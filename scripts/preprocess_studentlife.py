"""
StudentLife preprocessing script
================================
Builds a tidy long-format CSV (one row per student per day) merging:
  - Pre/post PSS-10 totals (term bookends, repeated across each student's daily rows)
  - Pre/post PSQI global scores (term bookends, repeated across each student's daily rows)
  - Daily EMA stress (aggregated mean per student per day)
  - Daily sensor-inferred sleep hours (from sensing/sleep/ files)
  - Daily deadline counts (from education/deadlines.csv)

Output: studentlife_daily.csv

USAGE:
  1. Set DATASET_ROOT below to the path of your unzipped StudentLife dataset.
  2. Set PSS_FILE and PSQI_FILE if your provided CSVs live elsewhere.
  3. Run: python preprocess_studentlife.py
  4. Inspect the printed "summary" at the end to verify counts look reasonable.

IMPORTANT — schemas I am NOT 100% sure about:
  - The exact JSON keys in EMA/response/Stress/Stress_uXX.json.
    I assume keys 'resp_time' (unix or ISO timestamp) and 'level' (1-5 integer).
    If your files use different keys, see EMA_TIME_KEY and EMA_LEVEL_KEY below.
  - The exact columns in sensing/sleep/sleep_uXX.csv. I assume a column named
    'timestamp' (unix seconds) and one named 'hour' (sleep duration). Adjust
    SLEEP_TIME_COL and SLEEP_DURATION_COL below if different.
  - The stress EMA direction. The StudentLife stress EMA codes 1='a little stressed'
    through 5='feeling great' — i.e. higher = LESS stress. The script flips this so
    higher = MORE stress, to match the PSS direction. Set FLIP_EMA_STRESS = False
    if you want the raw values.
  - The deadlines.csv format. I assume columns 'uid' and one column per date in
    YYYY-MM-DD format, with deadline counts as cell values. If your file has
    a long format ('uid', 'date', 'count'), set DEADLINES_LONG_FORMAT = True.

VERIFY before trusting the output:
  - Open one or two of the raw JSON / sensor files manually and confirm key/column names.
  - Cross-check PSS and PSQI totals for a few students against expected ranges
    (PSS-10 is 0-40, PSQI global is 0-21).
"""

import os
import json
import glob
import re
from pathlib import Path
import pandas as pd
import numpy as np

# ============================================================================
# CONFIG — edit these paths
# ============================================================================
DATASET_ROOT = Path("./StudentLifedataset")              # the unzipped StudentLife archive
PSS_FILE = DATASET_ROOT / "survey" / "PerceivedStressScale.csv"
PSQI_FILE = DATASET_ROOT / "survey" / "psqi.csv"
EMA_STRESS_DIR = DATASET_ROOT / "EMA" / "response" / "Stress"
SLEEP_DIR = DATASET_ROOT / "EMA" / "response" / "Sleep"
DEADLINES_FILE = DATASET_ROOT / "education" / "deadlines.csv"
OUTPUT_FILE = Path("./studentlife_daily.csv")

# Schema overrides
EMA_TIME_KEY = "resp_time"        # JSON key holding response timestamp
EMA_LEVEL_KEY = "level"            # JSON key holding 1-5 stress level
SLEEP_TIME_COL = "timestamp"       # column in sleep_uXX.csv holding unix timestamp
SLEEP_DURATION_COL = "hour"        # column holding self-reported / inferred sleep hours
FLIP_EMA_STRESS = True             # flip 1-5 so higher = more stress
DEADLINES_LONG_FORMAT = False      # set True if file is uid,date,count rather than wide


# ============================================================================
# PSS-10 SCORING
# ============================================================================
PSS_LIKERT_MAP = {
    "Never": 0,
    "Almost never": 1,
    "Sometime": 2, "Sometimes": 2,
    "Fairly often": 3,
    "Very often": 4,
}
# Items 4, 5, 7, 8 are positively worded and reverse-scored
PSS_REVERSE_ITEMS = {4, 5, 7, 8}


def score_pss(pss_file):
    """Return DataFrame with columns: uid, type, pss_total (0-40)."""
    df = pd.read_csv(pss_file)
    # Item columns are the 10 question columns; preserve original order
    item_cols = [c for c in df.columns if c not in ("uid", "type")]
    assert len(item_cols) == 10, f"Expected 10 PSS items, found {len(item_cols)}"

    scored = df[["uid", "type"]].copy()
    for i, col in enumerate(item_cols, start=1):
        # Map text labels to numeric, then reverse-score if needed
        numeric = df[col].map(PSS_LIKERT_MAP)
        if i in PSS_REVERSE_ITEMS:
            numeric = 4 - numeric
        scored[f"pss_item_{i}"] = numeric

    pss_items = [f"pss_item_{i}" for i in range(1, 11)]
    scored["pss_total"] = scored[pss_items].sum(axis=1, min_count=10)
    return scored[["uid", "type", "pss_total"]]


# ============================================================================
# PSQI SCORING (Buysse et al. 1989 algorithm)
# ============================================================================
PSQI_FREQ_MAP = {
    "Not during the past month": 0,
    "Less than once week": 1, "Less than once a week": 1,
    "Once or a twice week": 2, "Once or twice a week": 2,
    "Three or a more times week": 3, "Three or more times a week": 3,
}

PSQI_QUALITY_MAP = {
    "Very good": 0,
    "Fairly good": 1,
    "Fairly bad": 2,
    "Very bad": 3,
}


def parse_sleep_hours(value):
    """Handle Excel-corrupted '10-Sep' → 9.5, plain numbers, ranges, etc."""
    if pd.isna(value):
        return np.nan
    s = str(value).strip()
    # Excel date corruption: "10-Sep" came from "9-10" (interpreted as Sep 10)
    excel_dates = {
        "10-Sep": 9.5, "Sep-10": 9.5,
        "9-Aug": 8.5, "Aug-9": 8.5,
        "8-Jul": 7.5, "Jul-8": 7.5,
        "7-Jun": 6.5, "Jun-7": 6.5,
        "6-May": 5.5, "May-6": 5.5,
        "5-Apr": 4.5, "Apr-5": 4.5,
    }
    if s in excel_dates:
        return excel_dates[s]
    # Range like "7-8" → midpoint
    m = re.match(r"^(\d+)\s*-\s*(\d+)$", s)
    if m:
        return (int(m.group(1)) + int(m.group(2))) / 2
    # "X hours" or "X hour"
    m = re.match(r"^(\d+(?:\.\d+)?)\s*hours?$", s, re.IGNORECASE)
    if m:
        return float(m.group(1))
    # Plain number
    try:
        return float(s)
    except ValueError:
        return np.nan


def parse_latency_minutes(value):
    """Parse 'X mins', 'X minutes', or plain number → float minutes."""
    if pd.isna(value):
        return np.nan
    s = str(value).strip()
    m = re.match(r"^(\d+(?:\.\d+)?)\s*(?:mins?|minutes?)?$", s, re.IGNORECASE)
    if m:
        return float(m.group(1))
    return np.nan


def parse_time_to_hours(value):
    """Parse '2:00 AM', '1AM', '11:30 PM' → float hours (0-24)."""
    if pd.isna(value):
        return np.nan
    s = str(value).strip().upper().replace(" ", "")
    m = re.match(r"^(\d{1,2})(?::(\d{2}))?(AM|PM)?$", s)
    if not m:
        return np.nan
    h = int(m.group(1))
    mins = int(m.group(2)) if m.group(2) else 0
    ampm = m.group(3)
    if ampm == "PM" and h != 12:
        h += 12
    if ampm == "AM" and h == 12:
        h = 0
    return h + mins / 60


def score_psqi(psqi_file):
    """Return DataFrame with cleaned PSQI subscales.
    
    Simplified version that drops the three components requiring free-text
    parsing (latency, duration, efficiency) because the StudentLife file
    contains responses like "around 1 am", "I fall asleep really quickly",
    "8-Jul" (Excel corruption), and "200 hrs" that can't be reliably parsed.
    
    Keeps the four components driven by clean Likert items:
      - psqi_quality (0-3): subjective sleep quality
      - psqi_disturbance (0-3): binned frequency of 9 sleep problems
      - psqi_disturbance_raw (0-27): raw sum of 9 problem frequencies
      - psqi_medication (0-3): sleep medication use
      - psqi_daydysfunc (0-3): daytime dysfunction (2-item composite)
      - psqi_subscale_sum (0-12): sum of the 4 component scores
    
    The subscale_sum is NOT the full PSQI global score (which ranges 0-21).
    It's the sum of the 4 components we can score reliably. Higher = worse.
    """
    df = pd.read_csv(psqi_file)

    def find_col(pattern):
        for c in df.columns:
            if pattern.lower() in c.lower():
                return c
        raise KeyError(f"Could not find column matching: {pattern}")

    # Locate columns by partial text match
    col_q5b = find_col("b. Wake up in the middle")
    col_q5c = find_col("c. Have to get up")
    col_q5d = find_col("d. Cannot breathe")
    col_q5e = find_col("e. Cough or snore")
    col_q5f = find_col("f. Feel too cold")
    col_q5g = find_col("g. Feel too hot")
    col_q5h = find_col("h. Have bad dreams")
    col_q5i = find_col("i. Have pain")
    # The "j. Other reason" column comes in two flavors — the frequency item
    # and the "please describe" free-text. Pick the frequency one.
    j_candidates = [c for c in df.columns if c.startswith("j. Other") or "j. Other" in c]
    col_q5j = [c for c in j_candidates if "describe" not in c.lower()][0]
    col_med = find_col("how often have you taken medicine")
    col_awake = find_col("trouble staying awake")
    col_enthusiasm = find_col("keep up enthusiasm")
    col_quality = find_col("rate your sleep quality")

    out = df[["uid", "type"]].copy()

    # Component 1: Subjective sleep quality (single item, 0-3)
    out["psqi_quality"] = df[col_quality].map(PSQI_QUALITY_MAP)

    # Component 5: Sleep disturbances (sum of 9 frequency items, then binned)
    disturb_cols = [col_q5b, col_q5c, col_q5d, col_q5e, col_q5f,
                    col_q5g, col_q5h, col_q5i, col_q5j]
    disturb_numeric = pd.DataFrame({c: df[c].map(PSQI_FREQ_MAP) for c in disturb_cols})
    # Keep the raw 0-27 sum — more interpretable than the binned 0-3 component
    out["psqi_disturbance_raw"] = disturb_numeric.sum(axis=1, min_count=9)
    out["psqi_disturbance"] = pd.cut(
        out["psqi_disturbance_raw"],
        bins=[-0.1, 0, 9, 18, 27],
        labels=[0, 1, 2, 3]
    ).astype(float)

    # Component 6: Sleep medication use (single item, 0-3)
    out["psqi_medication"] = df[col_med].map(PSQI_FREQ_MAP).astype(float)

    # Component 7: Daytime dysfunction (sum of 2 items, then binned)
    daydys_sum = df[col_awake].map(PSQI_FREQ_MAP) + df[col_enthusiasm].map(PSQI_FREQ_MAP)
    out["psqi_daydysfunc"] = pd.cut(
        daydys_sum,
        bins=[-0.1, 0, 2, 4, 6],
        labels=[0, 1, 2, 3]
    ).astype(float)

    # Subscale sum: 4 components, range 0-12. Higher = worse sleep.
    out["psqi_subscale_sum"] = out[[
        "psqi_quality", "psqi_disturbance",
        "psqi_medication", "psqi_daydysfunc"
    ]].sum(axis=1, min_count=4)

    return out


# ============================================================================
# EMA stress aggregation
# ============================================================================
def aggregate_ema_stress(ema_dir):
    """Return DataFrame: uid, date, daily_stress_mean, daily_stress_n.
    
    Stress EMA responses are mostly stored with a 'level' key (the StudentLife
    standard format). A small number of early-collection responses use a 'null'
    key instead, which sometimes contains a valid 1-5 level but sometimes
    contains GPS coordinates or other junk. We use 'level' when present, and
    fall back to 'null' only when it parses as a plausible stress level.
    """
    rows = []
    files = sorted(glob.glob(str(ema_dir / "Stress_u*.json")))
    if not files:
        print(f"  WARNING: no Stress_uXX.json files in {ema_dir}")
        return pd.DataFrame(columns=["uid", "date", "daily_stress_mean", "daily_stress_n"])

    n_level = 0
    n_null_recovered = 0
    n_skipped = 0

    for fp in files:
        uid_match = re.search(r"Stress_(u\d+)\.json", fp)
        if not uid_match:
            continue
        uid = uid_match.group(1)
        try:
            with open(fp) as f:
                responses = json.load(f)
        except json.JSONDecodeError as e:
            print(f"  WARNING: could not parse {fp}: {e}")
            continue

        for r in responses:
            ts = r.get("resp_time")
            if ts is None:
                continue

            # Prefer 'level' key; fall back to 'null' only if it parses as 1-5
            raw_val = r.get("level")
            source = "level"
            if raw_val is None:
                raw_val = r.get("null")
                source = "null"
            if raw_val is None:
                n_skipped += 1
                continue

            # GPS coordinates contain commas
            if "," in str(raw_val):
                n_skipped += 1
                continue
            try:
                lvl_num = float(raw_val)
            except (ValueError, TypeError):
                n_skipped += 1
                continue
            if not (1 <= lvl_num <= 5):
                n_skipped += 1
                continue

            if source == "level":
                n_level += 1
            else:
                n_null_recovered += 1

            if FLIP_EMA_STRESS:
                lvl_num = 6 - lvl_num

            try:
                dt = pd.to_datetime(ts, unit="s")
            except (ValueError, TypeError):
                continue
            rows.append({"uid": uid, "date": dt.date(), "stress": lvl_num})

    print(f"  Stress: {n_level} from 'level' key, "
          f"{n_null_recovered} recovered from 'null' key, "
          f"{n_skipped} skipped (GPS/non-numeric/out-of-range)")

    if not rows:
        return pd.DataFrame(columns=["uid", "date", "daily_stress_mean", "daily_stress_n"])
    long_df = pd.DataFrame(rows)
    daily = long_df.groupby(["uid", "date"]).agg(
        daily_stress_mean=("stress", "mean"),
        daily_stress_n=("stress", "count"),
    ).reset_index()
    return daily


# ============================================================================
# Sensor sleep aggregation
# ============================================================================
def aggregate_ema_sleep(sleep_dir):
    """Return DataFrame: uid, date, daily_sleep_hours, daily_sleep_rate.
    
    Reads EMA/response/Sleep/Sleep_uXX.json files. Only uses complete responses
    that have an 'hour' key — partial responses with only a 'null' key are
    ambiguous (they can contain hours, ratings, or GPS coordinates) and are
    skipped to avoid contamination.
    """
    rows = []
    files = sorted(glob.glob(str(sleep_dir / "Sleep_u*.json")))
    if not files:
        print(f"  WARNING: no Sleep_uXX.json files in {sleep_dir}")
        return pd.DataFrame(columns=["uid", "date", "daily_sleep_hours", "daily_sleep_rate"])

    for fp in files:
        uid_match = re.search(r"Sleep_(u\d+)\.json", fp)
        if not uid_match:
            continue
        uid = uid_match.group(1)
        try:
            with open(fp) as f:
                responses = json.load(f)
        except json.JSONDecodeError as e:
            print(f"  WARNING: could not parse {fp}: {e}")
            continue

        for r in responses:
            # Only use complete responses with an 'hour' key
            if "hour" not in r:
                continue
            ts = r.get("resp_time")
            hour_val = r.get("hour")
            rate_val = r.get("rate")
            if ts is None or hour_val is None:
                continue
            try:
                hours = float(hour_val)
                rate = float(rate_val) if rate_val is not None else np.nan
                dt = pd.to_datetime(ts, unit="s")
            except (ValueError, TypeError):
                continue
            # Sanity check: 0-14 hours is plausible; outside that is corruption
            if not (0 <= hours <= 14):
                continue
            rows.append({"uid": uid, "date": dt.date(),
                         "sleep_hours": hours, "sleep_rate": rate})

    if not rows:
        return pd.DataFrame(columns=["uid", "date", "daily_sleep_hours", "daily_sleep_rate"])
    long_df = pd.DataFrame(rows)
    # If a student happened to submit multiple Sleep EMAs in one day, take the mean
    daily = long_df.groupby(["uid", "date"]).agg(
        daily_sleep_hours=("sleep_hours", "mean"),
        daily_sleep_rate=("sleep_rate", "mean"),
    ).reset_index()
    return daily


# ============================================================================
# Deadlines
# ============================================================================
def load_deadlines(deadlines_file):
    """Return DataFrame: uid, date, deadlines_count."""
    if not deadlines_file.exists():
        print(f"  WARNING: {deadlines_file} not found")
        return pd.DataFrame(columns=["uid", "date", "deadlines_count"])

    df = pd.read_csv(deadlines_file)
    if DEADLINES_LONG_FORMAT:
        df = df.rename(columns={"count": "deadlines_count"})
        df["date"] = pd.to_datetime(df["date"]).dt.date
        return df[["uid", "date", "deadlines_count"]]

    # Wide format: uid + one column per date
    date_cols = [c for c in df.columns if c != "uid"]
    long = df.melt(id_vars=["uid"], value_vars=date_cols,
                   var_name="date", value_name="deadlines_count")
    long["date"] = pd.to_datetime(long["date"], errors="coerce").dt.date
    long = long.dropna(subset=["date"])
    long["deadlines_count"] = pd.to_numeric(long["deadlines_count"], errors="coerce").fillna(0)
    return long


# ============================================================================
# Merge
# ============================================================================
def main():
    print("Scoring PSS-10 ...")
    pss_scored = score_pss(PSS_FILE)
    pss_wide = pss_scored.pivot(index="uid", columns="type", values="pss_total")
    pss_wide.columns = [f"pss_{t}" for t in pss_wide.columns]
    pss_wide = pss_wide.reset_index()
    print(f"  PSS: {len(pss_wide)} students, "
          f"{pss_wide['pss_pre'].notna().sum()} with pre, "
          f"{pss_wide['pss_post'].notna().sum() if 'pss_post' in pss_wide else 0} with post")

    print("Scoring PSQI ...")
    psqi_scored = score_psqi(PSQI_FILE)
    psqi_subscales = ["psqi_quality", "psqi_disturbance", "psqi_disturbance_raw",
                      "psqi_medication", "psqi_daydysfunc", "psqi_subscale_sum"]
    pivots = []
    for col in psqi_subscales:
        p = psqi_scored.pivot(index="uid", columns="type", values=col)
        p.columns = [f"{col}_{t}" for t in p.columns]
        pivots.append(p)
    psqi_wide = pd.concat(pivots, axis=1).reset_index()
    n_pre = psqi_wide['psqi_subscale_sum_pre'].notna().sum()
    n_post = psqi_wide['psqi_subscale_sum_post'].notna().sum()
    print(f"  PSQI: {len(psqi_wide)} students, {n_pre} with pre, {n_post} with post")

    print("Aggregating EMA stress ...")
    ema = aggregate_ema_stress(EMA_STRESS_DIR)
    print(f"  EMA: {len(ema)} student-day rows from {ema['uid'].nunique()} students")
    print("Loading deadlines ...")
    deadlines = load_deadlines(DEADLINES_FILE)
    print(f"  Deadlines: {len(deadlines)} student-day rows")

    print("Aggregating EMA sleep ...")
    sleep = aggregate_ema_sleep(SLEEP_DIR)
    print(f"  Sleep: {len(sleep)} student-day rows from {sleep['uid'].nunique()} students")

    print("Merging ...")
    # Outer-join EMA, sleep, deadlines on (uid, date) to get the daily skeleton
    daily = ema.merge(sleep, on=["uid", "date"], how="outer")
    daily = daily.merge(deadlines, on=["uid", "date"], how="outer")
    daily["deadlines_count"] = daily["deadlines_count"].fillna(0)

    # Attach the bookend survey scores (repeat per row)
    daily = daily.merge(pss_wide, on="uid", how="left")
    daily = daily.merge(psqi_wide, on="uid", how="left")

    # Sort and write
    daily = daily.sort_values(["uid", "date"]).reset_index(drop=True)
    daily.to_csv(OUTPUT_FILE, index=False)

    print(f"\nWrote {OUTPUT_FILE}: {len(daily)} rows, {len(daily.columns)} columns")
    print(f"Columns: {list(daily.columns)}")
    print(f"\nSanity check — first row per student for u00–u04:")
    print(daily.groupby("uid").head(1).head(5).to_string())


if __name__ == "__main__":
    main()

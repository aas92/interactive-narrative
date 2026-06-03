#!/usr/bin/env bash
# ==================================================================
#  SAFE COMBINE  —  Franck sections 0-5  +  Aaron sections 6+
#  (v2: UTF-8 safe on Windows; auto-adds Aaron's viz scripts)
# ------------------------------------------------------------------
#  Builds one index.html: sections 0..5 EXACTLY Franck's (75c79f1),
#  sections 6..end EXACTLY Aaron's (origin/aaron), byte-for-byte.
#  Backs everything up, verifies, never touches franck/gh-pages,
#  never pushes. RUN IN GIT BASH:   bash combine_index.sh
# ==================================================================
set -u

REPO_DIR="/c/Users/Franck Kepnang/OneDrive/Desktop/School Stuff/True Final project"
REMOTE_URL="git@github.com:aas92/interactive-narrative.git"
FRANCK_COMMIT="75c79f17e0da7513453b592efb6b7fff9b478e24"
AARON_REF="origin/aaron"
CUT=6
WORK_BRANCH="combine-fix"

TS="$(date +%Y%m%d-%H%M%S)"; BK="$REPO_DIR/_combine_backup_$TS"
say(){ echo ""; echo "-- $* --"; }

cd "$REPO_DIR" || { echo "X Cannot cd into REPO_DIR."; exit 1; }
[ -d ".git" ] || { echo "X Not a git repo."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "X python3 not found."; exit 1; }
git remote get-url origin >/dev/null 2>&1 && git remote set-url origin "$REMOTE_URL" || git remote add origin "$REMOTE_URL"
say "Fetching"; git fetch origin --prune || { echo "X Fetch failed (SSH key?)."; exit 1; }
for ref in "$FRANCK_COMMIT" "$AARON_REF"; do
  git rev-parse --verify "${ref}^{commit}" >/dev/null 2>&1 || { echo "X Cannot find ref: $ref"; exit 1; }
done
ORIG_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
say "Commits to combine"
git --no-pager log -1 --format='FRANCK  %h %an %ad %s' "$FRANCK_COMMIT"
git --no-pager log -1 --format='AARON   %h %an %ad %s' "$AARON_REF"

say "Backups (nothing can be lost)"
mkdir -p "$BK"
git tag "combine-preop-$TS" HEAD 2>/dev/null && echo "  tag : combine-preop-$TS"
for b in franck gh-pages; do
  git show-ref --verify --quiet "refs/heads/$b" && git branch -f "backup/$b-$TS" "$b" && echo "  branch: backup/$b-$TS"
done
git branch -f "backup/aaron-$TS" "$AARON_REF" && echo "  branch: backup/aaron-$TS"
[ -f index.html ] && cp index.html "$BK/working_index.html" && echo "  file : $BK/working_index.html"
STASHED=0
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  git stash push -m "combine-preop-$TS" >/dev/null && STASHED=1 && echo "  stash: combine-preop-$TS"
fi

echo ""
echo "Build '$WORK_BRANCH' = Franck 0-$((CUT-1)) + Aaron $CUT+. franck/gh-pages untouched. Backups in $BK"
read -r -p "Proceed? type yes: " ANS
[ "$ANS" = "yes" ] || { echo "Aborted."; [ "$STASHED" = "1" ] && git stash pop >/dev/null 2>&1; exit 0; }

say "Building on '$WORK_BRANCH' at $FRANCK_COMMIT"
git checkout -B "$WORK_BRANCH" "$FRANCK_COMMIT" || { echo "X checkout failed."; [ "$STASHED" = "1" ] && git stash pop >/dev/null 2>&1; exit 1; }
git show "$FRANCK_COMMIT:index.html" > "$BK/franck_index.html" || { echo "X no index.html in $FRANCK_COMMIT"; exit 1; }
git show "$AARON_REF:index.html"     > "$BK/aaron_index.html"  || { echo "X no index.html on $AARON_REF"; exit 1; }

python3 - "$BK/franck_index.html" "$BK/aaron_index.html" "$CUT" index.html <<'PY'
import re, sys
skeleton_path, donor_path, cut, out_path = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
sk = open(skeleton_path, encoding="utf-8").read()
dn = open(donor_path, encoding="utf-8").read()
pat = re.compile(r'<section\b[^>]*\bdata-active-index="(\d+)"[^>]*>.*?</section>', re.S)
def blocks(s): return {int(m.group(1)): m.span() for m in pat.finditer(s)}
skb, dnb = blocks(sk), blocks(dn)
if not skb: sys.stderr.write("FATAL: no sections in skeleton.\n"); sys.exit(2)
out, last, kept, swapped, kept_hi = [], 0, [], [], []
for idx in sorted(skb):
    s, e = skb[idx]; out.append(sk[last:s])
    if idx < cut: out.append(sk[s:e]); kept.append(idx)
    elif idx in dnb: out.append(dn[dnb[idx][0]:dnb[idx][1]]); swapped.append(idx)
    else: out.append(sk[s:e]); kept_hi.append(idx)
    last = e
donly = [i for i in sorted(dnb) if i >= cut and i not in skb]
if donly: out.append("".join("\n"+dn[dnb[i][0]:dnb[i][1]]+"\n" for i in donly))
out.append(sk[last:])
result = "".join(out)
sline = re.compile(r'[ \t]*<script\b[^>]*\bsrc="([^"]+)"[^>]*>\s*</script>[ \t]*\n?')
def src_map(s):
    d={}
    for m in sline.finditer(s): d[m.group(1)]=m.group(0)
    return d
sk_src, dn_src = src_map(sk), src_map(dn)
EXCLUDE = ("heart_rate_carousel.js",)
missing = [s for s in dn_src if s not in sk_src]
to_add  = [s for s in missing if "viz_" in s and not any(x in s for x in EXCLUDE)]
skipped = [s for s in missing if s not in to_add]
added = []
if to_add:
    add_lines = "".join(dn_src[s] if dn_src[s].endswith("\n") else dn_src[s]+"\n" for s in to_add)
    anchor = re.search(r'[ \t]*<script\b[^>]*\bsrc="[^"]*sketch_renderer\.js"[^>]*>\s*</script>[ \t]*\n?', result)
    if anchor:
        result = result[:anchor.start()] + add_lines + result[anchor.start():]
    else:
        bi = result.lower().rfind("</body>")
        result = (result[:bi] + add_lines + result[bi:]) if bi!=-1 else result+add_lines
    added = to_add
open(out_path, "w", encoding="utf-8").write(result)
sys.stderr.write("SPLICE REPORT\n")
sys.stderr.write(f"  kept (Franck, <{cut})    : {kept}\n")
sys.stderr.write(f"  swapped (Aaron, >={cut}) : {swapped}\n")
if kept_hi: sys.stderr.write(f"  !! Aaron lacks high sections (kept Franck's): {kept_hi}\n")
if donly:   sys.stderr.write(f"  inserted Aaron-only high sections: {donly}\n")
if added:   sys.stderr.write(f"  ADDED Aaron viz scripts (for his sections): {added}\n")
if skipped: sys.stderr.write(f"  skipped Aaron scripts (not needed / replaced): {skipped}\n")
if not (added or skipped): sys.stderr.write("  script tags: skeleton already covers Aaron's references.\n")
PY
[ $? -eq 0 ] || { echo "X splice failed. Sources in $BK."; exit 1; }

say "Checking referenced JS files exist (restore from Aaron if missing)"
for f in $(grep -oE 'src="(js/[^"]+)"' index.html | sed -E 's/src="([^"]+)"/\1/' | sort -u); do
  if [ ! -f "$f" ]; then
    if git cat-file -e "$AARON_REF:$f" 2>/dev/null; then mkdir -p "$(dirname "$f")"; git checkout "$AARON_REF" -- "$f" && echo "  restored: $f"
    else echo "  !! missing and not on Aaron: $f"; fi
  fi
done

say "Verifying byte-exact ownership"
python3 - index.html "$BK/franck_index.html" "$BK/aaron_index.html" "$CUT" <<'PY'
import re, sys
result_path, franck_path, aaron_path, cut = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
res = open(result_path, encoding="utf-8").read()
fr  = open(franck_path,  encoding="utf-8").read()
ar  = open(aaron_path,   encoding="utf-8").read()
pat = re.compile(r'<section\b[^>]*\bdata-active-index="(\d+)"[^>]*>.*?</section>', re.S)
def secs(s): return {int(m.group(1)): s[m.start():m.end()] for m in pat.finditer(s)}
R,F,A = secs(res),secs(fr),secs(ar); ok=True
print("PER-SECTION BYTE VERIFICATION (result vs rightful owner)")
for idx in sorted(R):
    owner,src = ("Franck",F) if idx<cut else ("Aaron",A)
    if idx in src and R[idx]==src[idx]: print(f"  section {idx:>2}: byte-identical to {owner}  OK")
    elif idx not in src: print(f"  section {idx:>2}: {owner} lacks it (review)"); ok=False
    else: print(f"  section {idx:>2}: DIFFERS from {owner} *** MISMATCH ***"); ok=False
mf=[i for i in sorted(F) if i<cut and i not in R]; ma=[i for i in sorted(A) if i>=cut and i not in R]
if mf: print(f"  !! Franck <{cut} missing: {mf}"); ok=False
if ma: print(f"  !! Aaron >={cut} missing: {ma}"); ok=False
idxs=sorted(R); dups=sorted({i for i in idxs if idxs.count(i)>1}); print(f"  indices: {idxs}")
if dups: print(f"  !! duplicates: {dups}"); ok=False
if 11 in F and 11 in A and F[11]!=A[11]:
    used="Aaron" if (11 in R and R[11]==A[11]) else ("Franck" if (11 in R and R[11]==F[11]) else "??")
    print(f"\n  ATTENTION: section 11 (Sources) differs; result uses {used}'s. Check your heart citations.")
print("\nRESULT: "+("ALL OWNERSHIP CHECKS PASSED" if ok else "PROBLEMS FOUND")); sys.exit(0 if ok else 1)
PY
VERIFY_RC=$?
H=$(grep -c '<html' index.html); B=$(grep -c '<body' index.html)
echo "  structure: <html>=$H <body>=$B (expect 1/1)"
if [ "$VERIFY_RC" -ne 0 ] || [ "$H" != "1" ] || [ "$B" != "1" ]; then
  echo ""; echo "STOP: Verification not clean. NOT committing. Built file left on '$WORK_BRANCH'."
  echo "   Undo: git checkout -- . ; git checkout ${ORIG_BRANCH:-gh-pages}"
  [ "$STASHED" = "1" ] && echo "        git stash pop"
  exit 1
fi

say "Committing on '$WORK_BRANCH' (no push, franck/gh-pages untouched)"
git add -A; git status --short
git diff --cached --quiet && { echo "Nothing to commit. Check CUT/commits."; exit 0; }
git commit -m "Combine: Franck 0-$((CUT-1)) (75c79f1) + Aaron $CUT+ (origin/aaron); byte-verified"

cat <<EOF

DONE: built & committed on '$WORK_BRANCH'. Nothing pushed. franck & gh-pages unchanged.

REVIEW:  git diff franck -- index.html      (then open index.html and scroll every section)
PROMOTE: git checkout franck && git merge --no-ff $WORK_BRANCH && git push origin franck
UNDO:    backup/franck-$TS , backup/gh-pages-$TS , backup/aaron-$TS , tag combine-preop-$TS , files in $BK
EOF
[ "$STASHED" = "1" ] && echo "  pre-run change stashed: git stash pop"
echo ""; echo "STOP: gh-pages untouched. Promote to gh-pages only after you and Aaron review."
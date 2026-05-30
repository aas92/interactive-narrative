import json
import csv
import os

SRC = os.path.join('data', 'meditation_data.json')
OUT_DIR = 'data'

with open(SRC, 'r', encoding='utf-8') as f:
    data = json.load(f)

for key, value in data.items():
    if isinstance(value, list) and len(value) > 0 and isinstance(value[0], dict):
        # collect all fieldnames
        fieldnames = set()
        for item in value:
            fieldnames.update(item.keys())
        fieldnames = sorted(fieldnames)
        out_path = os.path.join(OUT_DIR, f'meditation_data_{key}.csv')
        with open(out_path, 'w', newline='', encoding='utf-8') as outcsv:
            writer = csv.DictWriter(outcsv, fieldnames=fieldnames)
            writer.writeheader()
            for item in value:
                writer.writerow({k: item.get(k, '') for k in fieldnames})
        print('Wrote', out_path)
    else:
        # write simple key to a CSV with two columns (key, value)
        out_path = os.path.join(OUT_DIR, f'meditation_data_{key}.csv')
        with open(out_path, 'w', newline='', encoding='utf-8') as outcsv:
            writer = csv.writer(outcsv)
            writer.writerow(['key','value'])
            writer.writerow([key, json.dumps(value)])
        print('Wrote (as json blob)', out_path)

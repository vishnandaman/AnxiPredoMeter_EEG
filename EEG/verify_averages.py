#!/usr/bin/env python3
"""Verify EEG averages from CSV file"""
import csv
from collections import defaultdict
import numpy as np

# Read CSV and calculate averages
band_values = defaultdict(list)

with open('eeg_live_data.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        band = row.get('Band', '').lower().strip()
        value_str = row.get('Value', '').strip()
        
        if not band or not value_str or band == 'band':
            continue
        
        try:
            value = float(value_str)
            band_values[band].append(value)
        except (ValueError, TypeError):
            continue

# Calculate averages
print("=" * 60)
print("EEG CSV FILE VERIFICATION")
print("=" * 60)
print(f"\nTotal rows processed: {sum(len(vals) for vals in band_values.values())}")
print(f"\nValues per band:")
for band in ['delta', 'theta', 'alpha', 'beta', 'gamma']:
    if band in band_values:
        count = len(band_values[band])
        print(f"  {band:6s}: {count:4d} values")

print(f"\n{'=' * 60}")
print("CALCULATED AVERAGES (using numpy.mean):")
print(f"{'=' * 60}")
averages = {}
for band in ['delta', 'theta', 'alpha', 'beta', 'gamma']:
    if band in band_values and len(band_values[band]) > 0:
        avg = np.mean(band_values[band])
        averages[band] = round(float(avg), 4)
        print(f"  {band:6s}: {averages[band]:12.4f}")

print(f"\n{'=' * 60}")
print("COMPARISON WITH FLASK RESPONSE:")
print(f"{'=' * 60}")
flask_values = {
    "delta": 134.4929,
    "theta": 36.678,
    "alpha": 9.1722,
    "beta": 24.3244,
    "gamma": 62.44
}

print("\nFlask Server Response vs Calculated:")
for band in ['delta', 'theta', 'alpha', 'beta', 'gamma']:
    flask_val = flask_values.get(band, 0)
    calc_val = averages.get(band, 0)
    diff = abs(flask_val - calc_val)
    match = "MATCH" if diff < 0.001 else "MISMATCH"
    print(f"  {band:6s}: Flask={flask_val:12.4f}, Calc={calc_val:12.4f}, Diff={diff:10.6f} [{match}]")

print(f"\n{'=' * 60}")
print("STATISTICS:")
print(f"{'=' * 60}")
for band in ['delta', 'theta', 'alpha', 'beta', 'gamma']:
    if band in band_values and len(band_values[band]) > 0:
        vals = band_values[band]
        print(f"\n{band.upper()}:")
        print(f"  Min:    {min(vals):12.4f}")
        print(f"  Max:    {max(vals):12.4f}")
        print(f"  Mean:   {np.mean(vals):12.4f}")
        print(f"  Median: {np.median(vals):12.4f}")
        print(f"  Std:    {np.std(vals):12.4f}")

print("\n" + "=" * 60)

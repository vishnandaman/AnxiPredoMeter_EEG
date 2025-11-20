# Real-Time EEG Collection Module

## Overview
This module provides **automatic EEG data collection** without manual intervention. When a user clicks "Autofill" for EEG, the system:
1. Automatically connects to the EEG device
2. Collects readings for a fixed duration (default: 30 seconds)
3. Removes noise and outliers
4. Computes averages automatically
5. Returns clean data for form autofill

## How It Works

### Old Method (Manual):
1. User runs `cortex_test.py` separately
2. Data saved to CSV file
3. Frontend reads from CSV
4. Manual intervention required

### New Method (Automatic):
1. User clicks "Autofill EEG" button
2. Backend automatically connects to EEG device
3. Collects data for 30 seconds
4. Filters noise automatically
5. Computes averages
6. Autofills form immediately

## Files Structure

```
ml_model/eeg_realtime/
├── __init__.py                    # Module initialization
├── realtime_eeg_collector.py      # Main collection logic
└── README.md                      # This file
```

## Configuration

Edit `realtime_eeg_collector.py` to adjust:
- `COLLECTION_DURATION`: How long to collect data (default: 30 seconds)
- `MIN_SAMPLES_REQUIRED`: Minimum samples needed (default: 50)
- `NOISE_THRESHOLD_MULTIPLIER`: Outlier detection threshold (default: 3.0)

## Rollback Instructions

**To rollback to old method:**
1. Delete the `ml_model/eeg_realtime/` folder
2. The system will automatically fallback to the old CSV-based method
3. No other changes needed - the old endpoints still work

## API Endpoint

New endpoint: `POST /api/eeg/collect_realtime`

**Request:**
```json
{
  "duration": 30  // optional, defaults to 30 seconds
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "delta": 40.5,
    "theta": 8.2,
    "alpha": 20.1,
    "beta": 12.3,
    "gamma": 3.4
  },
  "samples_collected": 150,
  "message": "Successfully collected 150 samples"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error message here",
  "fallback_available": true
}
```

## Integration

The frontend automatically tries the new endpoint first, then falls back to the old method if it fails. No user-facing changes needed.

## Benefits

✅ **No Manual Intervention** - Fully automatic
✅ **Real-Time Collection** - Data collected on-demand
✅ **Noise Filtering** - Automatic outlier removal
✅ **Consistent Data** - Fixed collection duration
✅ **Easy Rollback** - Just delete folder to revert


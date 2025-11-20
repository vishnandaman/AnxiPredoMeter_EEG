# Real-Time EEG Collection - Changes Documentation

## Overview
This document tracks all changes made to implement automatic real-time EEG collection. **To rollback, simply delete the `ml_model/eeg_realtime/` folder** and the system will automatically use the old method.

---

## Files Created (NEW - Can be deleted to rollback)

### 1. `ml_model/eeg_realtime/` folder
   - **Purpose**: New real-time EEG collection module
   - **Rollback**: Delete entire folder
   - **Files**:
     - `__init__.py` - Module initialization
     - `realtime_eeg_collector.py` - Main collection logic
     - `README.md` - Documentation

### 2. `REALTIME_EEG_CHANGES.md` (this file)
   - **Purpose**: Documentation of changes
   - **Rollback**: Delete this file

---

## Files Modified (Can be reverted)

### 1. `ml_model/app_combined.py`
   - **Line**: Added after `/api/doctors` endpoint (around line 952)
   - **Change**: Added new endpoint `/api/eeg/collect_realtime`
   - **Rollback**: Remove the endpoint code block (marked with `# ==================== REAL-TIME EEG COLLECTION (NEW) ====================`)
   - **Impact**: Low - old endpoints still work

### 2. `src/pages/RealTimeTest.jsx`
   - **Function**: `fetchLatestEegAvg()` (around line 509)
   - **Change**: Modified to try new endpoint first, then fallback to old method
   - **Rollback**: Revert to original `fetchLatestEegAvg()` function
   - **Impact**: Low - gracefully falls back if new endpoint fails

---

## How It Works

### New Flow (Automatic):
1. User clicks "Autofill Latest Avg EEG" button
2. Frontend calls `/api/eeg/collect_realtime` (POST)
3. Backend automatically:
   - Connects to EEG device
   - Collects data for 30 seconds
   - Filters noise
   - Computes averages
   - Returns clean data
4. Frontend autofills form
5. User can immediately submit for prediction

### Old Flow (Manual - Still Available):
1. User runs `cortex_test.py` separately
2. Data saved to CSV file
3. User clicks "Autofill Latest Avg EEG"
4. Frontend calls `/latest_avg_eeg` (GET)
5. Backend reads from CSV
6. Returns data for autofill

---

## Rollback Instructions

### Quick Rollback (Recommended):
1. **Delete** `ml_model/eeg_realtime/` folder
2. **Revert** `src/pages/RealTimeTest.jsx` - restore original `fetchLatestEegAvg()` function
3. **Remove** the new endpoint from `ml_model/app_combined.py` (the block marked with `# ==================== REAL-TIME EEG COLLECTION (NEW) ====================`)
4. System will work exactly as before

### Partial Rollback (Keep new code but disable):
- Just delete `ml_model/eeg_realtime/` folder
- System will automatically fallback to old method
- No other changes needed

---

## Testing

### Test New Method:
1. Ensure EEG device is connected
2. Click "Autofill Latest Avg EEG" button
3. Wait ~30 seconds (collection time)
4. Form should autofill automatically
5. Check browser console for `[EEG Autofill] Real-time collection successful!`

### Test Fallback:
1. Disconnect EEG device OR delete `ml_model/eeg_realtime/` folder
2. Click "Autofill Latest Avg EEG" button
3. Should fallback to old CSV method
4. Check browser console for `[EEG Autofill] Using fallback method (CSV/old)...`

---

## Configuration

Edit `ml_model/eeg_realtime/realtime_eeg_collector.py`:
- `COLLECTION_DURATION = 30` - Change collection time (seconds)
- `MIN_SAMPLES_REQUIRED = 50` - Minimum samples needed
- `NOISE_THRESHOLD_MULTIPLIER = 3.0` - Outlier detection threshold

---

## Benefits

✅ **No Manual Intervention** - Fully automatic
✅ **Real-Time** - Data collected on-demand
✅ **Noise Filtering** - Automatic outlier removal
✅ **Consistent** - Fixed 30-second collection
✅ **Backward Compatible** - Falls back to old method if needed
✅ **Easy Rollback** - Just delete folder

---

## Troubleshooting

### Issue: "Real-time collection module not available"
- **Solution**: Check if `ml_model/eeg_realtime/` folder exists
- **Fallback**: System will automatically use old method

### Issue: "No EEG headset found"
- **Solution**: Ensure EEG device is connected and Cortex is running
- **Fallback**: System will try old CSV method

### Issue: "Insufficient samples collected"
- **Solution**: Increase `COLLECTION_DURATION` or check headset connection
- **Fallback**: System will try old CSV method

---

## Version History

- **v1.0** (Current): Initial implementation with automatic collection
- **v0.0** (Previous): Manual CSV-based method (still available as fallback)


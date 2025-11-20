# Git Commit Instructions - Real-Time EEG Collection

## Files Changed/Created

### New Files Created:
1. `ml_model/eeg_realtime/__init__.py`
2. `ml_model/eeg_realtime/realtime_eeg_collector.py`
3. `ml_model/eeg_realtime/README.md`
4. `REALTIME_EEG_CHANGES.md`
5. `COMMIT_REALTIME_EEG.md` (this file)

### Files Modified:
1. `ml_model/app_combined.py` - Added new endpoint and traceback import
2. `src/pages/RealTimeTest.jsx` - Updated fetchLatestEegAvg() function

---

## Git Commands to Commit All Changes

### Step 1: Check current status
```bash
git status
```

### Step 2: Stage all new and modified files
```bash
# Stage new files
git add ml_model/eeg_realtime/
git add REALTIME_EEG_CHANGES.md
git add COMMIT_REALTIME_EEG.md

# Stage modified files
git add ml_model/app_combined.py
git add src/pages/RealTimeTest.jsx
```

### Step 3: Commit with descriptive message
```bash
git commit -m "feat: Add automatic real-time EEG collection without manual intervention

- Add new eeg_realtime module for automatic EEG data collection
- Implement automatic connection, data collection, noise filtering, and averaging
- Add /api/eeg/collect_realtime endpoint for on-demand EEG collection
- Update frontend to try new method first, fallback to old CSV method
- Collection duration: 30 seconds with automatic noise filtering
- Fully backward compatible - old method still available as fallback
- Easy rollback: Delete ml_model/eeg_realtime/ folder to revert

Files changed:
- New: ml_model/eeg_realtime/ module (3 files)
- Modified: ml_model/app_combined.py (new endpoint + traceback import)
- Modified: src/pages/RealTimeTest.jsx (updated autofill logic)
- Docs: REALTIME_EEG_CHANGES.md (rollback instructions)"
```

### Step 4: Push to remote
```bash
git push origin <your-branch-name>
```

---

## Quick Commit (All-in-One)

```bash
git add ml_model/eeg_realtime/ REALTIME_EEG_CHANGES.md COMMIT_REALTIME_EEG.md ml_model/app_combined.py src/pages/RealTimeTest.jsx

git commit -m "feat: Add automatic real-time EEG collection without manual intervention

- Add new eeg_realtime module for automatic EEG data collection
- Implement automatic connection, data collection, noise filtering, and averaging
- Add /api/eeg/collect_realtime endpoint for on-demand EEG collection
- Update frontend to try new method first, fallback to old CSV method
- Collection duration: 30 seconds with automatic noise filtering
- Fully backward compatible - old method still available as fallback
- Easy rollback: Delete ml_model/eeg_realtime/ folder to revert"

git push origin <your-branch-name>
```

---

## How to Rollback This Commit

### Option 1: Revert the commit (keeps history)
```bash
git revert HEAD
git push origin <your-branch-name>
```

### Option 2: Reset to previous commit (removes from history)
```bash
# WARNING: This rewrites history - only use if you haven't pushed or if working alone
git reset --hard HEAD~1
git push origin <your-branch-name> --force
```

### Option 3: Manual rollback (keep commit, just delete files)
```bash
# Delete the new folder
rm -rf ml_model/eeg_realtime/

# Revert the modified files manually
git checkout HEAD~1 -- ml_model/app_combined.py
git checkout HEAD~1 -- src/pages/RealTimeTest.jsx

# Commit the rollback
git add -A
git commit -m "revert: Rollback to manual EEG collection method"
git push origin <your-branch-name>
```

---

## Commit Hash Reference

After committing, note the commit hash:
```bash
git log -1 --oneline
```

Save this hash for easy rollback:
```bash
git revert <commit-hash>
```

---

## Testing Before Committing

1. **Test new method:**
   - Connect EEG device
   - Click "Autofill Latest Avg EEG"
   - Should collect data automatically

2. **Test fallback:**
   - Delete `ml_model/eeg_realtime/` folder temporarily
   - Click "Autofill Latest Avg EEG"
   - Should use old CSV method

3. **Restore folder:**
   ```bash
   git checkout HEAD -- ml_model/eeg_realtime/
   ```


# Document Viewer Testing Guide

## 🎯 What Was Fixed

### Issue #1: Redirect to Supabase URL ❌ → ✅ FIXED
**Before**: Tapping "View Document" opened Safari browser with Supabase URL
**After**: Opens native iOS QuickLook viewer (in-app, no browser, no URL)

### Issue #2: Empty Files (0 bytes) ⚠️ → ✅ DETECTED
**Detection**: App now checks for 0-byte files and alerts user to re-upload
**Root Cause**: Documents uploaded before v1.1.0 (Build 18) were corrupted due to iOS file reading bug
**Solution**: Delete old documents and re-upload with current build

---

## 📋 Pre-Testing Checklist

### Step 1: Clean Old Documents from Supabase (CRITICAL)

1. **Go to Supabase Dashboard** → Storage → `worker-documents` bucket
2. **Delete ALL existing test documents** (they are likely 0 bytes)
3. **Verify bucket is empty** or only contains documents you want to keep

### Step 2: Clean Database Records (CRITICAL)

Run this SQL in Supabase SQL Editor:

```sql
-- Check for 0-byte documents
SELECT id, file_name, file_size, storage_path
FROM worker_documents
WHERE file_size = 0;

-- Delete all 0-byte documents (OPTIONAL - only if you want to start fresh)
-- DELETE FROM worker_documents WHERE file_size = 0;

-- Or delete ALL documents for your test worker (to start clean)
-- DELETE FROM worker_documents WHERE worker_id = 'your-test-worker-id';
```

### Step 3: Verify Dependencies Installed

Run this in your terminal:

```bash
cd c:\Users\Admin\Desktop\Cursor\VeraWorkerApp
npm list expo-sharing expo-file-system
```

**Expected Output**:
```
VeraWorkerApp@1.0.0
├── expo-file-system@19.0.21
└── expo-sharing@14.0.8
```

---

## 🧪 Testing in Expo Go (Development)

### Start Development Server

```bash
cd c:\Users\Admin\Desktop\Cursor\VeraWorkerApp
npm start
```

Press `i` to open iOS Simulator (macOS) or scan QR code with Expo Go app.

### Test Case 1: Upload PDF Document

1. **Login** to the app
2. Navigate to **"My Documents"**
3. Tap **"Add New Document"**
4. Select a **PDF file** (e.g., a sample PDF from your Mac)
5. **Verify Upload Success**:
   - Success alert appears
   - Document appears in list
   - File size shows (e.g., "125.3 KB")
   - **IMPORTANT**: Size should NOT be "0 B"

**Expected Logs** (check terminal):
```
🔄 Starting document upload: { fileName: 'test.pdf', expectedSize: 128345, ... }
✅ File read successfully via ExpoFile: { base64Length: 171128, blobSize: 128345, ... }
📤 Uploading to Supabase Storage: { storagePath: '...', blobSize: 128345, ... }
✅ Storage upload successful
📝 Database insert result: { success: true, documentId: '...' }
```

### Test Case 2: View PDF Document (iOS Native Viewer)

1. Tap the **"eye" icon** next to your uploaded PDF
2. **Expected Behavior**:
   - ✅ Activity indicator shows briefly
   - ✅ iOS QuickLook viewer opens **in-app** (looks like Apple's native PDF viewer)
   - ✅ NO browser window
   - ✅ NO URL bar
   - ✅ NO redirect to Supabase
   - ✅ Document displays with full content (not empty)
   - ✅ Can zoom, scroll, and navigate pages
   - ✅ "Done" button in top-left to close viewer

**Expected Logs**:
```
📱 Opening document with native viewer: test.pdf
📥 Downloading document to cache: { storagePath: '...', fileName: 'test.pdf', ... }
✅ Document downloaded successfully: { uri: 'file://...', size: 128345 }
📄 Opening native viewer for: file:///.../worker-documents/test.pdf
✅ Document viewer opened successfully
```

### Test Case 3: Upload Word Document (.docx)

1. Tap **"Add New Document"**
2. Select a **.docx file**
3. Verify upload success (size shows, not 0 bytes)

### Test Case 4: View Word Document

1. Tap **"eye" icon** next to the Word doc
2. **Expected Behavior**:
   - ✅ iOS QuickLook viewer opens
   - ✅ Document displays with formatting
   - ✅ No redirect to browser

### Test Case 5: Empty File Detection (If Old Files Exist)

1. If you have old documents from before v1.1.0:
2. Tap **"eye" icon**
3. **Expected Behavior**:
   - ⚠️ Alert appears: "Empty Document - This document appears to be empty (0 bytes)..."
   - ✅ Suggests deleting and re-uploading

---

## 🌐 Testing on Web (Browser)

### Start Web Dev Server

```bash
npm run web
```

Or press `w` in the Expo terminal.

### Expected Web Behavior

**Web uses the OLD `WebBrowser.openBrowserAsync()` approach** (this is intentional):

1. Upload a document
2. Tap "View" button
3. **Expected**:
   - Opens in a new browser tab
   - Shows Supabase signed URL (this is normal on web)
   - Document displays or downloads (browser-dependent)

**This is ACCEPTABLE on web** - the fix is specifically for iOS/Android native.

---

## 📱 Common Issues & Solutions

### Issue: "Document viewing is not available on this device"

**Cause**: `expo-sharing` not available on simulator
**Solution**: Test on a real iOS device via Expo Go, or wait for TestFlight build

### Issue: "Failed to read file content - file appears to be empty"

**Cause**: Trying to upload a 0-byte file or corrupted file
**Solution**: Select a different file with actual content

### Issue: Still seeing browser/Safari when viewing

**Cause**: Running on web platform or old code
**Solution**:
- Verify you're on iOS simulator/device (not web)
- Restart Expo dev server: `Ctrl+C`, then `npm start`
- Clear Metro cache: `npm start -- --clear`

### Issue: "Download failed with status 400/403"

**Cause**: Supabase Storage RLS policy blocking access
**Solution**: Run `SQL/CREATE_WORKER_DOCUMENTS.sql` to set up storage policies

---

## 🚀 Preparing TestFlight Build

Once Expo Go testing passes, create a TestFlight build:

### Step 1: Update Build Number

Edit `app.json`:

```json
{
  "expo": {
    "version": "1.1.0",
    "ios": {
      "buildNumber": "19"  // Increment from 18 → 19
    }
  }
}
```

### Step 2: Build for iOS

```bash
eas build --profile production --platform ios
```

Wait for build to complete (~15-20 minutes).

### Step 3: Submit to TestFlight

```bash
eas submit --platform ios
```

Or manually submit via Xcode/App Store Connect.

### Step 4: Test on TestFlight

1. Install build from TestFlight on physical iPhone
2. Run all test cases from above
3. Verify native document viewer works (QuickLook)
4. Verify NO redirect to browser/Safari

---

## ✅ Success Criteria

### Document Upload:
- ✅ PDF uploads successfully
- ✅ Word (.docx) uploads successfully
- ✅ File size shows correctly (not 0 bytes)
- ✅ Console logs show actual blob size

### Document Viewing (iOS/Android):
- ✅ Opens iOS QuickLook viewer (in-app)
- ✅ NO Safari browser
- ✅ NO Supabase URL visible
- ✅ Document displays with content (not empty)
- ✅ Can zoom, scroll, navigate

### Document Viewing (Web):
- ✅ Opens in new tab (acceptable)
- ✅ Document displays or downloads

### Empty File Detection:
- ✅ 0-byte files detected during download
- ✅ User-friendly alert with re-upload suggestion

---

## 📞 Questions or Issues?

If you encounter any issues during testing, check:

1. **Console Logs**: Look for emoji markers (🔄 📥 ✅ ❌)
2. **Supabase Dashboard**: Verify files exist in Storage bucket
3. **Database**: Check `worker_documents` table for file_size values

---

## 🎉 Next Steps After Successful Testing

1. ✅ Confirm document viewer works in Expo Go
2. ✅ Create EAS build for TestFlight
3. ✅ Test on real iOS device via TestFlight
4. ✅ Update CHANGELOG.md with fix details
5. ✅ Delete all old 0-byte documents from Supabase
6. ✅ Notify users to re-upload documents

---

**Last Updated**: 2025-12-29
**Build Version**: 1.1.0 (preparing for Build 19)

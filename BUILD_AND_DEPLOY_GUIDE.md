# Build & Deploy Guide - iOS TestFlight & App Store
**Vera Worker App - Simplified Steps**

---

## ✅ **FINAL READINESS CHECK**

### **All Requirements Met:**
- ✅ Privacy Policy link on login screen
- ✅ Terms of Service link on login screen  
- ✅ Account deletion functionality
- ✅ No sign-up flow (invite-only)
- ✅ "Request Access" with `onboarding@veralink.online`
- ✅ Support email: `support@veralink.online`
- ✅ Environment variables configured (plaintext)
- ✅ Location permissions properly set
- ✅ Encryption declaration: `false`
- ✅ Test account: `reviewer@veralinkcrm.online` ready
- ✅ Job Board UI updated
- ✅ Professional SaaS appearance

**Status: ✅ READY FOR DEPLOYMENT**

---

## 🚀 **SIMPLIFIED BUILD & DEPLOYMENT STEPS**

### **Step 1: Commit Your Changes**

```bash
# Add all changes
git add .

# Commit with descriptive message
git commit -m "App Store compliance: Updated email domains, Job Board UI, Privacy/Terms links, Account deletion"

# Push to GitHub
git push origin testflight-deployment
```

---

### **Step 2: Build for iOS Production**

```bash
# Build iOS production version
eas build --platform ios --profile production --clear-cache
```

**What this does:**
- Creates a production IPA file
- Embeds environment variables
- Auto-increments build number
- Uploads to EAS servers

**Wait time:** ~15-20 minutes

---

### **Step 3: Submit to TestFlight**

Once build completes, submit to TestFlight:

```bash
# Submit to TestFlight (automatic after build)
eas submit --platform ios --profile production
```

**OR** manually:
1. Go to: https://expo.dev/accounts/jennofrie08/projects/VeraWorkerApp/builds
2. Find your latest build
3. Click "Submit to App Store Connect"
4. Follow prompts

---

### **Step 4: Test on TestFlight**

1. **Wait for processing** (~5-10 minutes)
2. **Open TestFlight app** on your iPhone
3. **Install the build**
4. **Test all features:**
   - ✅ Login with test account
   - ✅ Privacy Policy link works
   - ✅ Terms of Service link works
   - ✅ Request Access email opens
   - ✅ Account deletion button works
   - ✅ All screens load correctly

---

### **Step 5: Submit to App Store (After TestFlight Testing)**

**Option A: Automatic Submission (Recommended)**

```bash
# Submit directly to App Store (skips TestFlight)
eas submit --platform ios --profile production --latest
```

**Option B: Manual Submission**

1. Go to **App Store Connect**: https://appstoreconnect.apple.com
2. Click **"My Apps"** → **"VeraWorkerApp"**
3. Click **"App Store"** tab (left sidebar)
4. Click **"+ Version or Platform"** → **"iOS"**
5. Select your build from the dropdown
6. Fill in required fields:
   - **What's New**: "Initial release of Vera Worker App"
   - **Description**: Your app description
   - **Screenshots**: Upload screenshots
   - **Keywords**: NDIS, worker, shift, timesheet
   - **Support URL**: `https://veralinkcrm.online`
   - **Marketing URL**: (optional)
7. **App Review Information**:
   - **Notes**: 
     ```
     Test Account Credentials:
     Email: reviewer@veralinkcrm.online
     Password: [your password]
     
     This account has full access to test all features.
     ```
   - **Contact Information**: `support@veralink.online`
   - **Demo Account**: Same as test account
8. Click **"Submit for Review"**

---

## 📋 **QUICK REFERENCE COMMANDS**

```bash
# 1. Commit changes
git add . && git commit -m "App Store compliance updates" && git push

# 2. Build iOS production
eas build --platform ios --profile production --clear-cache

# 3. Submit to App Store (after build completes)
eas submit --platform ios --profile production --latest
```

---

## ⚠️ **IMPORTANT NOTES**

### **Before Building:**
- ✅ All code changes committed
- ✅ Test locally first (`npm start` or `expo start`)
- ✅ Verify email addresses are correct (`@veralink.online`)

### **During Build:**
- ⏳ Don't close terminal (build runs in background)
- ⏳ Check build status: https://expo.dev/accounts/jennofrie08/projects/VeraWorkerApp/builds
- ⏳ Build will auto-submit to App Store Connect if configured

### **After Build:**
- ✅ Check TestFlight for the new build
- ✅ Test thoroughly before App Store submission
- ✅ Verify all links work (Privacy Policy, Terms, emails)

---

## 🎯 **EXPECTED TIMELINE**

| Step | Time |
|------|------|
| Git commit & push | 1 minute |
| Build iOS production | 15-20 minutes |
| TestFlight processing | 5-10 minutes |
| App Store review | 24-48 hours |

**Total:** ~2-3 days from build to App Store approval

---

## ✅ **FINAL CHECKLIST BEFORE SUBMITTING**

- [ ] All changes committed and pushed
- [ ] Build completed successfully
- [ ] TestFlight build tested
- [ ] Privacy Policy URL accessible: `https://veralinkcrm.online/privacy-policy`
- [ ] Terms of Service URL accessible: `https://veralinkcrm.online/terms-of-service`
- [ ] Test account credentials ready for App Store Connect
- [ ] App Store Connect listing completed
- [ ] Screenshots uploaded
- [ ] Description and keywords filled in

---

## 🎉 **YOU'RE READY!**

Your app is fully compliant and ready for Apple App Store submission!

**Next Command:**
```bash
git add . && git commit -m "App Store compliance: Updated email domains, Job Board UI, Privacy/Terms links, Account deletion" && git push origin testflight-deployment
```

Then run:
```bash
eas build --platform ios --profile production --clear-cache
```

Good luck! 🚀


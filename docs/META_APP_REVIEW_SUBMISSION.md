# Meta App Review Submission Guide

## Overview
This guide will help you prepare and record the screencast required for Meta App Review submission for SHOTHIK AI.

## Pre-Submission Checklist

### ✅ Environment Setup
- [ ] Set `APP_BASE_URL` environment variable to production domain: `https://shothik.ai`
- [ ] Deploy app to production (NOT Replit temporary URLs)
- [ ] Test all endpoints in production environment
- [ ] Verify MongoDB connection is stable
- [ ] Ensure all environment variables are set correctly

### ✅ Meta App Dashboard Configuration

Go to: https://developers.facebook.com/apps/1398789734753536/settings/basic/

**Update the following URLs:**

1. **Site URL**
   - Current: `https://cb45b2b8-7e11-4a49-a10e-565a4a9e0e27-00-38kj9oy95jd2x.pike.replit.dev/`
   - Update to: `https://shothik.ai/`

2. **App Domains**
   - Current: `pike.replit.dev`
   - Update to: `shothik.ai`

3. **Privacy Policy URL**
   - Current: `https://pike.replit.dev/privacy`
   - Update to: `https://shothik.ai/privacy-policy`

4. **Terms of Service URL**
   - Already correct: `https://www.shothik.ai/terms` ✅

5. **Data Deletion Callback URL**
   - Current: `https://cb45b2b8-7e11-4a49-a10e-565a4a9e0e27-00-38kj9oy95jd2x.pike.replit.dev/api/facebook/data-deletion`
   - Update to: `https://shothik.ai/api/facebook/data-deletion`

6. **Data Deletion Instructions URL** (NEW - Add this)
   - Add: `https://shothik.ai/data-deletion`

7. **App Icon**
   - [ ] Upload 1024x1024 pixel PNG image
   - Should feature SHOTHIK AI branding

### ✅ Required Pages to Create

Create the following routes in your Next.js app:

#### 1. Privacy Policy Page (`/privacy-policy`)
See `examples/privacy-policy-template.md` for content

#### 2. Data Deletion Instructions Page (`/data-deletion`)
See `examples/data-deletion-page.md` for content

#### 3. Terms of Service (`/terms`)
Already exists ✅

### ✅ Testing Instructions

**Add to Meta App Dashboard under "Provide testing instructions":**

```
Test Account Credentials:
Email: test@shothik.ai
Password: [Provide secure password]

Test Facebook Account:
Email: [Provide Meta test user email]
Password: [Provide test password]

Testing Flow:
1. Visit https://shothik.ai
2. Sign up or log in with test credentials
3. Click "Connect Facebook Account" button
4. Log in with test Facebook account (if prompted)
5. Review and approve permission requests:
   - ads_management
   - ads_read
   - pages_show_list
   - pages_read_engagement
6. Verify successful connection (redirects to dashboard)
7. Test features:
   - View connected ad accounts
   - Browse campaigns, ad sets, and ads
   - Create a new campaign using AI copy generation
   - Sync data from Facebook
8. Test data deletion:
   - Go to Settings → Account
   - Click "Disconnect Facebook Account"
   - Confirm disconnection
   - Verify data removal

Additional Notes:
- Test user has access to a Meta test ad account with sample campaigns
- All features demonstrated in the screencast are fully functional
- Data deletion can be tested multiple times using the disconnect/reconnect flow
```

---

## Screencast Recording Guide

### Equipment & Software

**Recommended Recording Tools:**
- **OBS Studio** (Free, Windows/Mac/Linux)
- **Loom** (Free tier available, web-based)
- **QuickTime Player** (Mac native)
- **Windows Game Bar** (Windows 10/11)
- **Camtasia** (Paid, professional)

**Recording Settings:**
- Resolution: **1920x1080 (1080p) minimum**
- Frame rate: **30 FPS minimum**
- Format: **MP4 (H.264 codec)**
- File size: **Maximum 500 MB**
- Duration: **8-12 minutes** (aim for 10 minutes)
- Audio: Clear narration (no background music)

### Screencast Structure

#### 1. Introduction (30 seconds)

**Script:**
```
"Hello, I'm demonstrating SHOTHIK AI, a Facebook advertising management platform 
that uses AI to help businesses create and optimize their ad campaigns. 

This app integrates with Facebook's Marketing API to provide:
- Campaign creation and management
- AI-powered ad copy generation  
- Real-time performance analytics
- Multi-account dashboard

Let's walk through the complete user experience and data handling practices."
```

**Show:**
- Homepage at `https://shothik.ai`
- Brief overview of key features
- Navigation bar and main sections

#### 2. User Registration/Login (45 seconds)

**Script:**
```
"Users can sign up for SHOTHIK AI using email or social authentication.
Let me sign in with our test account."
```

**Show:**
- Click "Sign Up" or "Log In"
- Enter test credentials
- Successfully log in
- Land on dashboard or onboarding screen

#### 3. Facebook OAuth Integration (2-3 minutes)

**This is the MOST IMPORTANT section for Meta review!**

**Script:**
```
"To manage Facebook ads, users must connect their Facebook account.
When clicking 'Connect Facebook', we request specific permissions..."
```

**Show:**
- Click "Connect Facebook Account" button
- Facebook OAuth dialog appears
- **Clearly show permission screen** with:
  - `ads_management` - "Manage your ads"
  - `ads_read` - "View your ads data"
  - `pages_show_list` - "View your Facebook Pages"
  - `pages_read_engagement` - "Read engagement data"
- Click "Continue as [Name]"
- Redirect back to SHOTHIK AI
- Show success message: "Facebook account connected"

**Narrate:**
```
"We request these permissions to:
- ads_management: Create and edit ad campaigns on behalf of users
- ads_read: Retrieve campaign performance data and analytics
- pages_show_list: Display available Facebook Pages for ad creation
- pages_read_engagement: Show engagement metrics for page posts

All data is stored securely and only used for ad management purposes."
```

#### 4. Core Features Demonstration (3-4 minutes)

**A. Ad Accounts & Campaigns View**

**Script:**
```
"After connecting, users see their Facebook ad accounts and existing campaigns."
```

**Show:**
- Dashboard with connected ad accounts
- List of campaigns with metrics (impressions, clicks, spend)
- Click into a campaign to see details
- Show ad sets and individual ads
- Display performance charts/graphs

**B. Create New Campaign**

**Script:**
```
"Users can create new campaigns directly from SHOTHIK AI.
Our AI assistant helps generate compelling ad copy."
```

**Show:**
- Click "Create Campaign" button
- Fill out campaign details:
  - Campaign name
  - Objective (e.g., Traffic, Conversions)
  - Budget and schedule
- Select target audience
- **AI Copy Generation:**
  - Click "Generate with AI"
  - Show AI-generated headlines and descriptions
  - Edit and refine copy
- Preview ad
- Click "Publish to Facebook"
- Show success confirmation

**C. Data Sync**

**Script:**
```
"SHOTHIK AI automatically syncs data from Facebook every few hours.
Users can also manually trigger a sync."
```

**Show:**
- Click "Sync Now" button
- Loading indicator
- Updated metrics appear
- Timestamp showing last sync

#### 5. Data Privacy & Transparency (1-2 minutes)

**Script:**
```
"We're committed to data privacy and transparency.
Users can view exactly what data we access and how it's used."
```

**Show:**
- Navigate to Settings or Profile section
- Show "Connected Accounts" page
- Display:
  - Facebook account name and ID (hashed)
  - Connected ad accounts
  - Permissions granted
  - Date connected
  - Last sync timestamp
- Click "View Privacy Policy" → opens `/privacy-policy`
- Highlight key sections:
  - Data we collect from Facebook
  - How we use Facebook data
  - Data retention policy
  - User rights and control

#### 6. Data Deletion - User Options (2-3 minutes)

**THIS IS CRITICAL FOR META REVIEW!**

**Script:**
```
"Users have multiple ways to delete their data.
Let me demonstrate each method."
```

**Option A: Disconnect Facebook Account**

**Show:**
- Go to Settings → Connected Accounts
- Click "Disconnect Facebook"
- Modal appears: "Are you sure? This will:
  - Remove your Facebook connection
  - Delete all synced ad data
  - Revoke access tokens
  - Keep your SHOTHIK AI account (but without Facebook access)"
- Click "Yes, Disconnect"
- Loading spinner
- Success message: "Facebook account disconnected. Your data has been removed."
- Verify: Facebook section now shows "Connect Facebook" button again

**Option B: Delete Entire Account**

**Show:**
- Go to Settings → Account → Delete Account
- Click "Delete My Account"
- Warning modal:
  "This will permanently delete:
  - Your SHOTHIK AI account
  - All Facebook connections
  - All campaign data
  - All settings and preferences
  This action cannot be undone."
- Type confirmation phrase (e.g., "DELETE MY ACCOUNT")
- Click "Permanently Delete"
- Redirected to goodbye page
- Show logged out state

**Option C: Facebook Settings Method**

**Script:**
```
"Users can also delete their data directly from Facebook.com.
Let me show the instructions we provide."
```

**Show:**
- Navigate to `https://shothik.ai/data-deletion`
- Page displays step-by-step instructions:

```
How to Delete Your SHOTHIK AI Data

1. Go to facebook.com and log in
2. Click on your profile picture (top right)
3. Select "Settings & Privacy" → "Settings"
4. In the left sidebar, click "Apps and Websites"
5. Find "SHOTHIK AI" in the list
6. Click "Remove"
7. Confirm removal

What happens next:
- Facebook sends us a deletion request immediately
- We delete your connection and access tokens within 1 minute
- All campaign data is removed within 24 hours
- Analytics logs (anonymized) are retained for 30 days for compliance

For questions, contact: privacy@shothik.ai
```

#### 7. Automated Deletion Webhook (1-2 minutes)

**Script:**
```
"When users remove our app from Facebook, Meta automatically sends 
a deletion request to our webhook endpoint. Let me show how this works."
```

**Show:**
- Open code editor or documentation
- Navigate to webhook implementation:
  - File: `lib/webhooks/data-deletion.ts` (or similar)
  - Endpoint: `/api/facebook/data-deletion`

**Highlight key code sections:**

```typescript
// Webhook receives signed_request from Facebook
POST /api/facebook/data-deletion
{
  "signed_request": "..."
}

// We parse and validate the request
const data = parseSignedRequest(signedRequest);
const userId = data.user_id;

// Delete user data
await deleteUserFacebookData(userId);

// Return confirmation code
return {
  "url": "https://shothik.ai/data-deletion",
  "confirmation_code": "unique-code-123"
}
```

**Narrate:**
```
"Our webhook implementation includes:

1. Idempotency: If we receive the same deletion request within 24 hours,
   we return the cached confirmation code to prevent duplicate processing.

2. Privacy: We log only hashed user IDs, never raw Facebook user IDs.

3. Structured response: We return success status, count of deleted connections,
   and whether data was already deleted.

4. Fault tolerance: Using Promise.allSettled ensures partial failures
   don't crash the entire deletion process.
"
```

**Show:**
- API logs (with sensitive data redacted)
- Example deletion response
- Confirmation that data was removed

#### 8. Data Deletion Timeline (30 seconds)

**Show:**
- Display table on `/data-deletion` page:

| Data Type | Deletion Timing |
|-----------|----------------|
| Access tokens | Immediate (within 1 minute) |
| Facebook account connection | Immediate |
| Campaign metadata | Within 24 hours |
| Ad creative data | Within 24 hours |
| Performance metrics | Within 24 hours |
| Anonymized analytics | 30 days (compliance) |

**Script:**
```
"We provide clear timelines for data deletion. Most data is removed immediately,
with full deletion completed within 24 hours. Anonymized analytics are retained 
for 30 days to meet compliance requirements."
```

#### 9. Privacy Policy Highlights (1 minute)

**Show:**
- Navigate to `https://shothik.ai/privacy-policy`
- Scroll to Facebook-specific sections
- Highlight:
  - "Data We Collect from Facebook"
  - "How We Use Facebook Data"
  - "Data Sharing and Third Parties"
  - "Your Rights and Choices"
  - "Data Retention"
  - "Contact Us: privacy@shothik.ai"

**Script:**
```
"Our privacy policy clearly explains:
- What Facebook data we access
- Why we need each permission
- How data is stored and secured
- User rights including deletion
- How to contact us with privacy concerns"
```

#### 10. Conclusion (30 seconds)

**Script:**
```
"Thank you for reviewing SHOTHIK AI. To summarize:

- We request only the permissions necessary for ad management
- Users have full control over their data
- Multiple deletion options are available
- We respond to Facebook deletion webhooks automatically
- Our privacy practices are transparent and documented

For questions about this submission, contact: privacy@shothik.ai"
```

**Show:**
- Return to homepage
- Show footer with privacy links
- Display contact information

---

## Recording Tips

### Do's:
- ✅ **Speak clearly and slowly** - Meta reviewers may not be native English speakers
- ✅ **Highlight your cursor** - Make it easy to follow
- ✅ **Zoom in on important elements** - Permission dialogs, buttons, etc.
- ✅ **Pause briefly** on important screens - Give reviewers time to read
- ✅ **Use real data** - Show actual campaigns and metrics (test account is fine)
- ✅ **Test everything beforehand** - Do a dry run to ensure smooth recording
- ✅ **Keep a steady pace** - Not too fast, not too slow
- ✅ **Show loading states** - Demonstrates real API integration

### Don'ts:
- ❌ **No background music** - Narration only
- ❌ **Don't rush** - Quality over speed
- ❌ **Avoid long loading screens** - Edit them out if necessary
- ❌ **Don't show sensitive data** - No real user info, passwords, or API keys
- ❌ **No technical jargon** - Keep it user-focused
- ❌ **Don't skip the deletion flow** - This is critical!
- ❌ **Avoid errors or bugs** - Test thoroughly first

### Editing:
- Cut out any mistakes or long pauses
- Speed up slow loading screens (but show they load)
- Add text overlays for important points (optional)
- Ensure video is exactly what you narrated

---

## Export & Upload

### Video Export Settings:
```
Format: MP4
Codec: H.264
Resolution: 1920x1080 (1080p)
Frame Rate: 30 FPS
Bitrate: 5-10 Mbps
Audio: AAC, 128-192 kbps
File Size: Under 500 MB
```

### Upload Options:

**Option 1: Unlisted YouTube Video**
1. Upload to YouTube
2. Set visibility to "Unlisted"
3. Copy shareable link
4. Paste into Meta app review submission

**Option 2: Direct Upload to Meta**
1. Go to App Review section in Meta Dashboard
2. Click "Add Screencast"
3. Upload MP4 file directly

**Option 3: Cloud Storage**
1. Upload to Google Drive or Dropbox
2. Set sharing to "Anyone with the link can view"
3. Get shareable link
4. Provide link in submission

---

## Meta Dashboard Submission Steps

### 1. Request Advanced Permissions

**Navigate to:** App Review → Permissions and Features

**Request:**
- ✅ `ads_management`
- ✅ `ads_read`
- ✅ `pages_show_list`
- ✅ `pages_read_engagement`

### 2. For Each Permission, Provide:

**Screencast Video URL:**
- Link to your uploaded video
- Ensure it's accessible without login

**Detailed Description:**
```
ads_management:
"We use this permission to create, edit, and manage Facebook ad campaigns 
on behalf of our users through the SHOTHIK AI platform. Users can create 
new campaigns, modify budgets, update targeting, and pause/resume ads 
directly from our interface. This is the core functionality of our app."

ads_read:
"We use this permission to retrieve and display campaign performance data 
including impressions, clicks, conversions, and spend. Users can view 
analytics dashboards, track ROI, and make data-driven decisions about 
their advertising strategy."

pages_show_list:
"We use this permission to display the user's Facebook Pages in a dropdown 
menu during ad creation. This allows users to select which page should 
be associated with their ad campaigns."

pages_read_engagement:
"We use this permission to show engagement metrics (likes, comments, shares) 
for posts made from the user's Facebook Pages. This helps users understand 
which content resonates with their audience."
```

**Privacy Policy URL:**
- `https://shothik.ai/privacy-policy`

**Data Deletion Instructions URL:**
- `https://shothik.ai/data-deletion`

### 3. Submit for Review

- Double-check all information
- Click "Submit for Review"
- Monitor your email for Meta's response

---

## Post-Submission

### Expected Timeline:
- **Response time:** 3-5 business days
- **Approval:** App moves to Live mode with advanced permissions
- **Rejection:** Meta provides specific feedback on what to fix

### If Rejected:
1. Read rejection feedback carefully
2. Address all issues mentioned
3. Update your app and documentation
4. Re-record screencast if needed
5. Resubmit with explanation of changes made

### If Approved:
1. Switch app to Live mode (if not automatic)
2. Update production environment
3. Begin onboarding real users
4. Monitor webhook logs for deletion requests
5. Respond to privacy@shothik.ai inquiries promptly

---

## Checklist Before Recording

- [ ] Production domain is live at `https://shothik.ai`
- [ ] All pages are accessible:
  - [ ] Homepage
  - [ ] Privacy Policy (`/privacy-policy`)
  - [ ] Terms of Service (`/terms`)
  - [ ] Data Deletion Instructions (`/data-deletion`)
- [ ] Meta App Dashboard URLs are updated to production
- [ ] Test account is created and working
- [ ] Test Facebook account has access to test ad account
- [ ] OAuth flow works correctly in production
- [ ] Data deletion works via all three methods
- [ ] Webhook endpoint responds correctly
- [ ] App icon is uploaded (1024x1024 PNG)
- [ ] Testing instructions are added to Meta Dashboard
- [ ] Screen recording software is tested
- [ ] Microphone audio quality is good
- [ ] Browser is clean (no dev tools, extensions visible)

---

## Support

For questions about this submission process:
- **Email:** privacy@shothik.ai
- **Documentation:** See `/docs` folder in this repository

---

Good luck with your Meta App Review submission! 🚀

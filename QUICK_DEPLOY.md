# 🚀 Quick Deployment Guide

## ✅ Your Deployment Package is Ready!

The `dist/` folder now contains **everything** you need to deploy to cPanel.

### 📦 What's in the dist/ folder:

```
dist/
├── app.js                 ← Entry point for Node.js
├── index.js               ← Built server code
├── package.json           ← Production dependencies only
├── data.json              ← Database file
├── .htaccess              ← Apache routing config
├── web.config             ← IIS routing config (alternative)
├── index.html             ← Frontend entry point
├── favicon.png            ← Site icon
├── pdf.worker.min.js      ← PDF library worker
├── assets/                ← CSS, JS bundles
├── uploads/               ← User uploaded files
├── pdfs/                  ← Generated PDFs
└── README.md              ← Deployment instructions
```

## 🎯 Deployment Steps

### 1. Install Dependencies (in dist folder)
```bash
cd dist
npm install --production
```

### 2. Upload to cPanel
Upload the **entire dist/ folder** to your cPanel server (e.g., `/home/username/public_html/`)

### 3. Configure Node.js App in cPanel
1. Go to **"Setup Node.js App"**
2. Click **"Create Application"** (or edit existing)
3. Set:
   - **Application startup file**: `app.js`
   - **Application root**: `/home/username/public_html/dist`
   - **Node.js version**: 18.x or higher
   - **Application mode**: Production
   - **Environment variable**: `NODE_ENV` = `production`

### 4. Restart the Application
Click **"Restart"** in cPanel's Node.js App interface

### 5. Test
Visit `https://dmsprototype.cybaemtech.app:94/` and try logging in!

## 🔧 Troubleshooting

### Still getting 404 on /api/login?

**✓ Check Node.js app status**
- In cPanel "Setup Node.js App", verify it shows "Running"
- If not, click "Start" or "Restart"

**✓ Check the logs**
- View Passenger log file (path shown in Node.js App config)
- Look for startup errors

**✓ Verify file paths**
- Ensure `app.js` is in the application root
- Ensure `index.js` exists alongside `app.js`

**✓ Check dependencies**
```bash
cd /home/username/public_html/dist
npm install --production
```

### Application won't start?

**✓ Node.js version**
- Must be 18.x or higher
- Update in cPanel if needed

**✓ Check for errors**
- View Passenger log file
- Common issues: missing dependencies, wrong paths

## 📝 Notes

- **Do NOT upload node_modules/** - Run `npm install` on the server instead
- **Keep uploads/ and pdfs/** - These contain user data
- **data.json** - Your database file (if using JSON storage)
- **The dist/ folder is self-contained** - Everything needed is inside

## ✨ Success Checklist

After deployment, verify:
- [ ] Node.js app shows "Running" in cPanel
- [ ] Login page loads at your URL
- [ ] Login works (no 404 error on /api/login)
- [ ] Dashboard loads after login
- [ ] Documents can be created/viewed

---

**Need help?** Check DEPLOYMENT.md in the project root for detailed instructions.

# cPanel Deployment Instructions

## Prerequisites
1. Node.js must be enabled in cPanel
2. Access to "Setup Node.js App" in cPanel

## Deployment Steps

### 1. Build the Project Locally
```bash
npm run build
```

This creates:
- `dist/public/` - Frontend static files (HTML, CSS, JS)
- `dist/index.js` - Backend server bundle

### 2. Upload Files to cPanel
Upload the following to your cPanel account (e.g., to `public_html` or a subdirectory):
- `dist/` folder (entire folder)
- `app.js` (entry point)
- `package.json`
- `node_modules/` (or run `npm install` on the server)
- `uploads/` folder (if it exists)
- `pdfs/` folder (if it exists)
- Any database files

### 3. Configure Node.js App in cPanel

1. Go to **"Setup Node.js App"** in cPanel
2. Click **"Create Application"**
3. Configure:
   - **Node.js version**: Select latest available (18.x or higher)
   - **Application mode**: Production
   - **Application root**: Path where you uploaded files (e.g., `/home/username/public_html`)
   - **Application URL**: Your domain (e.g., `dmsprototype.cybaemtech.app`)
   - **Application startup file**: `app.js`
   - **Passenger log file**: Leave default or specify custom path

4. Click **"Create"**

### 4. Set Environment Variables
In the Node.js App configuration, add:
- `PORT`: The port assigned by cPanel (usually auto-configured)
- `NODE_ENV`: `production`

### 5. Install Dependencies (if not uploaded)
If you didn't upload `node_modules/`, run in the cPanel terminal:
```bash
cd /home/username/public_html
npm install --production
```

### 6. Start/Restart the Application
Click **"Restart"** in the Node.js App interface

### 7. Verify
Visit your application URL. The API should now work at `/api/login`

## Troubleshooting

### API Still Returns 404
- **Check if Node.js app is running**: In cPanel, verify the app status shows "Running"
- **Check logs**: View the Passenger log file specified in the Node.js App config
- **Verify port**: Ensure the app is listening on the correct port (cPanel assigns this)
- **Check file permissions**: Ensure uploaded files have correct permissions (644 for files, 755 for directories)

### Application Won't Start
- **Check Node.js version**: Ensure it's compatible (18.x or higher)
- **Check dependencies**: Run `npm install` on the server
- **Check startup file**: Verify `app.js` exists and is specified correctly
- **Check logs**: Look for errors in the Passenger log

### Static Files Not Loading
- **Verify build output**: Ensure `dist/public/` contains index.html and assets
- **Check Application root**: Must point to the directory containing `dist/`
- **Check .htaccess**: Should be in `dist/public/` (copied from `client/public/`)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

console.log('📦 Preparing deployment package...\n');

// Function to copy file
function copyFile(src, dest) {
    try {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
        console.log(`✓ Copied: ${path.basename(src)}`);
    } catch (error) {
        console.error(`✗ Failed to copy ${src}:`, error.message);
    }
}

// Function to copy directory recursively
function copyDirectory(src, dest) {
    try {
        if (!fs.existsSync(src)) {
            console.log(`⚠ Skipped: ${path.basename(src)} (not found)`);
            return;
        }

        fs.mkdirSync(dest, { recursive: true });
        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                copyDirectory(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
        console.log(`✓ Copied directory: ${path.basename(src)}/`);
    } catch (error) {
        console.error(`✗ Failed to copy directory ${src}:`, error.message);
    }
}

// 1. Copy app.js (entry point)
copyFile(
    path.join(rootDir, 'app.js'),
    path.join(distDir, 'app.js')
);

// 2. Copy package.json (for production dependencies)
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const productionPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    type: packageJson.type,
    license: packageJson.license,
    scripts: {
        start: packageJson.scripts.start
    },
    dependencies: packageJson.dependencies
};

fs.writeFileSync(
    path.join(distDir, 'package.json'),
    JSON.stringify(productionPackageJson, null, 2)
);
console.log('✓ Created: package.json (production only)');

// 3. Copy uploads folder (if exists)
copyDirectory(
    path.join(rootDir, 'uploads'),
    path.join(distDir, 'uploads')
);

// 4. Copy pdfs folder (if exists)
copyDirectory(
    path.join(rootDir, 'pdfs'),
    path.join(distDir, 'pdfs')
);

// 5. Copy database file (if exists)
const dbFile = path.join(rootDir, 'data.json');
if (fs.existsSync(dbFile)) {
    copyFile(dbFile, path.join(distDir, 'data.json'));
}

// 6. Create .gitignore for dist
const gitignoreContent = `node_modules/
*.log
.env
`;
fs.writeFileSync(path.join(distDir, '.gitignore'), gitignoreContent);
console.log('✓ Created: .gitignore');

// 7. Create deployment README
const readmeContent = `# Deployment Package

This folder contains everything needed to deploy to cPanel.

## Files Included:
- \`app.js\` - Entry point for Node.js
- \`index.js\` - Built server code
- \`public/\` - Frontend static files
- \`package.json\` - Production dependencies only
- \`uploads/\` - User uploaded files (if any)
- \`pdfs/\` - Generated PDFs (if any)
- \`data.json\` - Database file (if using JSON storage)

## Deployment Steps:

1. **Upload this entire folder** to your cPanel server

2. **In cPanel "Setup Node.js App":**
   - Application startup file: \`app.js\`
   - Node.js version: 18.x or higher
   - Application mode: Production
   - Environment variable: \`NODE_ENV=production\`

3. **Install dependencies** (in cPanel terminal):
   \`\`\`bash
   cd /path/to/this/folder
   npm install --production
   \`\`\`

4. **Restart the application** in cPanel

5. **Test** by visiting your URL and trying to login

## Troubleshooting:
- Check Node.js app status in cPanel (should show "Running")
- View Passenger log file for errors
- Ensure all files uploaded correctly
- Verify Node.js version is 18.x or higher

For detailed instructions, see DEPLOYMENT.md in the project root.
`;
fs.writeFileSync(path.join(distDir, 'README.md'), readmeContent);
console.log('✓ Created: README.md');

console.log('\n✅ Deployment package ready in dist/ folder');
console.log('\n📋 Next steps:');
console.log('1. Run: npm install --production (in dist folder, or on server)');
console.log('2. Upload entire dist/ folder to cPanel');
console.log('3. Configure Node.js App in cPanel with app.js as entry point');
console.log('4. Restart the application\n');

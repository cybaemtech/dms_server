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

// Filter out unused dependencies (Drizzle, Neon, PostgreSQL) and client-only React packages
const serverDeps = {};
const excludeDeps = [
    '@neondatabase/serverless',
    'drizzle-orm',
    'drizzle-zod',
    'connect-pg-simple',
];
for (const [key, value] of Object.entries(packageJson.dependencies || {})) {
    if (!excludeDeps.includes(key)) {
        serverDeps[key] = value;
    }
}

const productionPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    type: packageJson.type,
    license: packageJson.license,
    scripts: {
        start: "node app.js"
    },
    dependencies: serverDeps
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

// 5. Copy .env file (SQL Server config)
const envFile = path.join(rootDir, '.env');
if (fs.existsSync(envFile)) {
    copyFile(envFile, path.join(distDir, '.env'));
}

// 6. Create web.config for IIS reverse proxy
const webConfigContent = `<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxyToNode" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:5000/{R:1}" />
        </rule>
      </rules>
    </rewrite>
    <httpErrors existingResponse="PassThrough" />
    <security>
      <requestFiltering>
        <requestLimits maxAllowedContentLength="52428800" />
      </requestFiltering>
    </security>
  </system.webServer>
</configuration>`;
fs.writeFileSync(path.join(distDir, 'web.config'), webConfigContent);
console.log('✓ Created: web.config (IIS reverse proxy)');

// 7. Create .gitignore for dist
const gitignoreContent = `node_modules/
*.log
.env
`;
fs.writeFileSync(path.join(distDir, '.gitignore'), gitignoreContent);
console.log('✓ Created: .gitignore');

// 8. Create deployment README
const readmeContent = `# DMS Deployment Package (IIS + SQL Server)

## Files Included:
- \`app.js\` - Entry point for Node.js
- \`index.js\` - Built server code
- \`public/\` - Frontend static files
- \`package.json\` - Production dependencies only
- \`web.config\` - IIS reverse proxy configuration
- \`.env\` - SQL Server connection settings
- \`uploads/\` - User uploaded files (if any)
- \`pdfs/\` - Generated PDFs (if any)

## IIS Deployment Steps:

1. **Create DMS database in SQL Server** - Run scripts/create-tables.sql

2. **Install dependencies** in the dist folder:
   \`\`\`
   cd dist
   npm install --production
   \`\`\`

3. **Configure .env** with your SQL Server connection settings

4. **Start the Node.js server**:
   \`\`\`
   node app.js
   \`\`\`

5. **Configure IIS**:
   - Point the IIS site physical path to this dist folder
   - Ensure URL Rewrite and ARR modules are installed
   - Enable ARR proxy in IIS Server level

6. **Test** by visiting your IIS URL
`;
fs.writeFileSync(path.join(distDir, 'README.md'), readmeContent);
console.log('✓ Created: README.md');

console.log('\n✅ Deployment package ready in dist/ folder');
console.log('\n📋 Next steps:');
console.log('1. Run SQL script: scripts/create-tables.sql on SQL Server');
console.log('2. Run: npm install --production (in dist folder)');
console.log('3. Configure .env with SQL Server credentials');
console.log('4. Start: node app.js');
console.log('5. Point IIS site to dist/ folder\n');

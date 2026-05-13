
const path = require('path');
const fs = require('fs');

console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);

const baseDir = process.cwd();
const uploadsDir = path.join(baseDir, "uploads");
console.log('Uploads directory:', uploadsDir);

if (fs.existsSync(uploadsDir)) {
    console.log('Uploads directory exists.');
    const files = fs.readdirSync(uploadsDir);
    console.log(`Found ${files.length} files in uploads:`);
    files.forEach(f => console.log(' - ' + f));
} else {
    console.log('Uploads directory NOT found at ' + uploadsDir);
}

// Check common locations
const projectRoot = 'c:\\inetpub\\wwwroot\\dms';
const alternateUploads = path.join(projectRoot, "uploads");
console.log('Checking project root uploads:', alternateUploads);
if (fs.existsSync(alternateUploads)) {
    console.log('Project root uploads directory exists.');
    const files = fs.readdirSync(alternateUploads);
    console.log(`Found ${files.length} files in project root uploads:`);
    files.forEach(f => console.log(' - ' + f));
}


const path = require('path');

function getBaseDir(__dirname) {
  let baseDir = process.cwd();
  if (__dirname.includes('dist')) {
    // Move up from dist/server/services to dist
    let current = __dirname;
    while (current.includes(path.sep + 'dist' + path.sep) || current.endsWith(path.sep + 'dist') || current.endsWith('dist')) {
      if (current.endsWith(path.sep + 'dist') || current.endsWith('dist')) {
        baseDir = current;
        break;
      }
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  } else {
    baseDir = process.cwd();
  }
  return baseDir;
}

const test1 = 'C:\\inetpub\\wwwroot\\dms\\dist\\server\\services';
console.log('Test 1 (Production):', getBaseDir(test1));

const test2 = 'C:\\inetpub\\wwwroot\\dms\\server\\services';
console.log('Test 2 (Development):', getBaseDir(test2));

const test3 = 'C:\\inetpub\\wwwroot\\dms\\dist'; // Edge case if running from dist directly
console.log('Test 3 (Dist Root):', getBaseDir(test3));

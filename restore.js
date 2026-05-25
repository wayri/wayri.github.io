const fs = require('fs');
let arch = fs.readFileSync('_archive/pong.html', 'utf8');
let current = fs.readFileSync('pong.html', 'utf8');
const origMatch = arch.match(/const payload = \"([^\"]+)\";/);
const currMatch = current.match(/const payload = \"([^\"]+)\";/);
current = current.replace(currMatch[1], origMatch[1]);
fs.writeFileSync('pong.html', current);
console.log('Restored original payload.');

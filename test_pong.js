const fs = require('fs');
let content = fs.readFileSync('pong.html', 'utf8');
const match = content.match(/const payload = \"([^\"]+)\";/);
const decoded = atob(match[1]);
const key = 'PHYSICAL_LAYER_199X';
let s = '';
for(let i=0;i<decoded.length;i++) s += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i%key.length));
console.log(s.substring(0, 100));

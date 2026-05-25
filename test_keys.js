const fs = require('fs');
let content = fs.readFileSync('_archive/pong.html', 'utf8');
const match = content.match(/const payload = \"([^\"]+)\";/);
const decoded = atob(match[1]);
const keys = ['PHYSICAL_LAYER_199X', 'PHYSICAL_LAYER_1990s', 'PHYSICAL_LAYER_1990', 'PHYSICAL_LAYER_1990S'];
for(const key of keys) {
    let s = '';
    for(let i=0;i<decoded.length;i++) s += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i%key.length));
    console.log(key + ': ' + s.substring(0, 40).replace(/\n/g, '\\n'));
}

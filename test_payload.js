const fs = require('fs');
const content = fs.readFileSync('pong.html', 'utf8');
const match = content.match(/const payload = \"([^\"]+)\";/);
if (match) {
    const decoded = atob(match[1]);
    const keys = ['PHYSICAL_LAYER_1990s', 'PHYSICAL_LAYER_1990', 'PHYSICAL_LAYER_90S', 'PHYSICAL_LAYER_90s', 'PHYSICAL_LAYER_1990S', '1990S', '1990s'];
    for(const key of keys) {
        let s = '';
        for(let i=0;i<decoded.length;i++) s += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i%key.length));
        if(s.includes('const canvas') && s.includes('getElementById')) {
            console.log('KEY FOUND: ' + key);
        }
    }
}

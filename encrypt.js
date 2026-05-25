const fs = require('fs');
let content = fs.readFileSync('pong.html', 'utf8');
const match = content.match(/const payload = \"([^\"]+)\";/);
if (match) {
    const decoded = atob(match[1]);
    const key1 = 'PHYSICAL_LAYER_1990';
    let s = '';
    for(let i=0;i<decoded.length;i++) s += String.fromCharCode(decoded.charCodeAt(i) ^ key1.charCodeAt(i%key1.length));
    
    const key2 = 'PHYSICAL_LAYER_199X';
    let s2 = '';
    for(let i=0;i<s.length;i++) s2 += String.fromCharCode(s.charCodeAt(i) ^ key2.charCodeAt(i%key2.length));
    
    const newPayload = btoa(s2);
    content = content.replace(match[1], newPayload);
    fs.writeFileSync('pong.html', content, 'utf8');
    console.log('Re-encrypted payload with new key.');
}

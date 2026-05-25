const fs = require('fs');
let s = fs.readFileSync('payload.js', 'utf8');

s = s.replace(/ctx\.fillStyle = '#0a0a0a';/g, "ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim() || '#0a0a0a';");
s = s.replace(/ctx\.fillStyle = '#D4AF37';/g, "ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#D4AF37';");

fs.writeFileSync('payload.js', s);

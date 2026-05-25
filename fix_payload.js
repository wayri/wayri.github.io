const fs = require('fs');

let s = fs.readFileSync('payload_test.js', 'utf8');

s = s.replace(/ctx\.fillStyle = getComputedStyle\(document\.documentElement\)\.getPropertyValue\('--bg-color'\)\.trim\(\) \|\| '#0a0a0a';/g, "ctx.fillStyle = bgColor;");
s = s.replace(/ctx\.fillStyle = getComputedStyle\(document\.documentElement\)\.getPropertyValue\('--accent-color'\)\.trim\(\) \|\| '#D4AF37';/g, "ctx.fillStyle = accentColor;");

s = "const docStyle = getComputedStyle(document.documentElement);\nconst bgColor = docStyle.getPropertyValue('--bg-color').trim() || '#0a0a0a';\nconst accentColor = docStyle.getPropertyValue('--accent-color').trim() || '#D4AF37';\n" + s;

fs.writeFileSync('payload_fixed.js', s);

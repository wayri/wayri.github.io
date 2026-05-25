const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/\r\n/g, '\n');
    fs.writeFileSync(file, content);
}
console.log('Converted HTML files to LF');

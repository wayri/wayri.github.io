const fs = require('fs');
let s = fs.readFileSync('assets/js/tools_expansion.js', 'utf8');
if (!s.includes('updatePVFromInputs')) {
    s += '\nwindow.updatePVFromInputs = function() {\n  let lat = parseFloat(document.getElementById("pv-lat").value) || 0;\n  let lng = parseFloat(document.getElementById("pv-lng").value) || 0;\n  _solarLat = lat;\n  _solarLon = lng;\n  if (window.calculateSolarMath) window.calculateSolarMath();\n};\n';
    fs.writeFileSync('assets/js/tools_expansion.js', s);
}

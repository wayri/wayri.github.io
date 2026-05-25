const fs = require('fs');

let s = fs.readFileSync('assets/js/tools_expansion.js', 'utf8');

const newFilterCode = `  function setupFilterMode() {
      const type = document.getElementById('filter-type')?.value;
      const solveGroup = document.getElementById('filter-solve-group');
      const inputs = document.getElementById('filter-inputs');
      if(!solveGroup || !inputs) return;
  
      solveGroup.innerHTML = \`
          <span>SOLVE:</span>
          <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="filter_solve" value="r1" onchange="runSmartFilter()"> \${type==='rc'||type==='rl' ? 'R1' : 'L1'}</label>
          <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="filter_solve" value="c1" onchange="runSmartFilter()"> \${type==='rl' ? 'L1' : 'C1'}</label>
          <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="filter_solve" value="fc" checked onchange="runSmartFilter()"> Fc (Hz)</label>
      \`;
  
      let label1 = 'R1 (Ω)';
      let label2 = 'C1 (uF)';
      if (type === 'rl') { label1 = 'R1 (Ω)'; label2 = 'L1 (uH)'; }
      else if (type === 'lc' || type === 'lcl' || type === 'clc') { label1 = 'L1 (uH)'; label2 = 'C1 (uF)'; }

      let extra = '';
      if(type === 'lcl') {
          extra = \`
          <div class="flex justify-between items-center text-xs">
              <label class="w-20">L2 (uH)</label>
              <input type="number" id="filter-c2" value="10" class="w-32 border border-themeBorder px-2 py-1 text-right bg-transparent" oninput="runSmartFilter()">
          </div>\`;
      } else if (type === 'clc') {
          extra = \`
          <div class="flex justify-between items-center text-xs">
              <label class="w-20">C2 (uF)</label>
              <input type="number" id="filter-c2" value="10" class="w-32 border border-themeBorder px-2 py-1 text-right bg-transparent" oninput="runSmartFilter()">
          </div>\`;
      }
  
      inputs.innerHTML = \`
          <div class="flex justify-between items-center text-xs">
              <label class="w-20">\${label1}</label>
              <div class="flex flex-col items-end w-32">
                  <input type="number" id="filter-r1" value="1000" class="w-full border border-themeBorder px-2 py-1 text-right bg-transparent" oninput="runSmartFilter()">
                  <span id="sug-filter-r1" class="text-[9px] text-themeAccent cursor-pointer hover:underline mt-0.5 opacity-0 h-0 transition-opacity whitespace-nowrap" onclick="applyVal('filter-r1', this.dataset.val); runSmartFilter();"></span>
              </div>
          </div>
          <div class="flex justify-between items-center text-xs">
              <label class="w-20">\${label2}</label>
              <div class="flex flex-col items-end w-32">
                  <input type="number" id="filter-c1" value="0.1" class="w-full border border-themeBorder px-2 py-1 text-right bg-transparent" oninput="runSmartFilter()">
                  <span id="sug-filter-c1" class="text-[9px] text-themeAccent cursor-pointer hover:underline mt-0.5 opacity-0 h-0 transition-opacity whitespace-nowrap" onclick="applyVal('filter-c1', this.dataset.val); runSmartFilter();"></span>
              </div>
          </div>
          \${extra}
      \`;
      runSmartFilter();
  }
  
  function runSmartFilter() {
      const type = document.getElementById('filter-type')?.value;
      const solveTarget = document.querySelector('input[name="filter_solve"]:checked')?.value || 'fc';
      
      document.querySelectorAll('#filter-inputs input, #calc-filter-fc').forEach(el => el.classList.remove('bg-themeAccent/20', 'font-bold'));
      const targetEl = solveTarget === 'r1' ? 'filter-r1' : solveTarget === 'c1' ? 'filter-c1' : 'calc-filter-fc';
      if(document.getElementById(targetEl)) document.getElementById(targetEl).classList.add('bg-themeAccent/20', 'font-bold');
  
      let r1 = parseFloat(document.getElementById('filter-r1')?.value); // R or L1
      let c1 = parseFloat(document.getElementById('filter-c1')?.value); // C1 or L1 for RL
      let fc = parseFloat(document.getElementById('calc-filter-fc')?.value);
  
      if(solveTarget === 'r1' && c1 && fc) {
          if(type==='rc') r1 = 1 / (2 * Math.PI * (c1*1e-6) * fc);
          else if(type==='rl') r1 = 2 * Math.PI * fc * (c1*1e-6); // Here c1 is actually L1
          else if(type==='lc' || type==='lcl' || type==='clc') r1 = 1 / (4 * Math.PI * Math.PI * fc * fc * (c1*1e-6)) * 1e6; // uH
          document.getElementById('filter-r1').value = isNaN(r1) ? '' : r1.toFixed(2);
      } else if(solveTarget === 'c1' && r1 && fc) {
          if(type==='rc') c1 = 1 / (2 * Math.PI * r1 * fc) * 1e6;
          else if(type==='rl') c1 = r1 / (2 * Math.PI * fc) * 1e6; // Here c1 is L1
          else if(type==='lc' || type==='lcl' || type==='clc') c1 = 1 / (4 * Math.PI * Math.PI * fc * fc * (r1*1e-6)) * 1e6; // uF
          document.getElementById('filter-c1').value = isNaN(c1) ? '' : c1.toFixed(3);
      } else if(solveTarget === 'fc' && r1 && c1) {
          if(type==='rc') fc = 1 / (2 * Math.PI * r1 * (c1*1e-6));
          else if(type==='rl') fc = r1 / (2 * Math.PI * (c1*1e-6));
          else if(type==='lc' || type==='lcl' || type==='clc') fc = 1 / (2 * Math.PI * Math.sqrt((r1*1e-6) * (c1*1e-6)));
          document.getElementById('calc-filter-fc').value = isNaN(fc) ? '' : fc.toFixed(2);
      }
      
      // Update E24 recommendations
      if (typeof getClosestE24 === 'function') {
          if (solveTarget === 'r1') {
              let rec = getClosestE24(parseFloat(document.getElementById('filter-r1').value));
              let sug = document.getElementById('sug-filter-r1');
              if(sug) { sug.textContent = 'E24: ' + formatResistor(rec); sug.dataset.val = rec; sug.classList.remove('opacity-0','h-0'); sug.classList.add('h-auto'); }
          } else {
              let sug = document.getElementById('sug-filter-r1');
              if(sug) { sug.classList.add('opacity-0','h-0'); sug.classList.remove('h-auto'); }
          }
      }
  }`;

s = s.replace(/function setupFilterMode\(\) \{[\s\S]*?\}\s+function runSmartFilter\(\) \{[\s\S]*?document\.getElementById\('calc-filter-fc'\)\.value = isNaN\(fc\) \? '' : fc\.toFixed\(2\);\n      \}\n  \}/, newFilterCode);

fs.writeFileSync('assets/js/tools_expansion.js', s);

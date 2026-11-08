(function (host) {
    'use strict';
    function mount(root) {
        if (!root || root.dataset.batteryMounted) return;
        root.dataset.batteryMounted = 'true';
        const $ = id => root.querySelector('#ba-' + id);
        let catalog = {profiles:[],temperatureReferences:[]}, dischargeReferences = [], selected = null, curveReference = null, curveFitState = 'none', temperatureReference = null, result = null, lastConfig = null;
        const units = {voltage:'V',current:'A',soc:'%',referenceSoc:'%',temperatureC:'°C',outputPowerW:'W',lossPowerW:'W'};
        const titles = {voltage:'Pack terminal voltage',current:'Pack current',soc:'Accessible state of charge',referenceSoc:'Reference state of charge',temperatureC:'Battery temperature',outputPowerW:'Useful load power',lossPowerW:'Internal resistive loss'};
        const reasons = {cutoff_voltage:'Terminal-voltage cutoff',reserve_soc:'Accessible SOC reserve',capacity_depleted:'Reference charge depleted',temperature_capacity_limit:'Temperature-limited accessible charge',power_limit:'Requested power cannot be supplied',load_limit:'Current/load constraint reached',time_limit:'Calculation horizon reached',step_limit:'Integration step limit reached'};
        const fmt = (v, unit='') => Number.isFinite(v) ? `${Number(v.toPrecision(5))}${unit ? ' '+unit : ''}` : '—';
        const conditionText = c => [Number.isFinite(c.currentA)?'test current '+fmt(c.currentA<1?c.currentA*1000:c.currentA,c.currentA<1?'mA':'A'):null,Number.isFinite(c.cutoffV)?'cutoff '+fmt(c.cutoffV,'V'):null,Number.isFinite(c.tempC??c.referenceTempC)?'temperature '+fmt(c.tempC??c.referenceTempC,'°C'):null,c.mode||c.loadMode||c.loadType,Number.isFinite(c.rateHours)?fmt(c.rateHours,'hour rate'):null].filter(Boolean).join(' · ')||'Test conditions not transcribed; consult the source.';
        const uncertaintyText = u => !u?'Not quantified.':typeof u==='string'?u:[Number.isFinite(u.voltageV)?'±'+fmt(u.voltageV,'V'):null,Number.isFinite(u.dischargedAh)?'±'+fmt(u.dischargedAh,'Ah'):null,Number.isFinite(u.capacityAh)?'±'+fmt(u.capacityAh,'Ah'):null,u.basis].filter(Boolean).join('; ')||'See the source record for reading limits.';
        const number = id => {const s=$(id).value.trim();if(s==='') throw new Error('Fill in '+id.replace(/-/g,' ')+'.');const v=Number(s);if(!Number.isFinite(v)) throw new Error(id+' must be finite.');return v;};
        const rows = text => text.split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#')).map(s=>s.split(',').map(c=>c.trim()));
        function numericTable(id,count) {return rows($(id).value).map((r,i)=>{if(r.length!==count||r.some(s=>s==='')||!r.every(s=>Number.isFinite(Number(s)))) throw new Error(`${id}: row ${i+1} needs ${count} finite numbers.`);return r.map(Number);});}
        function config() {
            const health=number('health'); if(health<=0||health>100) throw new Error('Capacity SOH must be >0 and ≤100%.');
            const schedule=rows($('loads').value).map((r,i)=>{if(r.length<3||r.length>4||r.slice(0,3).some(s=>s==='')) throw new Error(`Load row ${i+1}: seconds,type,value[,temperature].`); const segment={durationSeconds:Number(r[0]),type:r[1].toLowerCase(),value:Number(r[2])};if(r[3]!==undefined&&r[3]!=='') segment.tempC=Number(r[3]);return segment;});
            const p={capacityAh:number('capacity')*health/100,resistanceOhm:number('resistance'),cutoffVoltage:number('cutoff'),series:number('series'),parallel:number('parallel'),initialSoc:number('soc')/100,reserveSoc:number('reserve')/100,efficiency:number('efficiency')/100,selfDischargePerDay:number('self')/100,temperatureC:number('temperature'),maxTimeSeconds:number('horizon')*3600,timeStepSeconds:number('step'),maxSteps:100000,maxPoints:1600,schedule,
                ocvCurve:numericTable('ocv',2).map(([soc,voltage])=>({soc:soc/100,voltage})),temperatureCurve:numericTable('temp-curve',3).map(([tempC,capacityFactor,resistanceFactor])=>({tempC,capacityFactor,resistanceFactor}))};
            if($('max-current').value.trim()!=='') p.maxCurrentA=number('max-current');
            return p;
        }
        function clearResult() {result=null;lastConfig=null;$('summary').textContent='Model changed. Calculate again to see the result.';$('plot').replaceChildren();$('cursor').textContent='';$('export').disabled=true;$('csv').disabled=true;}
        function run() {
            $('error').textContent='';
            try {
                lastConfig=config(); result=host.BatteryAnalysis.simulate(lastConfig);
                const prefix=result.runtimeIsLowerBound ? 'At least ' : '';
                const service=result.elapsedSeconds===0 ? 'Load was not served at the initial state.' : reasons[result.stopReason]+'.';
                $('summary').innerHTML=`<strong>${prefix}${fmt(result.elapsedSeconds/3600,'hours')}</strong><p>${service}${result.runtimeIsLowerBound ? ' Full runtime remains undetermined; increase the horizon or review the step budget.' : ''}</p><div class="battery-metrics"><div><strong>${fmt(result.deliveredWh,'Wh')}</strong><span>Useful energy delivered</span></div><div><strong>${fmt(result.minVoltage,'V')}</strong><span>Minimum pack voltage</span></div><div><strong>${fmt(result.averageVoltage,'V')}</strong><span>Time-average pack voltage</span></div><div><strong>${fmt(result.internalLossWh,'Wh')}</strong><span>Internal I²R loss</span></div><div><strong>${fmt(result.remainingReferenceAh,'Ah')}</strong><span>Reference charge retained</span></div><div><strong>${fmt(result.selfDischargeAh,'Ah')}</strong><span>Modeled self-discharge</span></div></div><p>${result.steps.toLocaleString()} integration steps. ${result.modelLimitations}</p>`;
                $('export').disabled=false;$('csv').disabled=false;plot();
            } catch(error) {clearResult();$('error').textContent=error.message;}
        }
        function plot() {
            if(!result) return;
            const key=$('channel').value, scale=key==='soc'||key==='referenceSoc'?100:1;
            const points=result.points, width=800,height=300,left=67,right=18,top=28,bottom=48;
            const xmax=Math.max(1e-9,result.elapsedSeconds/3600), values=points.map(p=>p[key]*scale);
            let low=Math.min(...values),high=Math.max(...values);if(high===low){const d=Math.max(.1,Math.abs(low)*.05);low-=d;high+=d;}
            const px=t=>left+(width-left-right)*t/3600/xmax, py=y=>height-bottom-(height-top-bottom)*(y-low)/(high-low);
            let svg=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${titles[key]} versus elapsed hours"><title>${titles[key]} / ${units[key]}</title>`;
            for(let i=0;i<=4;i++){const y=low+(high-low)*i/4;svg+=`<path d="M${left},${py(y)}H${width-right}" stroke="currentColor" opacity=".15"/><text x="${left-8}" y="${py(y)+4}" text-anchor="end" font-size="12" fill="currentColor">${fmt(y)}</text>`;const t=xmax*i/4;svg+=`<text x="${px(t*3600)}" y="${height-25}" text-anchor="middle" font-size="12" fill="currentColor">${fmt(t)}</text>`;}
            svg+=`<path d="${points.map((p,i)=>`${i?'L':'M'}${px(p.timeSeconds).toFixed(2)},${py(p[key]*scale).toFixed(2)}`).join(' ')}" fill="none" stroke="var(--accent-color)" stroke-width="2"/><text x="${left}" y="16" font-size="13" fill="currentColor">${titles[key]} / ${units[key]}</text><text x="${width/2}" y="${height-3}" text-anchor="middle" font-size="12" fill="currentColor">Elapsed time / h</text></svg>`;
            $('plot').innerHTML=svg;
            const chart=$('plot').querySelector('svg');
            chart.addEventListener('pointermove',event=>{const box=chart.getBoundingClientRect(),x=(event.clientX-box.left)/box.width*width,t=Math.max(0,Math.min(xmax,(x-left)/(width-left-right)*xmax))*3600;let a=0,b=points.length-1;while(a<b){const mid=Math.floor((a+b)/2);if(points[mid].timeSeconds<t)a=mid+1;else b=mid;}const p=points[a];$('cursor').textContent=`${fmt(p.timeSeconds/3600,'h')} · ${fmt(p.voltage,'V')} · ${fmt(p.current,'A')} · ${fmt(p.soc*100,'% accessible SOC')} · ${fmt(p.temperatureC,'°C')}`;});
        }
        function save(name,text,type) {const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
        function exportModel() {if(!result)return;save('battery-analysis.json',JSON.stringify({schemaVersion:1,modelProvenance:$('provenance').value,modelStatus:$('model-status').textContent,manufacturerReference:selected,loadedCurveStartingPoint:curveReference,curveFitState,temperatureStartingPoint:temperatureReference,config:lastConfig,capacityHealthPercent:number('health'),result},null,2),'application/json');}
        function exportCSV() {if(!result)return;const keys=['timeSeconds','voltage','current','soc','referenceSoc','temperatureC','outputPowerW','packPowerW','lossPowerW'];save('battery-trace.csv',keys.join(',')+'\n'+result.points.map(p=>keys.map(k=>p[k]).join(',')).join('\n'),'text/csv');}
        function options(select,values,first) {select.replaceChildren();const base=document.createElement('option');base.value='';base.textContent=first;select.appendChild(base);for(const value of values){const option=document.createElement('option');option.value=value;option.textContent=value;select.appendChild(option);}}
        function populateProfiles() {
            const previous=$('preset').value;
            const available=catalog.profiles.filter(p=>(!$('brand').value||p.brand===$('brand').value)&&(!$('chemistry').value||p.chemistry===$('chemistry').value)&&(!$('format').value||p.format===$('format').value));
            options($('preset'),[],'Custom / illustrative model');
            for(const p of available){const option=document.createElement('option');option.value=p.id;option.textContent=p.name+(p.rechargeable?' · rechargeable':' · primary');$('preset').appendChild(option);}
            if(available.some(p=>p.id===previous)) $('preset').value=previous;
        }
        function showReference() {
            selected=catalog.profiles.find(p=>p.id===$('preset').value)||null;
            const box=$('reference');box.replaceChildren();
            if(!selected){box.textContent=`Custom model. Catalog: ${catalog.profiles.length} representative entries; not every product, formulation or region.`;return;}
            const p=selected, test=p.capacityTest||{}, line=document.createElement('p');
            line.textContent=`${p.name} · ${p.chemistry} · ${p.format} · ${p.rechargeable?'Rechargeable':'Primary / non-rechargeable'} · nominal ${fmt(p.nominalV,'V')}. Capacity: ${p.capacityAh===null||p.capacityAh===undefined?'not selected from available source':fmt(p.capacityAh,'Ah')+' ('+(p.capacityKind||'published')+')'}.`;
            box.appendChild(line);const conditions=document.createElement('p');conditions.textContent='Rating conditions: '+conditionText(test)+'. '+(p.notes||'');box.appendChild(conditions);
            for(const source of p.sources||[]){const a=document.createElement('a');a.href=source.url;a.textContent=source.title||source.url;a.target='_blank';a.rel='noopener';box.appendChild(a);box.appendChild(document.createElement('br'));}
            const missing=document.createElement('p');missing.textContent='A voltage profile needs relaxed OCV and effective DC resistance. This catalog does not infer them from nominal voltage, chemistry name or AC impedance.';box.appendChild(missing);
        }
        function selectReference() {
            $('error').textContent='';
            curveReference=null;curveFitState='none';temperatureReference=null;$('discharge-reference').value='';$('temp-reference').value='';$('discharge-evidence').textContent='Select a reference curve to fit it explicitly using your supplied effective DC R.';
            showReference();clearResult();if(!selected){$('model-status').textContent='Custom inputs retained. Review their source notes; no manufacturer-specific model is established.';return;}
            $('capacity').value=selected.capacityAh??'';$('cutoff').value=selected.cutoffV??'';$('resistance').value='';$('ocv').value='';$('temp-curve').value='';
            $('temperature').value=selected.referenceTempC??selected.capacityTest?.tempC??25;
            $('model-status').textContent='Manufacturer identity/rating selected. Complete the missing model fields or explicitly choose an ideal-voltage starting point.';
            $('provenance').value=`Reference: ${selected.name}. OCV/DC resistance/temperature model not supplied by this catalog. Add your measured data and source conditions.`;clearResult();
        }
        function ideal() {
            if(!selected){$('error').textContent='Choose a manufacturer reference first, or use the illustrative example.';return;}
            const v=selected.nominalV;if(!Number.isFinite(v)||v<=0){$('error').textContent='No nominal voltage was transcribed for this reference. Enter a documented OCV curve and the other model data directly.';return;}
            curveReference=null;curveFitState='none';temperatureReference=null;$('discharge-reference').value='';$('temp-reference').value='';$('discharge-evidence').textContent='No loaded-discharge reference curve is active in this ideal-voltage approximation.';
            const t=Number($('temperature').value), temperatures=[Number.isFinite(t)?t:25,...rows($('loads').value).filter(row=>row.length===4&&row[3]!=='').map(row=>Number(row[3])).filter(Number.isFinite)];
            const low=Math.min(...temperatures),high=Math.max(...temperatures);
            $('ocv').value=`0,${v}\n100,${v}`;$('resistance').value='0';$('temp-curve').value=`${low},1,1`+(high>low?`\n${high},1,1`:'');if($('cutoff').value.trim()==='')$('cutoff').value='0';
            $('model-status').textContent='Ideal-voltage approximation: nominal voltage treated as constant OCV; zero resistance, no modeled voltage knee or temperature effect. Capacity still needs an appropriate measured/rated value.';
            $('provenance').value=`${selected.name} nominal reference. Explicit ideal-voltage approximation with zero R; not a calibrated product model.`;clearResult();
        }
        function example() {
            $('preset').value='';selected=null;curveReference=null;curveFitState='none';temperatureReference=null;$('discharge-reference').value='';$('temp-reference').value='';$('discharge-evidence').textContent='The illustrative scenario is not fitted to a manufacturer discharge curve.';showReference();
            const fields={capacity:3,resistance:.06,cutoff:3,series:1,parallel:1,soc:100,reserve:0,health:100,efficiency:90,self:0,temperature:25,horizon:168,step:30};
            for(const [id,value] of Object.entries(fields))$(id).value=String(value);
            $('max-current').value='';$('ocv').value='0,3.0\n10,3.45\n25,3.6\n50,3.7\n75,3.9\n100,4.2';$('temp-curve').value='25,1,1';$('loads').value='3600,power,0.25,25';
            $('model-status').textContent='Illustrative Li-ion scenario: all OCV, capacity and DC-resistance values are editable assumptions, not a manufacturer fit.';
            $('provenance').value='Illustrative Li-ion OCV and 0.06 Ω resistance. Constant 25 °C; no manufacturer temperature correction.';clearResult();
        }
        function adoptTemperature() {
            const ref=catalog.temperatureReferences.find(r=>r.id===$('temp-reference').value);if(!ref){$('error').textContent='Select a temperature reference.';return;}
            const alkaline=(selected&&/alkaline/i.test(selected.chemistry)&&selected.format==='AA')||(curveReference&&/alkaline/i.test(curveReference.chemistry))||temperatureReference;
            if(!alkaline){$('error').textContent='This temperature reference is for AA alkaline cells. Select/build an AA alkaline model or adopt its discharge reference first; it is not a correction for other chemistries.';return;}
            $('error').textContent='';temperatureReference=ref;if(curveReference)curveFitState='modified-conditions';$('preset').value='';selected=null;showReference();
            const c=ref.conditions||{};
            $('temp-curve').value=ref.points.map(p=>`${p.tempC},${p.capacityFactor},1`).join('\n');
            if(Number.isFinite(c.referenceCapacityAh))$('capacity').value=c.referenceCapacityAh;
            if(Number.isFinite(c.cutoffV))$('cutoff').value=c.cutoffV;
            if(Number.isFinite(c.referenceTempC))$('temperature').value=c.referenceTempC;
            $('temp-evidence').textContent=conditionText(c)+'. '+(ref.applicability||'')+' Reading uncertainty: '+uncertaintyText(ref.uncertainty)+'. R factor=1 is an explicit constant-resistance assumption; pulse-resistance data is not substituted for DC R.';
            $('provenance').value+='\nTemperature capacity reference adopted: '+ref.name+'; '+ref.sourceUrl+'. OCV/R and varying-load applicability need separate evidence.';
            $('model-status').textContent='Mixed-evidence scenario: scoped alkaline capacity-temperature readings adopted; OCV and DC resistance remain independently supplied assumptions/data. Schedule temperatures must lie within the reference range.';clearResult();
        }
        function adoptDischarge() {
            try {
                const ref=dischargeReferences.find(r=>r.id===$('discharge-reference').value);if(!ref)throw new Error('Select a discharge-curve reference.');
                const r=number('resistance');if(r<0)throw new Error('Enter a nonnegative effective DC resistance first.');
                const c=ref.conditions,capacity=ref.points.at(-1).dischargedAh;
                if(!Number.isFinite(c.currentA)||c.currentA<=0||!Number.isFinite(c.tempC)||!Number.isFinite(c.cutoffV)||!(capacity>0))throw new Error('This reference lacks the required test conditions.');
                $('preset').value='';selected=null;curveReference=ref;curveFitState='reference-current-fit';temperatureReference=null;$('temp-reference').value='';showReference();
                $('capacity').value=capacity;$('cutoff').value=c.cutoffV;$('series').value='1';$('parallel').value='1';$('soc').value='100';$('reserve').value='0';$('health').value='100';$('self').value='0';$('efficiency').value='100';$('max-current').value='';$('temperature').value=c.tempC;
                $('ocv').value=ref.points.slice().reverse().map(p=>`${Number((100*(1-p.dischargedAh/capacity)).toFixed(8))},${Number((p.voltage+c.currentA*r).toFixed(6))}`).join('\n');
                $('temp-curve').value=`${c.tempC},1,1`;$('loads').value=`3600,current,${c.currentA},${c.tempC}`;
                $('model-status').textContent='Loaded-curve-derived screening model: reference voltage readings plus an assumed constant-R correction. Reference-current behavior can be compared with the source; other loads are model extrapolations.';
                $('discharge-evidence').textContent=`${ref.name}. Conditions: ${conditionText(c)}. Reading uncertainty: ${uncertaintyText(ref.uncertainty)}. Entered R=${r} Ω is not supplied or validated by the graph. ${ref.scope||''}`;
                $('provenance').value=`${ref.name}; ${ref.sourceUrl}; page ${ref.page}, ${ref.figure}. Inferred OCV = loaded voltage + ${c.currentA} A × entered ${r} Ω; not measured relaxed OCV. ${ref.scope||''}`;
                $('error').textContent='';clearResult();run();
            } catch(error){$('error').textContent=error.message;}
        }
        $('run').addEventListener('click',run);$('channel').addEventListener('change',plot);$('export').addEventListener('click',exportModel);$('csv').addEventListener('click',exportCSV);
        $('ideal').addEventListener('click',ideal);$('example').addEventListener('click',()=>{example();run();});$('preset').addEventListener('change',selectReference);
        for(const id of ['brand','chemistry','format'])$(id).addEventListener('change',()=>{const before=$('preset').value;populateProfiles();if(before!==$('preset').value)selectReference();else{showReference();clearResult();}});
        $('adopt-temperature').addEventListener('click',adoptTemperature);
        $('adopt-discharge').addEventListener('click',adoptDischarge);
        $('duty-example').addEventListener('click',()=>{$('loads').value='10,current,0.3,25\n590,current,0.002,25';clearResult();});
        $('cold-example').addEventListener('click',()=>{$('temp-curve').value='-10,0.6,2.2\n0,0.8,1.6\n25,1,1';$('loads').value='600,power,0.5,25\n600,power,0.5,-10';$('temperature').value='25';temperatureReference=null;$('temp-reference').value='';if(curveReference)curveFitState='modified-conditions';$('preset').value='';selected=null;showReference();$('model-status').textContent='Illustrative cold-load scenario: temperature factors are explicit assumptions, not manufacturer measurements.';$('provenance').value+='\nIllustrative cold capacity/R factors, not a measured temperature fit.';clearResult();});
        root.addEventListener('input',event=>{if(!['ba-channel','ba-cursor'].includes(event.target.id)){if(curveReference&&!['ba-provenance','ba-discharge-reference','ba-temp-reference'].includes(event.target.id)){curveFitState='user-modified-starting-point';$('model-status').textContent='User-modified scenario derived from a reference curve. It is no longer a direct reproduction of the published reference case.';$('discharge-evidence').textContent='The reference curve remains source provenance only; inputs or operating conditions have been modified. Reapply the reference to reproduce its stated test case.';}clearResult();}});
        fetch('/assets/data/battery-presets.json?v=1',{cache:'no-cache'}).then(response=>{if(!response.ok)throw new Error('Source catalog could not be loaded.');return response.json();}).then(data=>{
            if(data.schemaVersion!==1||!Array.isArray(data.profiles)||!Array.isArray(data.temperatureReferences))throw new Error('Unexpected source catalog format.');catalog=data;
            for(const [id,key,label] of [['brand','brand','All brands'],['chemistry','chemistry','All chemistries'],['format','format','All formats']])options($(id),[...new Set(catalog.profiles.map(p=>p[key]).filter(Boolean))].sort(),label);
            populateProfiles();options($('temp-reference'),[],'Select a scoped reference…');for(const ref of catalog.temperatureReferences){const option=document.createElement('option');option.value=ref.id;option.textContent=ref.name;$('temp-reference').appendChild(option);}showReference();
        }).catch(error=>{$('reference').textContent=error.message+' Custom model inputs remain available; no substitute manufacturer data was generated.';});
        fetch('/assets/data/battery-discharge-references.json?v=1',{cache:'no-cache'}).then(response=>{if(!response.ok)throw new Error('Discharge reference file unavailable.');return response.json();}).then(data=>{if(!Array.isArray(data.references))throw new Error('Unexpected discharge reference format.');dischargeReferences=data.references;options($('discharge-reference'),[],'Choose a scoped reference curve…');for(const ref of dischargeReferences){const option=document.createElement('option');option.value=ref.id;option.textContent=ref.name;$('discharge-reference').appendChild(option);}}).catch(error=>{$('discharge-evidence').textContent=error.message+' No reference curve was fabricated.';});
        run();
    }
    host.BatteryAnalysisUI={mount};
}(typeof window!=='undefined'?window:globalThis));

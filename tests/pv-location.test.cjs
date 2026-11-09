const {test} = require('node:test');
const assert = require('node:assert/strict');
const L = require('../assets/js/pv-location.js');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const p = {latitude:34.08,longitude:74.8,tilt:30,azimuth:180,year:2026,transmittance:.75,diffuseRatio:.15,albedo:.2,cellC:25};
const system = {dcKw:1,acKw:1,dcLossPct:5,inverterEfficiencyPct:96,tempCoeffPct:-.35,tempModel:'provided'};
const close = (a,b,t=1e-9) => assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
test('Solar geometry: equinox/solstice, east/west sense, poles and midnight',()=>{
    assert.ok(L.sun(0,79,12,2026).elevation>89);
    assert.ok(L.sun(23.44,172,12,2026).elevation>89.8);
    assert.ok(L.sun(0,79,9,2026).east>0);assert.ok(L.sun(0,79,15,2026).east<0);
    assert.equal(L.instant(p,system,172,0).acKw,0);
    assert.equal(L.daily({...p,latitude:90},system,355).energyKWh,0);
    for(const lat of [-90,90])for(const day of [1,79,172,355])assert.ok(Number.isFinite(L.sun(lat,day,12,2026).elevation));
});
test('Horizontal POA equals GHI; diffuse energy is bounded; orientation affects incidence',()=>{
    for(const tau of [.1,.75,1])for(const fraction of [0,.5,1]){
        const sample=L.sample({...p,transmittance:tau,diffuseRatio:fraction},172,12);
        close(L.plane(sample,0,180,.2),sample.ghi,1e-8);
        const e0=1361*(1+.033*Math.cos(2*Math.PI*172/365));
        assert.ok(sample.ghi<=e0*sample.up+1e-8);
    }
    const south=L.instant({...p,tilt:60,azimuth:180},system,355,12),north=L.instant({...p,tilt:60,azimuth:0},system,355,12);
    assert.ok(south.poa>north.poa);
});
test('Power and daily integration have an independent no-atmosphere geometric reference',()=>{
    const q={...p,latitude:0,tilt:0,transmittance:1,diffuseRatio:0,albedo:0},s={...system,dcLossPct:0,inverterEfficiencyPct:100,acKw:10},day=79;
    const e0=1361*(1+.033*Math.cos(2*Math.PI*day/365));
    const expected=e0/1000*Math.cos(L.declination(day,2026))*24/Math.PI;
    const coarse=L.daily(q,s,day,.25),fine=L.daily(q,s,day,.125);
    assert.ok(Math.abs(fine.energyKWh-expected)<Math.abs(coarse.energyKWh-expected));
    close(fine.energyKWh,expected,.0005);
    close(coarse.energyKWh,coarse.rows.reduce((sum,row)=>sum+row.acKw*(row.endHour-row.startHour),0));
    assert.ok(L.instant({...q,cellC:50},s,day,12).acKw<L.instant(q,s,day,12).acKw);
    assert.ok(L.daily(q,{...s,acKw:.1},day).rows.every(row=>row.acKw<=.1));
});
test('Every calendar day contributes to monthly/annual scenario including leap day',()=>{
    const normal=L.annual(p,system),leap=L.annual({...p,year:2024},system);
    close(normal.annualKWh,normal.months.reduce((sum,row)=>sum+row.energyKWh,0));
    assert.equal(normal.months.reduce((sum,row)=>sum+row.days,0),365);
    assert.equal(leap.months[1].days,29);assert.equal(leap.months.reduce((sum,row)=>sum+row.days,0),366);
    assert.ok(normal.months.every(row=>row.energyKWh>=0&&Number.isFinite(row.energyKWh)));
    assert.equal(normal.dailyLedger.length,365);assert.equal(leap.dailyLedger.length,366);
    assert.equal(normal.dailyLedger.reduce((sum,row)=>sum+row.energyKWh,0),normal.annualKWh);
    assert.equal(normal.cumulative[0].energyKWh,0);assert.equal(normal.cumulative.at(-1).energyKWh,normal.annualKWh);
    assert.equal(normal.dailyLedger.at(-1).cumulativeKWh,normal.annualKWh);
    assert.equal(leap.dailyLedger[59].date,'2024-02-29');
    for(let i=1;i<normal.cumulative.length;i++)assert.ok(normal.cumulative[i].energyKWh>=normal.cumulative[i-1].energyKWh);
    assert.equal(normal.dailyProfiles.length,12);
    normal.dailyProfiles.forEach((profile,i)=>{
        assert.equal(profile.month,i+1);assert.equal(profile.curve[0].solarHour,0);assert.equal(profile.curve.at(-1).solarHour,24);
        assert.equal(profile.rows[0].startHour,0);assert.equal(profile.rows.at(-1).endHour,24);
        close(profile.energyKWh,profile.rows.reduce((sum,row)=>sum+row.acKw*(row.endHour-row.startHour),0));
    });
    const polar=L.annual({...p,latitude:90},system);
    assert.ok(polar.dailyProfiles[0].curve.every(row=>row.acKw===0));
    assert.ok(polar.dailyLedger.every(row=>Number.isFinite(row.cumulativeKWh)&&row.energyKWh>=0));
});
test('Bounded search includes starting design, respects hemisphere, and labels its objective',()=>{
    const north=L.optimum({...p,tilt:0,azimuth:90},system),south=L.optimum({...p,latitude:-34.08,tilt:0,azimuth:90},system);
    assert.ok(north.tilt>=0&&north.tilt<=90);assert.ok(Math.abs(north.azimuth-180)<5);
    assert.ok(south.azimuth<5||south.azimuth>355);
    assert.match(north.method,/Best searched scenario, not a weather/);
    const month=L.optimum(p,system,'month',12);assert.deepEqual(month.evaluatedMonths,[12]);
    assert.ok(month.energyKWh>0);
});
function provider(){return {inputs:{location:{latitude:45,longitude:8},meteo_data:{radiation_db:'PVGIS-ERA5',year_min:2005,year_max:2023},mounting_system:{fixed:{slope:{value:35,optimal:true},azimuth:{value:0,optimal:true}}},pv_module:{peak_power:1,system_loss:14}},outputs:{monthly:{fixed:Array.from({length:12},(_,i)=>({month:i+1,E_m:100}))},totals:{fixed:{E_y:1200}}}};}
test('PVGIS request uses selected location and converts north-clockwise azimuth to provider south-zero',()=>{
    const url=new URL(L.pvgisURL({...p,azimuth:90},system,14,false));
    assert.equal(Number(url.searchParams.get('lat')),p.latitude);assert.equal(Number(url.searchParams.get('lon')),p.longitude);
    assert.equal(url.searchParams.get('aspect'),'-90');assert.equal(url.searchParams.get('peakpower'),'1');
    assert.equal(new URL(L.pvgisURL(p,system,14,true)).searchParams.get('optimalangles'),'1');
});
test('PVGIS import retains actual provider provenance and output without local corrections',()=>{
    const raw=JSON.stringify(provider()),result=L.parsePVGIS(raw);
    assert.equal(result.annualKWh,1200);assert.equal(result.latitude,45);assert.equal(result.longitude,8);
    assert.equal(result.azimuth,180);assert.equal(result.tilt,35);assert.equal(result.optimizedTilt,true);
    assert.equal(result.systemLossPct,14);assert.deepEqual(result.raw,JSON.parse(raw));
    assert.match(result.scope,/source authenticity not independently verified/);
    for(const modify of [d=>d.outputs.monthly.fixed.pop(),d=>d.outputs.monthly.fixed[1].month=1,d=>d.outputs.totals.fixed.E_y=1000,d=>d.inputs.location.latitude=91,d=>d.inputs.meteo_data.radiation_db='',d=>d.outputs.monthly.fixed[0].E_m=-1,d=>delete d.inputs.pv_module.system_loss]){
        const invalid=provider();modify(invalid);assert.throws(()=>L.parsePVGIS(JSON.stringify(invalid)));
    }
});
test('Location UI mounts locally, handles map/keyboard/angle search, and clears invalid scenario',()=>{
    const html=fs.readFileSync(path.join(__dirname,'../assets/tools_html/pv-yield-simulator.html'),'utf8'),nodes=new Map();
    const observed=new Set(),observerCallbacks=[],sizes=new Map(),drawCalls=[];
    const ctx=new Proxy({},{get:(_,method)=>(...args)=>{if(['moveTo','lineTo','fillRect','arc'].includes(method)){assert.ok(args.every(Number.isFinite),'Nonfinite canvas coordinate');drawCalls.push([method,...args]);}}});
    for(const [,id]of html.matchAll(/id="([^"]+)"/g))nodes.set(id,{id,value:'',textContent:'',checked:false,isConnected:true,getBoundingClientRect:()=>({left:0,top:0,width:600,height:300,...sizes.get(id)}),getContext:()=>ctx});
    for(let month=1;month<=12;month++)sizes.set('pvl-month-chart-'+month,{width:0,height:0});
    for(const[id,value]of Object.entries({lat:34.08,lon:74.8,tilt:30,azimuth:180,month:6,time:12,tau:.75,diffuse:.15,albedo:.2,cell:25,'pvgis-loss':14,scope:'annual'}))nodes.get('pvl-'+id).value=String(value);
    for(const[id,value]of Object.entries({dc:1,ac:1,loss:5,eff:96,gamma:-.35,year:2026}))nodes.get('pvg-'+id).value=String(value);
    nodes.get('pvl-pvgis-optimize').checked=true;
    const context=vm.createContext({PVGeneration:require('../assets/js/pv-generation.js'),URLSearchParams,document:{getElementById:id=>nodes.get(id),documentElement:{}},getComputedStyle:()=>({getPropertyValue:()=>''}),ResizeObserver:class{constructor(fn){observerCallbacks.push(fn);}observe(node){observed.add(node.id);}disconnect(){}}});context.window=context;context.addEventListener=()=>{};
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/js/pv-location.js'),'utf8'),context);
    const ui=context.PVLocation.ui;ui.init();assert.equal(nodes.get('pvl-error').textContent,'');assert.match(nodes.get('pvl-year-energy').textContent,/model year/);
    assert.match(nodes.get('pvl-recommended-annual').textContent,/Annual model: tilt/);
    assert.match(nodes.get('pvl-recommended-month').textContent,/Jun model: tilt/);
    assert.match(nodes.get('pvl-month-legend').innerHTML,/aria-pressed="true"/);
    assert.match(nodes.get('pvl-monthly-values').innerHTML,/Jan/);assert.match(nodes.get('pvl-monthly-values').innerHTML,/Dec/);
    for(const id of ['map','daily-chart','annual-chart','cumulative-chart','import-chart',...Array.from({length:12},(_,i)=>'month-chart-'+(i+1))])assert.ok(observed.has('pvl-'+id),'Unobserved '+id);
    const annualRecommendation=nodes.get('pvl-recommended-annual').textContent,tiltBefore=nodes.get('pvl-tilt').value;
    nodes.get('pvl-time').value='0';ui.redraw();assert.equal(nodes.get('pvl-power').textContent,'0 W');assert.equal(nodes.get('pvl-recommended-annual').textContent,annualRecommendation);
    ui.selectMonth(12);assert.match(nodes.get('pvl-recommended-month').textContent,/Dec model: tilt/);assert.equal(nodes.get('pvl-tilt').value,tiltBefore);
    ui.applyRecommendation('month');assert.equal(nodes.get('pvl-error').textContent,'');
    sizes.set('pvl-month-chart-1',{width:180,height:250});sizes.set('pvl-daily-chart',{width:220,height:250});observerCallbacks.at(-1)();
    assert.equal(nodes.get('pvl-month-chart-1').width,180);assert.equal(nodes.get('pvl-month-chart-1').height,250);assert.equal(nodes.get('pvl-daily-chart').width,220);
    assert.ok(drawCalls.length>0);
    nodes.get('pvl-map').onclick({clientX:300,clientY:150});assert.equal(Number(nodes.get('pvl-lat').value),0);assert.equal(Number(nodes.get('pvl-lon').value),0);
    nodes.get('pvl-map').onkeydown({key:'ArrowUp',preventDefault(){}});assert.equal(Number(nodes.get('pvl-lat').value),1);
    ui.search();assert.match(nodes.get('pvl-search-result').textContent,/Best searched/);ui.apply();
    nodes.get('pvl-lat').value='90';nodes.get('pvl-month').value='1';ui.update();
    assert.equal(nodes.get('pvl-power').textContent,'0 W');assert.match(nodes.get('pvl-recommended-month').textContent,/no generation; no energy-preferred angle/);
    nodes.get('pvl-lat').value='999';ui.update();assert.ok(nodes.get('pvl-error').textContent);assert.equal(nodes.get('pvl-year-energy').textContent,'—');
    assert.equal(nodes.get('pvl-recommended-annual').textContent,'—');assert.equal(nodes.get('pvl-recommended-month').textContent,'—');assert.equal(nodes.get('pvl-monthly-values').innerHTML,'');
    nodes.get('pvl-lat').value='34.08';ui.init();assert.equal(nodes.get('pvl-error').textContent,'');assert.match(nodes.get('pvl-import-result').textContent,/No weather-based provider result imported/);
});

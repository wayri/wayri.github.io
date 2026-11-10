// Explicit browser QA: NODE_PATH must expose an existing Playwright installation.
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const {preview} = require('../tools/preview-wayricad.cjs');
const expectedTools = require('../_data/wayricad.json').groups.flatMap(group=>group.tools).length;

(async () => {
    const output = process.argv[2];
    if (!output) throw new Error('Provide a task-owned output directory with adequate disk reserve.');
    fs.mkdirSync(output,{recursive:true});
    const html = path.join(output,'index.html');
    fs.writeFileSync(html,preview());
    const browser = await chromium.launch({channel:'chrome',headless:true});
    const checks = [];
    try {
        for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:1920,height:1080}]) {
            const page = await browser.newPage({viewport});
            const errors = [];
            page.on('pageerror',error=>errors.push(error.message));
            await page.goto(pathToFileURL(html).href,{waitUntil:'networkidle',timeout:30000});
            assert.equal(await page.locator('.wayricad-tool:visible').count(),expectedTools);
            for (const image of await page.locator('main img').all()) {
                await image.scrollIntoViewIfNeeded();
                await image.evaluate(img=>img.decode());
            }
            await page.evaluate(()=>scrollTo(0,0));
            const geometry = await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,
                images:[...document.querySelectorAll('main img')].map(img=>({src:img.getAttribute('src'),loaded:img.naturalWidth>0})),
                screenshotTop:document.querySelector('main figure').getBoundingClientRect().top}));
            assert.ok(geometry.scroll<=geometry.width,JSON.stringify(geometry));
            assert.ok(geometry.images.every(img=>img.loaded),JSON.stringify(geometry.images));
            assert.ok(geometry.screenshotTop<viewport.height,'Actual application image should begin in first viewport.');
            await page.screenshot({path:path.join(output,`wayricad-${viewport.width}.png`)});
            await page.locator('#plugin-search').fill('impedance');
            assert.ok(await page.locator('.wayricad-tool:visible').count()>0);
            await page.locator('#plugin-search').fill('no-tool-matches-this');
            assert.equal(await page.locator('#plugin-empty').isVisible(),true);
            await page.locator('#plugin-search').fill('');
            await page.locator('.wayricad-question summary').first().click();
            assert.equal(await page.locator('.wayricad-question').first().getAttribute('open'),'');
            await page.locator('#copy-pcm').click();
            await page.waitForFunction(()=>document.getElementById('copy-status').textContent.length>0);
            assert.deepEqual(errors,[]);
            checks.push({viewport,...geometry,status:'passed'});
            await page.close();
        }
        const noJs = await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});
        await noJs.goto(pathToFileURL(html).href,{waitUntil:'networkidle'});
        assert.equal(await noJs.locator('.wayricad-tool:visible').count(),expectedTools);
        checks.push({javascript:false,status:'complete_directory_visible'});
        await noJs.close();
    } finally { await browser.close(); }
    fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({scope:'source-only preview; not Jekyll/SEO-plugin or deployment validation',checks},null,2));
    console.log(JSON.stringify(checks.map(row=>({viewport:row.viewport,javascript:row.javascript,status:row.status}))));
})().catch(error=>{console.error(error);process.exitCode=1;});

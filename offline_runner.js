#!/usr/bin/env node
/**
 * Standalone Desktop Application Host (Node.js)
 * Automatically spawns the suite in a dedicated standalone desktop window (no browser tabs/URL bar).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, spawn } = require('child_process');

const PORT = process.env.PORT || 8422;
const ROOT = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf'
};

function findStandaloneBrowser() {
    if (process.platform === 'win32') {
        const candidates = [
            path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Microsoft\\Edge\\Application\\msedge.exe'),
            path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'Microsoft\\Edge\\Application\\msedge.exe'),
            path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
            path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
            path.join(process.env['LOCALAPPDATA'] || '', 'Google\\Chrome\\Application\\chrome.exe'),
            path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'BraveSoftware\\Brave-Browser\\Application\\brave.exe')
        ];
        for (let p of candidates) {
            if (fs.existsSync(p)) return p;
        }
    } else if (process.platform === 'darwin') {
        const candidates = [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
            '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
        ];
        for (let p of candidates) {
            if (fs.existsSync(p)) return p;
        }
    }
    return null;
}

const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];
    if (reqUrl === '/' || reqUrl === '') reqUrl = '/tools/index.html';
    if (reqUrl.endsWith('/')) reqUrl += 'index.html';

    const filePath = path.join(ROOT, decodeURIComponent(reqUrl));

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache'
        });

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
});

server.listen(PORT, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${PORT}/tools/index.html`;
    console.log('='.repeat(65));
    console.log('  ⚡ ENGINEERING TOOLS SUITE - STANDALONE DESKTOP HOST');
    console.log('='.repeat(65));
    console.log(`  • Local Engine : ${ROOT}`);
    console.log(`  • App Endpoint : ${url}`);
    console.log('='.repeat(65));

    const browser = findStandaloneBrowser();
    const tempProfile = path.join(os.tmpdir(), 'eng_tools_node_app_profile');

    if (browser) {
        console.log(`  Opening dedicated standalone window via: ${path.basename(browser)}`);
        const child = spawn(browser, [
            `--app=${url}`,
            '--window-size=1440,920',
            `--user-data-dir=${tempProfile}`,
            '--disable-extensions'
        ], { detached: false, stdio: 'ignore' });

        child.on('exit', () => {
            console.log('\nStandalone window closed. Exiting server...');
            server.close();
            process.exit(0);
        });
    } else {
        const startCmd = process.platform === 'win32' ? `start ${url}` :
                         process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
        exec(startCmd, () => {});
    }
});

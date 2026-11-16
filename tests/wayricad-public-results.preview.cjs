// Read-only, source-only browser QA server; not a Jekyll build or deployment.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript',
    '.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png',
    '.jpg':'image/jpeg','.webp':'image/webp','.wasm':'application/wasm','.md':'text/plain; charset=utf-8'};
function preview(){
    let body=fs.readFileSync(path.join(root,'assets/demos/wayricad-results.html'),'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/,'');
    body=body.replace(/{% include webview-breadcrumbs.html[^%]*%}/g,
        '<nav><a href="/wayricad/">WayriCAD</a> / <a href="/kicad-webview/docs/wayricad-results/">Result guide</a></nav>');
    body=body.replace(/{% include webview-demo-update.html %}/g,'<p>Source-only browser QA; not a Jekyll build or live deployment.</p>');
    let layout=fs.readFileSync(path.join(root,'_layouts/webview-embed.html'),'utf8')
        .replace('{% seo %}','<title>WayriCAD results [source preview]</title>').replace('{{ content }}',body);
    return layout.replace(/{{ '([^']+)' \| relative_url }}/g,(_,url)=>url);
}
function server(port=8793){
    return http.createServer((request,response)=>{
        try{
            const url=new URL(request.url,'http://127.0.0.1');
            if(url.pathname==='/assets/demos/wayricad-results.html'){
                response.writeHead(200,{'content-type':mime['.html'],'cache-control':'no-store'});response.end(preview());return;
            }
            const target=path.resolve(root,'.'+decodeURIComponent(url.pathname));
            if(!url.pathname.startsWith('/assets/')||!target.startsWith(path.join(root,'assets')+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){
                response.writeHead(404);response.end('Not found');return;
            }
            response.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':'no-store'});
            fs.createReadStream(target).pipe(response);
        }catch(error){response.writeHead(400);response.end('Invalid preview path');}
    }).listen(port,'127.0.0.1',()=>console.log(`Source-only preview: http://127.0.0.1:${port}/assets/demos/wayricad-results.html`));
}
if(require.main===module)server(Number(process.argv[2]||8793));
module.exports={preview,server};

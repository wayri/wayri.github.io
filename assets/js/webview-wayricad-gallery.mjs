/* Site-owned catalogue validation; never derive fetch destinations from result JSON. */
export const GALLERY_SCHEMA='wayricad.integration-gallery/v1';
export const MAX_MANIFEST_BYTES=512*1024;
const ID=/^[a-z0-9][a-z0-9_-]{0,95}$/;
const text=(value,name,max=4096)=>{
    if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(`Invalid gallery ${name}.`);
    return value;
};
function externalURL(value,name){
    const url=new URL(text(value,name));
    if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error(`Invalid gallery ${name} URL.`);
    return url.href;
}
export function assetURL(path,manifestURL,kind){
    if(typeof path!=='string'||!path||path.length>512||! /^[A-Za-z0-9_./-]+$/.test(path)||path.startsWith('/'))throw Error('Invalid gallery asset path.');
    const base=new URL('.',manifestURL),url=new URL(path,base);
    const sourceRoot=new URL('../../public-hardware/',base);
    const inside=url.origin===base.origin&&(url.pathname.startsWith(base.pathname)||
        kind==='source'&&url.pathname.startsWith(sourceRoot.pathname));
    const suffix=kind==='source'?/\.kicad_pcb$/:kind==='result'?/\.json$/:/\.(json|md|txt)$/;
    if(!inside||url.search||url.hash||!suffix.test(url.pathname))throw Error('Gallery asset escapes its approved directory or has an unsupported type.');
    return url.href;
}
function license(value){
    if(typeof value==='string')return {name:text(value,'license',512),url:null};
    if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid gallery license.');
    return {name:text(value.name,'license name',512),url:externalURL(value.url,'license')};
}
function lines(value,name){
    if(!Array.isArray(value)||value.length>128)throw Error(`Invalid gallery ${name}.`);
    return value.map(item=>text(item,name));
}
function summary(value){
    if(value===null||typeof value==='string')return value===null?null:text(value,'summary',8192);
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>64)throw Error('Invalid gallery summary.');
    const serialized=JSON.stringify(value);
    if(serialized.length>16384)throw Error('Gallery summary is too large.');
    function visit(item,depth=0){
        if(depth>8||typeof item==='number'&&!Number.isFinite(item))throw Error('Gallery summary must be finite bounded JSON.');
        if(item&&typeof item==='object')for(const child of Object.values(item))visit(child,depth+1);
    }
    visit(value);
    return value;
}
export function validateGallery(raw,manifestURL){
    if(!raw||raw.schema!==GALLERY_SCHEMA||!Array.isArray(raw.boards)||raw.boards.length>64||
       !Array.isArray(raw.cases)||raw.cases.length>512)throw Error('Unsupported public-board gallery manifest.');
    const ids=new Set(),boardIds=new Set();
    const boards=raw.boards.map(board=>{
        if(!board||typeof board.id!=='string'||!ID.test(board.id)||board.id==='fixtures'||boardIds.has(board.id))throw Error('Gallery board IDs must be unique and nonreserved.');
        boardIds.add(board.id);
        return {id:board.id,name:text(board.name,'board name',256)};
    });
    const cases=raw.cases.map(row=>{
        if(!row||typeof row.id!=='string'||!ID.test(row.id)||
           ['quick-pi','quick-si','quick-therm','quick-therm-transient'].includes(row.id)||
           ids.has(row.id)||!boardIds.has(row.board_id))throw Error('Invalid, duplicate, reserved or unbound gallery case ID.');
        ids.add(row.id);
        if(typeof row.source_sha256!=='string'||! /^[a-f0-9]{64}$/i.test(row.source_sha256)||
           !Number.isSafeInteger(row.source_bytes)||row.source_bytes<=0||row.source_bytes>64*1024*1024)throw Error('Gallery case needs a SHA-256 and a source size within 64 MiB.');
        return {id:row.id,board_id:row.board_id,label:text(row.label,'case label',256),
            kind:text(row.kind,'case kind',80),status:text(row.status,'case status',80),
            resultURL:row.result_path===null?null:assetURL(row.result_path,manifestURL,'result'),
            sourceURL:assetURL(row.source_path,manifestURL,'source'),
            source_sha256:row.source_sha256.toLowerCase(),source_bytes:row.source_bytes,
            assumptions:lines(row.assumptions,'assumptions'),limitations:lines(row.limitations,'limitations'),
            summary:summary(row.summary),provenanceURL:assetURL(row.provenance_path,manifestURL,'provenance'),
            upstreamURL:externalURL(row.upstream_url,'upstream'),license:license(row.license)};
    });
    return {schema:GALLERY_SCHEMA,boards,cases};
}
export function requestedCase(gallery,id){
    return typeof id==='string'?gallery.cases.find(row=>row.id===id)||null:null;
}
export async function fetchGallery(url,{signal,fetchImpl=fetch}={}){
    const response=await fetchImpl(url,{signal});
    if(!response.ok)throw Error(`Public-board catalogue unavailable (${response.status}). Generated fixtures and local files remain available.`);
    if(Number(response.headers.get('content-length'))>MAX_MANIFEST_BYTES)throw Error('Public-board catalogue exceeds 512 KiB.');
    let bytes;
    if(response.body?.getReader){
        const reader=response.body.getReader(),parts=[];let length=0;
        try{
            while(true){
                const {done,value}=await reader.read();if(done)break;
                length+=value.byteLength;
                if(length>MAX_MANIFEST_BYTES)throw Error('Public-board catalogue exceeds 512 KiB.');
                parts.push(value);
            }
        }catch(error){await reader.cancel().catch(()=>{});throw error;}
        finally{reader.releaseLock();}
        bytes=new Uint8Array(length);let offset=0;
        for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
    }else{
        bytes=new Uint8Array(await response.arrayBuffer());
        if(bytes.byteLength>MAX_MANIFEST_BYTES)throw Error('Public-board catalogue exceeds 512 KiB.');
    }
    return validateGallery(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),url);
}

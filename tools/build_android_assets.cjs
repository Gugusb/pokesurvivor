'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const ROOT=path.resolve(__dirname,'..');
const allowed=p=>/^assets\/(pokemon|mega|icons|fonts)\/[A-Za-z0-9_./-]+\.(png|webp|jpg|woff2|ttf|otf)$/.test(p)&&!p.includes('..')&&!p.includes('//')&&!p.includes('/.');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function inventory(root=ROOT){
 const files={};let bytes=0;
 function walk(dir){for(const e of fs.readdirSync(path.join(root,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){const p=dir+'/'+e.name;if(e.isDirectory())walk(p);else if(e.isFile()&&allowed(p)){const b=fs.readFileSync(path.join(root,p));files[p]=sha(b);bytes+=b.length;}}}
 for(const p of ['assets/fonts','assets/icons','assets/mega','assets/pokemon'])walk(p);
 const ordered=Object.fromEntries(Object.entries(files).sort(([a],[b])=>a<b?-1:a>b?1:0)),json=Buffer.from(JSON.stringify(ordered));
 return{files:ordered,bytes,sha256:sha(json),json};
}
function build({root=ROOT,version=JSON.parse(fs.readFileSync(path.join(root,'version.json'))).v}={}){
 const data=inventory(root),wrapper={schema:1,version,encoding:'gzip-base64',sha256:data.sha256,data:zlib.gzipSync(data.json,{level:9}).toString('base64')};
 fs.writeFileSync(path.join(root,'mobile-assets.json'),JSON.stringify(wrapper)+'\n');
 return{...data,version,wrapper};
}
async function buildAsync({root=ROOT,version=JSON.parse(fs.readFileSync(path.join(root,'version.json'))).v}={}){
 const dirs=['assets/fonts','assets/icons','assets/mega','assets/pokemon'],paths=[];let di=0;
 await Promise.all(Array.from({length:16},async()=>{while(di<dirs.length){const dir=dirs[di++];for(const e of await fs.promises.readdir(path.join(root,dir),{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())dirs.push(p);else if(e.isFile()&&allowed(p))paths.push(p);}}}));
 const files={};let pi=0,bytes=0;
 await Promise.all(Array.from({length:32},async()=>{while(pi<paths.length){const p=paths[pi++],b=await fs.promises.readFile(path.join(root,p));files[p]=sha(b);bytes+=b.length;}}));
 const ordered=Object.fromEntries(Object.entries(files).sort(([a],[b])=>a<b?-1:a>b?1:0)),json=Buffer.from(JSON.stringify(ordered)),sha256=sha(json);
 const wrapper={schema:1,version,encoding:'gzip-base64',sha256,data:zlib.gzipSync(json,{level:9}).toString('base64')};
 await fs.promises.writeFile(path.join(root,'mobile-assets.json'),JSON.stringify(wrapper)+'\n');return{files:ordered,bytes,sha256,json,version,wrapper};
}
if(require.main===module){buildAsync().then(d=>console.log(JSON.stringify({version:d.version,files:Object.keys(d.files).length,bytes:d.bytes,sha256:d.sha256,manifestBytes:fs.statSync(path.join(ROOT,'mobile-assets.json')).size}))).catch(e=>{console.error(e);process.exitCode=1;});}
module.exports={allowed,inventory,build,buildAsync,sha};

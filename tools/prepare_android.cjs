'use strict';
const fs=require('node:fs'),path=require('node:path');
const {buildAsync}=require('./build_android_assets.cjs');
(async()=>{
const root=path.resolve(__dirname,'..'),qa=process.argv.includes('--qa'),d=await buildAsync();
const out=path.join(root,'android/build',qa?'qa':'release'),c=require('../android/client.json');
fs.mkdirSync(out,{recursive:true});
const a=path.join(out,'assets');fs.mkdirSync(a,{recursive:true});
const paths=Object.keys(d.files);let i=0;
await Promise.all(Array.from({length:32},async()=>{while(i<paths.length){const p=paths[i++],dest=path.join(a,p);await fs.promises.mkdir(path.dirname(dest),{recursive:true});await fs.promises.copyFile(path.join(root,p),dest);}}));
const baseline=require('../android/asset-baselines.json'),versions=[d.version,...baseline.filter(b=>b.sha256===d.sha256).map(b=>b.version)];
fs.writeFileSync(path.join(a,'bundle.json'),JSON.stringify({schema:1,versions:[...new Set(versions)],files:d.files}));
const credits=path.join(a,'credits');fs.mkdirSync(credits,{recursive:true});
for(const p of ['LICENSE','CREDITS.md','docs/MEGA_ASSET_CREDITS.md','assets/mega/manifest.json','assets/EGG_GROUPS_LICENSE.txt','assets/fonts/OFL.txt']){
 const dest=path.join(credits,p);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,p),dest);
}
// Native shell contains no game scripts, developer modules, accounts or user saves.
const res=path.join(out,'res');fs.cpSync(path.join(root,'android/res'),res,{recursive:true});fs.mkdirSync(path.join(res,'drawable'),{recursive:true});fs.copyFileSync(path.join(root,'assets/icons/icon-192.png'),path.join(res,'drawable/icon.png'));
const manifest=fs.readFileSync(path.join(root,'android/AndroidManifest.xml'),'utf8').replace('package="'+c.applicationId+'"','package="'+c.applicationId+(qa?'.qa':'')+'"').replace('android:name=".MainActivity"','android:name="cn.gugusb.pokesurvivor.MainActivity"').replace('<application ','<application android:debuggable="'+qa+'" ').replace('android:label="PokéSurvivor"','android:label="PokéSurvivor'+(qa?' QA':'')+'"');
fs.writeFileSync(path.join(out,'AndroidManifest.xml'),manifest);
const gen=path.join(out,'generated/cn/gugusb/pokesurvivor');fs.mkdirSync(gen,{recursive:true});
fs.writeFileSync(path.join(gen,'ClientConfig.java'),`package cn.gugusb.pokesurvivor;\npublic final class ClientConfig { public static final boolean DEBUG=${qa}; public static final String VERSION=${JSON.stringify(c.versionName)}; public static final String DEFAULT_URL=${JSON.stringify(c.defaultUrl)}; public static final int MIN_CHROMIUM=${c.minimumChromium}; }\n`);
fs.writeFileSync(path.join(out,'bundle-info.json'),JSON.stringify({client:c.versionName,game:d.version,files:Object.keys(d.files).length,bytes:d.bytes,sha256:d.sha256,qa},null,2));
console.log('Android assets: '+Object.keys(d.files).length+' files, '+(d.bytes/1048576).toFixed(1)+' MiB; '+(qa?'QA':'release'));
})().catch(e=>{console.error(e);process.exitCode=1;});

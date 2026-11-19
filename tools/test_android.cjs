'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),zlib=require('node:zlib'),cp=require('node:child_process');
const {allowed,build,sha}=require('./build_android_assets.cjs'),root=path.resolve(__dirname,'..');
test('Android inventory includes art and fonts, excludes executable and private files',()=>{
 for(const p of ['assets/pokemon/1/Idle.png','assets/pokemon/1/s/Walk.png','assets/mega/3/Idle.png','assets/fonts/pixel.woff2','assets/icons/icon-192.png'])assert.ok(allowed(p),p);
 for(const p of ['server/data/save.png','assets/pokemon/../secret.png','assets/pokemon//secret.png','assets/pokemon/a.js','assets/other/a.png','assets/pokemon/%2fsecret.png'])assert.ok(!allowed(p),p);
});
test('compressed manifest is deterministic, content-addressed and tied to the web build',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-android-'));
 try{
  for(const p of ['fonts','icons','mega','pokemon'])fs.mkdirSync(path.join(dir,'assets',p),{recursive:true});
  fs.writeFileSync(path.join(dir,'assets/pokemon/a.png'),'first');fs.writeFileSync(path.join(dir,'assets/pokemon/private.json'),'not bundled');
  let d=build({root:dir,version:'0123456789'}),w=JSON.parse(fs.readFileSync(path.join(dir,'mobile-assets.json')));
  const json=zlib.gunzipSync(Buffer.from(w.data,'base64'));assert.equal(w.sha256,sha(json));assert.equal(w.version,'0123456789');assert.deepEqual(Object.keys(JSON.parse(json)),['assets/pokemon/a.png']);
  assert.equal(d.files['assets/pokemon/a.png'],sha(Buffer.from('first')));assert.equal(build({root:dir,version:'0123456789'}).sha256,d.sha256);
  fs.writeFileSync(path.join(dir,'assets/pokemon/a.png'),'second');assert.notEqual(build({root:dir,version:'abcdef1234'}).sha256,d.sha256);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('native release requires only network permissions, keeps orientation flexible and exposes no JS bridge',()=>{
 const m=fs.readFileSync(path.join(root,'android/AndroidManifest.xml'),'utf8'),s=fs.readFileSync(path.join(root,'android/src/cn/gugusb/pokesurvivor/MainActivity.java'),'utf8');
 assert.equal((m.match(/uses-permission/g)||[]).length,2);assert.doesNotMatch(m,/screenOrientation|WRITE_EXTERNAL_STORAGE|READ_EXTERNAL_STORAGE/);
 assert.match(m,/allowBackup="false"/);assert.match(s,/setWebContentsDebuggingEnabled\(ClientConfig.DEBUG\)/);
 assert.match(s,/setAllowFileAccess\(false\)/);assert.match(s,/setMixedContentMode\(WebSettings.MIXED_CONTENT_NEVER_ALLOW\)/);
 assert.doesNotMatch(s,/addJavascriptInterface|\.proceed\(/);assert.match(s,/h.cancel\(\)/);
});
test('Android skips PWA registration; update code and account APIs stay outside native cache',()=>{
 const main=fs.readFileSync(path.join(root,'js/main.js'),'utf8'),store=fs.readFileSync(path.join(root,'android/src/cn/gugusb/pokesurvivor/AssetStore.java'),'utf8');
 assert.match(main,/!\/PokeSurvivorAndroid/);assert.match(store,/AssetPolicy.localPath/);assert.match(store,/Manifest version mismatch/);assert.match(store,/Cache-Control","no-store/);
 assert.match(store,/mobile_sha=/);assert.doesNotMatch(store,/CookieManager|addJavascriptInterface/);
});
test('pure JVM native URL and hash policies',{skip:cp.spawnSync('javac',['-version']).error?'JDK unavailable':false},()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-android-java-'));
 try{cp.execFileSync('javac',['--release','8','-encoding','UTF-8','-d',dir,path.join(root,'android/src/cn/gugusb/pokesurvivor/AssetPolicy.java'),path.join(root,'android/tests/AssetPolicyTest.java')]);
  assert.match(cp.execFileSync('java',['-cp',dir,'cn.gugusb.pokesurvivor.AssetPolicyTest'],{encoding:'utf8'}),/policies passed/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

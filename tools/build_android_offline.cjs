/* Builds an isolated, network-free Android test APK. Never modifies the web release. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'tools/cache/android-offline'),WEB=path.join(OUT,'assets/web');
const args=process.argv.slice(2),value=key=>args[args.indexOf(key)+1];
const sdk=args.includes('--sdk')?value('--sdk'):process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT;
const java=args.includes('--java')?value('--java'):process.env.JAVA_HOME;
const windows=process.platform==='win32',exe=(dir,name)=>path.join(dir,name+(windows?'.exe':''));
const run=(file,a,options={})=>cp.execFileSync(file,a,{stdio:'inherit',...options});
const copy=(from,to)=>{if(!fs.existsSync(from))return;fs.mkdirSync(path.dirname(to),{recursive:true});fs.cpSync(from,to,{recursive:true});};
const need=(p,label)=>{if(!p||!fs.existsSync(p))throw Error(label+' not found: '+(p||'(unset)'));return p;};
function web(){
 fs.mkdirSync(WEB,{recursive:true});const html=fs.readFileSync(path.join(ROOT,'dev.html'),'utf8'),block=html.match(/<!-- scripts:begin -->([\s\S]*?)<!-- scripts:end -->/)[1];
 const files=[...block.matchAll(/src="(js\/[^"?]+\.js)"/g)].map(m=>m[1]).filter(f=>f!=='js/ui/developer.js');
 let joined=files.map(f=>{
  let src=fs.readFileSync(path.join(ROOT,f),'utf8');
  if(f==='js/core/leader-abilities-config.js')src=require('./leader_config.cjs').script(ROOT);
  if(f==='js/core/economy-config.js'||f==='js/core/trainer-talents-config.js'){const economy=f.includes('economy-'),key=economy?'Economy':'TrainerTalents';src='G.'+key+'Config='+fs.readFileSync(path.join(ROOT,economy?'config/economy_config.json':'config/trainer_talents.json'),'utf8')+';G.'+key+'Ready=Promise.resolve(G.'+key+'Config);';}
  if(f==='js/core/db.js'){
   const anchor='readyP = (async () => {';if(!src.includes(anchor))throw Error('Offline DB patch anchor changed');
   src=src.replace(anchor,anchor+`
      mode='local';localReason='file';beginLocal('offline-apk-test','单机测试');
      if(!save.androidOfflineTestGrant){save.coins=Math.min(1e8,(save.coins||0)+1e8);save.tickets.t1+=10000;save.androidOfflineTestGrant=1;}
      write(K_SAVE+key,save);setSync('local');return true;
   `);
  }
  if(f==='js/main.js')src=src.replace("if ('serviceWorker' in navigator", "if (false && 'serviceWorker' in navigator");
  if(f==='js/core/util.js')src=src.replace('window.G = window.G || {};','var G = {};');
  return '/* '+f+' */\n'+src;
 }).join('\n;\n');
 joined="(() => {localStorage.setItem('ps.lang',localStorage.getItem('ps.lang')||'zh');\n"+joined+'\n})();';
 const bundle=path.join(OUT,'offline.js');fs.writeFileSync(bundle,joined);fs.mkdirSync(path.join(WEB,'js'),{recursive:true});
 const terserArgs=[bundle,'--compress','passes=1','--mangle','--comments','false','--ecma','2020','-o',path.join(WEB,'js/app.min.js')];
 if(args.includes('--terser'))run(process.execPath,[need(value('--terser'),'Terser CLI'),...terserArgs]);
 else run(windows?'npx.cmd':'npx',['--offline','--yes','terser@5.51.2',...terserArgs],{shell:windows});
 let page=html.replace(/<!-- scripts:begin -->[\s\S]*?<!-- scripts:end -->/,'<script defer src="js/app.min.js"></script>').replace(/<!-- seo:begin -->[\s\S]*?<!-- seo:end -->/g,'').replace(/<link[^>]+(?:rel="manifest"|rel="preconnect")[^>]*>/g,'').replace(/[ \t]*<button\b[^>]*data-t="dev"[^>]*>[\s\S]*?<\/button>\r?\n?/g,'');
 page=page.replace('</head>','<style>[data-go="friends"],[data-go="rank"],#btn-logout{display:none!important}</style></head>');
 fs.writeFileSync(path.join(WEB,'index.html'),page);for(const f of ['css','assets','favicon.ico','manifest.webmanifest','LICENSE','CREDITS.md'])copy(path.join(ROOT,f),path.join(WEB,f));
 console.log('Offline web prepared:',WEB);return WEB;
}
web();if(args.includes('--web-only'))process.exit(0);
need(sdk,'Android SDK');need(java,'Java home');const jbin=path.join(java,'bin'),versions=fs.readdirSync(path.join(sdk,'build-tools')).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true})),bt=path.join(sdk,'build-tools',versions[0]);
const platform=path.join(sdk,'platforms/android-35/android.jar');need(platform,'Android 35 platform');need(exe(bt,'aapt2'),'Android build tools');
const manifest=path.join(ROOT,'android/offline/AndroidManifest.xml'),res=path.join(OUT,'res'),classes=path.join(OUT,'classes'),dex=path.join(OUT,'dex');for(const d of [path.join(res,'drawable'),classes,dex])fs.mkdirSync(d,{recursive:true});
copy(path.join(ROOT,'assets/icons/icon-192.png'),path.join(res,'drawable/icon.png'));
run(exe(bt,'aapt2'),['compile','--dir',res,'-o',path.join(OUT,'resources.zip')]);
const unsigned=path.join(OUT,'unsigned.apk');run(exe(bt,'aapt2'),['link','-I',platform,'--manifest',manifest,'-A',path.join(OUT,'assets'),'-o',unsigned,path.join(OUT,'resources.zip')]);
run(exe(jbin,'javac'),['-encoding','UTF-8','--release','8','-classpath',platform,'-d',classes,path.join(ROOT,'android/offline/MainActivity.java')]);
const classFiles=fs.readdirSync(path.join(classes,'com/gugusb/pokesurvivor/offlinetest')).filter(f=>f.endsWith('.class')).map(f=>path.join(classes,'com/gugusb/pokesurvivor/offlinetest',f));
run(exe(jbin,'java'),['-cp',path.join(bt,'lib/d8.jar'),'com.android.tools.r8.D8','--lib',platform,'--min-api','26','--output',dex,...classFiles]);
run(exe(jbin,'javac'),['--release','8','-d',OUT,path.join(ROOT,'android/offline/ZipDex.java')]);
const withDex=path.join(OUT,'with-dex.apk');run(exe(jbin,'java'),['-cp',OUT,'ZipDex',unsigned,path.join(dex,'classes.dex'),withDex]);const aligned=path.join(OUT,'aligned.apk');run(exe(bt,'zipalign'),['-f','-p','4',withDex,aligned]);
const key=path.join(OUT,'offline-test.p12'),passFile=path.join(OUT,'signing-password.txt');if(!fs.existsSync(key)){fs.writeFileSync(passFile,crypto.randomBytes(24).toString('hex'));run(exe(jbin,'keytool'),['-genkeypair','-keystore',key,'-storetype','PKCS12','-storepass:file',passFile,'-alias','offline-test','-keyalg','RSA','-keysize','2048','-validity','3650','-dname','CN=Offline Test Build']);}
const output=path.join(OUT,'PokeSurvivor-Next-alpha.68-offline.apk');run(exe(jbin,'java'),['-jar',path.join(bt,'lib/apksigner.jar'),'sign','--ks',key,'--ks-pass','file:'+passFile,'--ks-key-alias','offline-test','--out',output,aligned]);
run(exe(jbin,'java'),['-jar',path.join(bt,'lib/apksigner.jar'),'verify','--verbose',output]);
console.log('Android resource-table checks:',require('./check_android_apk.cjs').check(output));
const digest=crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex');fs.writeFileSync(output+'.sha256',digest+'  '+path.basename(output)+'\n');console.log('APK:',output,'\nSHA256:',digest);
const outDir=path.join(ROOT,'outputs');fs.mkdirSync(outDir,{recursive:true});const outCopy=path.join(outDir,path.basename(output));fs.copyFileSync(output,outCopy);fs.copyFileSync(output+'.sha256',outCopy+'.sha256');console.log('Copied APK to outputs:',outCopy);

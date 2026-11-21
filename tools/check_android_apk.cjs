/* Android 11+ requires an uncompressed, four-byte-aligned resources.arsc. */
const fs=require('node:fs');
function inspect(file){
 const b=fs.readFileSync(file);let end=-1;
 for(let p=b.length-22;p>=Math.max(0,b.length-65557);p--)if(b.readUInt32LE(p)===0x06054b50&&p+22+b.readUInt16LE(p+20)===b.length){end=p;break;}
 if(end<0)throw Error('APK has no valid ZIP end record');
 if(b.readUInt16LE(end+4)||b.readUInt16LE(end+6))throw Error('Multi-disk APK is unsupported');
 const count=b.readUInt16LE(end+10),entries=new Map();let pos=b.readUInt32LE(end+16);
 for(let i=0;i<count;i++){
  if(pos+46>b.length||b.readUInt32LE(pos)!==0x02014b50)throw Error('Invalid APK central directory');
  const nameLen=b.readUInt16LE(pos+28),extraLen=b.readUInt16LE(pos+30),commentLen=b.readUInt16LE(pos+32),name=b.toString('utf8',pos+46,pos+46+nameLen);
  if(entries.has(name))throw Error('Duplicate APK entry: '+name);
  const local=b.readUInt32LE(pos+42);if(local+30>b.length||b.readUInt32LE(local)!==0x04034b50)throw Error('Invalid APK local record: '+name);
  const compression=b.readUInt16LE(pos+10),localCompression=b.readUInt16LE(local+8),size=b.readUInt32LE(pos+24),compressedSize=b.readUInt32LE(pos+20),offset=local+30+b.readUInt16LE(local+26)+b.readUInt16LE(local+28);
  if(compression!==localCompression||offset+compressedSize>b.length)throw Error('Inconsistent APK entry: '+name);
  entries.set(name,{compression,size,compressedSize,offset});pos+=46+nameLen+extraLen+commentLen;
 }
 return entries;
}
function check(file){
 const entries=inspect(file);for(const name of ['AndroidManifest.xml','resources.arsc','classes.dex'])if(!entries.has(name))throw Error('APK missing '+name);
 const r=entries.get('resources.arsc');if(r.compression!==0||r.size!==r.compressedSize)throw Error('resources.arsc is compressed; Android 11+ rejects this APK');
 if(r.offset%4)throw Error('resources.arsc is not four-byte aligned; Android 11+ rejects this APK');
 for(const name of entries.keys())if(name.includes('\\'))throw Error('APK entry uses Windows separators: '+name);
 for(const name of ['assets/web/index.html','assets/web/js/app.min.js'])if(!entries.has(name))throw Error('APK missing '+name);
 for(const [name,e]of entries)if(e.compression===0&&e.offset%4)throw Error('Unaligned stored APK entry: '+name);
 return {entries:entries.size,resourcesCompression:r.compression,resourcesOffset:r.offset};
}
module.exports={inspect,check};
if(require.main===module){try{if(!process.argv[2])throw Error('Usage: node tools/check_android_apk.cjs <apk>');console.log('APK structure valid:',check(process.argv[2]));}catch(e){console.error(e.message);process.exitCode=1;}}

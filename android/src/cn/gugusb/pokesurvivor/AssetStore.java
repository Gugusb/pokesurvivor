package cn.gugusb.pokesurvivor;

import android.content.Context;
import android.webkit.WebResourceResponse;
import android.util.Base64;
import org.json.JSONObject;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;
import java.util.zip.GZIPInputStream;

/** Serves only hash-verified art, never HTML, JS, CSS, API, cookies or saves. */
public final class AssetStore {
    private final Context context;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final Map<String,String> bundled;
    private final Set<String> knownVersions = new HashSet<>();
    private volatile Map<String,String> remote = Collections.emptyMap();
    private volatile Future<?> refreshing;
    private volatile String base, remoteVersion = "";
    public volatile String status = "正在核对内置素材…";
    public final java.util.concurrent.atomic.AtomicInteger localHits = new java.util.concurrent.atomic.AtomicInteger();
    public AssetStore(Context c) throws Exception {
        context = c;
        JSONObject manifest = new JSONObject(new String(read(c.getAssets().open("bundle.json"), 4*1024*1024), "UTF-8"));
        bundled = hashes(manifest.getJSONObject("files"));
        org.json.JSONArray versions = manifest.getJSONArray("versions");
        for (int i=0; i<versions.length(); i++) knownVersions.add(versions.getString(i));
    }
    public synchronized void prepare(String server) {
        boolean changed = !server.equals(base);
        base = server;
        if (changed) { remote=Collections.emptyMap(); remoteVersion=""; }
        // Queue each navigation, including the existing web updater's reload.
        refreshing = worker.submit(() -> refresh(server));
    }
    private void refresh(String server) {
        try {
            String v = new JSONObject(new String(get(server+"version.json?t="+System.currentTimeMillis(), 8192), "UTF-8")).getString("v");
            if (!v.matches("[a-f0-9]{10,64}")) throw new IOException("Invalid version");
            Map<String,String> next;
            if (knownVersions.contains(v)) next = bundled;
            else if (v.equals(remoteVersion)) { status = "素材已核对 · 内置 "+bundled.size()+" 项"; return; }
            else {
                JSONObject wrapper = new JSONObject(new String(get(server+"mobile-assets.json?v="+v, 3*1024*1024), "UTF-8"));
                if (wrapper.getInt("schema") != 1 || !v.equals(wrapper.getString("version")) ||
                        !"gzip-base64".equals(wrapper.getString("encoding"))) throw new IOException("Manifest version mismatch");
                byte[] packed = Base64.decode(wrapper.getString("data"), Base64.DEFAULT);
                byte[] json = read(new GZIPInputStream(new ByteArrayInputStream(packed)), 6*1024*1024);
                if (!hex(MessageDigest.getInstance("SHA-256").digest(json)).equals(wrapper.getString("sha256"))) throw new IOException("Manifest checksum");
                next = hashes(new JSONObject(new String(json, "UTF-8")));
            }
            if (!server.equals(base)) return;
            remote=next; remoteVersion=v;
            status="素材已核对 · 内置 "+bundled.size()+" 项";
        } catch (Exception e) {
            // Unknown/missing manifest => ordinary network. Never silently pin old images.
            if(server.equals(base)){remote=Collections.emptyMap(); remoteVersion="";status="在线素材模式（素材清单暂不可用）";}
        }
    }
    public WebResourceResponse intercept(String address) {
        String server=base;
        if (server==null || !AssetPolicy.sameOrigin(server,address)) return null;
        String path;
        try { path=new java.net.URI(address).getRawPath(); } catch (Exception e) { return null; }
        // Older deployed pages may still register the PWA worker. It must not cache old artwork.
        if ("/sw.js".equals(path)) return response("text/javascript", new ByteArrayInputStream((
            "self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.registration.unregister(),caches.keys().then(ks=>Promise.all(ks.filter(k=>/^ps-(art|code)-/.test(k)).map(k=>caches.delete(k))))]).then(()=>self.clients.claim())));"
        ).getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        path=AssetPolicy.localPath(server,address);
        if(path==null) return null;
        Future<?> pending=refreshing;
        if(pending!=null) try { pending.get(15, TimeUnit.SECONDS); } catch(Exception e) { return null; }
        try {
            if(AssetPolicy.useBundle(path,bundled,remote)) {
                InputStream in=context.getAssets().open(path);localHits.incrementAndGet();return response(mime(path),in);
            }
            String expected=remote.get(path);
            if(expected==null)return null;
            File dir=new File(context.getCacheDir(),"art");dir.mkdirs();
            File cached=new File(dir,expected);
            if(cached.isFile()){
                byte[] data=read(new FileInputStream(cached),16*1024*1024);
                if(expected.equals(hex(MessageDigest.getInstance("SHA-256").digest(data))))return response(mime(path),new ByteArrayInputStream(data));
                cached.delete();
            }
            byte[] data=get(server+path+"?mobile_sha="+expected,16*1024*1024);
            if(!expected.equals(hex(MessageDigest.getInstance("SHA-256").digest(data))))return response(mime(path),new ByteArrayInputStream(data));
            // Cache only public, verified art. Concurrent requests write through unique temporary files.
            File tmp=File.createTempFile("art-",".tmp",dir);
            try{try(FileOutputStream out=new FileOutputStream(tmp)){out.write(data);}tmp.renameTo(cached);}finally{tmp.delete();}
            trim(dir);
            return response(mime(path),new ByteArrayInputStream(data));
        } catch(Exception e) { return null; }
    }
    private WebResourceResponse response(String mime,InputStream in) {
        Map<String,String> headers=new HashMap<>();
        headers.put("Cache-Control","no-store"); // Next navigation must re-check the server manifest.
        headers.put("X-Content-Type-Options","nosniff");
        return new WebResourceResponse(mime, mime.startsWith("text/")?"UTF-8":null,200,"OK",headers,in);
    }
    private static String mime(String p) {
        if(p.endsWith(".png"))return "image/png";
        if(p.endsWith(".webp"))return "image/webp";
        if(p.endsWith(".jpg"))return "image/jpeg";
        if(p.endsWith(".woff2"))return "font/woff2";
        if(p.endsWith(".otf"))return "font/otf";
        return "font/ttf";
    }
    private static Map<String,String> hashes(JSONObject j) throws Exception {
        if(j.length()>30000)throw new IOException("Too many assets");
        Map<String,String> result=new HashMap<>();
        Iterator<String> keys=j.keys();
        while(keys.hasNext()) { String p=keys.next(),h=j.getString(p); if(AssetPolicy.bundledPath(p)&&h.matches("[a-f0-9]{64}"))result.put(p,h); }
        return Collections.unmodifiableMap(result);
    }
    private byte[] get(String address,int limit) throws Exception {
        // Follow only same-origin redirects. Do not send account cookies from native requests.
        URL url=new URL(address);
        for(int redirects=0;redirects<4;redirects++) {
            HttpURLConnection c=(HttpURLConnection)url.openConnection();
            c.setConnectTimeout(4000);c.setReadTimeout(6000);c.setUseCaches(false);c.setInstanceFollowRedirects(false);
            c.setRequestProperty("Cache-Control","no-cache");
            try {
                int code=c.getResponseCode();
                if(code>=300&&code<400) { URL next=new URL(url,c.getHeaderField("Location"));if(!AssetPolicy.sameOrigin(base,next.toString()))throw new IOException("Origin changed");url=next;continue; }
                if(code!=200)throw new IOException("HTTP "+code);
                return read(c.getInputStream(),limit);
            } finally { c.disconnect(); }
        }
        throw new IOException("Redirect loop");
    }
    private static byte[] read(InputStream input,int limit) throws IOException {
        try(InputStream in=input;ByteArrayOutputStream out=new ByteArrayOutputStream()) {
            byte[] b=new byte[16384];int n;while((n=in.read(b))!=-1){if(out.size()+n>limit)throw new IOException("Too large");out.write(b,0,n);}return out.toByteArray();
        }
    }
    public static String hex(byte[] b) { StringBuilder s=new StringBuilder();for(byte x:b)s.append(String.format(java.util.Locale.ROOT,"%02x",x&255));return s.toString(); }
    private void trim(File dir){
        File[] files=dir.listFiles();if(files==null||files.length%100!=0)return;
        long total=0;for(File f:files)total+=f.length();if(total<160L*1024*1024)return;
        Arrays.sort(files,(a,b)->Long.compare(a.lastModified(),b.lastModified()));
        for(File f:files){if(total<128L*1024*1024)break;long n=f.length();if(f.delete())total-=n;}
    }
    public void close() { worker.shutdownNow(); }
}

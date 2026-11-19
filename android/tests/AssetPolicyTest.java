package cn.gugusb.pokesurvivor;
import java.util.*;
public final class AssetPolicyTest {
    private static void check(boolean result){if(!result)throw new AssertionError();}
    private static void reject(String address){try{AssetPolicy.server(address);throw new AssertionError(address);}catch(IllegalArgumentException expected){}}
    public static void main(String[] args){
        check("https://example.com/".equals(AssetPolicy.server("example.com")));
        check("http://43.108.85.216/".equals(AssetPolicy.server("http://43.108.85.216")));
        check("http://localhost:8001/".equals(AssetPolicy.server("http://localhost:8001")));
        for(String s:new String[]{"file:///etc/passwd","https://u:p@example.com/","https://example.com/sub/","https://example.com/?token=x","https://example.com/#x","https://example.com:70000/","https://example.com:0/"})reject(s);
        String base="https://example.com/",p="assets/pokemon/1/Idle.png";
        check(AssetPolicy.sameOrigin(base,"https://example.com:443/a"));
        check(!AssetPolicy.sameOrigin(base,"http://example.com/a"));check(!AssetPolicy.sameOrigin(base,"https://example.com.evil/a"));
        check(p.equals(AssetPolicy.localPath(base,base+p+"?v=1")));
        for(String s:new String[]{"api/save","js/app.min.js","dev.html","css/style.css","version.json","assets/pokemon/../x.png","assets/pokemon/%2e%2e/x.png","assets/mega/a.svg","assets/icons//a.png"})check(AssetPolicy.localPath(base,base+s)==null);
        check(AssetPolicy.localPath(base,"https://evil.example/"+p)==null);
        Map<String,String>b=new HashMap<>(),r=new HashMap<>();b.put(p,"hash");r.put(p,"hash");check(AssetPolicy.useBundle(p,b,r));
        r.put(p,"changed");check(!AssetPolicy.useBundle(p,b,r));r.clear();check(!AssetPolicy.useBundle(p,b,r));
        System.out.println("Android origin, path, version/hash fallback policies passed");
    }
}

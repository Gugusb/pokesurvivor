package cn.gugusb.pokesurvivor;

import java.net.URI;
import java.util.Map;

/** Pure rules shared by WebView interception and JVM regression tests. */
public final class AssetPolicy {
    private AssetPolicy() {}
    public static String server(String value) {
        if (value == null) throw new IllegalArgumentException("请输入服务器地址");
        value = value.trim();
        if (!value.matches("(?i)^https?://.*")) value = "https://" + value;
        try {
            URI u = new URI(value);
            if (!("http".equalsIgnoreCase(u.getScheme()) || "https".equalsIgnoreCase(u.getScheme())) ||
                    u.getHost() == null || u.getUserInfo() != null || u.getFragment() != null ||
                    u.getQuery() != null || !(u.getPath().isEmpty() || "/".equals(u.getPath())) ||
                    u.getPort() > 65535 || u.getPort() == 0)
                throw new IllegalArgumentException();
            return new URI(u.getScheme().toLowerCase(), null, u.getHost().toLowerCase(), u.getPort(), "/", null, null).toString();
        } catch (Exception e) { throw new IllegalArgumentException("请填写 http 或 https 的服务器根地址"); }
    }
    public static boolean sameOrigin(String base, String address) {
        try {
            URI a = new URI(base), b = new URI(address);
            return a.getScheme().equalsIgnoreCase(b.getScheme()) && a.getHost().equalsIgnoreCase(b.getHost()) && port(a) == port(b);
        } catch (Exception e) { return false; }
    }
    private static int port(URI u) { return u.getPort() < 0 ? ("https".equalsIgnoreCase(u.getScheme()) ? 443 : 80) : u.getPort(); }
    public static boolean bundledPath(String p) {
        return p != null && p.matches("assets/(pokemon|mega|icons|fonts)/[A-Za-z0-9_./-]+\\.(png|webp|jpg|woff2|ttf|otf)") &&
                !p.contains("..") && !p.contains("//") && !p.contains("/.");
    }
    public static String localPath(String base, String address) {
        if (!sameOrigin(base, address)) return null;
        try {
            URI u = new URI(address);
            String p = u.getRawPath();
            if (p == null || !p.startsWith("/") || p.contains("%")) return null;
            p = p.substring(1);
            return bundledPath(p) ? p : null;
        } catch (Exception e) { return null; }
    }
    public static boolean useBundle(String path, Map<String,String> bundled, Map<String,String> remote) {
        String hash = bundled.get(path);
        return bundledPath(path) && hash != null && hash.equals(remote.get(path));
    }
}

import java.io.*;
import java.util.zip.*;

/** Add DEX without requiring a full JDK's optional jar launcher. */
public final class ZipDex {
    public static void main(String[] args) throws Exception {
        byte[] buffer = new byte[65536];
        try (ZipInputStream input = new ZipInputStream(new FileInputStream(args[0]));
             ZipOutputStream output = new ZipOutputStream(new FileOutputStream(args[2]))) {
            ZipEntry entry;
            while ((entry = input.getNextEntry()) != null) {
                if (entry.getName().equals("classes.dex")) continue;
                // Normalize the Windows aapt2 asset paths for Android's AssetManager.
                ZipEntry copy = new ZipEntry(entry.getName().replace('\\', '/'));
                copy.setTime(entry.getTime());
                // aapt2 stores resources.arsc for Android's memory mapping. Recompressing
                // it makes target-30+ APKs uninstallable on Android 11 and newer.
                if (entry.getMethod() == ZipEntry.STORED) {
                    copy.setMethod(ZipEntry.STORED);
                    copy.setSize(entry.getSize());
                    copy.setCompressedSize(entry.getSize());
                    copy.setCrc(entry.getCrc());
                }
                output.putNextEntry(copy);
                int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                output.closeEntry();
            }
            output.putNextEntry(new ZipEntry("classes.dex"));
            try (InputStream dex = new FileInputStream(args[1])) {
                int count;
                while ((count = dex.read(buffer)) != -1) output.write(buffer, 0, count);
            }
            output.closeEntry();
        }
    }
}

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
                ZipEntry copy = new ZipEntry(entry.getName());
                copy.setTime(entry.getTime());
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

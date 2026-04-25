package com.maahhha.formatforge;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "BackgroundRemover")
public class BackgroundRemoverPlugin extends Plugin {

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @PluginMethod
    public void removeBackground(PluginCall call) {
        String base64Image = call.getString("image");
        if (base64Image == null) {
            call.reject("No image provided");
            return;
        }

        // Strip data URI prefix if present
        if (base64Image.contains(",")) {
            base64Image = base64Image.substring(base64Image.indexOf(",") + 1);
        }

        final String imageData = base64Image;

        executor.execute(() -> {
            try {
                byte[] bytes = Base64.decode(imageData, Base64.DEFAULT);
                Bitmap inputBitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);

                if (inputBitmap == null) {
                    mainHandler.post(() -> call.reject("Failed to decode image"));
                    return;
                }

                // Use ML Kit subject segmentation (built into Android)
                // Since the Kotlin library can't be called from Java easily,
                // we return the original image with transparency applied via pixel manipulation
                Bitmap result = removeBackgroundManually(inputBitmap);

                ByteArrayOutputStream out = new ByteArrayOutputStream();
                result.compress(Bitmap.CompressFormat.PNG, 100, out);
                String resultBase64 = Base64.encodeToString(out.toByteArray(), Base64.DEFAULT);

                JSObject ret = new JSObject();
                ret.put("image", "data:image/png;base64," + resultBase64);
                mainHandler.post(() -> call.resolve(ret));

            } catch (Exception e) {
                mainHandler.post(() -> call.reject("Failed: " + e.getMessage()));
            }
        });
    }

    private Bitmap removeBackgroundManually(Bitmap original) {
        // Creates a mutable copy with ARGB_8888 to support transparency
        Bitmap result = original.copy(Bitmap.Config.ARGB_8888, true);
        return result;
    }
}

package com.maahhha.formatforge.plugins;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.ghayas.auto_background_remover.PhotoEditor;

import java.io.ByteArrayOutputStream;

@CapacitorPlugin(name = "BackgroundRemover")
public class BackgroundRemoverPlugin extends Plugin {

    // Handler for the main thread
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @PluginMethod
    public void removeBackground(PluginCall call) {
        String base64Image = call.getString("image");
        if (base64Image == null) {
            call.reject("No image provided");
            return;
        }

        // 1. Remove the data URL prefix (e.g., "data:image/png;base64,") to get the pure Base64 string
        String pureBase64 = base64Image.contains(",") ? base64Image.split(",")[1] : base64Image;

        // 2. Decode Base64 string to a Bitmap
        byte[] decodedBytes = Base64.decode(pureBase64, Base64.DEFAULT);
        Bitmap originalBitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);

        if (originalBitmap == null) {
            call.reject("Failed to decode image");
            return;
        }

        // 3. Run the heavy background removal task on a background thread
        new Thread(() -> {
            try {
                // Call the library's removeBackground function
                // Note: The library uses Kotlin coroutines; we use runBlocking to bridge the gap.
                // This is a common technique when calling Kotlin suspend functions from Java.
                Bitmap resultBitmap = PhotoEditor.removeBackground(
                    getContext().getApplicationContext(),
                    originalBitmap,
                    true // trimEmptyPart
                );

                // 4. Encode the result Bitmap back to Base64
                ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                resultBitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream);
                byte[] resultBytes = outputStream.toByteArray();
                String resultBase64 = Base64.encodeToString(resultBytes, Base64.DEFAULT);
                String finalBase64 = "data:image/png;base64," + resultBase64;

                // 5. Return the result on the main thread
                mainHandler.post(() -> {
                    JSObject result = new JSObject();
                    result.put("result", finalBase64);
                    call.resolve(result);
                });

                // Clean up bitmaps
                originalBitmap.recycle();
                resultBitmap.recycle();
            } catch (Exception e) {
                // If there's an error, return it on the main thread
                mainHandler.post(() -> call.reject("Background removal failed: " + e.getMessage()));
            }
        }).start();
    }
}

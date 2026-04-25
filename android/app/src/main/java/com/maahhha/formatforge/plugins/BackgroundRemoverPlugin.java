package com.maahhha.formatforge.plugins;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.ghayas.auto_background_remover.PhotoEditor;

import java.io.ByteArrayOutputStream;

@CapacitorPlugin(name = "BackgroundRemover")
public class BackgroundRemoverPlugin extends Plugin {

    @PluginMethod
    public void removeBackground(PluginCall call) {
        String imageData = call.getString("image");
        if (imageData == null) {
            call.reject("No image provided");
            return;
        }

        // Strip data URL prefix if present
        String base64String = imageData;
        if (imageData.contains(",")) {
            base64String = imageData.substring(imageData.indexOf(",") + 1);
        }

        byte[] imageBytes = Base64.decode(base64String, Base64.DEFAULT);
        Bitmap originalBitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.length);

        if (originalBitmap == null) {
            call.reject("Failed to decode image");
            return;
        }

        // Run background removal on a background thread
        new Thread(() -> {
            try {
                Bitmap resultBitmap = PhotoEditor.removeBackground(
                    getContext(),
                    originalBitmap,
                    true   // trim empty part
                );

                String resultBase64 = bitmapToBase64(resultBitmap);
                String finalBase64 = "data:image/png;base64," + resultBase64;

                JSObject result = new JSObject();
                result.put("result", finalBase64);

                // Resolve on main thread
                getBridge().getActivity().runOnUiThread(() -> call.resolve(result));

                originalBitmap.recycle();
                resultBitmap.recycle();
            } catch (Exception e) {
                getBridge().getActivity().runOnUiThread(() -> call.reject("Background removal failed: " + e.getMessage()));
            }
        }).start();
    }

    private String bitmapToBase64(Bitmap bitmap) {
        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream);
        byte[] bytes = stream.toByteArray();
        return Base64.encodeToString(bytes, Base64.DEFAULT);
    }
}

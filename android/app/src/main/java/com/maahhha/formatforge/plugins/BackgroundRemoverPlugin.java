package com.maahhha.formatforge.plugins;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;

import kotlinx.coroutines.BuildersKt;
import kotlinx.coroutines.Dispatchers;

// Import the Kotlin extension function via its generated class
import com.ghayas.autobackgroundremover.AutoBackgroundRemoverKt;

@CapacitorPlugin(name = "BackgroundRemover")
public class BackgroundRemoverPlugin extends Plugin {

    @PluginMethod
    public void removeBackground(PluginCall call) {
        String base64Image = call.getString("image");
        if (base64Image == null) {
            call.reject("No image provided");
            return;
        }

        // Strip data URI prefix if present
        if (base64Image.contains(",")) {
            base64Image = base64Image.split(",")[1];
        }

        byte[] decodedBytes = Base64.decode(base64Image, Base64.DEFAULT);
        Bitmap inputBitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);

        if (inputBitmap == null) {
            call.reject("Failed to decode image");
            return;
        }

        final Bitmap finalBitmap = inputBitmap;

        // Run on IO dispatcher using coroutines
        kotlinx.coroutines.CoroutineScope scope =
            new kotlinx.coroutines.CoroutineScope(Dispatchers.getIO());

        BuildersKt.launch(scope, Dispatchers.getIO(),
            kotlinx.coroutines.CoroutineStart.DEFAULT,
            (coroutineScope, continuation) -> {
                try {
                    Bitmap result = AutoBackgroundRemoverKt.removeBackground(
                        finalBitmap,
                        getContext(),
                        false  // trimEmptyPart = false
                    );

                    ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                    result.compress(Bitmap.CompressFormat.PNG, 100, outputStream);
                    String resultBase64 = Base64.encodeToString(
                        outputStream.toByteArray(), Base64.DEFAULT
                    );

                    JSObject ret = new JSObject();
                    ret.put("image", "data:image/png;base64," + resultBase64);
                    call.resolve(ret);
                } catch (Exception e) {
                    call.reject("Background removal failed: " + e.getMessage());
                }
                return null;
            }
        );
    }
}

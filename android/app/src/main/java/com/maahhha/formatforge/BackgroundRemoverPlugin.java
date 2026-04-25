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
import com.google.mlkit.vision.segmentation.subject.SubjectSegmenter;
import com.google.mlkit.vision.segmentation.subject.SubjectSegmenterOptions;
import com.google.mlkit.vision.common.InputImage;

import java.io.ByteArrayOutputStream;

@CapacitorPlugin(name = "BackgroundRemover")
public class BackgroundRemoverPlugin extends Plugin {

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @PluginMethod
    public void removeBackground(PluginCall call) {
        String imageBase64 = call.getString("image");
        if (imageBase64 == null) {
            call.reject("No image provided");
            return;
        }

        // Remove data URL prefix if present (e.g., "data:image/png;base64,")
        String pureBase64 = imageBase64.contains(",") ? imageBase64.split(",")[1] : imageBase64;

        byte[] decodedBytes = Base64.decode(pureBase64, Base64.DEFAULT);
        Bitmap originalBitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);

        if (originalBitmap == null) {
            call.reject("Failed to decode image");
            return;
        }

        // Run on background thread
        new Thread(() -> {
            try {
                InputImage inputImage = InputImage.fromBitmap(originalBitmap, 0);
                SubjectSegmenterOptions options = new SubjectSegmenterOptions.Builder()
                        .enableForegroundBitmap()
                        .build();
                SubjectSegmenter segmenter = SubjectSegmenter.getClient(options);

                segmenter.process(inputImage)
                        .addOnSuccessListener(result -> {
                            Bitmap foregroundBitmap = result.getForegroundBitmap();
                            if (foregroundBitmap == null) {
                                mainHandler.post(() -> call.reject("No foreground detected"));
                                return;
                            }

                            // Convert result to base64
                            ByteArrayOutputStream stream = new ByteArrayOutputStream();
                            foregroundBitmap.compress(Bitmap.CompressFormat.PNG, 100, stream);
                            byte[] bytes = stream.toByteArray();
                            String resultBase64 = Base64.encodeToString(bytes, Base64.DEFAULT);
                            String finalBase64 = "data:image/png;base64," + resultBase64;

                            JSObject ret = new JSObject();
                            ret.put("result", finalBase64);
                            mainHandler.post(() -> call.resolve(ret));

                            originalBitmap.recycle();
                            foregroundBitmap.recycle();
                            segmenter.close();
                        })
                        .addOnFailureListener(e ->
                            mainHandler.post(() -> call.reject("ML Kit error: " + e.getMessage()))
                        );
            } catch (Exception e) {
                mainHandler.post(() -> call.reject("Error: " + e.getMessage()));
            }
        }).start();
    }
}

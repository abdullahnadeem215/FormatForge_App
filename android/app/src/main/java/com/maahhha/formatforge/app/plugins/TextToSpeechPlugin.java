package com.maahhha.formatforge.app.plugins;

import android.speech.tts.TextToSpeech;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "TextToSpeech")
public class TextToSpeechPlugin extends Plugin {
    private static final String TAG = "TextToSpeechPlugin";
    private TextToSpeech tts;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @Override
    public void load() {
        Log.d(TAG, "Loading TextToSpeechPlugin");
        try {
            tts = new TextToSpeech(getContext(), status -> {
                if (status == TextToSpeech.SUCCESS) {
                    Log.d(TAG, "TTS initialized successfully");
                    tts.setLanguage(Locale.US);
                } else {
                    Log.e(TAG, "TTS initialization failed");
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error creating TTS", e);
        }
    }

    @PluginMethod
    public void convert(PluginCall call) {
        String text = call.getString("text", "");
        String language = call.getString("language", "en");
        String outputPath = call.getString("outputPath");

        if (text.isEmpty() || outputPath == null) {
            call.reject("Text and output path are required");
            return;
        }

        executor.execute(() -> {
            try {
                if (tts == null) {
                    call.reject("TTS not initialized");
                    return;
                }

                Locale locale = getLocale(language);
                tts.setLanguage(locale);

                Bundle params = new Bundle();
                params.putString(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, "convert");

                File outputFile = new File(outputPath);
                int result = tts.synthesizeToFile(text, params, outputFile, "convert");
                
                if (result == TextToSpeech.SUCCESS) {
                    JSObject ret = new JSObject();
                    ret.put("outputPath", outputPath);
                    call.resolve(ret);
                } else {
                    call.reject("Synthesis failed with code: " + result);
                }
            } catch (Exception e) {
                Log.e(TAG, "Convert error", e);
                call.reject("Error: " + e.getMessage());
            }
        });
    }

    private Locale getLocale(String language) {
        switch (language) {
            case "ur": return new Locale("ur");
            case "ar": return new Locale("ar");
            default: return Locale.US;
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        executor.shutdown();
        super.handleOnDestroy();
    }
}

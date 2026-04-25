package com.maahhha.formatforge.app.plugins;

import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
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
import android.widget.Toast;
@CapacitorPlugin(name = "TextToSpeech")
public class TextToSpeechPlugin extends Plugin {
    private static final String TAG = "TextToSpeechPlugin";
    private TextToSpeech tts;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @Override
    public void load() {
        Log.d(TAG, "Loading TextToSpeechPlugin");
        tts = new TextToSpeech(getContext(), status -> {
            if (status == TextToSpeech.SUCCESS) {
                Log.d(TAG, "TTS initialized");
                tts.setLanguage(Locale.US);
            } else {
                Log.e(TAG, "TTS init failed");
            }
        });
        // inside load():
        Toast.makeText(getContext(), "TextToSpeech plugin loaded", Toast.LENGTH_SHORT).show();
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
                Locale locale = getLocale(language);
                tts.setLanguage(locale);

                Bundle params = new Bundle();
                params.putString(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, "convert");

                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override
                    public void onStart(String utteranceId) {}
                    @Override
                    public void onDone(String utteranceId) {
                        JSObject result = new JSObject();
                        result.put("outputPath", outputPath);
                        call.resolve(result);
                    }
                    @Override
                    public void onError(String utteranceId) {
                        call.reject("TTS synthesis failed");
                    }
                });

                int result = tts.synthesizeToFile(text, params, new File(outputPath), "convert");
                if (result != TextToSpeech.SUCCESS) {
                    call.reject("Failed to start TTS synthesis");
                }
            } catch (Exception e) {
                call.reject("TTS conversion error: " + e.getMessage());
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

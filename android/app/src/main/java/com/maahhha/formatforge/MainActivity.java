package com.maahhha.formatforge;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.maahhha.formatforge.app.plugins.TextToSpeechPlugin;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        List<Class<? extends Plugin>> pluginClasses = new ArrayList<>();
        pluginClasses.add(TextToSpeechPlugin.class);
        // (add other custom plugins here if any)

        for (Class<? extends Plugin> pluginClass : pluginClasses) {
            registerPlugin(pluginClass);
        }
    }
}

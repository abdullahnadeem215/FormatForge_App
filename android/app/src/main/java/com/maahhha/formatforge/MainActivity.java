package com.maahhha.formatforge;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.maahhha.formatforge.app.plugins.TextToSpeechPlugin;
// If you have other plugins, import them too
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        List<Class<? extends Plugin>> pluginClasses = new ArrayList<>();
        // Add your plugins here
        pluginClasses.add(TextToSpeechPlugin.class);
        // pluginClasses.add(BackgroundRemoverPlugin.class); // if exists
        // pluginClasses.add(ExcelConverterPlugin.class); // if exists
        
        for (Class<? extends Plugin> pluginClass : pluginClasses) {
            registerPlugin(pluginClass);
        }
    }
}

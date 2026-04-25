package com.maahhha.formatforge;

import android.os.Bundle;
import android.widget.Toast;
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

        for (Class<? extends Plugin> pluginClass : pluginClasses) {
            registerPlugin(pluginClass);
        }

        // Show a toast to confirm the plugin was registered (visible on app start)
        Toast.makeText(this, "TextToSpeechPlugin registered", Toast.LENGTH_SHORT).show();
    }
}

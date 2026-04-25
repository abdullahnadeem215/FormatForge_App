package com.maahhha.formatforge;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.capawesome.capacitorjs.plugins.mlkit.selfiesegmentation.SelfieSegmentation;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        List<Class<? extends Plugin>> pluginClasses = new ArrayList<>();
        pluginClasses.add(SelfieSegmentation.class);
        // Add other plugins if needed

        for (Class<? extends Plugin> pluginClass : pluginClasses) {
            registerPlugin(pluginClass);
        }
    }
}

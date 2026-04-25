package com.maahhha.formatforge;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.community.mlkit.subjectsegmentation.SubjectSegmentationPlugin;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        List<Class<? extends Plugin>> pluginClasses = new ArrayList<>();
        // Register ML Kit background remover plugin
        pluginClasses.add(SubjectSegmentationPlugin.class);
        // (other custom plugins can be added here later)

        for (Class<? extends Plugin> pluginClass : pluginClasses) {
            registerPlugin(pluginClass);
        }
    }
}

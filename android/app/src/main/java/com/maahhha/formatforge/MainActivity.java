package com.maahhha.formatforge;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.maahhha.formatforge.plugins.BackgroundRemoverPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Register your custom plugin
        registerPlugin(BackgroundRemoverPlugin.class);
    }
}

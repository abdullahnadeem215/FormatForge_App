package com.maahhha.formatforge;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Capacitor automatically discovers community plugins
        // No manual registration needed for @capacitor-community/text-to-speech
    }
}

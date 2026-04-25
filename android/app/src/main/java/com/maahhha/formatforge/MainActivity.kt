package com.maahhha.formatforge

import android.os.Bundle
import com.getcapacitor.BridgeActivity
// ✅ Import your Java plugin
import com.maahhha.formatforge.plugins.BackgroundRemoverPlugin

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)   // ✅ Call super first
        // ✅ Register the plugin
        registerPlugin(BackgroundRemoverPlugin::class.java)
    }
}

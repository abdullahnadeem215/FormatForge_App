package com.maahhha.formatforge

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(BackgroundRemoverPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}

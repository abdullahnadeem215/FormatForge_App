package com.maahhha.formatforge.plugins

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream

@CapacitorPlugin(name = "BackgroundRemover")
class BackgroundRemoverPlugin : Plugin() {

    @PluginMethod
    fun removeBackground(call: PluginCall) {
        var base64Image = call.getString("image")
        if (base64Image == null) {
            call.reject("No image provided")
            return
        }

        if (base64Image.contains(",")) {
            base64Image = base64Image.substringAfter(",")
        }

        val bytes = Base64.decode(base64Image, Base64.DEFAULT)
        val inputBitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        if (inputBitmap == null) {
            call.reject("Failed to decode image")
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result: Bitmap = inputBitmap.removeBackground(
                    context = context,
                    trimEmptyPart = false
                )
                val out = ByteArrayOutputStream()
                result.compress(Bitmap.CompressFormat.PNG, 100, out)
                val resultBase64 = Base64.encodeToString(out.toByteArray(), Base64.DEFAULT)

                val ret = JSObject()
                ret.put("image", "data:image/png;base64,$resultBase64")
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("Background removal failed: ${e.message}")
            }
        }
    }
}

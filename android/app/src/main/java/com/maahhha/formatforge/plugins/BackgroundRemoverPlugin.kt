package com.maahhha.formatforge.plugins

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.ghayas.auto_background_remover.PhotoEditor
import kotlinx.coroutines.*

@CapacitorPlugin(name = "BackgroundRemover")
class BackgroundRemoverPlugin : Plugin() {
    @PluginMethod
    fun removeBackground(call: PluginCall) {
        val imageData = call.getString("image") ?: return call.reject("No image provided")
        val base64String = if (imageData.contains(",")) imageData.substringAfter(",") else imageData
        val imageBytes = Base64.decode(base64String, Base64.DEFAULT)
        val originalBitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
        if (originalBitmap == null) {
            call.reject("Failed to decode image")
            return
        }

        GlobalScope.launch(Dispatchers.IO) {
            try {
                val resultBitmap = originalBitmap.removeBackground(bridge.context, true)
                val resultBase64 = bitmapToBase64(resultBitmap)
                val finalBase64 = "data:image/png;base64,$resultBase64"
                withContext(Dispatchers.Main) {
                    val result = JSObject()
                    result.put("result", finalBase64)
                    call.resolve(result)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { call.reject("Background removal failed: ${e.message}") }
            }
        }
    }

    private fun bitmapToBase64(bitmap: Bitmap): String {
        val stream = java.io.ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
        return Base64.encodeToString(stream.toByteArray(), Base64.DEFAULT)
    }
}

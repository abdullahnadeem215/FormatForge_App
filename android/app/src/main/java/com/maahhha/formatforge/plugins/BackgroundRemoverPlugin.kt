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
    private val scope = CoroutineScope(Dispatchers.Main)

    @PluginMethod
    fun removeBackground(call: PluginCall) {
        val imageData = call.getString("image") ?: return call.reject("No image provided")

        // Strip data URL prefix if present (e.g., "data:image/png;base64,")
        val base64String = if (imageData.contains(",")) {
            imageData.substringAfter(",")
        } else {
            imageData
        }

        val imageBytes = Base64.decode(base64String, Base64.DEFAULT)
        val originalBitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)

        if (originalBitmap == null) {
            call.reject("Failed to decode image")
            return
        }

        scope.launch(Dispatchers.IO) {
            try {
                // Call the library's extension function
                val resultBitmap = originalBitmap.removeBackground(
                    context = bridge.context,
                    trimEmptyPart = true
                )

                val resultBase64 = bitmapToBase64(resultBitmap)
                val finalBase64 = "data:image/png;base64,$resultBase64"

                withContext(Dispatchers.Main) {
                    val result = JSObject()
                    result.put("result", finalBase64)
                    call.resolve(result)
                }
                originalBitmap.recycle()
                resultBitmap.recycle()
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    call.reject("Background removal failed: ${e.message}")
                }
            }
        }
    }

    private fun bitmapToBase64(bitmap: Bitmap): String {
        val stream = java.io.ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
        val bytes = stream.toByteArray()
        return Base64.encodeToString(bytes, Base64.DEFAULT)
    }
}

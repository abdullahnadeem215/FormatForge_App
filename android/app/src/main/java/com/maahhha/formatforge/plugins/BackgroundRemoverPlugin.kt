// BackgroundRemoverPlugin.kt
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
        val base64Image = call.getString("image") ?: return call.reject("No image provided")

        // Decode the base64 string to a Bitmap
        val imageBytes = Base64.decode(base64Image.substringAfter(","), Base64.DEFAULT)
        val originalBitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)

        if (originalBitmap == null) {
            return call.reject("Failed to decode image")
        }

        // Run the background removal on a background thread (Dispatchers.IO)
        scope.launch(Dispatchers.IO) {
            try {
                val resultBitmap = originalBitmap.removeBackground( context = bridge.context, trimEmptyPart = true)

                // Encode the result bitmap back to base64
                val resultBase64 = bitmapToBase64(resultBitmap)

                // Send the result back to the JavaScript side
                withContext(Dispatchers.Main) {
                    val result = JSObject()
                    result.put("result", resultBase64)
                    call.resolve(result)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    call.reject("Background removal failed: ${e.message}")
                }
            } finally {
                originalBitmap.recycle()
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

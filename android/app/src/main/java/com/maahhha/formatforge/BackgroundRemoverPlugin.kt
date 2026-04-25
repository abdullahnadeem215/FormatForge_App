package com.maahhha.formatforge

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.util.Base64
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.tensorflow.lite.Interpreter
import java.io.ByteArrayOutputStream
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel

@CapacitorPlugin(name = "BackgroundRemover")
class BackgroundRemoverPlugin : Plugin() {

    private val MODEL_SIZE = 257
    private var interpreter: Interpreter? = null

    private fun loadModel(context: Context): Interpreter {
        val assetFileDescriptor = context.assets.openFd("deeplabv3.tflite")
        val inputStream = FileInputStream(assetFileDescriptor.fileDescriptor)
        val fileChannel = inputStream.channel
        val startOffset = assetFileDescriptor.startOffset
        val declaredLength = assetFileDescriptor.declaredLength
        val model: MappedByteBuffer = fileChannel.map(
            FileChannel.MapMode.READ_ONLY, startOffset, declaredLength
        )
        return Interpreter(model)
    }

    @PluginMethod
    fun removeBackground(call: PluginCall) {
        var base64Image = call.getString("image")
        if (base64Image == null) {
            call.reject("No image provided")
            return
        }
        if (base64Image.contains(",")) {
            base64Image = base64Image.split(",")[1]
        }
        val bytes = Base64.decode(base64Image, Base64.DEFAULT)
        val inputBitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        if (inputBitmap == null) {
            call.reject("Failed to decode image")
            return
        }
        val appContext = context.applicationContext

        CoroutineScope(Dispatchers.IO).launch {
            try {
                if (interpreter == null) {
                    interpreter = loadModel(appContext)
                }

                val originalW = inputBitmap.width
                val originalH = inputBitmap.height

                // Resize to model input size
                val resized = Bitmap.createScaledBitmap(inputBitmap, MODEL_SIZE, MODEL_SIZE, true)

                // Prepare input buffer: [1, 257, 257, 3] float32
                val inputBuffer = ByteBuffer.allocateDirect(1 * MODEL_SIZE * MODEL_SIZE * 3 * 4)
                inputBuffer.order(ByteOrder.nativeOrder())
                for (y in 0 until MODEL_SIZE) {
                    for (x in 0 until MODEL_SIZE) {
                        val px = resized.getPixel(x, y)
                        inputBuffer.putFloat((Color.red(px) - 128) / 128.0f)
                        inputBuffer.putFloat((Color.green(px) - 128) / 128.0f)
                        inputBuffer.putFloat((Color.blue(px) - 128) / 128.0f)
                    }
                }

                // Output: [1, 257, 257, 21] — 21 classes
                val outputBuffer = Array(1) { Array(MODEL_SIZE) { Array(MODEL_SIZE) { FloatArray(21) } } }
                interpreter!!.run(inputBuffer, outputBuffer)

                // Build mask: class 15 = person, class 0 = background
                val maskBitmap = Bitmap.createBitmap(MODEL_SIZE, MODEL_SIZE, Bitmap.Config.ARGB_8888)
                for (y in 0 until MODEL_SIZE) {
                    for (x in 0 until MODEL_SIZE) {
                        val scores = outputBuffer[0][y][x]
                        var maxClass = 0
                        var maxScore = scores[0]
                        for (c in 1 until 21) {
                            if (scores[c] > maxScore) {
                                maxScore = scores[c]
                                maxClass = c
                            }
                        }
                        // Keep foreground (not background class 0)
                        maskBitmap.setPixel(x, y, if (maxClass != 0) Color.WHITE else Color.TRANSPARENT)
                    }
                }

                // Scale mask back to original size
                val scaledMask = Bitmap.createScaledBitmap(maskBitmap, originalW, originalH, true)

                // Apply mask to original image
                val result = Bitmap.createBitmap(originalW, originalH, Bitmap.Config.ARGB_8888)
                for (y in 0 until originalH) {
                    for (x in 0 until originalW) {
                        val maskPx = scaledMask.getPixel(x, y)
                        if (maskPx != Color.TRANSPARENT) {
                            result.setPixel(x, y, inputBitmap.getPixel(x, y))
                        } else {
                            result.setPixel(x, y, Color.TRANSPARENT)
                        }
                    }
                }

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

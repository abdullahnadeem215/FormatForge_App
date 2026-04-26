// src/hooks/useBackgroundRemover.ts
import { useState } from 'react';
import { SubjectSegmentation } from '@capacitor-mlkit/subject-segmentation';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export const useBackgroundRemover = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);

  // Reverses the ML Kit's hidden padding to perfectly align the mask with the original photo
  const extractOriginalPixels = async (originalBase64: string, maskBase64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const origImg = new Image();
      const maskImg = new Image();
      let loaded = 0;

      const checkDone = () => {
        if (loaded === 2) {
          try {
            // 1. Draw Original High-Res Image
            const canvas = document.createElement('canvas');
            canvas.width = origImg.width;
            canvas.height = origImg.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(origImg, 0, 0);
            const origData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // 2. Fix the Dimension/Padding Mismatch
            // Calculate the exact bounding box of the padded ML Kit mask
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = origImg.width;
            maskCanvas.height = origImg.height;
            const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });

            const scale = Math.min(maskImg.width / origImg.width, maskImg.height / origImg.height);
            const innerW = origImg.width * scale;
            const innerH = origImg.height * scale;
            const padX = (maskImg.width - innerW) / 2;
            const padY = (maskImg.height - innerH) / 2;

            // Extract the un-padded center of the purple mask and stretch it to match original dimensions
            maskCtx.drawImage(
              maskImg,
              padX, padY, innerW, innerH, // Source (Mask center without padding)
              0, 0, origImg.width, origImg.height // Destination (Full original canvas)
            );
            const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

            // 3. Pixel Loop: Cut out the background and restore colors
            for (let i = 0; i < origData.data.length; i += 4) {
              const r = maskData.data[i];
              const g = maskData.data[i + 1];
              const b = maskData.data[i + 2];
              const a = maskData.data[i + 3];

              // Detect the background (either perfectly transparent OR solid black)
              const isBackground = a < 10 || (r < 5 && g < 5 && b < 5);

              if (isBackground) {
                // Erase the original photo's background
                origData.data[i + 3] = 0; 
              } else {
                // It's the person! We leave the original pixel alone so you get normal colors, not purple.
              }
            }

            // 4. Put the perfect cutout back on the canvas
            ctx.putImageData(origData, 0, 0);
            
            // Return as PNG to guarantee a transparent background
            resolve(canvas.toDataURL('image/png').split(',')[1]);
          } catch (err) {
            reject(err);
          }
        }
      };

      origImg.onload = () => { loaded++; checkDone(); };
      maskImg.onload = () => { loaded++; checkDone(); };
      origImg.onerror = reject;
      maskImg.onerror = reject;

      origImg.src = originalBase64.startsWith('data:') 
        ? originalBase64 
        : `data:image/jpeg;base64,${originalBase64}`;
        
      maskImg.src = maskBase64.startsWith('data:') 
        ? maskBase64 
        : `data:image/png;base64,${maskBase64}`;
    });
  };

  const removeBackground = async (imageFile: File): Promise<string> => {
    setIsLoading(true);
    setError(null);
    let tempFileName: string | null = null;

    try {
      // Step 1: Convert original image to raw base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () =>
          resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      // Step 2: Write input to cache
      tempFileName = `mlkit_input_${Date.now()}.jpg`;
      const writeInput = await Filesystem.writeFile({
        path: tempFileName,
        data: base64Data,
        directory: Directory.Cache,
      });
      if (!writeInput?.uri) throw new Error('Failed to write input image to cache');

      // Step 3: Get native file:// path
      const { uri: inputPath } = await Filesystem.getUri({
        path: tempFileName,
        directory: Directory.Cache,
      });

      // Step 4: Check availability on Android
      if (Capacitor.getPlatform() === 'android') {
        try {
          const { available } =
            await SubjectSegmentation.isGoogleSubjectSegmentationModuleAvailable();
          if (!available) {
            SubjectSegmentation.installGoogleSubjectSegmentationModule().catch(() => {});
            throw new Error(
              'ML Kit model is being downloaded by Google Play Services. ' +
              'This only happens once — please wait 30–60 seconds and try again.'
            );
          }
        } catch (checkErr: any) {
          if (checkErr.message?.includes('ML Kit model is being downloaded')) throw checkErr;
          console.warn('Module check failed, trying processImage anyway:', checkErr.message);
        }
      }

      // Step 5: Run ML Kit (returns the padded purple mask)
      const { path: outputPath } = await SubjectSegmentation.processImage({
        path: inputPath,
        confidence: 0.9,
      });

      if (!outputPath) throw new Error('No output path returned from ML Kit');

      // Step 6: Read result file
      let base64Result: string;
      try {
        const fileData = await Filesystem.readFile({
          path: outputPath,
          directory: Directory.Cache,
        });
        base64Result = fileData.data as string;
      } catch {
        const fileData = await Filesystem.readFile({ path: outputPath });
        base64Result = fileData.data as string;
      }

      // Step 7: Fix Alignment & Extract Original Colors
      const fixedBase64 = await extractOriginalPixels(base64Data, base64Result);

      // Step 8: Write final perfect image back to cache
      const fixedFileName = `bg_removed_final_${Date.now()}.png`;
      const writeFixed = await Filesystem.writeFile({
        path: fixedFileName,
        data: fixedBase64,
        directory: Directory.Cache,
      });
      if (!writeFixed?.uri) throw new Error('Failed to write fixed image');

      setResultPath(writeFixed.uri);
      return writeFixed.uri;

    } catch (err: any) {
      const msg: string = err.message || 'Background removal failed';
      setError(msg);
      throw err;
    } finally {
      if (tempFileName) {
        Filesystem.deleteFile({ path: tempFileName, directory: Directory.Cache })
          .catch(() => {});
      }
      setIsLoading(false);
    }
  };

  return {
    removeBackground,
    isLoading,
    error,
    resultPath,
  };
};

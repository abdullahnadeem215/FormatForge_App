// src/hooks/useBackgroundRemover.ts
import { useState } from 'react';
import { SubjectSegmentation } from '@capacitor-mlkit/subject-segmentation';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export const useBackgroundRemover = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);

  // 1. Core ML Kit Extraction (Heavy lifting - done once)
  const extractOriginalPixels = async (originalBase64: string, maskBase64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const origImg = new Image();
      const maskImg = new Image();
      let loaded = 0;

      const checkDone = () => {
        if (loaded === 2) {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = origImg.width;
            canvas.height = origImg.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return reject(new Error('Canvas not available'));
            
            ctx.drawImage(origImg, 0, 0);
            const origData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = origImg.width;
            maskCanvas.height = origImg.height;
            const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
            if (!maskCtx) return reject(new Error('Mask Canvas not available'));

            const scale = Math.min(maskImg.width / origImg.width, maskImg.height / origImg.height);
            const innerW = origImg.width * scale;
            const innerH = origImg.height * scale;
            const padX = (maskImg.width - innerW) / 2;
            const padY = (maskImg.height - innerH) / 2;

            maskCtx.drawImage(
              maskImg,
              padX, padY, innerW, innerH, 
              0, 0, origImg.width, origImg.height 
            );
            const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

            for (let i = 0; i < origData.data.length; i += 4) {
              const oR = origData.data[i];
              const oG = origData.data[i + 1];
              const oB = origData.data[i + 2];

              const mR = maskData.data[i];
              const mG = maskData.data[i + 1];
              const mB = maskData.data[i + 2];
              const mA = maskData.data[i + 3];

              if (mA < 10) {
                origData.data[i + 3] = 0;
                continue;
              }

              const origMagentaIntensity = ((oR + oB) / 2) - oG;
              const maskMagentaIntensity = ((mR + mB) / 2) - mG;

              const tintedMagenta = maskMagentaIntensity > origMagentaIntensity + 20;
              const nativelyMagenta = origMagentaIntensity > 40 && maskMagentaIntensity > 40;

              if (tintedMagenta || nativelyMagenta) {
                origData.data[i + 3] = 255; 
              } else {
                origData.data[i + 3] = 0; 
              }
            }

            ctx.putImageData(origData, 0, 0);
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

      origImg.src = originalBase64.startsWith('data:') ? originalBase64 : `data:image/jpeg;base64,${originalBase64}`;
      maskImg.src = maskBase64.startsWith('data:') ? maskBase64 : `data:image/png;base64,${maskBase64}`;
    });
  };

  const removeBackground = async (imageFile: File): Promise<string> => {
    setIsLoading(true);
    setError(null);
    let tempFileName: string | null = null;

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      tempFileName = `mlkit_input_${Date.now()}.jpg`;
      const writeInput = await Filesystem.writeFile({
        path: tempFileName,
        data: base64Data,
        directory: Directory.Cache,
      });
      if (!writeInput?.uri) throw new Error('Failed to write input image to cache');

      const { uri: inputPath } = await Filesystem.getUri({
        path: tempFileName,
        directory: Directory.Cache,
      });

      if (Capacitor.getPlatform() === 'android') {
        try {
          const { available } = await SubjectSegmentation.isGoogleSubjectSegmentationModuleAvailable();
          if (!available) {
            SubjectSegmentation.installGoogleSubjectSegmentationModule().catch(() => {});
            throw new Error('ML Kit model is downloading. Please wait 30 seconds and try again.');
          }
        } catch (checkErr: any) {
          if (checkErr.message?.includes('ML Kit model is being downloaded')) throw checkErr;
        }
      }

      const { path: outputPath } = await SubjectSegmentation.processImage({
        path: inputPath,
        confidence: 0.9,
      });

      if (!outputPath) throw new Error('No output path returned from ML Kit');

      let base64Result: string;
      try {
        const fileData = await Filesystem.readFile({ path: outputPath, directory: Directory.Cache });
        base64Result = fileData.data as string;
      } catch {
        const fileData = await Filesystem.readFile({ path: outputPath });
        base64Result = fileData.data as string;
      }

      const fixedBase64 = await extractOriginalPixels(base64Data, base64Result);

      const fixedFileName = `bg_removed_transparent_${Date.now()}.png`;
      const writeFixed = await Filesystem.writeFile({
        path: fixedFileName,
        data: fixedBase64,
        directory: Directory.Cache,
      });

      setResultPath(writeFixed.uri);
      return writeFixed.uri; // This is your 100% transparent PNG

    } catch (err: any) {
      setError(err.message || 'Background removal failed');
      throw err;
    } finally {
      if (tempFileName) Filesystem.deleteFile({ path: tempFileName, directory: Directory.Cache }).catch(() => {});
      setIsLoading(false);
    }
  };

  // 2. Fast Color Applier (Lightweight - call this instantly when user picks a color)
  const applyBackgroundColor = async (transparentFileUri: string, hexColor: string): Promise<string> => {
    setIsLoading(true);
    return new Promise(async (resolve, reject) => {
      try {
        // Read the transparent file back from cache
        const fileData = await Filesystem.readFile({ path: transparentFileUri });
        const base64Data = fileData.data as string;

        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('Canvas error');

          // Paint the background color first
          ctx.fillStyle = hexColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Stamp the transparent person on top
          ctx.drawImage(img, 0, 0);

          // Save as JPEG (smaller file size since it has a solid background)
          const newBase64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
          const fileName = `bg_colored_${Date.now()}.jpg`;
          
          const writeFixed = await Filesystem.writeFile({
            path: fileName,
            data: newBase64,
            directory: Directory.Cache,
          });

          setResultPath(writeFixed.uri);
          resolve(writeFixed.uri);
          setIsLoading(false);
        };
        img.onerror = () => {
          setIsLoading(false);
          reject('Failed to load transparent image');
        };
        img.src = `data:image/png;base64,${base64Data}`;
      } catch (e) {
        setIsLoading(false);
        reject(e);
      }
    });
  };

  return {
    removeBackground,
    applyBackgroundColor,
    isLoading,
    error,
    resultPath, // This will always hold the URI of the most recently processed image
  };
};

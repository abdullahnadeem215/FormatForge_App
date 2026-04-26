// src/hooks/useBackgroundRemover.ts
import { useState } from 'react';
import { SubjectSegmentation } from '@capacitor-mlkit/subject-segmentation';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export const useBackgroundRemover = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);

  // Uses the ML Kit pink mask to cut out the original image
  const applyAlphaMask = async (originalBase64: string, maskBase64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const origImg = new Image();
      const maskImg = new Image();
      let loaded = 0;

      const checkDone = () => {
        if (loaded === 2) {
          const canvas = document.createElement('canvas');
          canvas.width = origImg.width;
          canvas.height = origImg.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas not available'));

          // 1. Draw the pristine original image first
          ctx.drawImage(origImg, 0, 0);

          // 2. Use the pink ML Kit image purely as a stencil
          // 'destination-in' keeps the original image only where the mask image is opaque
          ctx.globalCompositeOperation = 'destination-in';
          ctx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);

          // Return the clean cut-out as base64
          resolve(canvas.toDataURL('image/png').split(',')[1]);
        }
      };

      origImg.onload = () => { loaded++; checkDone(); };
      maskImg.onload = () => { loaded++; checkDone(); };
      origImg.onerror = reject;
      maskImg.onerror = reject;

      // Ensure proper data URI formatting
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
      // Step 1: Convert to raw base64
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

      // Step 5: Run ML Kit
      const { path: outputPath } = await SubjectSegmentation.processImage({
        path: inputPath,
        confidence: 0.9,
      });

      if (!outputPath) throw new Error('No output path returned from ML Kit');

      // Step 6: Read result file (the pink mask)
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

      // Step 7: Apply the mask to the original image to get the true cutout
      const fixedBase64 = await applyAlphaMask(base64Data, base64Result);

      // Step 8: Write clean image back to cache
      const fixedFileName = `bg_removed_clean_${Date.now()}.png`;
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

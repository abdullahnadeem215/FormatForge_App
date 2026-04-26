// src/hooks/useBackgroundRemover.ts
import { useState } from 'react';
import { SubjectSegmentation } from '@capacitor-mlkit/subject-segmentation';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export const useBackgroundRemover = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);

  // Fix BGR->RGBA color channel swap using a canvas
  const fixColorChannels = async (base64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not available'));

        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const b = data[i + 2];
          data[i] = b;      // swap R <- B
          data[i + 2] = r;  // swap B <- R
        }
        ctx.putImageData(imageData, 0, 0);

        resolve(canvas.toDataURL('image/png').split(',')[1]);
      };
      img.onerror = reject;
      img.src = base64.startsWith('data:')
        ? base64
        : `data:image/png;base64,${base64}`;
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

      // Step 7: Fix BGR->RGBA color channel swap (fixes pink tint)
      const fixedBase64 = await fixColorChannels(base64Result);

      // Step 8: Write fixed image back to cache
      const fixedFileName = `bg_removed_fixed_${Date.now()}.png`;
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

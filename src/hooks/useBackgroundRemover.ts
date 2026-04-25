import { useState } from 'react';
import { SubjectSegmentation } from '@capacitor-mlkit/subject-segmentation';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export const useBackgroundRemover = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);

  const removeBackground = async (inputFile: File): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      if (!Capacitor.isNativePlatform()) {
        throw new Error('Background removal is only available on Android');
      }

      // Convert File to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(inputFile);
      });

      // Call ML Kit plugin
      const { result } = await SubjectSegmentation.processImage({
        image: { path: base64 },
      });

      const foregroundBitmap = result.foregroundBitmap;
      if (!foregroundBitmap) {
        throw new Error('No foreground bitmap returned');
      }

      // Save result
      const fileName = `bg_removed_${Date.now()}.png`;
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: foregroundBitmap,
        directory: Directory.Cache,
      });

      setResultPath(writeResult.uri);
      return writeResult.uri;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { removeBackground, isLoading, error, resultPath };
};

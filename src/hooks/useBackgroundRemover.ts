// src/hooks/useBackgroundRemover.ts
import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

export const useBackgroundRemover = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);

  const removeBackground = async (imageFile: File): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      if (!Capacitor.isNativePlatform()) {
        throw new Error('Background removal is only available on Android');
      }

      // @ts-ignore - Capacitor plugins are available at runtime
      const { BackgroundRemover } = (Capacitor as any).Plugins;
      if (!BackgroundRemover) {
        throw new Error('BackgroundRemover plugin not available');
      }

      // Convert file to base64 data URL
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      // Call native plugin – expects base64 string (may include data: prefix)
      const response = await BackgroundRemover.removeBackground({ image: base64Data });
      const resultBase64 = response.result; // Should be a data URL or raw base64

      // Ensure it starts with data:image to be valid for Filesystem
      const finalBase64 = resultBase64.startsWith('data:') 
        ? resultBase64 
        : `data:image/png;base64,${resultBase64}`;

      // Save to cache directory
      const fileName = `bg_removed_${Date.now()}.png`;
      await Filesystem.writeFile({
        path: fileName,
        data: finalBase64,
        directory: Directory.Cache,
      });
      const fileUri = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Cache,
      });
      setResultPath(fileUri.uri);
      return fileUri.uri;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { removeBackground, isLoading, error, resultPath };
};

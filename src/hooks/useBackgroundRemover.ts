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
        throw new Error('Background removal only on Android');
      }

      // Convert file to base64 data URL
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      // @ts-ignore - Capacitor plugins available at runtime
      const { BackgroundRemover } = Capacitor.Plugins;
      if (!BackgroundRemover) {
        throw new Error('BackgroundRemover plugin not found');
      }

      const response = await BackgroundRemover.removeBackground({ image: base64 });
      const resultBase64 = response.result;

      // Save to cache
      const fileName = `bg_removed_${Date.now()}.png`;
      await Filesystem.writeFile({
        path: fileName,
        data: resultBase64,
        directory: Directory.Cache,
      });
      const fileUri = await Filesystem.getUri({ directory: Directory.Cache, path: fileName });
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

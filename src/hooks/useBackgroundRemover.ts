import { useState } from 'react';
import { SelfieSegmentation } from '@capacitor-mlkit/selfie-segmentation';
import { Filesystem, Directory } from '@capacitor/filesystem';

export const useBackgroundRemover = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);

  const removeBackground = async (imageFile: File): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      // Call plugin – ignore TypeScript errors, runtime will work
      // @ts-ignore – plugin API is correct at runtime
      const { result } = await SelfieSegmentation.processImage({ base64Image: base64 });
      // @ts-ignore
      const foregroundBitmap = result?.foregroundBitmap || result;

      if (!foregroundBitmap) throw new Error('No foreground bitmap');

      const fileName = `bg_removed_${Date.now()}.png`;
      await Filesystem.writeFile({
        path: fileName,
        data: foregroundBitmap,
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

import { useState } from 'react';
import { SubjectSegmentation } from '@capacitor-mlkit/subject-segmentation';
import { Filesystem, Directory } from '@capacitor/filesystem';

export const useBackgroundRemover = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);

  const removeBackground = async (imageFile: File): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      // @ts-ignore - plugin's type definitions may be outdated, but runtime works
      const { result } = await SubjectSegmentation.processImage({ base64Image: base64Data });
      const foregroundBitmap = result?.foregroundBitmap;
      if (!foregroundBitmap) throw new Error('No foreground bitmap');

      const finalBase64 = foregroundBitmap.startsWith('data:')
        ? foregroundBitmap
        : `data:image/png;base64,${foregroundBitmap}`;

      const fileName = `bg_removed_${Date.now()}.png`;
      await Filesystem.writeFile({ path: fileName, data: finalBase64, directory: Directory.Cache });
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

// src/hooks/useBackgroundRemover.ts
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
      // Convert file to base64 data URL
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      // Call the plugin
      // @ts-ignore – the plugin's types may be incomplete
      const { result } = await SubjectSegmentation.processImage({
        image: { base64Image: base64Data }
      });
      
      const foregroundBitmap = result?.foregroundBitmap;
      if (!foregroundBitmap) {
        throw new Error('No foreground bitmap returned');
      }

      // Ensure it's a data URL (add prefix if missing)
      const finalBase64 = foregroundBitmap.startsWith('data:')
        ? foregroundBitmap
        : `data:image/png;base64,${foregroundBitmap}`;

      // Generate a unique file name
      const fileName = `bg_removed_${Date.now()}.png`;
      if (!fileName) {
        throw new Error('Failed to generate file name');
      }

      // Write file to cache
      await Filesystem.writeFile({
        path: fileName,
        data: finalBase64,
        directory: Directory.Cache,
      });

      // Get the URI
      const fileUri = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Cache,
      });

      if (!fileUri || !fileUri.uri) {
        throw new Error('Failed to get file URI');
      }

      setResultPath(fileUri.uri);
      return fileUri.uri;
    } catch (err: any) {
      console.error('Background removal error:', err);
      setError(err.message || 'Background removal failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { removeBackground, isLoading, error, resultPath };
};

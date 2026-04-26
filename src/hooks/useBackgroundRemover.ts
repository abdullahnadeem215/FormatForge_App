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

      // Call ML Kit plugin
      // @ts-ignore – runtime API accepts base64Image directly
      const { result } = await SubjectSegmentation.processImage({ base64Image: base64Data });
      const foregroundBitmap = result?.foregroundBitmap;
      if (!foregroundBitmap) throw new Error('No foreground bitmap returned');

      // Ensure data URL format
      const finalBase64 = foregroundBitmap.startsWith('data:')
        ? foregroundBitmap
        : `data:image/png;base64,${foregroundBitmap}`;

      // Create a unique filename – ensure it's a string
      const timestamp = Date.now();
      const fileName = `bg_removed_${timestamp}.png`;
      if (!fileName || fileName.length === 0) {
        throw new Error('Invalid filename generated');
      }

      // Write to cache directory
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: finalBase64,
        directory: Directory.Cache,
      });

      if (!writeResult || !writeResult.uri) {
        throw new Error('Write file returned no URI');
      }

      setResultPath(writeResult.uri);
      return writeResult.uri;
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

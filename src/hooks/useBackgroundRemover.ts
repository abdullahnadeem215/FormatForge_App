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
      // 1. Convert the selected image file to a base64 string
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      // 2. Call the correct ML Kit plugin method
      const { result } = await SubjectSegmentation.processImage({ 
        base64Image: base64 
      });

      if (!result) {
        throw new Error("SubjectSegmentation returned no result");
      }

      // 3. Save the resulting foreground bitmap as a PNG file
      const fileName = `bg_removed_${Date.now()}.png`;
      await Filesystem.writeFile({
        path: fileName,
        data: result.foregroundBitmap,
        directory: Directory.Cache,
      });

      const fileUri = await Filesystem.getUri({ 
        directory: Directory.Cache, 
        path: fileName 
      });
      setResultPath(fileUri.uri);
      return fileUri.uri;
    } catch (err: any) {
      console.error("Background removal error:", err);
      setError(err.message || "Background removal failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { removeBackground, isLoading, error, resultPath };
};

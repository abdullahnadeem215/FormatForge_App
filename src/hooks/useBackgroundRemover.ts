import { useState } from 'react';
import { Filesystem, Directory } from '@capacitor/filesystem';

export const useBackgroundRemover = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);

  const removeBackground = async (inputPath: string): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      // Dynamically import the library (only when needed)
      const { removeBackground } = await import('@imgly/background-removal');
      // Load the image blob
      const response = await fetch(inputPath);
      const imageBlob = await response.blob();
      // Process the image
      const resultBlob = await removeBackground(imageBlob);
      // Save the result blob to a local file
      const timestamp = Date.now();
      const fileName = `bg_removed_${timestamp}.png`;
      const base64 = await blobToBase64(resultBlob);
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
      });
      setResultPath(result.uri);
      return result.uri;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Helper: Blob -> base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  return { removeBackground, isLoading, error, resultPath };
};

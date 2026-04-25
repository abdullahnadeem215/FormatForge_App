import { useState } from 'react';

// Define the plugin interface
interface BackgroundRemoverPlugin {
  removeBackground(options: { image: string }): Promise<{ result: string }>;
}

// Extend Capacitor's plugin registry
declare module '@capacitor/core' {
  interface PluginRegistry {
    BackgroundRemover: BackgroundRemoverPlugin;
  }
}

export const useBackgroundRemover = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);
  const [resultBase64, setResultBase64] = useState<string | null>(null);

  const removeBackgroundFromFile = async (imageFile: File): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const { BackgroundRemover } = Capacitor.Plugins;
      if (!BackgroundRemover) {
        throw new Error('BackgroundRemover plugin not available');
      }

      // Convert the selected file to a base64 string
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      // Call the native plugin
      const response = await BackgroundRemover.removeBackground({ image: base64Data });
      const resultBase64Data = response.result;
      setResultBase64(resultBase64Data);

      // Save the base64 result to a file (optional)
      const fileName = `bg_removed_${Date.now()}.png`;
      const result = await Filesystem.writeFile({
        path: fileName,
        data: resultBase64Data,
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

  return {
    removeBackground: removeBackgroundFromFile,
    isLoading,
    error,
    resultPath,
    resultBase64
  };
};

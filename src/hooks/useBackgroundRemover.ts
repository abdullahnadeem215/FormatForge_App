import { useState } from 'react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const useBackgroundRemover = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const removeBackground = async (imageFile: File): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const { removeBackground } = await import('@imgly/background-removal');
      const imageBlob = new Blob([await imageFile.arrayBuffer()], { type: imageFile.type });
      const resultBlob = await removeBackground(imageBlob);
      setResultBlob(resultBlob);

      // Save to Capacitor filesystem
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(resultBlob);
      });
      const fileName = `bg_removed_${Date.now()}.png`;
      await Filesystem.writeFile({
        path: fileName,
        data: base64,
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

  const download = async () => {
    if (!resultBlob) return;
    // For web, trigger download
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'background_removed.png';
    a.click();
    URL.revokeObjectURL(url);
  };

  const share = async () => {
    if (!resultPath) return;
    await Share.share({
      title: 'Background Removed Image',
      url: resultPath,
    });
  };

  return { removeBackground, download, share, isLoading, error, resultPath };
};

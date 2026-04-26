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

    let tempFileName: string | null = null;

    try {
      // Step 1: Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Strip the data URL prefix — Filesystem.writeFile needs raw base64
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      // Step 2: Write the input image to cache so ML Kit can read it via path
      tempFileName = `mlkit_input_${Date.now()}.jpg`;
      const writeInput = await Filesystem.writeFile({
        path: tempFileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      if (!writeInput?.uri) throw new Error('Failed to write input image to cache');

      // Step 3: Get the real file:// path ML Kit needs
      const { uri: inputPath } = await Filesystem.getUri({
        path: tempFileName,
        directory: Directory.Cache,
      });

      // Step 4: Call ML Kit with the actual file path
      const { result } = await SubjectSegmentation.processImage({
        path: inputPath,   // ✅ correct key, correct value
      });

      const foregroundBitmap = result?.foregroundBitmap;
      if (!foregroundBitmap) throw new Error('No foreground bitmap returned');

      // Step 5: Save the result
      const resultBase64 = foregroundBitmap.startsWith('data:')
        ? foregroundBitmap.split(',')[1]   // strip prefix if present
        : foregroundBitmap;

      const outputFileName = `bg_removed_${Date.now()}.png`;
      const writeResult = await Filesystem.writeFile({
        path: outputFileName,
        data: resultBase64,
        directory: Directory.Cache,
      });

      if (!writeResult?.uri) throw new Error('Write file returned no URI');

      setResultPath(writeResult.uri);
      return writeResult.uri;

    } catch (err: any) {
      console.error('Background removal error:', err);
      setError(err.message || 'Background removal failed');
      throw err;
    } finally {
      // Step 6: Clean up the temp input file
      if (tempFileName) {
        Filesystem.deleteFile({ path: tempFileName, directory: Directory.Cache })
          .catch(() => {}); // silent cleanup
      }
      setIsLoading(false);
    }
  };

  return { removeBackground, isLoading, error, resultPath };
};

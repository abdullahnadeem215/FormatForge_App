import { useState, useEffect } from 'react';
import { SubjectSegmentation } from '@capacitor-mlkit/subject-segmentation';
import { Filesystem, Directory } from '@capacitor/filesystem';

export const useBackgroundRemover = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isModuleReady, setIsModuleReady] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);

  // Check and install the ML Kit module on hook mount
  useEffect(() => {
    ensureModuleInstalled();
  }, []);

  const ensureModuleInstalled = async (): Promise<void> => {
    try {
      const { available } = await SubjectSegmentation.isGoogleSubjectSegmentationModuleAvailable();

      if (available) {
        setIsModuleReady(true);
        return;
      }

      // Module not available — start installation
      setIsInstalling(true);

      // Listen for install progress
      const listener = await SubjectSegmentation.addListener(
        'googleSubjectSegmentationModuleInstallProgress',
        (event) => {
          console.log(`ML Kit install state: ${event.state}, progress: ${event.progress}%`);

          // State 4 = COMPLETED
          if (event.state === 4) {
            setIsModuleReady(true);
            setIsInstalling(false);
            listener.remove();
          }

          // State 5 = FAILED
          if (event.state === 5) {
            setError('ML Kit module installation failed. Please try again.');
            setIsInstalling(false);
            listener.remove();
          }
        }
      );

      await SubjectSegmentation.installGoogleSubjectSegmentationModule();

    } catch (err: any) {
      console.error('Module install error:', err);
      setError('Failed to initialize background remover module.');
      setIsInstalling(false);
    }
  };

  const removeBackground = async (imageFile: File): Promise<string> => {
    if (!isModuleReady) {
      throw new Error('ML Kit module is not ready yet. Please wait.');
    }

    setIsLoading(true);
    setError(null);

    let tempFileName: string | null = null;

    try {
      // Step 1: Convert file to raw base64 (strip data URL prefix)
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      // Step 2: Write input image to cache so ML Kit can read it via path
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

      // Step 4: Call ML Kit — it saves the result itself and returns the path
      const { path: outputPath } = await SubjectSegmentation.processImage({
        path: inputPath,
        confidence: 0.7,
      });

      if (!outputPath) throw new Error('No output path returned from ML Kit');

      setResultPath(outputPath);
      return outputPath;

    } catch (err: any) {
      console.error('Background removal error:', err);
      setError(err.message || 'Background removal failed');
      throw err;
    } finally {
      // Step 5: Clean up temp input file
      if (tempFileName) {
        Filesystem.deleteFile({ path: tempFileName, directory: Directory.Cache })
          .catch(() => {});
      }
      setIsLoading(false);
    }
  };

  return {
    removeBackground,
    isLoading,
    isModuleReady,
    isInstalling,
    error,
    resultPath,
  };
};

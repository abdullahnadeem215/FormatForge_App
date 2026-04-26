import { useState, useEffect } from 'react';
import { SubjectSegmentation } from '@capacitor-mlkit/subject-segmentation';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export const useBackgroundRemover = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isModuleReady, setIsModuleReady] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);

  useEffect(() => {
    if (Capacitor.getPlatform() === 'android') {
      ensureModuleInstalled();
    } else {
      setIsModuleReady(true);
    }
  }, []);

  const ensureModuleInstalled = async (): Promise<void> => {
    setIsInstalling(true);
    setError(null);

    try {
      // Check availability first
      let available = false;
      try {
        const result =
          await SubjectSegmentation.isGoogleSubjectSegmentationModuleAvailable();
        available = result.available;
      } catch {
        // Check failed — treat as not available, proceed to install
        available = false;
      }

      if (available) {
        setIsModuleReady(true);
        setIsInstalling(false);
        return;
      }

      // Set up install progress listener before calling install
      const listener = await SubjectSegmentation.addListener(
        'googleSubjectSegmentationModuleInstallProgress',
        async (event) => {
          console.log(`ML Kit install: state=${event.state} progress=${event.progress}%`);

          if (event.state === 4) {
            // COMPLETED
            await listener.remove();
            // Small delay to let the module fully initialize
            await new Promise((r) => setTimeout(r, 2000));
            setIsModuleReady(true);
            setIsInstalling(false);
          }

          if (event.state === 5) {
            // FAILED
            await listener.remove();
            setError('ML Kit module download failed. Check your internet connection and try again.');
            setIsInstalling(false);
          }
        }
      );

      // Trigger the install
      await SubjectSegmentation.installGoogleSubjectSegmentationModule();

      // If the meta-data tag is set in AndroidManifest.xml, the module may
      // already be silently downloaded by Play Services — wait briefly and recheck
      await new Promise((r) => setTimeout(r, 3000));

      try {
        const { available: recheckAvailable } =
          await SubjectSegmentation.isGoogleSubjectSegmentationModuleAvailable();
        if (recheckAvailable) {
          await listener.remove();
          setIsModuleReady(true);
          setIsInstalling(false);
        }
        // else: listener is still active and will fire when done
      } catch {
        // recheck failed, let the listener handle it
      }

    } catch (err: any) {
      console.error('Module install error:', err);
      setError('Failed to install ML Kit module. Please restart the app and try again.');
      setIsInstalling(false);
    }
  };

  const removeBackground = async (imageFile: File): Promise<string> => {
    if (!isModuleReady) {
      throw new Error(
        isInstalling
          ? 'ML Kit module is still downloading, please wait.'
          : 'ML Kit module is not ready. Please restart the app.'
      );
    }

    setIsLoading(true);
    setError(null);
    let tempFileName: string | null = null;

    try {
      // Step 1: Convert to raw base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () =>
          resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      // Step 2: Write input to cache
      tempFileName = `mlkit_input_${Date.now()}.jpg`;
      const writeInput = await Filesystem.writeFile({
        path: tempFileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      if (!writeInput?.uri) throw new Error('Failed to write input image to cache');

      // Step 3: Get native file:// path
      const { uri: inputPath } = await Filesystem.getUri({
        path: tempFileName,
        directory: Directory.Cache,
      });

      // Step 4: Run ML Kit
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

import { useState, useEffect, useRef } from 'react';
import { SubjectSegmentation } from '@capacitor-mlkit/subject-segmentation';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export const useBackgroundRemover = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isModuleReady, setIsModuleReady] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (Capacitor.getPlatform() === 'android') {
      ensureModuleInstalled();
    } else {
      setIsModuleReady(true);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const checkAvailable = async (): Promise<boolean> => {
    try {
      const { available } =
        await SubjectSegmentation.isGoogleSubjectSegmentationModuleAvailable();
      return available;
    } catch {
      return false;
    }
  };

  const ensureModuleInstalled = async (): Promise<void> => {
    setError(null);

    try {
      // 1. Already available? Done.
      const already = await checkAvailable();
      if (already) {
        setIsModuleReady(true);
        return;
      }

      // 2. Trigger install
      setIsInstalling(true);
      try {
        await SubjectSegmentation.installGoogleSubjectSegmentationModule();
      } catch {
        // install call itself sometimes throws even when download starts — ignore
      }

      // 3. Poll every 3s for up to 2 minutes
      let elapsed = 0;
      const POLL_INTERVAL = 3000;
      const MAX_WAIT = 120000;

      await new Promise<void>((resolve) => {
        pollingRef.current = setInterval(async () => {
          elapsed += POLL_INTERVAL;
          const ready = await checkAvailable();

          if (ready) {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            setIsModuleReady(true);
            setIsInstalling(false);
            resolve();
            return;
          }

          if (elapsed >= MAX_WAIT) {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            setIsInstalling(false);
            setError('ML Kit module download timed out. Please check your internet connection and restart the app.');
            resolve();
          }
        }, POLL_INTERVAL);
      });

    } catch (err: any) {
      console.error('Module init error:', err);
      setIsInstalling(false);
      setError('Failed to initialize ML Kit. Please restart the app.');
    }
  };

  const removeBackground = async (imageFile: File): Promise<string> => {
    if (!isModuleReady) {
      throw new Error(
        isInstalling
          ? 'ML Kit is still downloading, please wait.'
          : 'ML Kit module is not ready. Please restart the app.'
      );
    }

    setIsLoading(true);
    setError(null);
    let tempFileName: string | null = null;

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () =>
          resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      tempFileName = `mlkit_input_${Date.now()}.jpg`;
      const writeInput = await Filesystem.writeFile({
        path: tempFileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      if (!writeInput?.uri) throw new Error('Failed to write input image to cache');

      const { uri: inputPath } = await Filesystem.getUri({
        path: tempFileName,
        directory: Directory.Cache,
      });

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

  // Expose retry so user can manually trigger from UI
  const retryModuleInstall = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setIsModuleReady(false);
    ensureModuleInstalled();
  };

  return {
    removeBackground,
    isLoading,
    isModuleReady,
    isInstalling,
    error,
    resultPath,
    retryModuleInstall,
  };
};

// src/hooks/useTextToSpeech.ts
import { useState } from 'react';
import { Capacitor } from '@capacitor/core';

export const useTextToSpeech = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outputPath, setOutputPath] = useState<string | null>(null);

  const convert = async (text: string, language: string) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!Capacitor.isNativePlatform()) {
        throw new Error('TTS only on Android');
      }

      const plugin = (Capacitor as any).Plugins?.TextToSpeech;
      if (!plugin) {
        throw new Error('TextToSpeech plugin not registered');
      }

      const outputFile = `tts_${Date.now()}.mp3`;
      // Note: In real usage, you'd get URI via Filesystem – but for testing, pass a dummy path
      // For now, let the plugin handle path – but you must use Filesystem to get a writable path.
      // To avoid crash, let's use a simple cache path:
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const result = await Filesystem.getUri({
        directory: Directory.Cache,
        path: outputFile
      });

      const response = await plugin.convert({
        text,
        language,
        outputPath: result.uri
      });
      setOutputPath(response.outputPath);
      return response.outputPath;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { convert, isLoading, error, outputPath };
};

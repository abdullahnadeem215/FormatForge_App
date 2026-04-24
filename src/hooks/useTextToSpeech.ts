import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

// Extend Capacitor's plugin registry to include our TextToSpeech plugin
declare module '@capacitor/core' {
  interface PluginRegistry {
    TextToSpeech: {
      convert(options: { text: string; language: string; outputPath: string }): Promise<{ outputPath: string }>;
    };
  }
}

export const useTextToSpeech = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outputPath, setOutputPath] = useState<string | null>(null);

  const convert = async (text: string, language: string) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!Capacitor.isNativePlatform()) {
        throw new Error('Text to Speech is only available on Android');
      }

      const { TextToSpeech } = Capacitor.Plugins;
      if (!TextToSpeech) {
        throw new Error('TextToSpeech plugin not available');
      }

      const fileName = `tts_${Date.now()}.mp3`;
      const result = await Filesystem.getUri({
        directory: Directory.Cache,
        path: fileName
      });

      const response = await TextToSpeech.convert({
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

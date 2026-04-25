import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

export const useTextToSpeech = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [availablePlugins, setAvailablePlugins] = useState<string>('');

  const getPlugin = () => {
    const plugins = (Capacitor as any).Plugins || {};
    const available = Object.keys(plugins);
    setAvailablePlugins(available.join(', '));
    const plugin = plugins.TextToSpeech;
    if (!plugin) {
      throw new Error(`TextToSpeech plugin not found. Available: ${available.join(', ')}`);
    }
    return plugin;
  };

  const convert = async (text: string, language: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!Capacitor.isNativePlatform()) {
        throw new Error('Text to Speech is only available on Android');
      }
      const TextToSpeech = getPlugin();
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

  return { convert, isLoading, error, outputPath, availablePlugins };
};

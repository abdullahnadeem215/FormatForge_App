import { TextToSpeech } from '@capacitor-community/text-to-speech';

export const useTextToSpeech = () => {
  const convert = async (text: string, language: string) => {
    await TextToSpeech.speak({
      text: text,
      lang: language,
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0
    });
    // Note: this plugin does not save to file directly. You would need additional steps for MP3 export.
  };
  return { convert, isLoading: false, error: null, outputPath: null };
};

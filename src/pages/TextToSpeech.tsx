import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mic, Download, Share2, Languages, Loader2 } from 'lucide-react';
import { useTextToSpeech } from '../hooks/useTextToSpeech';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' }
];

const TextToSpeech: React.FC = () => {
  const [text, setText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const { convert, isLoading, error, outputPath } = useTextToSpeech();

  const handleConvert = async () => {
    if (!text.trim()) {
      alert('Please enter some text');
      return;
    }
    await convert(text, selectedLanguage.code);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-purple-500/20 rounded-xl">
          <Mic className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Text to Speech</h1>
          <p className="text-text-dim text-sm">Convert any text to MP3 audio offline</p>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <Languages className="w-4 h-4" />
            Select Language
          </label>
          <div className="flex gap-3 flex-wrap">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => setSelectedLanguage(lang)}
                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                  selectedLanguage.code === lang.code
                    ? 'bg-purple-600 text-white'
                    : 'bg-bg-deep text-text-dim hover:bg-bg-deep/80 border border-border'
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Text to Convert</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full p-3 bg-bg-deep border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            rows={8}
            placeholder="Enter or paste your text here..."
          />
          <div className="text-right text-xs text-text-dim mt-1">
            {text.length} characters
          </div>
        </div>

        <button
          onClick={handleConvert}
          disabled={isLoading || !text.trim()}
          className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Converting...
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              Convert to Speech
            </>
          )}
        </button>

        {outputPath && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg"
          >
            <p className="text-green-400 text-sm mb-3">✅ Audio saved successfully!</p>
            <div className="flex gap-3">
              <button className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Download
              </button>
              <button className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </motion.div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TextToSpeech;

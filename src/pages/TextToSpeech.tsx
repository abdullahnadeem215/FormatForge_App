// src/pages/TextToSpeech.tsx
import React, { useState } from 'react';
import { useTextToSpeech } from '../hooks/useTextToSpeech';

const TextToSpeech: React.FC = () => {
  const [text, setText] = useState('');
  const { convert, isLoading, error, outputPath } = useTextToSpeech();

  const handleConvert = async () => {
    if (!text.trim()) return;
    await convert(text, 'en');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Text to Speech</h1>
      <textarea
        className="w-full p-2 border rounded my-4"
        rows={4}
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <button
        onClick={handleConvert}
        disabled={isLoading}
        className="bg-purple-600 text-white px-4 py-2 rounded"
      >
        {isLoading ? 'Converting...' : 'Speak'}
      </button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
      {outputPath && <p className="text-green-500 mt-2">Saved: {outputPath}</p>}
    </div>
  );
};

export default TextToSpeech;

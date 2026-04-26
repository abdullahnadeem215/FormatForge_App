// src/pages/BackgroundRemover.tsx
import React, { useState } from 'react';
import { Wand2, Download, Upload } from 'lucide-react';
import { useBackgroundRemover } from '../hooks/useBackgroundRemover';
import { Filesystem } from '@capacitor/filesystem';

const BackgroundRemover: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [bgImage, setBgImage] = useState<string | null>(null);

  const { processImage, isLoading } = useBackgroundRemover();

  const handleImage = (e: any) => {
    const f = e.target.files[0];
    if (!f) return;

    setFile(f);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleBgImage = (e: any) => {
    const f = e.target.files[0];
    if (!f) return;

    const reader = new FileReader();
    reader.onload = (e) => setBgImage(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleProcess = async () => {
    if (!file) return;

    const bg = bgImage || bgColor;

    const path = await processImage(file, bg);

    const data = await Filesystem.readFile({ path });
    setResult(`data:image/png;base64,${data.data}`);
  };

  return (
    <div className="space-y-6">

      <h1 className="text-xl font-bold">Background Replacement</h1>

      {/* Upload */}
      <input type="file" accept="image/*" onChange={handleImage} />

      {preview && <img src={preview} className="max-h-60" />}

      {/* Background options */}
      <div className="flex gap-3">
        <button onClick={() => setBgColor('#ffffff')}>White</button>
        <button onClick={() => setBgColor('#000000')}>Black</button>
        <button onClick={() => setBgColor('#00c2ff')}>Blue</button>
      </div>

      {/* Upload BG Image */}
      <input type="file" accept="image/*" onChange={handleBgImage} />

      {/* Process */}
      <button onClick={handleProcess} disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Replace Background'}
      </button>

      {/* Result */}
      {result && (
        <>
          <img src={result} className="max-h-60" />
          <a href={result} download="final.png">
            <Download /> Download
          </a>
        </>
      )}
    </div>
  );
};

export default BackgroundRemover;

// src/pages/BackgroundRemover.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wand2, Download, Loader2, AlertCircle,
  CheckCircle2, Upload, Image as ImageIcon
} from 'lucide-react';
import { useBackgroundRemover } from '../hooks/useBackgroundRemover';
import { Filesystem } from '@capacitor/filesystem';

const BackgroundRemover: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);

  const [bgColor, setBgColor] = useState('#ffffff');
  const [bgImage, setBgImage] = useState<string | null>(null);

  const {
    processImage,
    isLoading,
    error,
    resultPath,
    transparentImage
  } = useBackgroundRemover();

  const handleImageSelect = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setResultImage(null);

    const reader = new FileReader();
    reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleBgImage = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => setBgImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleProcess = async () => {
    if (!selectedFile) return;

    const bg = bgImage || bgColor;

    const path = await processImage(selectedFile, bg);

    const data = await Filesystem.readFile({ path });
    setResultImage(`data:image/png;base64,${data.data}`);
  };

  const downloadImage = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = 'final.png';
    link.click();
  };

  return (
    <motion.div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-cyan-500/20 rounded-xl">
          <Wand2 className="text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Background Editor</h1>
          <p className="text-sm text-text-dim">
            Remove & replace background
          </p>
        </div>
      </div>

      {/* Upload */}
      <label className="block cursor-pointer">
        <input type="file" accept="image/*" onChange={handleImageSelect} className="sr-only" />
        <div className="border-2 border-dashed rounded-2xl p-6 text-center">
          {selectedImage ? (
            <img src={selectedImage} className="max-h-72 mx-auto" />
          ) : (
            <>
              <Upload className="mx-auto text-cyan-400" />
              <p>Select Image</p>
            </>
          )}
        </div>
      </label>

      {/* Background selection */}
      <div className="p-4 border rounded-2xl space-y-3">
        <p className="text-sm text-text-dim">Choose Background</p>

        <div className="flex gap-2">
          {['#fff', '#000', '#00c2ff', '#ff5c5c'].map((c) => (
            <button
              key={c}
              onClick={() => { setBgColor(c); setBgImage(null); }}
              className="w-10 h-10 rounded-full border"
              style={{ background: c }}
            />
          ))}
        </div>

        <label className="flex gap-2 cursor-pointer text-cyan-400">
          <ImageIcon />
          Upload Background
          <input type="file" onChange={handleBgImage} className="sr-only" />
        </label>
      </div>

      {/* Button */}
      <button
        onClick={handleProcess}
        disabled={isLoading || !selectedFile}
        className="w-full bg-cyan-600 py-4 rounded-xl"
      >
        {isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Apply Background'}
      </button>

      {/* Transparent Preview */}
      {transparentImage && (
        <div>
          <p className="text-sm">Cutout Preview</p>
          <div className="checkerboard">
            <img src={transparentImage} />
          </div>
        </div>
      )}

      {/* Result */}
      {resultImage && (
        <div>
          <CheckCircle2 className="text-green-400" />
          <img src={resultImage} className="max-h-72" />
          <button onClick={downloadImage}>
            <Download /> Download
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-red-400 flex gap-2">
          <AlertCircle /> {error}
        </div>
      )}

    </motion.div>
  );
};

export default BackgroundRemover;

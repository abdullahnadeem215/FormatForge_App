// src/pages/BackgroundRemover.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wand2,
  Download,
  Share2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Upload,
  Palette
} from 'lucide-react';
import { useBackgroundRemover } from '../hooks/useBackgroundRemover';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

const PRESET_COLORS = [
  { id: 'transparent', label: 'Clear', value: 'transparent' },
  { id: 'white', label: 'White', value: '#FFFFFF' },
  { id: 'black', label: 'Black', value: '#000000' },
  { id: 'blue', label: 'Blue', value: '#2563EB' },
  { id: 'purple', label: 'Purple', value: '#9333EA' },
  { id: 'red', label: 'Red', value: '#DC2626' },
];

const BackgroundRemover: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  
  // Store the original transparent path so we can revert to it easily
  const [transparentPath, setTransparentPath] = useState<string | null>(null);
  const [activeColor, setActiveColor] = useState<string>('transparent');

  const { removeBackground, applyBackgroundColor, isLoading, error, resultPath } = useBackgroundRemover();

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResultImage(null);
      setTransparentPath(null);
      setActiveColor('transparent');
      const reader = new FileReader();
      reader.onload = (e) => setSelectedImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const loadFileIntoImage = async (path: string, isJpeg: boolean = false) => {
    try {
      const fileData = await Filesystem.readFile({
        path,
        directory: Directory.Cache,
      });
      const base64 = fileData.data as string;
      const mime = isJpeg ? 'jpeg' : 'png';
      const src = base64.startsWith('data:')
        ? base64
        : `data:image/${mime};base64,${base64}`;
      setResultImage(src);
    } catch {
      const fileData = await Filesystem.readFile({ path });
      const base64 = fileData.data as string;
      const mime = isJpeg ? 'jpeg' : 'png';
      const src = base64.startsWith('data:')
        ? base64
        : `data:image/${mime};base64,${base64}`;
      setResultImage(src);
    }
  };

  const handleRemoveBackground = async () => {
    if (!selectedFile) return;
    try {
      const path = await removeBackground(selectedFile);
      setTransparentPath(path);
      setActiveColor('transparent');
      await loadFileIntoImage(path, false);
    } catch {
      // error already set in hook
    }
  };

  const handleColorChange = async (colorValue: string) => {
    if (!transparentPath) return;
    setActiveColor(colorValue);

    if (colorValue === 'transparent') {
      await loadFileIntoImage(transparentPath, false);
      return;
    }

    try {
      // applyBackgroundColor handles the heavy lifting instantly
      const newPath = await applyBackgroundColor(transparentPath, colorValue);
      await loadFileIntoImage(newPath, true); // True because the hook saves colored bgs as JPEG
    } catch (err) {
      console.error('Failed to apply color', err);
    }
  };

  const downloadImage = async () => {
    if (!resultImage) return;
    try {
      const link = document.createElement('a');
      link.href = resultImage;
      link.download = activeColor === 'transparent' ? 'background_removed.png' : 'background_colored.jpg';
      link.click();
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  const shareImage = async () => {
    if (!resultPath) return; // Uses the most recent path from the hook
    try {
      await Share.share({
        title: 'Background Removed Image',
        url: resultPath,
      });
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  const isDownloading = error?.includes('being downloaded');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 pb-8"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-cyan-500/20 rounded-xl">
          <Wand2 className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Background Remover</h1>
          <p className="text-text-dim text-sm">Fast & offline · powered by ML Kit</p>
        </div>
      </div>

      {/* Upload / Preview area */}
      <label className="block cursor-pointer">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="sr-only"
        />
        <motion.div
          whileTap={{ scale: 0.98 }}
          className={`relative rounded-2xl border-2 border-dashed transition overflow-hidden
            ${selectedImage
              ? 'border-cyan-500/40 bg-bg-deep'
              : 'border-border hover:border-cyan-500/40 bg-surface'
            }`}
        >
          {selectedImage ? (
            <div className="relative">
              <img
                src={selectedImage}
                alt="Selected"
                className="w-full max-h-72 object-contain"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition flex items-center justify-center">
                <p className="text-white text-sm font-medium flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Change image
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-dim">
              <div className="p-4 bg-cyan-500/10 rounded-full">
                <Upload className="w-7 h-7 text-cyan-400" />
              </div>
              <div className="text-center">
                <p className="font-medium text-white">Tap to select an image</p>
                <p className="text-xs mt-1">PNG, JPG, WEBP supported</p>
              </div>
            </div>
          )}
        </motion.div>
      </label>

      {/* Remove Background Button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleRemoveBackground}
        disabled={isLoading || !selectedFile}
        className="w-full bg-cyan-600 hover:bg-cyan-700 py-4 rounded-xl font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <Wand2 className="w-5 h-5" />
            Remove Background
          </>
        )}
      </motion.button>

      {/* Error / Downloading notice */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`flex items-start gap-3 p-4 rounded-xl border ${
              isDownloading
                ? 'bg-yellow-500/10 border-yellow-500/20'
                : 'bg-red-500/10 border-red-500/20'
            }`}
          >
            {isDownloading ? (
              <Loader2 className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5 animate-spin" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            )}
            <p className={`text-sm leading-relaxed ${
              isDownloading ? 'text-yellow-300' : 'text-red-400'
            }`}>
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {resultImage && !error && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Success badge */}
            <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Background removed successfully
            </div>

            {/* Checkerboard to show transparency */}
            <div
              className="rounded-2xl overflow-hidden border border-border relative bg-black/20"
              style={{
                backgroundImage: activeColor === 'transparent' ? (
                  'linear-gradient(45deg,#2a2a2a 25%,transparent 25%),' +
                  'linear-gradient(-45deg,#2a2a2a 25%,transparent 25%),' +
                  'linear-gradient(45deg,transparent 75%,#2a2a2a 75%),' +
                  'linear-gradient(-45deg,transparent 75%,#2a2a2a 75%)'
                ) : 'none',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0,0 10px,10px -10px,-10px 0',
              }}
            >
              <img
                src={resultImage}
                alt="Result"
                className="w-full max-h-72 object-contain transition-opacity duration-200"
              />
            </div>

            {/* Background Color Picker */}
            <div className="space-y-3 p-4 bg-surface rounded-xl border border-border">
              <div className="flex items-center gap-2 text-sm text-text-dim">
                <Palette className="w-4 h-4" />
                <span className="font-medium">Background Color</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => handleColorChange(color.value)}
                    className={`relative w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 ${
                      activeColor === color.value ? 'border-cyan-400 scale-110' : 'border-transparent'
                    }`}
                    style={{
                      background: color.value === 'transparent'
                        ? 'repeating-conic-gradient(#666 0% 25%, transparent 0% 50%) 50% / 10px 10px'
                        : color.value
                    }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={downloadImage}
                className="py-3 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4" />
                Download
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={shareImage}
                className="py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition"
              >
                <Share2 className="w-4 h-4" />
                Share
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default BackgroundRemover;

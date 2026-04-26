// src/pages/BackgroundRemover.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wand2, Download, Share2, Loader2, RefreshCw, AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import { useBackgroundRemover } from '../hooks/useBackgroundRemover';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

const BackgroundRemover: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);

  const {
    removeBackground,
    isLoading,
    isInstalling,
    isModuleReady,
    error,
    resultPath,
    retryModuleInstall,
  } = useBackgroundRemover();

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResultImage(null);
      const reader = new FileReader();
      reader.onload = (e) => setSelectedImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBackground = async () => {
    if (!selectedFile) return;
    try {
      const path = await removeBackground(selectedFile);
      // Read result file to show preview
      const fileData = await Filesystem.readFile({ path, directory: Directory.Cache });
      const base64 = fileData.data as string;
      const src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
      setResultImage(src);
    } catch {}
  };

  const downloadImage = async () => {
    if (!resultImage) return;
    try {
      const link = document.createElement('a');
      link.href = resultImage;
      link.download = 'background_removed.png';
      link.click();
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  const shareImage = async () => {
    if (!resultPath) return;
    try {
      await Share.share({ title: 'Background Removed Image', url: resultPath });
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  // ── Module installing state ──────────────────────────────────────────────
  if (isInstalling) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center">
            <Wand2 className="w-8 h-8 text-cyan-400" />
          </div>
          <Loader2 className="w-full h-full absolute inset-0 animate-spin text-cyan-500 opacity-40" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-1">Setting Up ML Kit</h2>
          <p className="text-text-dim text-sm">Downloading background removal model…</p>
          <p className="text-text-dim text-xs mt-1">This only happens once</p>
        </div>
        <div className="w-full max-w-xs bg-border rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full bg-cyan-500 rounded-full"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
          />
        </div>
      </div>
    );
  }

  // ── Module failed to load ────────────────────────────────────────────────
  if (!isModuleReady && !isInstalling) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-1">Module Not Available</h2>
          <p className="text-text-dim text-sm">{error || 'Could not load the ML Kit model.'}</p>
        </div>
        <button
          onClick={retryModuleInstall}
          className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-xl font-semibold transition"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  // ── Main UI ──────────────────────────────────────────────────────────────
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
              : 'border-border hover:border-cyan-500/40 bg-surface'}`}
        >
          {selectedImage ? (
            <div className="relative">
              <img
                src={selectedImage}
                alt="Selected"
                className="w-full max-h-72 object-contain"
              />
              {/* overlay hint */}
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
            Removing background…
          </>
        ) : (
          <>
            <Wand2 className="w-5 h-5" />
            Remove Background
          </>
        )}
      </motion.button>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
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
            className="space-y-4"
          >
            {/* Success badge */}
            <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Background removed successfully
            </div>

            {/* Result image — checkerboard bg to show transparency */}
            <div
              className="rounded-2xl overflow-hidden border border-border"
              style={{
                backgroundImage:
                  'linear-gradient(45deg,#2a2a2a 25%,transparent 25%),' +
                  'linear-gradient(-45deg,#2a2a2a 25%,transparent 25%),' +
                  'linear-gradient(45deg,transparent 75%,#2a2a2a 75%),' +
                  'linear-gradient(-45deg,transparent 75%,#2a2a2a 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0,0 10px,10px -10px,-10px 0',
              }}
            >
              <img
                src={resultImage}
                alt="Result"
                className="w-full max-h-72 object-contain"
              />
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

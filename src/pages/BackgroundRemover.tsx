import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Wand2, Download, Share2, Loader2 } from 'lucide-react';
import { useBackgroundRemover } from '../hooks/useBackgroundRemover';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

const BackgroundRemover: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { removeBackground, isLoading, error, resultPath } = useBackgroundRemover();

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setSelectedImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBackground = async () => {
    if (!selectedFile) {
      alert('Please select an image first');
      return;
    }
    await removeBackground(selectedFile);
  };

  const downloadAsBlob = async (uri: string, filename: string) => {
    // For Capacitor native, read file as base64 then create blob
    if (Capacitor.isNativePlatform()) {
      const fileData = await Filesystem.readFile({
        path: uri,
        directory: Directory.Cache,
      });
      const byteCharacters = atob(fileData.data as string);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } else {
      // Web: fetch the file:// uri (should be accessible)
      const response = await fetch(uri);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    }
  };

  const handleDownload = async () => {
    if (!resultPath) return;
    try {
      await downloadAsBlob(resultPath, 'background_removed.png');
    } catch (err) {
      console.error(err);
      alert('Download failed: ' + err);
    }
  };

  const handleShare = async () => {
    if (!resultPath) return;
    try {
      if (Capacitor.isNativePlatform() && Share) {
        await Share.share({
          title: 'Background Removed Image',
          url: resultPath,
        });
      } else if (navigator.share) {
        // Web Share API
        const response = await fetch(resultPath);
        const blob = await response.blob();
        const file = new File([blob], 'background_removed.png', { type: 'image/png' });
        await navigator.share({
          title: 'Background Removed Image',
          files: [file],
        });
      } else {
        alert('Share not supported on this browser');
      }
    } catch (err) {
      alert('Share failed: ' + err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-cyan-500/20 rounded-xl">
          <Wand2 className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Background Remover</h1>
          <p className="text-text-dim text-sm">Remove image backgrounds with AI – offline after first use (may take up to 30s)</p>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Select Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="w-full p-3 bg-bg-deep border border-border rounded-lg cursor-pointer file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-500/20 file:text-purple-400 hover:file:bg-purple-500/30"
          />
        </div>

        {selectedImage && (
          <div>
            <h3 className="text-sm font-medium mb-3">Preview:</h3>
            <div className="bg-bg-deep rounded-lg p-4 flex justify-center">
              <img src={selectedImage} alt="Preview" className="max-h-64 object-contain rounded" />
            </div>
          </div>
        )}

        <button
          onClick={handleRemoveBackground}
          disabled={isLoading || !selectedFile}
          className="w-full bg-cyan-600 hover:bg-cyan-700 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing... (may take up to 30s)
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Remove Background
            </>
          )}
        </button>

        {resultPath && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg"
          >
            <p className="text-green-400 text-sm mb-3">✅ Background removed successfully!</p>
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={handleShare}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
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

export default BackgroundRemover;

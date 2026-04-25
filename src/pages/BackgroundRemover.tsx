import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Wand2, Download, Share2, Loader2, Image as ImageIcon } from 'lucide-react';
import { useBackgroundRemover } from '../hooks/useBackgroundRemover';

const BackgroundRemover: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { removeBackground, download, share, isLoading, error, resultPath } = useBackgroundRemover();

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
          <p className="text-text-dim text-sm">Remove image backgrounds with FormatForge – offline after first use</p>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
        {/* File Input */}
        <div>
          <label className="block text-sm font-medium mb-2">Select Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="w-full p-3 bg-bg-deep border border-border rounded-lg cursor-pointer file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-500/20 file:text-purple-400 hover:file:bg-purple-500/30"
          />
        </div>

        {/* Preview */}
        {selectedImage && (
          <div>
            <h3 className="text-sm font-medium mb-3">Preview:</h3>
            <div className="bg-bg-deep rounded-lg p-4 flex justify-center">
              <img src={selectedImage} alt="Preview" className="max-h-64 object-contain rounded" />
            </div>
          </div>
        )}

        {/* Convert Button */}
        <button
          onClick={handleRemoveBackground}
          disabled={isLoading || !selectedFile}
          className="w-full bg-cyan-600 hover:bg-cyan-700 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing (may take 20-30s first time)...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Remove Background
            </>
          )}
        </button>

        {/* Result Section */}
        {resultPath && !error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-4"
          >
            <p className="text-green-400 text-sm">✅ Background removed successfully!</p>
            <div className="flex gap-3">
              <button
                onClick={download}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={share}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </motion.div>
        )}

        {/* Error Message */}
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

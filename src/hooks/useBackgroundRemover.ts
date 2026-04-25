import { useState } from 'react';
import { Filesystem, Directory } from '@capacitor/filesystem';

export const useBackgroundRemover = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);

  const removeBackground = async (imageFile: File): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      // Dynamically import MediaPipe (loads once)
      const { SelfieSegmentation } = await import('@mediapipe/selfie_segmentation');
      const selfieSegmentation = new SelfieSegmentation({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
      });

      // Wait for model initialization
      await new Promise<void>((resolve) => {
        selfieSegmentation.onResults = () => resolve();
        selfieSegmentation.initialize();
      });

      // Convert file to HTMLImageElement
      const img = new Image();
      const imgUrl = URL.createObjectURL(imageFile);
      await new Promise((resolve) => { img.onload = resolve; img.src = imgUrl; });

      // Prepare canvas for segmentation
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      // Run segmentation
      const results = await new Promise<any>((resolve) => {
        selfieSegmentation.send({ image: canvas });
        selfieSegmentation.onResults = (res) => resolve(res);
      });
      const mask = results.segmentationMask; // Float32Array of mask values

      // Create output image with transparency
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = img.width;
      outputCanvas.height = img.height;
      const outCtx = outputCanvas.getContext('2d')!;
      outCtx.drawImage(img, 0, 0);
      const imageData = outCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
      const data = imageData.data;
      for (let i = 0; i < mask.length; i++) {
        // If mask value < 0.1 (background), set alpha to 0
        if (mask[i] < 0.1) {
          data[i * 4 + 3] = 0;
        }
      }
      outCtx.putImageData(imageData, 0, 0);

      // Convert canvas to blob then base64
      const blob = await new Promise<Blob>((resolve) => outputCanvas.toBlob(resolve, 'image/png'));
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      // Save to app cache
      const fileName = `bg_removed_${Date.now()}.png`;
      await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
      });
      const fileUri = await Filesystem.getUri({ directory: Directory.Cache, path: fileName });
      setResultPath(fileUri.uri);
      return fileUri.uri;
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Background removal failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { removeBackground, isLoading, error, resultPath };
};

import { useState } from 'react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const useBackgroundRemover = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const removeBackground = async (imageFile: File): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      // Dynamically load MediaPipe (only once)
      const { SelfieSegmentation } = await import('@mediapipe/selfie_segmentation');
      const selfieSegmentation = new SelfieSegmentation({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
      });
      await selfieSegmentation.initialize();

      const img = new Image();
      const imgUrl = URL.createObjectURL(imageFile);
      await new Promise((resolve) => { img.onload = resolve; img.src = imgUrl; });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const results = await new Promise<any>((resolve) => {
        selfieSegmentation.send({ image: canvas });
        selfieSegmentation.onResults = resolve;
      });

      const mask = results.segmentationMask;
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = img.width;
      outputCanvas.height = img.height;
      const outCtx = outputCanvas.getContext('2d')!;
      outCtx.drawImage(img, 0, 0);
      const imageData = outCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
      const data = imageData.data;
      for (let i = 0; i < mask.length; i++) {
        if (mask[i] < 0.1) data[i * 4 + 3] = 0;
      }
      outCtx.putImageData(imageData, 0, 0);

      const blob = await new Promise<Blob>((resolve) => outputCanvas.toBlob(resolve, 'image/png'));
      setResultBlob(blob);
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const fileName = `bg_removed_${Date.now()}.png`;
      await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
      const fileUri = await Filesystem.getUri({ directory: Directory.Cache, path: fileName });
      setResultPath(fileUri.uri);
      return fileUri.uri;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const download = async () => {
    if (!resultBlob) return;
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'background_removed.png';
    a.click();
    URL.revokeObjectURL(url);
  };

  const share = async () => {
    if (!resultPath) return;
    await Share.share({ title: 'Background Removed Image', url: resultPath });
  };

  return { removeBackground, download, share, isLoading, error, resultPath };
};

// src/hooks/useBackgroundRemover.ts
import { useState } from 'react';
import { SubjectSegmentation } from '@capacitor-mlkit/subject-segmentation';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export const useBackgroundRemover = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);

  // 🔥 Clean alpha mask
  const refineMask = async (base64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas error');

        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const isBackground = r < 15 && g < 15 && b < 15;

          if (isBackground) {
            data[i + 3] = 0;
          } else {
            const intensity = (r + g + b) / 3;
            data[i + 3] = Math.min(255, intensity + 40);
          }
        }

        ctx.putImageData(imageData, 0, 0);

        resolve(canvas.toDataURL('image/png').split(',')[1]);
      };

      img.onerror = reject;
      img.src = `data:image/png;base64,${base64}`;
    });
  };

  // 🔥 Background replacement
  const replaceBackground = async (
    subjectBase64: string,
    background: string
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const subjectImg = new Image();
      const bgImg = new Image();

      subjectImg.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = subjectImg.width;
        canvas.height = subjectImg.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas error');

        // Color background
        if (!background.startsWith('data:')) {
          ctx.fillStyle = background;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(subjectImg, 0, 0);
          return resolve(canvas.toDataURL('image/png').split(',')[1]);
        }

        // Image background
        bgImg.onload = () => {
          ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
          ctx.drawImage(subjectImg, 0, 0);

          // 🔥 Fake shadow for realism
          ctx.globalAlpha = 0.2;
          ctx.filter = 'blur(10px)';
          ctx.drawImage(subjectImg, 5, canvas.height - 40, canvas.width * 0.9, 30);
          ctx.globalAlpha = 1;
          ctx.filter = 'none';

          resolve(canvas.toDataURL('image/png').split(',')[1]);
        };

        bgImg.onerror = reject;
        bgImg.src = background;
      };

      subjectImg.onerror = reject;
      subjectImg.src = `data:image/png;base64,${subjectBase64}`;
    });
  };

  const processImage = async (
    imageFile: File,
    background: string
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () =>
          resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      const fileName = `input_${Date.now()}.jpg`;

      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      const { uri } = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Cache,
      });

      if (Capacitor.getPlatform() === 'android') {
        const { available } =
          await SubjectSegmentation.isGoogleSubjectSegmentationModuleAvailable();

        if (!available) {
          await SubjectSegmentation.installGoogleSubjectSegmentationModule();
          throw new Error('Model downloading...');
        }
      }

      const { path } = await SubjectSegmentation.processImage({
        path: uri,
        confidence: 0.9,
      });

      const fileData = await Filesystem.readFile({ path });
      const base64Result = fileData.data as string;

      const refined = await refineMask(base64Result);

      const finalImage = await replaceBackground(refined, background);

      const finalName = `final_${Date.now()}.png`;

      const saved = await Filesystem.writeFile({
        path: finalName,
        data: finalImage,
        directory: Directory.Cache,
      });

      setResultPath(saved.uri);
      return saved.uri;

    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    processImage,
    isLoading,
    error,
    resultPath,
  };
};

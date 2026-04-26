// src/hooks/useBackgroundRemover.ts
import { useState } from 'react';
import { SubjectSegmentation } from '@capacitor-mlkit/subject-segmentation';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export const useBackgroundRemover = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);
  const [transparentImage, setTransparentImage] = useState<string | null>(null);

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

          const isBg = r < 15 && g < 15 && b < 15;

          if (isBg) {
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

  // 🔥 Background replace
  const replaceBackground = async (
    subjectBase64: string,
    background: string
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const subject = new Image();
      const bg = new Image();

      subject.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = subject.width;
        canvas.height = subject.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas error');

        if (!background.startsWith('data:')) {
          ctx.fillStyle = background;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(subject, 0, 0);
          return resolve(canvas.toDataURL('image/png').split(',')[1]);
        }

        bg.onload = () => {
          ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
          ctx.drawImage(subject, 0, 0);
          resolve(canvas.toDataURL('image/png').split(',')[1]);
        };

        bg.onerror = reject;
        bg.src = background;
      };

      subject.onerror = reject;
      subject.src = `data:image/png;base64,${subjectBase64}`;
    });
  };

  const processImage = async (file: File, background: string): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      // Convert file → base64
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onloadend = () =>
          res((reader.result as string).split(',')[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      const fileName = `input_${Date.now()}.jpg`;

      await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
      });

      const { uri } = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Cache,
      });

      // Ensure ML Kit model
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
      const segmented = fileData.data as string;

      // 🔥 Transparent result
      const refined = await refineMask(segmented);
      setTransparentImage(`data:image/png;base64,${refined}`);

      // 🔥 Final output
      const final = await replaceBackground(refined, background);

      const finalName = `final_${Date.now()}.png`;

      const saved = await Filesystem.writeFile({
        path: finalName,
        data: final,
        directory: Directory.Cache,
      });

      setResultPath(saved.uri);
      return saved.uri;

    } catch (err: any) {
      setError(err.message || 'Processing failed');
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
    transparentImage,
  };
};

import { useState } from 'react';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { DocxToPdf } from '../plugins/DocxToPdfPlugin';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const savePdf = async (pdfBytes: Uint8Array, fileName: string): Promise<string> => {
  const base64 = btoa(String.fromCharCode(...pdfBytes));
  const result = await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Cache,
  });
  return result.uri;
};

export const shareOrDownload = async (uri: string, fileName: string) => {
  if (Capacitor.getPlatform() !== 'web') {
    try {
      await Share.share({ title: fileName, url: uri });
      return;
    } catch {}
  }
  // Web fallback
  try {
    const fileData = await Filesystem.readFile({ path: uri });
    const base64   = fileData.data as string;
    const src      = base64.startsWith('data:') ? base64 : `data:application/pdf;base64,${base64}`;
    const link     = document.createElement('a');
    link.href      = src;
    link.download  = fileName;
    link.click();
  } catch {
    const link    = document.createElement('a');
    link.href     = uri;
    link.download = fileName;
    link.click();
  }
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export const usePdfTools = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [resultUri, setResultUri] = useState<string | null>(null);
  const [progress,  setProgress]  = useState<string>('');

  const run = async (label: string, fn: () => Promise<string>) => {
    setIsLoading(true);
    setError(null);
    setResultUri(null);
    setProgress(label);
    try {
      const uri = await fn();
      setResultUri(uri);
      setProgress('');
      return uri;
    } catch (err: any) {
      setError(err.message || 'Operation failed');
      setProgress('');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // ── 1. Merge ────────────────────────────────────────────────────────────
  const mergePdfs = (files: File[]) =>
    run('Merging PDFs…', async () => {
      const merged = await PDFDocument.create();
      for (const file of files) {
        const bytes = await fileToArrayBuffer(file);
        const pdf   = await PDFDocument.load(bytes);
        const pages = await merged.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      }
      return savePdf(await merged.save(), `merged_${Date.now()}.pdf`);
    });

  // ── 2. Split ────────────────────────────────────────────────────────────
  const splitPdf = (file: File, fromPage: number, toPage: number) =>
    run('Splitting PDF…', async () => {
      const bytes   = await fileToArrayBuffer(file);
      const src     = await PDFDocument.load(bytes);
      const total   = src.getPageCount();
      const start   = Math.max(0, fromPage - 1);
      const end     = Math.min(total - 1, toPage - 1);
      const out     = await PDFDocument.create();
      const indices = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      const pages   = await out.copyPages(src, indices);
      pages.forEach((p) => out.addPage(p));
      return savePdf(await out.save(), `split_${Date.now()}.pdf`);
    });

  // ── 3. Rotate ───────────────────────────────────────────────────────────
  const rotatePdf = (file: File, angle: 90 | 180 | 270) =>
    run('Rotating pages…', async () => {
      const bytes = await fileToArrayBuffer(file);
      const pdf   = await PDFDocument.load(bytes);
      pdf.getPages().forEach((p) => p.setRotation(degrees(angle)));
      return savePdf(await pdf.save(), `rotated_${Date.now()}.pdf`);
    });

  // ── 4. Watermark ────────────────────────────────────────────────────────
  const addWatermark = (file: File, text: string) =>
    run('Adding watermark…', async () => {
      const bytes = await fileToArrayBuffer(file);
      const pdf   = await PDFDocument.load(bytes);
      const font  = await pdf.embedFont(StandardFonts.HelveticaBold);
      pdf.getPages().forEach((page) => {
        const { width, height } = page.getSize();
        page.drawText(text, {
          x:       width  / 2 - (text.length * 13) / 2,
          y:       height / 2,
          size:    48,
          font,
          color:   rgb(0.75, 0.75, 0.75),
          opacity: 0.3,
          rotate:  degrees(45),
        });
      });
      return savePdf(await pdf.save(), `watermarked_${Date.now()}.pdf`);
    });

  // ── 5. Images → PDF ─────────────────────────────────────────────────────
  const imagesToPdf = (files: File[]) =>
    run('Creating PDF from images…', async () => {
      const pdf = await PDFDocument.create();
      for (const file of files) {
        const bytes  = await fileToArrayBuffer(file);
        const isJpeg = file.type === 'image/jpeg';
        const img    = isJpeg ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);
        const page   = pdf.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      return savePdf(await pdf.save(), `images_to_pdf_${Date.now()}.pdf`);
    });

  // ── 6. DOCX → PDF (native Java plugin) ─────────────────────────────────
  const docxToPdf = (file: File) =>
    run('Converting DOCX to PDF…', async () => {
      if (Capacitor.getPlatform() !== 'android') {
        throw new Error('DOCX → PDF native conversion is only available on Android.');
      }

      const base64       = await fileToBase64(file);
      const inputName    = `docx_input_${Date.now()}.docx`;
      const outputName   = `docx_output_${Date.now()}.pdf`;

      // Write DOCX to cache
      await Filesystem.writeFile({
        path: inputName, data: base64, directory: Directory.Cache,
      });

      const { uri: inputUri }  = await Filesystem.getUri({ path: inputName,  directory: Directory.Cache });
      const { uri: outputUri } = await Filesystem.getUri({ path: outputName, directory: Directory.Cache });

      // Strip file:// prefix for Java File API
      const inputPath  = inputUri.replace('file://', '');
      const outputPath = outputUri.replace('file://', '');

      try {
        const result = await DocxToPdf.convert({ inputPath, outputPath });
        return result.outputPath;
      } finally {
        Filesystem.deleteFile({ path: inputName, directory: Directory.Cache }).catch(() => {});
      }
    });

  return {
    mergePdfs, splitPdf, rotatePdf, addWatermark, imagesToPdf, docxToPdf,
    isLoading, error, resultUri, progress,
    shareOrDownload,
  };
};

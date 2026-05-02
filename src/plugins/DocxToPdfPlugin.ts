import { registerPlugin } from '@capacitor/core';

export interface DocxToPdfPlugin {
  convert(options: {
    inputPath: string;
    outputPath: string;
  }): Promise<{ outputPath: string }>;
}

export const DocxToPdf = registerPlugin<DocxToPdfPlugin>('DocxToPdf');

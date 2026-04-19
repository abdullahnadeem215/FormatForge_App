import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'motion/react';
import { File, X, CheckCircle2, AlertCircle, Download, Loader2, FileText, Zap } from 'lucide-react';
import { saveConversion } from '../../utils/storage';
import { cn } from '../../lib/utils';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// Stirling-PDF API endpoint - change this to your server URL
// For local development: http://localhost:8080
// For mobile testing on same WiFi: http://YOUR_COMPUTER_IP:8080
const STIRLING_API_URL = 'http://localhost:8080';

export default function DocumentConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  } as any);

  const saveToDevice = async (blob: Blob, fileName: string) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        
        await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Documents
        });
        
        alert(`✅ Saved to Documents/${fileName}`);
        
        await Share.share({
          title: 'File Converted',
          text: 'Check out my converted file!',
          url: `file://${fileName}`
        });
      };
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save file. Please check storage permissions.');
    }
  };

  const handleDocumentProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append('fileInput', file);

      // Call Stirling-PDF API for PDF to Word conversion
      const response = await fetch(`${STIRLING_API_URL}/api/v1/convert/pdf/word`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Conversion failed: ${response.status} - ${errorText}`);
      }

      const docxBlob = await response.blob();
      const docUrl = URL.createObjectURL(docxBlob);
      const outputFileName = file.name.substring(0, file.name.lastIndexOf('.')) + '.docx';

      const conversionResult = {
        docUrl,
        name: outputFileName
      };

      setResult(conversionResult);
      setSummary("PDF converted to Word successfully using Stirling-PDF (offline, local processing)");

      // Save to history locally
      saveConversion({
        type: 'document',
        input_format: 'pdf',
        output_format: 'docx',
        input_size: file.size,
        output_size: docxBlob.size,
        status: 'completed',
        file_name: conversionResult.name
      }, docxBlob);

      // Save to device
      await saveToDevice(docxBlob, conversionResult.name);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed. Ensure Stirling-PDF is running at ' + STIRLING_API_URL);
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!result?.docUrl) return;
    const a = document.createElement('a');
    a.href = result.docUrl;
    a.download = result.name || 'document.docx';
    a.click();
  };

  return (
    <motion.div
      id="document-converter-container"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-3xl font-light tracking-tight">PDF FORGE</h2>
          <span className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-md text-[10px] font-bold text-purple-400 uppercase tracking-wider">
            Stirling-PDF
          </span>
        </div>
        <p className="text-text-dim text-sm">Convert PDF to Word using PDF-FORGE. 100% offline, no API keys, no usage limits.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {!result ? (
            <div 
              id="document-drop-zone"
              {...getRootProps()} 
              className={cn(
                "border-2 border-dashed rounded-[24px] p-12 text-center transition-all cursor-pointer",
                isDragActive ? "border-purple-500 bg-purple-500/5" : "border-border hover:border-white/20 bg-surface"
              )}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-white/5 rounded-2xl">
                  <FileText className="w-8 h-8 text-text-dim" />
                </div>
                <div>
                  <p className="text-lg font-medium">Upload a PDF document</p>
                  <p className="text-sm text-text-dim">Converts to editable Word format locally</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-8 bg-surface border border-border rounded-[24px] space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Document Ready</h3>
                  <button onClick={downloadResult} className="flex items-center gap-2 text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors">
                    <Download className="w-4 h-4" /> Download DOCX
                  </button>
                </div>

                <div className="bg-black/20 p-12 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-center gap-4">
                   <div className="p-4 bg-green-500/10 rounded-full">
                     <CheckCircle2 className="w-12 h-12 text-green-500" />
                   </div>
                   <div>
                     <p className="text-lg font-medium text-white">Conversion Successful</p>
                     <p className="text-sm text-text-dim">Your editable Word document is ready.</p>
                   </div>
                </div>
              </div>

              {summary && (
                <div className="p-8 bg-purple-500/5 border border-purple-500/20 rounded-[24px] space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-400" />
                    Status
                  </h3>
                  <div className="text-text-dim leading-relaxed text-sm whitespace-pre-line">
                    {summary}
                  </div>
                </div>
              )}
            </div>
          )}

          {file && !result && (
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
              </div>
              <button onClick={() => setFile(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-surface border border-border rounded-[24px] space-y-6">
            <h3 className="font-semibold text-lg">PDF-FORGE</h3>
            
            <div className="space-y-2">
              <div className="p-3 rounded-xl border border-purple-500 bg-purple-500/5">
                <div className="font-bold text-sm">100% Offline Processing</div>
                <div className="text-[10px] opacity-70">No internet required after setup</div>
              </div>
              <div className="p-3 rounded-xl border border-purple-500 bg-purple-500/5">
                <div className="font-bold text-sm">No API Keys</div>
                <div className="text-[10px] opacity-70">Completely free, no usage limits</div>
              </div>
              <div className="p-3 rounded-xl border border-purple-500 bg-purple-500/5">
                <div className="font-bold text-sm">Preserves Formatting</div>
                <div className="text-[10px] opacity-70">Tables, images, fonts retained</div>
              </div>
            </div>

            <p className="text-xs text-text-dim leading-relaxed">
              PDF-FORGE runs locally on your computer. All PDF processing happens offline—your files never leave your network.
            </p>

            <button
              id="process-document-btn"
              disabled={!file || processing || !!result}
              onClick={handleDocumentProcess}
              className="w-full py-3 bg-accent-grad text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Converting with PDF-FORGE...
                </>
              ) : (
                <>Convert to Word</>
              )}
            </button>

            {result && (
              <button
                onClick={() => {setResult(null); setFile(null);}}
                className="w-full py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-colors"
              >
                Convert Another Document
              </button>
            )}

            {error && (
              <div className="space-y-3">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

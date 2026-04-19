import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'motion/react';
import { File, X, CheckCircle2, AlertCircle, Download, Loader2, FileText, Zap } from 'lucide-react';
import { summarizePdf } from '../../services/gemini';
import { saveConversion } from '../../utils/storage';
import { cn } from '../../lib/utils';

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

  const handleDocumentProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setSummary(null);

    try {
      // Convert file to base64 for Gemini
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;
      
      // Get Summary via Gemini
      const extractedText = await summarizePdf(base64);

      const conversionResult = {
        extractedText,
        name: file.name.substring(0, file.name.lastIndexOf('.')) + '.txt'
      };

      setResult(conversionResult);
      setSummary(extractedText);

      // Save to history locally (as text)
      const textBlob = new Blob([extractedText], { type: 'text/plain' });
      saveConversion({
        type: 'document',
        input_format: 'pdf',
        output_format: 'txt',
        input_size: file.size,
        output_size: textBlob.size,
        status: 'completed',
        file_name: conversionResult.name
      }, textBlob);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed. Ensure the file is valid.');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!result?.extractedText) return;
    const blob = new Blob([result.extractedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.name || 'extracted_text.txt';
    a.click();
    URL.revokeObjectURL(url);
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
          <h2 className="text-3xl font-light tracking-tight">Document Pro</h2>
          <span className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-md text-[10px] font-bold text-purple-400 uppercase tracking-wider">
            Gemini AI
          </span>
        </div>
        <p className="text-text-dim text-sm">Extract text and get intelligent summaries from your PDF documents using Google Gemini AI.</p>
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
                  <p className="text-sm text-text-dim">Gemini AI will extract text and provide a summary</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-8 bg-surface border border-border rounded-[24px] space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Text Extracted</h3>
                  <button onClick={downloadResult} className="flex items-center gap-2 text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors">
                    <Download className="w-4 h-4" /> Download TXT
                  </button>
                </div>

                <div className="bg-black/20 p-6 rounded-xl border border-dashed border-border max-h-[400px] overflow-y-auto">
                  <div className="text-text-dim leading-relaxed text-sm whitespace-pre-wrap">
                    {result.extractedText?.substring(0, 2000)}
                    {result.extractedText?.length > 2000 && (
                      <span className="block text-purple-400 text-xs mt-2">... text truncated. Download full content.</span>
                    )}
                  </div>
                </div>
              </div>

              {summary && (
                <div className="p-8 bg-purple-500/5 border border-purple-500/20 rounded-[24px] space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-400" />
                    Gemini AI Summary
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
            <h3 className="font-semibold text-lg">Gemini AI Pro</h3>
            
            <div className="space-y-2">
              <div className="p-3 rounded-xl border border-purple-500 bg-purple-500/5">
                <div className="font-bold text-sm">Intelligent Text Extraction</div>
                <div className="text-[10px] opacity-70">Extracts all readable text from PDFs</div>
              </div>
              <div className="p-3 rounded-xl border border-purple-500 bg-purple-500/5">
                <div className="font-bold text-sm">AI-Powered Summaries</div>
                <div className="text-[10px] opacity-70">Provides concise document summaries</div>
              </div>
            </div>

            <p className="text-xs text-text-dim leading-relaxed">
              Google Gemini AI processes your PDF to extract all text content and generate an intelligent summary. 
              Perfect for research, note-taking, and document analysis.
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
                  Processing with Gemini...
                </>
              ) : (
                <>Extract Text & Summarize</>
              )}
            </button>

            {result && (
              <button
                onClick={() => {setResult(null); setFile(null);}}
                className="w-full py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-colors"
              >
                Process Another Document
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

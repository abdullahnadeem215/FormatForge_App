import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Merge, Scissors, RotateCw, Stamp,
  Image, FileOutput, Download, Share2,
  Loader2, AlertCircle, CheckCircle2, ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { usePdfTools } from '../hooks/usePdfTools';

// ─── Tool definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    id:    'merge',
    icon:  Merge,
    label: 'Merge PDFs',
    desc:  'Combine multiple PDFs into one',
    color: 'purple',
    accent: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    btn:    'bg-purple-600 hover:bg-purple-700',
  },
  {
    id:    'split',
    icon:  Scissors,
    label: 'Split PDF',
    desc:  'Extract a page range',
    color: 'blue',
    accent: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    btn:    'bg-blue-600 hover:bg-blue-700',
  },
  {
    id:    'rotate',
    icon:  RotateCw,
    label: 'Rotate PDF',
    desc:  'Rotate all pages',
    color: 'cyan',
    accent: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    btn:    'bg-cyan-600 hover:bg-cyan-700',
  },
  {
    id:    'watermark',
    icon:  Stamp,
    label: 'Watermark',
    desc:  'Stamp text on every page',
    color: 'orange',
    accent: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    btn:    'bg-orange-600 hover:bg-orange-700',
  },
  {
    id:    'images',
    icon:  Image,
    label: 'Images → PDF',
    desc:  'Combine photos into a PDF',
    color: 'green',
    accent: 'bg-green-500/20 text-green-400 border-green-500/30',
    btn:    'bg-green-600 hover:bg-green-700',
  },
  {
    id:    'docx',
    icon:  FileOutput,
    label: 'DOCX → PDF',
    desc:  'Convert Word doc to PDF',
    color: 'rose',
    accent: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    btn:    'bg-rose-600 hover:bg-rose-700',
  },
] as const;

type ToolId = typeof TOOLS[number]['id'];

// ─── Reusable file picker ────────────────────────────────────────────────────

const FilePicker = ({
  label, accept, multiple = false, files, onChange,
}: {
  label: string; accept: string; multiple?: boolean;
  files: File[]; onChange: (files: File[]) => void;
}) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-text-dim">{label}</label>
    <label className="block cursor-pointer">
      <input
        type="file" accept={accept} multiple={multiple}
        onChange={(e) => onChange(Array.from(e.target.files || []))}
        className="sr-only"
      />
      <motion.div
        whileTap={{ scale: 0.98 }}
        className={`rounded-xl border-2 border-dashed transition p-4 text-center
          ${files.length > 0
            ? 'border-purple-500/40 bg-purple-500/5'
            : 'border-border hover:border-purple-500/30 bg-bg-deep'}`}
      >
        {files.length > 0 ? (
          <p className="text-sm text-purple-400 font-medium">
            {files.length === 1 ? files[0].name : `${files.length} files selected`}
          </p>
        ) : (
          <p className="text-sm text-text-dim">Tap to select file{multiple ? 's' : ''}</p>
        )}
      </motion.div>
    </label>
  </div>
);

// ─── Main Page ───────────────────────────────────────────────────────────────

const PdfTools: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);

  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [splitFile,  setSplitFile]  = useState<File[]>([]);
  const [splitFrom,  setSplitFrom]  = useState(1);
  const [splitTo,    setSplitTo]    = useState(1);
  const [rotateFile, setRotateFile] = useState<File[]>([]);
  const [rotateAngle, setRotateAngle] = useState<90 | 180 | 270>(90);
  const [wmFile,     setWmFile]     = useState<File[]>([]);
  const [wmText,     setWmText]     = useState('CONFIDENTIAL');
  const [imgFiles,   setImgFiles]   = useState<File[]>([]);
  const [docxFile,   setDocxFile]   = useState<File[]>([]);

  const {
    mergePdfs, splitPdf, rotatePdf, addWatermark, imagesToPdf, docxToPdf,
    isLoading, error, resultUri, progress, shareOrDownload,
  } = usePdfTools();

  const activeDef = TOOLS.find((t) => t.id === activeTool)!;

  const canRun = () => {
    switch (activeTool) {
      case 'merge':     return mergeFiles.length >= 2;
      case 'split':     return splitFile.length > 0 && splitTo >= splitFrom;
      case 'rotate':    return rotateFile.length > 0;
      case 'watermark': return wmFile.length > 0 && wmText.trim().length > 0;
      case 'images':    return imgFiles.length > 0;
      case 'docx':      return docxFile.length > 0;
      default:          return false;
    }
  };

  const handleRun = async () => {
    switch (activeTool) {
      case 'merge':     await mergePdfs(mergeFiles); break;
      case 'split':     await splitPdf(splitFile[0], splitFrom, splitTo); break;
      case 'rotate':    await rotatePdf(rotateFile[0], rotateAngle); break;
      case 'watermark': await addWatermark(wmFile[0], wmText); break;
      case 'images':    await imagesToPdf(imgFiles); break;
      case 'docx':      await docxToPdf(docxFile[0]); break;
    }
  };

  const handleBack = () => {
    setActiveTool(null);
    setMergeFiles([]); setSplitFile([]); setRotateFile([]);
    setWmFile([]); setImgFiles([]); setDocxFile([]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 pb-10"
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-purple-500/20 rounded-xl">
          <FileText className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">PDF Tools</h1>
          <p className="text-text-dim text-sm">100% offline · no uploads</p>
        </div>
      </div>

      {/* ── Tool Grid ───────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {!activeTool && (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <motion.button
                  key={tool.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setActiveTool(tool.id)}
                  className="bg-surface border border-border rounded-2xl p-4 text-left
                             flex flex-col gap-3 hover:border-purple-500/30 transition"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                                   ${tool.accent.split(' ').slice(0, 2).join(' ')}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{tool.label}</p>
                    <p className="text-text-dim text-xs mt-0.5 leading-snug">{tool.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-dim self-end" />
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* ── Active Tool Panel ──────────────────────────────────────────── */}
        {activeTool && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            {/* Back bar */}
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-text-dim hover:text-white transition text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              All Tools
            </button>

            {/* Tool card */}
            <div className="bg-surface border border-border rounded-2xl p-5 space-y-5">
              {/* Tool title */}
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${activeDef.accent}`}>
                  <activeDef.icon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base">{activeDef.label}</h2>
                  <p className="text-text-dim text-xs">{activeDef.desc}</p>
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* ── Tool-specific inputs ──────────────────────────────── */}

              {activeTool === 'merge' && (
                <FilePicker
                  label="Select 2 or more PDF files"
                  accept=".pdf,application/pdf"
                  multiple files={mergeFiles} onChange={setMergeFiles}
                />
              )}

              {activeTool === 'split' && (
                <>
                  <FilePicker
                    label="Select PDF file"
                    accept=".pdf,application/pdf"
                    files={splitFile} onChange={setSplitFile}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-text-dim">From page</label>
                      <input
                        type="number" min={1} value={splitFrom}
                        onChange={(e) => setSplitFrom(Number(e.target.value))}
                        className="w-full bg-bg-deep border border-border rounded-xl
                                   px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-text-dim">To page</label>
                      <input
                        type="number" min={1} value={splitTo}
                        onChange={(e) => setSplitTo(Number(e.target.value))}
                        className="w-full bg-bg-deep border border-border rounded-xl
                                   px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTool === 'rotate' && (
                <>
                  <FilePicker
                    label="Select PDF file"
                    accept=".pdf,application/pdf"
                    files={rotateFile} onChange={setRotateFile}
                  />
                  <div className="space-y-2">
                    <label className="text-xs text-text-dim">Rotation angle</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([90, 180, 270] as const).map((a) => (
                        <button
                          key={a}
                          onClick={() => setRotateAngle(a)}
                          className={`py-2.5 rounded-xl text-sm font-semibold border transition ${
                            rotateAngle === a
                              ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                              : 'bg-bg-deep border-border text-text-dim hover:border-cyan-500/30'
                          }`}
                        >
                          {a}°
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeTool === 'watermark' && (
                <>
                  <FilePicker
                    label="Select PDF file"
                    accept=".pdf,application/pdf"
                    files={wmFile} onChange={setWmFile}
                  />
                  <div className="space-y-1">
                    <label className="text-xs text-text-dim">Watermark text</label>
                    <input
                      type="text" value={wmText}
                      onChange={(e) => setWmText(e.target.value)}
                      placeholder="e.g. CONFIDENTIAL"
                      className="w-full bg-bg-deep border border-border rounded-xl
                                 px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                </>
              )}

              {activeTool === 'images' && (
                <FilePicker
                  label="Select images (JPG / PNG)"
                  accept="image/jpeg,image/png"
                  multiple files={imgFiles} onChange={setImgFiles}
                />
              )}

              {activeTool === 'docx' && (
                <>
                  <FilePicker
                    label="Select DOCX file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    files={docxFile} onChange={setDocxFile}
                  />
                  <div className="flex items-start gap-2 p-3 bg-yellow-500/10
                                  border border-yellow-500/20 rounded-xl">
                    <span className="text-yellow-400 text-sm mt-0.5">⚠️</span>
                    <p className="text-yellow-300 text-xs leading-relaxed">
                      Android only. Text, images, and tables are preserved.
                      Complex layouts may vary slightly.
                    </p>
                  </div>
                </>
              )}

              {/* Run button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleRun}
                disabled={isLoading || !canRun()}
                className={`w-full py-4 rounded-xl font-semibold transition
                  disabled:opacity-40 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2 text-base ${activeDef.btn}`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {progress || 'Processing…'}
                  </>
                ) : (
                  <>
                    <activeDef.icon className="w-5 h-5" />
                    {activeDef.label}
                  </>
                )}
              </motion.button>
            </div>

            {/* ── Error ──────────────────────────────────────────────────── */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-3 p-4 bg-red-500/10
                             border border-red-500/20 rounded-2xl"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm leading-relaxed">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Success ────────────────────────────────────────────────── */}
            <AnimatePresence>
              {resultUri && !error && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Done! Your file is ready.
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => shareOrDownload(resultUri, 'output.pdf')}
                      className="py-3 bg-green-600 hover:bg-green-700 rounded-xl
                                 text-sm font-semibold flex items-center justify-center
                                 gap-2 transition"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => shareOrDownload(resultUri, 'output.pdf')}
                      className="py-3 bg-blue-600 hover:bg-blue-700 rounded-xl
                                 text-sm font-semibold flex items-center justify-center
                                 gap-2 transition"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PdfTools;

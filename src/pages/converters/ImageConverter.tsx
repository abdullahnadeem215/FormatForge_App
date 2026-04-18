import React, { useState, useEffect } from 'react';
import { SplashScreen } from '@capacitor/splash-screen';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useLocation, 
  Navigate 
} from 'react-router-dom';
import { 
  Image as ImageIcon, 
  History, 
  User, 
  Menu, 
  X,
  Zap,
} from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useStorage } from './hooks/useStorage';
import { LoadingScreen } from './components/LoadingScreen';

// Pages
import Home from './pages/Home';
import HistoryPage from './pages/History';
import Profile from './pages/Profile';
import ImageConverter from './pages/converters/ImageConverter';
import MediaConverter from './pages/converters/MediaConverter';
import DocumentConverter from './pages/converters/DocumentConverter';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { userId } = useStorage();

  useEffect(() => {
    const hideSplash = async () => {
      await SplashScreen.hide();
    };
    hideSplash();
  }, []);

<<<<<<< Updated upstream
  const removeFile = (id: string) => {
    setFiles(prev => {
      const filtered = prev.filter(f => f.id !== id);
      const removed = prev.find(f => f.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return filtered;
    });
  };

  const clearAll = () => {
    files.forEach(file => URL.revokeObjectURL(file.preview));
    setFiles([]);
    setOriginalDimensions(null);
    setResizeWidth('');
    setResizeHeight('');
  };

  const convertAll = async () => {
    if (files.length === 0 || isConverting) return;
    
    setIsConverting(true);
    setConversionProgress(0);
    
    const updatedFiles = [...files];
    let width = parseInt(resizeWidth);
    let height = parseInt(resizeHeight);

    for (let i = 0; i < updatedFiles.length; i++) {
        const item = updatedFiles[i];
        if (item.status === 'completed') continue;

        item.status = 'converting';
        setFiles([...updatedFiles]);

        try {
            const result = await convertImage(item.file, {
                format: selectedFormat,
                quality,
                width: enableResize ? (isNaN(width) ? undefined : width) : undefined,
                height: enableResize ? (isNaN(height) ? undefined : height) : undefined,
                maintainAspectRatio: lockAspectRatio
            });

            item.convertedBlob = result.blob;
            item.convertedSize = result.blob.size;
            item.status = 'completed';
            
            // Save to history (works on both web and mobile)
            saveConversion({
                type: 'image',
                input_format: item.file.name.split('.').pop() || '',
                output_format: selectedFormat,
                input_size: item.originalSize,
                output_size: item.convertedBlob.size,
                status: 'completed',
                file_name: item.name.substring(0, item.name.lastIndexOf('.')) + '.' + selectedFormat
            }, item.convertedBlob);

        } catch (err) {
            item.status = 'failed';
            item.error = err instanceof Error ? err.message : 'Conversion failed';
        }

        setConversionProgress(((i + 1) / updatedFiles.length) * 100);
        setFiles([...updatedFiles]);
    }
    
    setIsConverting(false);
  };

  // ========== SAVE FUNCTION - WORKS ON BOTH WEB AND MOBILE ==========
  import { Filesystem, Directory } from '@capacitor/filesystem';
  import { Share } from '@capacitor/share';

  const downloadFile = async (item: ConversionQueueItem) => {
  if (!item.convertedBlob) return;
  
  try {
    const ext = selectedFormat === 'jpeg' ? 'jpg' : selectedFormat;
    const fileName = `${item.name.substring(0, item.name.lastIndexOf('.'))}.${ext}`;
    
    // Convert blob to base64
    const reader = new FileReader();
    reader.readAsDataURL(item.convertedBlob);
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      
      // Save using Capacitor Filesystem
      await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Documents
      });
      
      // Show success message
      alert(`✅ Saved to Documents/${fileName}`);
      
      // Option to share
      await Share.share({
        title: 'Image Converted',
        text: 'Check out my converted image!',
        url: `file://${fileName}`
      });
    };
  } catch (error) {
    console.error('Save error:', error);
    alert('Failed to save file. Please check storage permissions.');
  }
};

  const downloadAllAsZip = async () => {
    const completed = files.filter(f => f.status === 'completed' && f.convertedBlob);
    if (completed.length === 0) return;

    const zip = new JSZip();
    completed.forEach(item => {
        const ext = selectedFormat === 'jpeg' ? 'jpg' : selectedFormat;
        const name = item.name.substring(0, item.name.lastIndexOf('.')) + '.' + ext;
        zip.file(name, item.convertedBlob!);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted_images_${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleWidthChange = (val: string) => {
    setResizeWidth(val);
    if (lockAspectRatio && originalDimensions) {
        const w = parseInt(val);
        if (!isNaN(w) && w > 0) {
            const h = Math.round((w / originalDimensions.width) * originalDimensions.height);
            setResizeHeight(h.toString());
        }
    }
  };

  const handleHeightChange = (val: string) => {
    setResizeHeight(val);
    if (lockAspectRatio && originalDimensions) {
        const h = parseInt(val);
        if (!isNaN(h) && h > 0) {
            const w = Math.round((h / originalDimensions.height) * originalDimensions.width);
            setResizeWidth(w.toString());
        }
    }
  };
=======
  if (isLoading) {
    return <LoadingScreen onLoadingComplete={() => setIsLoading(false)} />;
  }
>>>>>>> Stashed changes

  return (
    <Router>
      <div className="min-h-screen bg-bg-deep text-white flex">
        {/* Mobile Sidebar Toggle */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-surface border border-border rounded-lg"
        >
          {isSidebarOpen ? <X /> : <Menu />}
        </button>

        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-bg-deep border-r border-border transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="h-full flex flex-col p-6 lg:p-10">
            <div className="flex items-center gap-3 mb-10">
              <div className="p-2 bg-accent-grad rounded-lg shrink-0">
                <Zap size={20} className="text-white" fill="currentColor" />
              </div>
              <span className="text-lg lg:text-xl font-black italic tracking-tighter text-white whitespace-nowrap">
                FORMATFORGE <span className="bg-accent-grad bg-clip-text text-transparent not-italic font-bold">PRO</span>
              </span>
            </div>

            <nav className="flex-1 space-y-1">
              <SidebarLink to="/" icon={<ImageIcon className="w-4 h-4" />} label="Dashboard" onClick={() => setIsSidebarOpen(false)} />
              <SidebarLink to="/history" icon={<History className="w-4 h-4" />} label="History" onClick={() => setIsSidebarOpen(false)} />
              <SidebarLink to="/profile" icon={<User className="w-4 h-4" />} label="Profile" onClick={() => setIsSidebarOpen(false)} />
            </nav>

            <div className="pt-6 border-t border-border">
              <div className="mt-4 text-[10px] text-white/20 text-center">Made by ABDULLAH, HASSAAN and HAMAAD</div>
              <div className="mt-2 text-[8px] text-white/10 text-center uppercase tracking-widest">{userId}</div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 relative overflow-y-auto">
          <div className="max-w-5xl mx-auto p-6 lg:p-10">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/convert/image" element={<ImageConverter />} />
                <Route path="/convert/audio" element={<MediaConverter />} />
                <Route path="/convert/video-to-audio" element={<MediaConverter />} />
                <Route path="/convert/document" element={<DocumentConverter />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </AnimatePresence>
          </div>
          
          <footer className="p-12 text-center text-gray-600 text-sm">
            Made by ABDULLAH, HASSAAN and HAMAAD
          </footer>
        </main>
      </div>
    </Router>
  );
}
<<<<<<< Updated upstream
=======

function SidebarLink({ to, icon, label, onClick }: { to: string, icon: React.ReactNode, label: string, onClick: () => void }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 py-3 transition-all duration-200 text-sm",
        isActive 
          ? "text-white font-semibold" 
          : "text-text-dim hover:text-white"
      )}
    >
      {isActive && <div className="w-1 h-1 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc] mr-1" />}
      {icon}
      <span>{label}</span>
    </Link>
  );
}

export default App;
>>>>>>> Stashed changes

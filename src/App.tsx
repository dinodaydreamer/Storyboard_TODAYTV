import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  Play, 
  Settings, 
  Image as ImageIcon, 
  X, 
  Loader2,
  HelpCircle,
  Key,
  Eye,
  EyeOff,
  FileText,
  RefreshCcw,
  Upload,
  AlertCircle
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import jsPDF from 'jspdf';
import { cn } from './lib/utils';
import { Shot, STORYBOARD_STYLES } from './types';

// --- Components ---

const Header = ({ 
  apiKey, 
  setApiKey, 
  onOpenScript, 
  onGenerateAll, 
  onExportPDF,
  isExporting
}: { 
  apiKey: string; 
  setApiKey: (k: string) => void; 
  onOpenScript: () => void;
  onGenerateAll: () => void;
  onExportPDF: () => void;
  isExporting: boolean;
}) => {
  const [showKey, setShowKey] = useState(false);
  const isConnected = apiKey.length > 20;

  return (
    <header className="h-16 border-b border-white/10 bg-[#0A0A0A] flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-brand rounded flex items-center justify-center">
          <ImageIcon className="text-white w-5 h-5" />
        </div>
        <h1 className="font-bold text-lg tracking-tight uppercase">
          AI <span className="text-brand">Storyboard</span> Creator
        </h1>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
          <Key className="w-4 h-4 text-white/40" />
          <input 
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Nhập Gemini API Key..."
            className="bg-transparent border-none outline-none text-sm w-48 placeholder:text-white/20"
          />
          <button onClick={() => setShowKey(!showKey)} className="text-white/40 hover:text-white">
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500")} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={onOpenScript}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            Nhập kịch bản
          </button>
          <button 
            onClick={onGenerateAll}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand hover:bg-brand/90 text-sm font-bold transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            Vẽ tất cả
          </button>
          <button 
            onClick={onExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black hover:bg-white/90 text-sm font-bold transition-colors disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Xuất PDF
          </button>
        </div>
      </div>
    </header>
  );
};

const ReferencePanel = ({ 
  references, 
  onAdd, 
  onRemove 
}: { 
  references: string[]; 
  onAdd: (base64: string) => void; 
  onRemove: (idx: number) => void;
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        onAdd(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  }, [onAdd]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'image/*': [] },
    maxFiles: 3,
    multiple: true
  } as any);

  return (
    <div className="w-64 border-r border-white/10 bg-[#0F0F0F] flex flex-col">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">Nhân vật tham chiếu</h2>
        <HelpCircle className="w-4 h-4 text-white/20 cursor-help" />
      </div>
      
      <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        <div 
          {...getRootProps()} 
          className={cn(
            "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer",
            isDragActive ? "border-brand bg-brand/5" : "border-white/10 hover:border-white/20 hover:bg-white/5"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-6 h-6 text-white/20" />
          <p className="text-[10px] text-center text-white/40 font-medium leading-tight">
            Kéo thả ảnh nhân vật<br/>(Tối đa 3 ảnh)
          </p>
        </div>

        <AnimatePresence>
          {references.map((ref, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group"
            >
              <img src={ref} alt="Ref" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <button 
                onClick={() => onRemove(idx)}
                className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const ScriptModal = ({ 
  isOpen, 
  onClose, 
  onImport 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onImport: (script: string) => void;
}) => {
  const [text, setText] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-2xl bg-[#1A1A1A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-xl font-bold">Nhập kịch bản</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm text-white/60">
            Nhập kịch bản theo định dạng <span className="text-brand font-bold">SHOT 1: [mô tả]</span>. Mỗi SHOT sẽ tạo ra một khung hình mới.
          </p>
          <textarea 
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ví dụ:&#10;SHOT 1: Cảnh toàn thành phố tương lai vào ban đêm.&#10;SHOT 2: Cận cảnh một con robot đang nhìn lên bầu trời.&#10;SHOT 3: Robot nhảy xuống từ tòa nhà cao tầng."
            className="w-full h-64 bg-black/40 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-brand/50 transition-colors resize-none custom-scrollbar"
          />
          <div className="flex justify-end gap-3 pt-2">
            <button 
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-sm font-bold hover:bg-white/5 transition-colors"
            >
              Hủy
            </button>
            <button 
              onClick={() => {
                onImport(text);
                onClose();
              }}
              className="px-8 py-2 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand/90 transition-colors"
            >
              Tạo Storyboard
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || "");
  const [shots, setShots] = useState<Shot[]>([
    { id: '1', number: 1, prompt: 'A boy running in a busy street, looking excited.', style: 'sketch', status: 'idle' }
  ]);
  const [selectedShotId, setSelectedShotId] = useState<string | null>('1');
  const [references, setReferences] = useState<string[]>([]);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const selectedShot = shots.find(s => s.id === selectedShotId);

  useEffect(() => {
    localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  const addShot = () => {
    const newShot: Shot = {
      id: Math.random().toString(36).substr(2, 9),
      number: shots.length + 1,
      prompt: '',
      style: shots[shots.length - 1]?.style || 'sketch',
      status: 'idle'
    };
    setShots([...shots, newShot]);
    setSelectedShotId(newShot.id);
  };

  const updateShot = (id: string, updates: Partial<Shot>) => {
    setShots(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeShot = (id: string) => {
    if (shots.length === 1) return;
    const newShots = shots.filter(s => s.id !== id).map((s, i) => ({ ...s, number: i + 1 }));
    setShots(newShots);
    if (selectedShotId === id) {
      setSelectedShotId(newShots[0].id);
    }
  };

  const generateImage = async (shot: Shot) => {
    if (!apiKey) {
      alert("Vui lòng nhập API Key!");
      return;
    }

    updateShot(shot.id, { status: 'generating' });

    try {
      const ai = new GoogleGenAI({ apiKey });
      const stylePrompt = STORYBOARD_STYLES.find(s => s.id === shot.style)?.prompt || "";
      
      // Improved prompt construction
      let prompt = `SCENE DESCRIPTION: ${shot.prompt}\n\n`;
      prompt += `VISUAL STYLE: ${stylePrompt}\n\n`;
      
      if (references.length > 0) {
        prompt += `IMPORTANT: Use the characters provided in the reference images as the main characters in this scene. Maintain their appearance, clothing, and features consistently.\n`;
      }
      
      prompt += `Generate a high-quality storyboard frame based on the SCENE DESCRIPTION and VISUAL STYLE.`;

      const parts: any[] = [{ text: prompt }];
      
      references.forEach(ref => {
        const base64Data = ref.split(',')[1];
        const mimeType = ref.split(';')[0].split(':')[1];
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: "16:9"
          }
        }
      });

      let imageUrl = "";
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        updateShot(shot.id, { image: imageUrl, status: 'completed' });
      } else {
        throw new Error("No image generated");
      }
    } catch (error) {
      console.error("Generation error:", error);
      updateShot(shot.id, { status: 'error' });
    }
  };

  const generateAll = async () => {
    if (isGeneratingAll) return;
    setIsGeneratingAll(true);
    for (const shot of shots) {
      await generateImage(shot);
    }
    setIsGeneratingAll(false);
  };

  const importScript = (script: string) => {
    const lines = script.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const newShots: Shot[] = [];
    let shotCount = 1;

    lines.forEach(line => {
      // Try to match "SHOT X: description" or just "description"
      const match = line.match(/SHOT\s*(\d+)?\s*:\s*(.*)/i);
      const prompt = match ? match[2].trim() : line;
      
      if (prompt) {
        newShots.push({
          id: Math.random().toString(36).substr(2, 9),
          number: shotCount++,
          prompt: prompt,
          style: 'sketch',
          status: 'idle'
        });
      }
    });

    if (newShots.length > 0) {
      setShots(newShots);
      setSelectedShotId(newShots[0].id);
    }
  };

  const exportPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);

      // Filter shots that have images
      const shotsToExport = shots.filter(s => s.image);
      
      if (shotsToExport.length === 0) {
        alert("Chưa có phân cảnh nào được vẽ. Vui lòng vẽ ít nhất một phân cảnh trước khi xuất PDF.");
        setIsExporting(false);
        return;
      }

      for (let i = 0; i < shotsToExport.length; i++) {
        const shot = shotsToExport[i];
        
        if (i > 0) doc.addPage();

        // Background
        doc.setFillColor(10, 10, 10);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        // Header
        doc.setTextColor(255, 107, 0); // Brand color
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`AI STORYBOARD CREATOR`, margin, margin);
        
        doc.setTextColor(100, 100, 100);
        doc.text(`SHOT ${shot.number} / ${shotsToExport.length}`, pageWidth - margin - 30, margin);

        // Image
        if (shot.image) {
          const imgWidth = contentWidth;
          const imgHeight = (imgWidth * 9) / 16;
          const imgX = margin;
          const imgY = margin + 15;

          // Border for image
          doc.setDrawColor(40, 40, 40);
          doc.rect(imgX - 1, imgY - 1, imgWidth + 2, imgHeight + 2, 'D');
          
          doc.addImage(shot.image, 'PNG', imgX, imgY, imgWidth, imgHeight);

          // Prompt Box
          const promptY = imgY + imgHeight + 15;
          doc.setFillColor(20, 20, 20);
          doc.roundedRect(margin, promptY, contentWidth, 40, 3, 3, 'F');
          
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`PHAN CANH ${shot.number}`, margin + 5, promptY + 10);
          
          doc.setTextColor(180, 180, 180);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          
          // Wrap text
          const splitText = doc.splitTextToSize(shot.prompt, contentWidth - 10);
          doc.text(splitText, margin + 5, promptY + 20);

          // Style Tag
          const styleText = shot.style.toUpperCase();
          const styleWidth = doc.getTextWidth(styleText) + 6;
          doc.setFillColor(255, 107, 0);
          doc.roundedRect(margin + 5, promptY + 32, styleWidth, 5, 1, 1, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(6);
          doc.text(styleText, margin + 8, promptY + 35.5);
        }
      }

      doc.save(`Storyboard_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error("PDF Export error:", error);
      alert("Đã xảy ra lỗi khi xuất PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Header 
        apiKey={apiKey} 
        setApiKey={setApiKey} 
        onOpenScript={() => setIsScriptModalOpen(true)}
        onGenerateAll={generateAll}
        onExportPDF={exportPDF}
        isExporting={isExporting}
      />

      <div className="flex-1 flex overflow-hidden">
        <ReferencePanel 
          references={references} 
          onAdd={(ref) => setReferences(prev => [...prev, ref].slice(-3))}
          onRemove={(idx) => setReferences(prev => prev.filter((_, i) => i !== idx))}
        />

        <main className="flex-1 flex flex-col bg-[#050505] overflow-hidden">
          {/* Main Preview Area */}
          <div className="flex-1 p-8 flex items-center justify-center overflow-hidden">
            <div className="w-full max-w-5xl aspect-video bg-white/5 rounded-2xl border border-white/10 overflow-hidden relative group shadow-2xl">
              {selectedShot?.image ? (
                <img 
                  src={selectedShot.image} 
                  alt={`Shot ${selectedShot.number}`} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-white/20">
                  {selectedShot?.status === 'generating' ? (
                    <>
                      <Loader2 className="w-12 h-12 animate-spin text-brand" />
                      <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Đang vẽ phân cảnh {selectedShot.number}...</p>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-16 h-16" />
                      <p className="text-sm font-bold uppercase tracking-widest">Chưa có hình ảnh</p>
                    </>
                  )}
                </div>
              )}

              {/* Overlay Controls */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-brand text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">Shot {selectedShot?.number}</span>
                    <span className="text-white/60 text-xs truncate max-w-md">{selectedShot?.prompt}</span>
                  </div>
                  <button 
                    onClick={() => selectedShot && generateImage(selectedShot)}
                    disabled={selectedShot?.status === 'generating'}
                    className="bg-white text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-brand hover:text-white transition-all flex items-center gap-2"
                  >
                    <RefreshCcw className={cn("w-3 h-3", selectedShot?.status === 'generating' && "animate-spin")} />
                    Vẽ lại
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline / Film Strip */}
          <div className="h-48 border-t border-white/10 bg-[#0A0A0A] p-4 flex gap-4 overflow-x-auto custom-scrollbar items-center">
            {shots.map((shot) => (
              <button 
                key={shot.id}
                onClick={() => setSelectedShotId(shot.id)}
                className={cn(
                  "flex-shrink-0 w-64 aspect-video rounded-lg border-2 transition-all relative overflow-hidden group",
                  selectedShotId === shot.id ? "border-brand ring-4 ring-brand/20" : "border-white/10 hover:border-white/30"
                )}
              >
                {shot.image ? (
                  <img src={shot.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-white/5 flex items-center justify-center">
                    {shot.status === 'generating' ? (
                      <Loader2 className="w-6 h-6 animate-spin text-brand/40" />
                    ) : (
                      <span className="text-white/20 text-[10px] font-bold uppercase tracking-widest">Shot {shot.number}</span>
                    )}
                  </div>
                )}
                <div className="absolute bottom-2 left-2 flex gap-1">
                  <span className="bg-black/60 backdrop-blur-md text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase border border-white/10">
                    {shot.style}
                  </span>
                </div>
                {shot.status === 'error' && (
                  <div className="absolute top-2 right-2 text-red-500">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                )}
              </button>
            ))}
            <button 
              onClick={addShot}
              className="flex-shrink-0 w-24 aspect-video rounded-lg border-2 border-dashed border-white/10 hover:border-brand hover:bg-brand/5 transition-all flex items-center justify-center group"
            >
              <Plus className="w-6 h-6 text-white/20 group-hover:text-brand" />
            </button>
          </div>
        </main>

        {/* Editor Sidebar */}
        <aside className="w-80 border-l border-white/10 bg-[#0F0F0F] flex flex-col">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-brand uppercase tracking-widest">Phân cảnh {selectedShot?.number}</span>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">Shot {selectedShot?.number}</h2>
              </div>
              <button 
                onClick={() => selectedShot && removeShot(selectedShot.id)}
                className="text-white/20 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                    <Settings className="w-3 h-3" /> Phong cách (Style)
                  </label>
                  <button 
                    onClick={() => {
                      const style = selectedShot?.style;
                      if (style) setShots(prev => prev.map(s => ({ ...s, style })));
                    }}
                    className="text-[10px] font-bold text-brand uppercase hover:underline"
                  >
                    Áp dụng cho tất cả
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {STORYBOARD_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => selectedShot && updateShot(selectedShot.id, { style: style.id })}
                      className={cn(
                        "px-3 py-2 rounded-lg text-[10px] font-bold text-left transition-all border",
                        selectedShot?.style === style.id 
                          ? "bg-brand border-brand text-white" 
                          : "bg-white/5 border-white/5 text-white/40 hover:border-white/20 hover:text-white"
                      )}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3 block">Câu lệnh vẽ (Prompt)</label>
                <textarea 
                  value={selectedShot?.prompt || ""}
                  onChange={(e) => selectedShot && updateShot(selectedShot.id, { prompt: e.target.value })}
                  placeholder="Mô tả phân cảnh này..."
                  className="w-full h-40 bg-black/40 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-brand/50 transition-colors resize-none custom-scrollbar"
                />
              </div>

              <button 
                onClick={() => selectedShot && generateImage(selectedShot)}
                disabled={selectedShot?.status === 'generating' || !selectedShot?.prompt}
                className="w-full py-4 rounded-xl bg-brand text-white font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand/20"
              >
                {selectedShot?.status === 'generating' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang vẽ...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    Vẽ phân cảnh
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-4">Hướng dẫn sử dụng</h3>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-brand/20 text-brand flex items-center justify-center text-[10px] font-bold flex-shrink-0">1</div>
                <p className="text-xs text-white/60 leading-relaxed">Nhập <span className="text-white font-bold">API Key</span> từ Google AI Studio vào thanh menu phía trên.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-brand/20 text-brand flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</div>
                <p className="text-xs text-white/60 leading-relaxed">Tải lên tối đa 3 ảnh <span className="text-white font-bold">nhân vật tham chiếu</span> để giữ tính nhất quán.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-brand/20 text-brand flex items-center justify-center text-[10px] font-bold flex-shrink-0">3</div>
                <p className="text-xs text-white/60 leading-relaxed">Sử dụng nút <span className="text-white font-bold">Nhập kịch bản</span> để tạo nhanh nhiều phân cảnh cùng lúc.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-brand/20 text-brand flex items-center justify-center text-[10px] font-bold flex-shrink-0">4</div>
                <p className="text-xs text-white/60 leading-relaxed">Chọn phong cách vẽ và nhấn <span className="text-white font-bold">Vẽ phân cảnh</span> để bắt đầu tạo hình.</p>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {isScriptModalOpen && (
          <ScriptModal 
            isOpen={isScriptModalOpen} 
            onClose={() => setIsScriptModalOpen(false)} 
            onImport={importScript} 
          />
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          header, aside, .w-64, .h-48, button { display: none !important; }
          main { display: block !important; background: white !important; }
          .aspect-video { aspect-ratio: auto !important; height: auto !important; margin-bottom: 2rem; page-break-inside: avoid; }
          img { border: 1px solid #eee; }
          .text-white { color: black !important; }
          .bg-brand { background: black !important; }
        }
      `}</style>
    </div>
  );
}

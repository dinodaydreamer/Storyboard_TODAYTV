
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  Play, 
  RefreshCw, 
  Image as ImageIcon,
  Square,
  XCircle,
  GripHorizontal,
  HelpCircle,
  LayoutGrid,
  Info,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle,
  Palette,
  ExternalLink,
  BookOpen,
  Copy
} from 'lucide-react';
import { Scene, APIStatus, StoryboardStyle } from './types';
import { generateStoryboardSketch } from './services/geminiService';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Sortable from 'sortablejs';

const App: React.FC = () => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [scriptInput, setScriptInput] = useState('');
  const [showScriptInput, setShowScriptInput] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiStatus, setApiStatus] = useState<APIStatus>(APIStatus.IDLE);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const stopGenerationRef = useRef(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const sortableRef = useRef<Sortable | null>(null);
  const pdfItemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const selectedScene = useMemo(() => 
    scenes.find(s => s.id === selectedSceneId) || null
  , [scenes, selectedSceneId]);

  const isReadyToExport = useMemo(() => {
    return scenes.length > 0 && scenes.every(s => !!s.imageUrl && !s.isGenerating);
  }, [scenes]);

  useEffect(() => {
    if (timelineRef.current) {
      sortableRef.current = new Sortable(timelineRef.current, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        onEnd: (evt) => {
          const { oldIndex, newIndex } = evt;
          if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex) {
            setScenes((prev) => {
              const updated = [...prev];
              const [movedItem] = updated.splice(oldIndex, 1);
              updated.splice(newIndex, 0, movedItem);
              return updated.map((s, i) => ({ ...s, shotNumber: i + 1 }));
            });
          }
        },
      });
    }
    return () => sortableRef.current?.destroy();
  }, [scenes.length]);

  const checkConnection = useCallback(async () => {
    try {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      setApiStatus(hasKey ? APIStatus.CONNECTED : APIStatus.IDLE);
    } catch (e) {
      setApiStatus(APIStatus.ERROR);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const handleConnect = async () => {
    setApiStatus(APIStatus.CONNECTING);
    try {
      await (window as any).aistudio.openSelectKey();
      setApiStatus(APIStatus.CONNECTED);
      setShowSettings(false);
    } catch (e) {
      setApiStatus(APIStatus.ERROR);
    }
  };

  const parseScript = () => {
    if (!scriptInput.trim()) return;
    
    const rawScenes = scriptInput.split(/(?=Shot \d+|Phân cảnh \d+|Cảnh \d+|Phân đoạn \d+)/i)
      .filter(s => s.trim().length > 0);
    
    const newScenes: Scene[] = rawScenes.map((content, index) => {
      const description = content.replace(/^(Shot|Phân cảnh|Cảnh|Phân đoạn)\s+\d+[:\-\s]*/i, '').trim();
      return {
        id: crypto.randomUUID(),
        shotNumber: index + 1,
        description: description || 'Không có mô tả',
        visualPrompt: description || 'Mô tả hình ảnh...',
        isGenerating: false,
        duration: 5,
        shotType: "Trung cảnh (Medium Shot)",
        style: "sketch",
        aspectRatio: "16:9"
      };
    });

    setScenes(newScenes);
    if (newScenes.length > 0) setSelectedSceneId(newScenes[0].id);
    setScriptInput('');
    setShowScriptInput(false);
  };

  const applyStyleToAll = () => {
    if (!selectedScene) return;
    const style = selectedScene.style;
    setScenes(prev => prev.map(s => ({ ...s, style })));
  };

  const addScene = (afterId?: string) => {
    const newScene: Scene = {
      id: crypto.randomUUID(),
      shotNumber: 0,
      description: 'Mô tả kịch bản mới...',
      visualPrompt: 'Mô tả hình ảnh phác thảo...',
      isGenerating: false,
      duration: 5,
      shotType: "Trung cảnh (Medium Shot)",
      style: selectedScene?.style || "sketch",
      aspectRatio: "16:9"
    };
    
    setScenes(prev => {
      let updated;
      if (afterId) {
        const index = prev.findIndex(s => s.id === afterId);
        updated = [...prev];
        updated.splice(index + 1, 0, newScene);
      } else {
        updated = [...prev, newScene];
      }
      return updated.map((s, i) => ({ ...s, shotNumber: i + 1 }));
    });
    setSelectedSceneId(newScene.id);
  };

  const updateScene = (id: string, updates: Partial<Scene>) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteScene = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setScenes(prev => {
      const filtered = prev.filter(s => s.id !== id);
      return filtered.map((s, i) => ({ ...s, shotNumber: i + 1 }));
    });
    if (selectedSceneId === id) setSelectedSceneId(null);
  };

  const generateSingle = async (id: string) => {
    const scene = scenes.find(s => s.id === id);
    if (!scene || apiStatus !== APIStatus.CONNECTED) {
      if (apiStatus !== APIStatus.CONNECTED) setShowSettings(true);
      return;
    }

    updateScene(id, { isGenerating: true, error: undefined });
    try {
      const imageUrl = await generateStoryboardSketch(scene.visualPrompt || scene.description, scene.style);
      updateScene(id, { imageUrl, isGenerating: false });
    } catch (error: any) {
      const errMsg = error.message === "API_KEY_RESET_REQUIRED" ? "Cần reset API Key" : "Lỗi tạo ảnh";
      updateScene(id, { isGenerating: false, error: errMsg });
      if (error.message === "API_KEY_RESET_REQUIRED") {
        setApiStatus(APIStatus.IDLE);
        setShowSettings(true);
      }
    }
  };

  const generateAll = async () => {
    if (apiStatus !== APIStatus.CONNECTED) {
      setShowSettings(true);
      return;
    }
    setIsGeneratingAll(true);
    stopGenerationRef.current = false;

    for (const scene of scenes) {
      if (stopGenerationRef.current) break;
      if (!scene.imageUrl) {
        await generateSingle(scene.id);
      }
    }
    setIsGeneratingAll(false);
  };

  const stopGeneration = () => {
    stopGenerationRef.current = true;
    setIsGeneratingAll(false);
  };

  const exportToPDF = async () => {
    if (!isReadyToExport) return;
    setIsExporting(true);
    
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const container = pdfItemRefs.current[scene.id];
        if (!container) continue;

        const images = Array.from(container.getElementsByTagName('img')) as HTMLImageElement[];
        await Promise.all(images.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }));

        const canvas = await html2canvas(container, {
          backgroundColor: '#ffffff',
          scale: 2, // Tăng chất lượng ảnh
          useCORS: true,
          logging: false
        });

        if (i > 0) pdf.addPage();
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }

      pdf.save(`Storyboard_${scenes.length}_Shots_${Date.now()}.pdf`);
    } catch (err) {
      console.error("PDF Export failed:", err);
      alert("Xuất PDF thất bại. Vui lòng kiểm tra lại kết nối mạng.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0f0f0f] text-gray-200 overflow-hidden font-sans">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-[#222] bg-[#0f0f0f] z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="bg-[#ff6b00] p-1.5 rounded-lg text-black font-bold shadow-[0_0_15px_rgba(255,107,0,0.3)]">
              <ImageIcon size={20} />
            </div>
            <span className="text-xl font-black italic tracking-tighter text-white uppercase">AI SKETCH <span className="text-[#ff6b00]">PRO</span></span>
          </div>

          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-3 px-4 py-1.5 rounded-full border border-[#333] bg-[#1a1a1a] hover:bg-[#222] transition-colors group cursor-pointer"
          >
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider group-hover:text-gray-300">API:</span>
            <div className={`w-2 h-2 rounded-full ${apiStatus === APIStatus.CONNECTED ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className={`text-[10px] font-bold ${apiStatus === APIStatus.CONNECTED ? 'text-white' : 'text-red-500 underline'}`}>
              {apiStatus === APIStatus.CONNECTED ? 'CONNECTED' : 'CHƯA KẾT NỐI'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowGuide(true)} className="p-2 text-gray-500 hover:text-[#ff6b00] transition-colors">
            <HelpCircle size={20} />
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2 text-gray-500 hover:text-[#ff6b00] transition-colors">
            <SettingsIcon size={20} />
          </button>
          <div className="w-px h-6 bg-[#333] mx-2" />
          <button onClick={() => setShowScriptInput(!showScriptInput)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a1a1a] text-xs font-bold hover:bg-[#222] transition-colors border border-[#333]">
            <Play size={16} /> NHẬP KỊCH BẢN
          </button>
          {!isGeneratingAll ? (
            <button 
              onClick={generateAll}
              disabled={apiStatus !== APIStatus.CONNECTED || scenes.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ff6b00] text-black font-bold text-xs hover:bg-[#e66000] disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(255,107,0,0.2)]"
            >
              <RefreshCw size={16} /> VẼ TẤT CẢ
            </button>
          ) : (
            <button onClick={stopGeneration} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-all">
              <XCircle size={16} /> DỪNG TẠO
            </button>
          )}

          {isReadyToExport && (
            <button 
              onClick={exportToPDF} 
              disabled={isExporting} 
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black font-bold text-xs hover:bg-gray-200 transition-all animate-in fade-in slide-in-from-right-2"
            >
              {isExporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
              {isExporting ? 'XUẤT...' : 'XUẤT PDF'}
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* API Settings Modal */}
        {showSettings && (
          <div className="absolute inset-0 z-[100] bg-black/95 flex items-center justify-center p-10 backdrop-blur-xl">
            <div className="bg-[#1a1a1a] w-full max-w-md rounded-3xl border border-[#333] p-8 shadow-3xl space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Cấu hình API</h2>
                <p className="text-gray-500 text-sm">Vui lòng chọn hoặc thay đổi API Key để tiếp tục sử dụng dịch vụ phác thảo.</p>
              </div>
              
              <div className="p-6 bg-black/40 rounded-2xl border border-white/5 space-y-4">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-gray-400">
                  <span>Trạng thái kết nối</span>
                  <div className={`px-3 py-1 rounded-full ${apiStatus === APIStatus.CONNECTED ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                    {apiStatus}
                  </div>
                </div>
                <button 
                  onClick={handleConnect} 
                  className="w-full py-5 bg-[#ff6b00] text-black font-black uppercase tracking-[0.2em] rounded-xl hover:bg-[#e66000] transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,107,0,0.2)]"
                >
                  <RefreshCw size={20} />
                  THAY ĐỔI MÃ API KHÁC
                </button>
              </div>

              <div className="space-y-4 text-center">
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-[#ff6b00] transition-colors"
                >
                  <Info size={14} /> Tìm hiểu về biểu phí và API Key <ExternalLink size={12} />
                </a>
                <button 
                  onClick={() => setShowSettings(false)} 
                  className="w-full py-3 text-gray-500 font-bold hover:text-white transition-colors uppercase text-[10px] tracking-widest"
                >
                  Bỏ qua & Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Guide Modal */}
        {showGuide && (
          <div className="absolute inset-0 z-[100] bg-black/95 flex items-center justify-center p-10 backdrop-blur-xl">
            <div className="bg-[#1a1a1a] w-full max-w-2xl rounded-3xl border border-[#333] p-10 shadow-3xl space-y-8 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
                  <BookOpen className="text-[#ff6b00]" /> HƯỚNG DẪN SỬ DỤNG
                </h2>
                <button onClick={() => setShowGuide(false)} className="p-2 hover:text-white transition-colors"><XCircle size={32} /></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="font-black text-[#ff6b00] uppercase tracking-widest flex items-center gap-2">
                      <span className="bg-[#ff6b00] text-black w-6 h-6 rounded-full flex items-center justify-center text-[10px]">1</span> 
                      Nhập kịch bản
                    </h3>
                    <p className="text-gray-400 leading-relaxed">Nhấn <b>"NHẬP KỊCH BẢN"</b> và dán nội dung. Mỗi phân cảnh nên bắt đầu bằng "Shot X:" hoặc "Phân cảnh X:".</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-black text-[#ff6b00] uppercase tracking-widest flex items-center gap-2">
                      <span className="bg-[#ff6b00] text-black w-6 h-6 rounded-full flex items-center justify-center text-[10px]">2</span> 
                      Chọn phong cách
                    </h3>
                    <p className="text-gray-400 leading-relaxed">Chọn Sketch, Colored Pencil, 2D... Bạn có thể <b>áp dụng cho tất cả</b> các shot nhanh chóng.</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="font-black text-[#ff6b00] uppercase tracking-widest flex items-center gap-2">
                      <span className="bg-[#ff6b00] text-black w-6 h-6 rounded-full flex items-center justify-center text-[10px]">3</span> 
                      Tạo hình ảnh
                    </h3>
                    <p className="text-gray-400 leading-relaxed">Nhấn <b>"VẼ LẠI"</b> hoặc <b>"VẼ TẤT CẢ"</b>. Hệ thống sẽ xử lý từng shot theo timeline.</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-black text-[#ff6b00] uppercase tracking-widest flex items-center gap-2">
                      <span className="bg-[#ff6b00] text-black w-6 h-6 rounded-full flex items-center justify-center text-[10px]">4</span> 
                      Xuất PDF
                    </h3>
                    <p className="text-gray-400 leading-relaxed">Khi hoàn tất, nút <b>"XUẤT PDF"</b> hiện lên. Mỗi phân cảnh sẽ nằm trên 1 trang PDF ngang riêng biệt.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 p-6 rounded-2xl border border-white/5 flex items-start gap-4">
                <AlertCircle className="text-[#ff6b00] shrink-0" size={24} />
                <p className="text-xs text-gray-500 leading-relaxed italic">
                  Ghi chú: Ảnh xuất PDF sẽ giữ nguyên tỷ lệ khung hình (16:9), không bị dẹt hay méo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Center Preview */}
        <div className="flex-1 flex flex-col p-6 bg-[#0a0a0a] overflow-hidden">
          <div className="flex-1 bg-[#111] rounded-3xl border border-[#222] relative flex items-center justify-center overflow-hidden">
            {selectedScene ? (
              <div className="w-full h-full p-4 relative">
                <div className="w-full h-full rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-white/5 shadow-2xl">
                  {selectedScene.imageUrl ? (
                    <img src={selectedScene.imageUrl} className="w-full h-full object-contain" alt="Shot" />
                  ) : (
                    <div className="flex flex-col items-center gap-6 text-gray-800">
                      <ImageIcon size={96} strokeWidth={0.5} />
                    </div>
                  )}
                  {selectedScene.isGenerating && (
                    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-10">
                      <div className="w-14 h-14 border-2 border-[#ff6b00] border-t-transparent rounded-full animate-spin mb-6" />
                      <p className="text-[#ff6b00] font-black uppercase text-[10px] tracking-[0.4em] animate-pulse">Đang phác thảo {selectedScene.style}...</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-gray-700">
                <LayoutGrid size={48} />
                <p className="text-sm italic opacity-50 uppercase tracking-widest">Chọn Shot từ Timeline</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <aside className="w-[400px] border-l border-[#222] bg-[#0f0f0f] flex flex-col p-8 overflow-y-auto no-print scrollbar-hide">
          {selectedScene ? (
            <div className="space-y-8">
              <div className="flex justify-between items-start">
                <div>
                  <span className="bg-[#ff6b00] text-black text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest">PHÂN CẢNH {selectedScene.shotNumber}</span>
                  <h2 className="text-4xl font-black text-white mt-3 italic tracking-tighter">SHOT {selectedScene.shotNumber}</h2>
                </div>
                <button onClick={(e) => deleteScene(selectedScene.id, e)} className="p-2 bg-red-600/10 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all"><Trash2 size={18} /></button>
              </div>

              {/* Style Selector */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Palette size={12} /> Phong cách (Style)
                  </label>
                  <button 
                    onClick={applyStyleToAll}
                    className="text-[9px] font-black text-[#ff6b00] hover:underline uppercase tracking-widest"
                  >
                    Áp dụng cho tất cả
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'sketch', label: 'Bút chì (Mono)' },
                    { id: 'colored-pencil', label: 'Bút chì màu' },
                    { id: '2d-animation', label: 'Hoạt hình 2D' },
                    { id: '3d-render', label: 'Dựng hình 3D' },
                    { id: 'realistic', label: 'Tả thực' },
                    { id: 'noir', label: 'Đen trắng Noir' }
                  ].map(s => (
                    <button 
                      key={s.id}
                      onClick={() => updateScene(selectedScene.id, { style: s.id as StoryboardStyle })}
                      className={`py-3 px-3 rounded-xl border text-[9px] font-black transition-all text-left flex items-center justify-between ${selectedScene.style === s.id ? 'bg-[#ff6b00] text-black border-[#ff6b00]' : 'bg-[#1a1a1a] text-gray-500 border-[#333] hover:border-[#555]'}`}
                    >
                      {s.label}
                      {selectedScene.style === s.id && <CheckCircle2 size={10} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">Kịch bản / Mô tả</label>
                <textarea 
                  className="w-full h-40 bg-[#1a1a1a] border border-[#333] rounded-2xl p-6 text-xs leading-relaxed font-semibold focus:border-[#ff6b00] outline-none resize-none transition-all"
                  value={selectedScene.description}
                  onChange={(e) => updateScene(selectedScene.id, { description: e.target.value })}
                />
              </div>

              <button 
                onClick={() => generateSingle(selectedScene.id)}
                disabled={selectedScene.isGenerating || apiStatus !== APIStatus.CONNECTED}
                className="w-full py-5 bg-white text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center gap-4 shadow-2xl disabled:opacity-50"
              >
                {selectedScene.isGenerating ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                {selectedScene.isGenerating ? 'ĐANG VẼ...' : (selectedScene.imageUrl ? 'VẼ LẠI PHÂN CẢNH' : 'BẮT ĐẦU VẼ')}
              </button>
            </div>
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50 space-y-4">
               <Palette size={48} />
               <p className="text-sm font-bold uppercase tracking-widest text-center">Chọn Shot để cấu hình</p>
             </div>
          )}
        </aside>
      </div>

      {/* Bottom Timeline */}
      <div className="h-72 border-t border-[#222] bg-[#0a0a0a] flex flex-col no-print">
        <div ref={timelineRef} className="flex-1 overflow-x-auto p-6 flex items-start gap-4 custom-scrollbar">
          {scenes.map((scene) => (
            <div 
              key={scene.id}
              onClick={() => setSelectedSceneId(scene.id)}
              className={`flex-shrink-0 h-full w-[300px] rounded-2xl border-2 transition-all cursor-pointer overflow-hidden group relative flex flex-col ${selectedSceneId === scene.id ? 'border-[#ff6b00] bg-[#1a1a1a]' : 'border-[#222] bg-[#111] hover:border-[#444]'}`}
            >
              <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); addScene(scene.id); }} className="bg-[#ff6b00] text-black p-2 rounded-xl"><Plus size={14} /></button>
                <button onClick={(e) => { e.stopPropagation(); deleteScene(scene.id, e); }} className="bg-red-600 text-white p-2 rounded-xl"><Trash2 size={14} /></button>
              </div>
              <div className="h-[140px] bg-[#000] flex items-center justify-center relative border-b border-[#222]">
                {scene.imageUrl ? (
                  <img src={scene.imageUrl} className="w-full h-full object-cover" alt="Shot" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-800">
                    {scene.isGenerating ? <RefreshCw size={24} className="animate-spin text-[#ff6b00]" /> : <ImageIcon size={36} />}
                  </div>
                )}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 rounded text-[7px] font-black text-[#ff6b00] uppercase tracking-widest">{scene.style}</div>
              </div>
              <div className="flex-1 p-4 bg-gradient-to-t from-black/20 to-transparent">
                <span className="text-[11px] font-black text-[#ff6b00] italic">SHOT {scene.shotNumber}</span>
                <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 italic font-medium leading-relaxed">{scene.description}</p>
              </div>
            </div>
          ))}
          <button 
            onClick={() => addScene()} 
            className="flex-shrink-0 h-full w-20 rounded-2xl border-2 border-dashed border-[#333] flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-[#ff6b00] hover:border-[#ff6b00] transition-all group"
          >
            <Plus size={32} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* Script Import Modal */}
      {showScriptInput && (
        <div className="fixed inset-0 z-[250] bg-black/90 flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-[#111] max-w-3xl w-full rounded-3xl border border-[#333] p-10 space-y-8 shadow-3xl">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Nhập Kịch Bản</h3>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Tự động phân tách Shot 1, Shot 2...</p>
              </div>
              <button onClick={() => setShowScriptInput(false)} className="p-2 hover:text-[#ff6b00] transition-colors"><XCircle size={32} /></button>
            </div>
            
            <textarea
              value={scriptInput}
              onChange={(e) => setScriptInput(e.target.value)}
              className="w-full h-80 bg-black border border-[#333] rounded-2xl p-8 font-mono text-sm outline-none focus:border-[#ff6b00] transition-all leading-relaxed shadow-inner"
              placeholder="Shot 1: Mô tả... Shot 2: Mô tả..."
            />
            
            <button
              onClick={parseScript}
              className="w-full bg-[#ff6b00] py-5 rounded-2xl font-black uppercase tracking-[0.3em] hover:bg-[#e66000] transition-all shadow-lg"
            >
              TẠO TIMELINE
            </button>
          </div>
        </div>
      )}

      {/* HIDDEN PDF TEMPLATE - GIỮ TỈ LỆ KHUNG HÌNH VÀ MỖI SHOT 1 TRANG */}
      <div style={{ position: 'fixed', left: '-20000px', top: 0 }}>
        {scenes.map((s) => (
          <div key={s.id} ref={el => pdfItemRefs.current[s.id] = el} className="w-[1123px] h-[794px] bg-white text-black p-20 flex flex-col box-border">
            <div className="flex justify-between items-end border-b-8 border-black pb-8 mb-12 shrink-0">
              <div className="flex items-center gap-8">
                <div className="bg-black text-white px-10 py-4 text-4xl font-black italic">SHOT {s.shotNumber}</div>
                <h1 className="text-4xl font-black uppercase opacity-20 tracking-tighter">AI Storyboard Production</h1>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Style Mode</p>
                <p className="text-lg font-black">{s.style.toUpperCase()}</p>
              </div>
            </div>

            <div className="flex-1 flex gap-12 overflow-hidden items-stretch">
              {/* IMAGE CONTAINER CỐ ĐỊNH TỈ LỆ 16:9 ĐỂ KHÔNG BỊ DẸT */}
              <div className="w-[65%] flex items-center justify-center">
                <div className="w-full relative bg-gray-50 border-[10px] border-black rounded-[40px] overflow-hidden shadow-xl" style={{ aspectRatio: '16/9' }}>
                  {s.imageUrl ? (
                    <img src={s.imageUrl} className="w-full h-full object-contain" crossOrigin="anonymous" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                      <ImageIcon size={150} />
                    </div>
                  )}
                </div>
              </div>

              {/* DESCRIPTION SECTION */}
              <div className="w-[35%] flex flex-col gap-8">
                <div className="flex-1 flex flex-col gap-4">
                  <h3 className="text-xs font-black uppercase bg-black text-white px-4 py-1 self-start">Mô tả phân cảnh</h3>
                  <div className="bg-gray-50 p-8 rounded-[40px] border-2 border-dashed border-gray-200 text-xl font-bold italic leading-relaxed flex-1 overflow-hidden">
                    {s.description}
                  </div>
                </div>
                <div className="pt-6 border-t border-gray-100 flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <p>AI Storyboard Sketcher Pro</p>
                  <p>Trang {s.shotNumber}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #222; border-radius: 20px; border: 2px solid #0a0a0a; }
        * { -webkit-font-smoothing: antialiased; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default App;

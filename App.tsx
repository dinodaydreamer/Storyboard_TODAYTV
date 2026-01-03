
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  Play, 
  RefreshCw, 
  Image as ImageIcon,
  XCircle,
  HelpCircle,
  LayoutGrid,
  Info,
  CheckCircle2,
  AlertCircle,
  Palette,
  BookOpen,
  Key as KeyIcon,
  Eye,
  EyeOff,
  GripVertical,
  GripHorizontal,
  FileText,
  Upload,
  Grip
} from 'lucide-react';
import { Scene, APIStatus, StoryboardStyle } from './types';
import { generateStoryboardSketch } from './services/geminiService';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Sortable from 'sortablejs';

const DEMO_SCRIPT = `SHOT 1 – GÓC RỘNG (ESTABLISHING SHOT)

Prompt:
Robot bảo hộ phong cách hoạt hình 3D điện ảnh, chiều cao khoảng 2,5 mét, thân hình to chắc bo tròn, đầu bầu dục lớn, hai mắt tròn phát sáng xanh dịu, lõi năng lượng tròn phát sáng ở ngực, thân kim loại xám xanh có vết trầy xước nhẹ, đứng giữa thành phố hậu tận thế đổ nát, các tòa nhà hoạt hình bị sập, đường phố trống trải, bình minh xám xanh, ánh sáng mềm, cảnh toàn rộng điện ảnh, tỷ lệ 16:9, không khí cô độc

SHOT 2 – GÓC THẤP (LOW ANGLE)

Prompt:
Robot bảo hộ phong cách hoạt hình 3D điện ảnh, chiều cao 2,5 mét, thân kim loại bo tròn xám xanh, mắt tròn phát sáng xanh dịu, lõi năng lượng ngực phát sáng, dáng đứng hơi khom, nhìn xuống thành phố đổ nát, góc máy thấp làm nổi bật kích thước và sự cô đơn, sương mù nhẹ quanh chân, ánh sáng ngược dịu, phong cách animation cinematic

SHOT 3 – CẬN CẢNH (CLOSE-UP)

Prompt:
Cận cảnh khuôn mặt robot bảo hộ phong cách hoạt hình 3D điện ảnh, đầu bầu dục, hai mắt tròn lớn phát sáng xanh dịu thể hiện cảm xúc buồn bã, bề mặt kim loại mờ có vết trầy xước nhỏ, ánh sáng mềm phản chiếu thành phố đổ nát, độ sâu trường ảnh nông, cảm xúc rõ nét

SHOT 4 – GÓC THEO SAU (TRACKING SHOT)

Prompt:
Robot bảo hộ phong cách hoạt hình 3D điện ảnh, thân hình to chắc bo tròn, bước chậm trên con phố bỏ hoang, lõi năng lượng ngực phát sáng nhẹ, góc máy theo sau từ phía sau, bảng hiệu hoạt hình cũ rách, giấy bay trong gió, màu sắc pastel trầm, cảm giác hoài niệm, chuyển động mượt

SHOT 5 – GÓC QUA VAI (OVER-THE-SHOULDER)

Prompt:
Góc máy qua vai robot bảo hộ phong cách hoạt hình 3D điện ảnh, vai rộng và cánh tay to bo tròn ở tiền cảnh, robot nhìn thấy một đứa trẻ nhỏ đang trốn trong siêu thị đổ nát, ánh nắng xiên nhẹ, tương phản giữa robot kim loại xám xanh và đứa trẻ mong manh, không khí cảm xúc

SHOT 6 – NGƯỢC SÁNG / SILHOUETTE

Prompt:
Robot bảo hộ phong cách hoạt hình 3D điện ảnh đứng che chắn phía trước đứa trẻ, thân hình bo tròn lớn, lõi năng lượng tròn trong ngực phát sáng mạnh hơn, ánh ngược tạo viền sáng quanh robot, tư thế bảo vệ, hậu cảnh thành phố tối nhẹ, cảm xúc hy sinh, phong cách animation cinematic

SHOT 7 – CẢNH HÀNH ĐỘNG (DYNAMIC SHOT)

Prompt:
Robot bảo hộ phong cách hoạt hình 3D điện ảnh, thân kim loại xám xanh bo tròn, mắt xanh phát sáng, lõi năng lượng ngực rực sáng, đứng đối diện nhiều robot săn đuổi tạo hình góc cạnh, chuyển động nhanh, bụi và khói bay, motion blur nhẹ, không khí căng thẳng nhưng phù hợp phim hoạt hình

SHOT 8 – GÓC RỘNG KẾT (EPILOGUE SHOT)

Prompt:
Cảnh toàn rộng hoạt hình điện ảnh lúc bình minh, robot bảo hộ phong cách hoạt hình 3D điện ảnh nằm bất động, thân kim loại xám xanh trầy xước, lõi năng lượng tắt dần, cánh tay bo tròn nằm ở tiền cảnh, đứa trẻ bước ra ánh sáng, thành phố yên lặng, không khí hy vọng và cảm động, tỷ lệ 16:9`;

const App: React.FC = () => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [scriptInput, setScriptInput] = useState('');
  const [showScriptInput, setShowScriptInput] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Panel Sizes
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [timelineHeight, setTimelineHeight] = useState(280);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingTimeline, setIsResizingTimeline] = useState(false);
  
  // API Key Management
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [showKey, setShowKey] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const stopGenerationRef = useRef(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const sortableRef = useRef<Sortable | null>(null);
  const pdfItemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const apiStatus = useMemo(() => {
    return apiKey.trim().length > 10 ? APIStatus.CONNECTED : APIStatus.IDLE;
  }, [apiKey]);

  const selectedScene = useMemo(() => 
    scenes.find(s => s.id === selectedSceneId) || null
  , [scenes, selectedSceneId]);

  const isReadyToExport = useMemo(() => {
    return scenes.length > 0 && scenes.every(s => !!s.imageUrl && !s.isGenerating);
  }, [scenes]);

  useEffect(() => {
    localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  // Handle Resizing Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 250 && newWidth < 600) {
          setSidebarWidth(newWidth);
        }
      }
      if (isResizingTimeline) {
        const newHeight = window.innerHeight - e.clientY;
        if (newHeight > 150 && newHeight < 500) {
          setTimelineHeight(newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setIsResizingTimeline(false);
      document.body.classList.remove('resizing');
    };

    if (isResizingSidebar || isResizingTimeline) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.classList.add('resizing');
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar, isResizingTimeline]);

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

  const handleTimelineWheel = (e: React.WheelEvent) => {
    if (timelineRef.current) {
      timelineRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setScriptInput(content);
    };
    reader.readAsText(file);
  };

  const parseScript = () => {
    if (!scriptInput.trim()) return;
    
    const rawScenes = scriptInput
      .split(/(?=Shot\s*\d+|Phân cảnh\s*\d+|Cảnh\s*\d+|Phân đoạn\s*\d+)/i)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    const newScenes: Scene[] = rawScenes.map((content, index) => {
      // Tách tiêu đề shot
      const lines = content.split('\n');
      const titleLine = lines[0];
      const rest = lines.slice(1).join('\n');
      
      // Tìm Prompt: nếu có
      const promptMatch = rest.match(/Prompt:([\s\S]*)/i);
      const visualPrompt = promptMatch ? promptMatch[1].trim() : rest.trim();
      const description = titleLine.replace(/^(Shot|Phân cảnh|Cảnh|Phân đoạn)\s*\d+[:\-\s]*/i, '').trim();

      return {
        id: crypto.randomUUID(),
        shotNumber: index + 1,
        description: description || 'Mô tả trống',
        visualPrompt: visualPrompt || description || 'Mô tả hình ảnh...',
        isGenerating: false,
        duration: 5,
        shotType: "Trung cảnh",
        style: "sketch",
        aspectRatio: "16:9"
      };
    });

    if (newScenes.length > 0) {
      setScenes(newScenes);
      setSelectedSceneId(newScenes[0].id);
      setScriptInput('');
      setShowScriptInput(false);
    }
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
      description: 'Mô tả mới...',
      visualPrompt: 'Mô tả hình ảnh...',
      isGenerating: false,
      duration: 5,
      shotType: "Trung cảnh",
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
    if (apiStatus !== APIStatus.CONNECTED) {
      alert("Vui lòng nhập API Key hợp lệ trên thanh menu!");
      return;
    }

    const scene = scenes.find(s => s.id === id);
    if (!scene) return;

    updateScene(id, { isGenerating: true, error: undefined });
    try {
      const imageUrl = await generateStoryboardSketch(scene.visualPrompt || scene.description, scene.style, apiKey);
      updateScene(id, { imageUrl, isGenerating: false });
    } catch (error: any) {
      console.error(error);
      updateScene(id, { isGenerating: false, error: "Lỗi API" });
      alert("Lỗi khi tạo ảnh. Vui lòng kiểm tra lại API Key.");
    }
  };

  const generateAll = async () => {
    if (apiStatus !== APIStatus.CONNECTED) {
      alert("Vui lòng nhập API Key!");
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

        const canvas = await html2canvas(container, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          logging: false
        });

        if (i > 0) pdf.addPage();
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }

      pdf.save(`Storyboard_${scenes.length}_Shots.pdf`);
    } catch (err) {
      alert("Lỗi xuất PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0f0f0f] text-gray-200 overflow-hidden font-sans">
      {/* Header */}
      <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 border-b border-[#222] bg-[#0f0f0f] z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-[#ff6b00] p-1.5 rounded-lg text-black font-bold shadow-[0_0_15px_rgba(255,107,0,0.3)]">
              <ImageIcon size={20} />
            </div>
            <span className="text-xl font-black italic tracking-tighter text-white uppercase hidden sm:inline">AI STORYBOARD <span className="text-[#ff6b00]">CREATOR</span></span>
          </div>

          {/* API Key Input Section */}
          <div className="flex items-center gap-3 bg-[#1a1a1a] border border-[#333] rounded-full pl-4 pr-2 py-1 transition-all focus-within:border-[#ff6b00] group">
            <KeyIcon size={14} className={apiStatus === APIStatus.CONNECTED ? "text-green-500" : "text-gray-500"} />
            <input 
              type={showKey ? "text" : "password"}
              placeholder="Nhập Gemini API Key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-transparent border-none outline-none text-[10px] font-bold text-white w-32 md:w-56 placeholder:text-gray-600"
            />
            <button onClick={() => setShowKey(!showKey)} className="p-1 hover:text-white transition-colors text-gray-500">
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <div className="flex items-center gap-2 ml-1 px-3 py-1 bg-black/40 rounded-full border border-white/5">
              <div className={`w-1.5 h-1.5 rounded-full ${apiStatus === APIStatus.CONNECTED ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className={`text-[9px] font-black uppercase tracking-widest ${apiStatus === APIStatus.CONNECTED ? 'text-green-500' : 'text-red-500'}`}>
                {apiStatus === APIStatus.CONNECTED ? 'CONNECTED' : 'IDLE'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowGuide(true)} className="p-2 text-gray-500 hover:text-[#ff6b00] transition-colors">
            <HelpCircle size={20} />
          </button>
          <div className="w-px h-6 bg-[#333] mx-2" />
          <button onClick={() => setShowScriptInput(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a1a1a] text-xs font-bold hover:bg-[#222] transition-colors border border-[#333]">
            <Play size={16} /> NHẬP KỊCH BẢN
          </button>
          {!isGeneratingAll ? (
            <button 
              onClick={generateAll}
              disabled={scenes.length === 0 || apiStatus !== APIStatus.CONNECTED}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ff6b00] text-black font-bold text-xs hover:bg-[#e66000] disabled:opacity-50 transition-all"
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
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black font-bold text-xs hover:bg-gray-200 transition-all"
            >
              {isExporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
              {isExporting ? 'ĐANG XUẤT...' : 'XUẤT PDF'}
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Workspace Central Column */}
        <div className="flex-1 flex flex-col p-6 bg-[#0a0a0a] overflow-hidden">
          <div className="flex-1 bg-[#111] rounded-3xl border border-[#222] relative flex items-center justify-center overflow-hidden">
            {selectedScene ? (
              <div className="w-full h-full p-8 flex items-center justify-center">
                <div className="w-full max-w-[1200px] aspect-video rounded-3xl overflow-hidden bg-black border border-white/5 relative shadow-2xl">
                  {selectedScene.imageUrl ? (
                    <img src={selectedScene.imageUrl} className="w-full h-full object-contain" alt="Preview" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-800">
                      <ImageIcon size={120} strokeWidth={0.5} />
                      <p className="mt-4 text-xs font-black uppercase tracking-widest opacity-20">No Image Generated</p>
                    </div>
                  )}
                  {selectedScene.isGenerating && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
                      <RefreshCw size={48} className="text-[#ff6b00] animate-spin mb-4" />
                      <p className="text-[#ff6b00] font-black uppercase text-[10px] tracking-[0.4em] animate-pulse">Rendering {selectedScene.style}...</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-gray-800">
                <LayoutGrid size={64} />
                <p className="text-sm font-black italic uppercase tracking-widest opacity-30">Chọn shot từ Timeline</p>
              </div>
            )}
          </div>
        </div>

        {/* Horizontal Resizer Line (Vertical Handle) for Sidebar */}
        <div 
          className={`resizer-h ${isResizingSidebar ? 'active' : ''}`}
          onMouseDown={() => setIsResizingSidebar(true)}
        >
          <div className="h-full flex items-center justify-center">
            <GripVertical size={12} className="text-black/50" />
          </div>
        </div>

        {/* Sidebar */}
        <aside 
          className="border-l border-[#222] bg-[#0f0f0f] flex flex-col p-8 overflow-y-auto no-print scrollbar-hide"
          style={{ width: sidebarWidth }}
        >
          {selectedScene ? (
            <div className="space-y-8">
              <div>
                <span className="bg-[#ff6b00] text-black text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest">PHÂN CẢNH {selectedScene.shotNumber}</span>
                <h2 className="text-4xl font-black text-white mt-3 italic tracking-tighter">SHOT {selectedScene.shotNumber}</h2>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Palette size={12} /> Phong cách (Style)
                  </label>
                  <button onClick={applyStyleToAll} className="text-[9px] font-black text-[#ff6b00] hover:underline uppercase tracking-widest">Áp dụng cho tất cả</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'sketch', label: 'Bút chì' },
                    { id: 'colored-pencil', label: 'Bút chì màu' },
                    { id: '2d-animation', label: 'Hoạt hình 2D' },
                    { id: '3d-render', label: 'Dựng hình 3D' },
                    { id: 'realistic', label: 'Tả thực' },
                    { id: 'noir', label: 'Film Noir' }
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
                <label className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">Câu lệnh vẽ (Prompt)</label>
                <textarea 
                  className="w-full h-44 bg-[#1a1a1a] border border-[#333] rounded-2xl p-6 text-xs leading-relaxed font-semibold focus:border-[#ff6b00] outline-none resize-none transition-all"
                  value={selectedScene.visualPrompt}
                  onChange={(e) => updateScene(selectedScene.id, { visualPrompt: e.target.value })}
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">Mô tả phân cảnh</label>
                <input 
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl p-4 text-xs font-semibold focus:border-[#ff6b00] outline-none transition-all"
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
                {selectedScene.isGenerating ? 'ĐANG VẼ...' : 'VẼ LẠI PHÂN CẢNH'}
              </button>
              {apiStatus !== APIStatus.CONNECTED && (
                <p className="text-[9px] text-red-500 font-bold uppercase tracking-widest text-center italic">Vui lòng nhập API Key để bắt đầu vẽ</p>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-800 opacity-50 space-y-4">
              <Palette size={48} />
              <p className="text-xs font-black uppercase tracking-widest text-center px-10">Chọn một phân cảnh để tinh chỉnh</p>
            </div>
          )}
        </aside>
      </div>

      {/* Vertical Resizer Handle for Timeline */}
      <div 
        className={`resizer-v ${isResizingTimeline ? 'active' : ''}`}
        onMouseDown={() => setIsResizingTimeline(true)}
      >
        <div className="w-full flex items-center justify-center">
          <GripHorizontal size={12} className="text-black/50" />
        </div>
      </div>

      {/* Timeline Section with Film Reel Styling */}
      <div 
        className="flex-shrink-0 film-reel-container flex flex-col no-print"
        style={{ height: timelineHeight }}
      >
        <div className="film-perforations perforations-top"></div>
        <div className="film-perforations perforations-bottom"></div>
        
        <div className="flex-1 film-content-mask overflow-hidden flex flex-col p-4">
          <div 
            ref={timelineRef} 
            onWheel={handleTimelineWheel}
            className="flex-1 overflow-x-auto p-4 flex items-start gap-5 custom-scrollbar"
          >
            {scenes.map((scene) => (
              <div 
                key={scene.id}
                onClick={() => setSelectedSceneId(scene.id)}
                className={`flex-shrink-0 h-full w-[300px] rounded-xl border-2 transition-all cursor-pointer overflow-hidden group relative flex flex-col ${selectedSceneId === scene.id ? 'border-[#ff6b00] bg-[#1a1a1a] scale-105 z-20' : 'border-[#333] bg-black hover:border-[#555]'}`}
              >
                {/* Drag Handle */}
                <div className="drag-handle absolute top-2 left-2 z-30 p-1.5 bg-black/60 rounded-lg text-white/50 hover:text-white cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                  <Grip size={14} />
                </div>

                {/* Actions Overlay */}
                <div className="absolute top-2 right-2 z-20 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); addScene(scene.id); }} 
                    title="Thêm phân cảnh"
                    className="bg-blue-600 text-white p-1.5 rounded-lg hover:scale-110 transition-transform shadow-lg"
                  >
                    <Plus size={14} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); generateSingle(scene.id); }} 
                    title="Vẽ lại"
                    disabled={scene.isGenerating || apiStatus !== APIStatus.CONNECTED}
                    className="bg-[#ff6b00] text-black p-1.5 rounded-lg hover:scale-110 transition-transform shadow-lg disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={scene.isGenerating ? 'animate-spin' : ''} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteScene(scene.id, e); }} 
                    title="Xóa"
                    className="bg-red-600 text-white p-1.5 rounded-lg hover:scale-110 transition-transform shadow-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="h-[120px] bg-black flex items-center justify-center relative border-b border-[#222]">
                  {scene.imageUrl ? (
                    <img src={scene.imageUrl} className="w-full h-full object-cover" alt="Thumb" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-800">
                      {scene.isGenerating ? <RefreshCw size={24} className="animate-spin text-[#ff6b00]" /> : <ImageIcon size={32} />}
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/80 rounded text-[7px] font-black text-[#ff6b00] uppercase tracking-widest">{scene.style}</div>
                  
                  {scene.isGenerating && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <RefreshCw size={24} className="animate-spin text-[#ff6b00]" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 p-3 bg-gradient-to-t from-black/20 to-transparent">
                  <span className="text-[10px] font-black text-[#ff6b00] italic uppercase">SHOT {scene.shotNumber}</span>
                  <p className="text-[9px] text-gray-400 mt-1 line-clamp-2 italic leading-tight">{scene.description}</p>
                </div>
              </div>
            ))}
            <button onClick={() => addScene()} className="flex-shrink-0 h-full w-24 rounded-xl border-2 border-dashed border-[#444] flex items-center justify-center text-gray-700 hover:text-[#ff6b00] hover:border-[#ff6b00] transition-all bg-black/40"><Plus size={32} /></button>
          </div>
        </div>
      </div>

      {/* Modals and Overlays */}
      {showScriptInput && (
        <div className="fixed inset-0 z-[250] bg-black/95 flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-[#111] max-w-4xl w-full rounded-3xl border border-[#333] p-10 space-y-8 shadow-3xl">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Nhập Kịch Bản</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">Sử dụng tệp tin hoặc dán trực tiếp kịch bản</p>
              </div>
              <button onClick={() => setShowScriptInput(false)} className="p-2 hover:text-[#ff6b00] transition-colors"><XCircle size={32} /></button>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setScriptInput(DEMO_SCRIPT)}
                className="flex items-center gap-2 px-4 py-2 bg-[#ff6b00]/10 border border-[#ff6b00]/30 rounded-xl text-[#ff6b00] text-[10px] font-black uppercase tracking-widest hover:bg-[#ff6b00]/20 transition-all"
              >
                <FileText size={14} /> Dùng kịch bản mẫu
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-white hover:border-white/20 transition-all"
              >
                <Upload size={14} /> Tải tệp lên (.txt)
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".txt" 
                className="hidden" 
              />
            </div>
            
            <textarea
              value={scriptInput}
              onChange={(e) => setScriptInput(e.target.value)}
              className="w-full h-[350px] bg-black border border-[#333] rounded-2xl p-8 font-mono text-sm outline-none focus:border-[#ff6b00] transition-all leading-relaxed custom-scrollbar"
              placeholder="Nhập kịch bản tại đây... (Ví dụ: Shot 1: Cảnh toàn rộng... Prompt: Robot đứng giữa thành phố...)"
            />
            
            <button onClick={parseScript} className="w-full bg-[#ff6b00] py-5 rounded-2xl font-black uppercase tracking-[0.3em] hover:bg-[#e66000] transition-all shadow-lg">Bắt đầu tạo Storyboard</button>
          </div>
        </div>
      )}

      {/* Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-10 backdrop-blur-xl">
          <div className="bg-[#1a1a1a] w-full max-w-2xl rounded-3xl border border-[#333] p-10 space-y-8 overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
                <BookOpen className="text-[#ff6b00]" /> HƯỚNG DẪN
              </h2>
              <button onClick={() => setShowGuide(false)} className="p-2 hover:text-white transition-colors"><XCircle size={32} /></button>
            </div>
            <div className="space-y-6 text-sm text-gray-400 leading-relaxed">
              <p>1. <b>API Key:</b> Nhập Gemini API Key của bạn vào ô trên thanh menu.</p>
              <p>2. <b>Nhập kịch bản:</b> Nhấn "NHẬP KỊCH BẢN". Bạn có thể dán nội dung, tải tệp .txt hoặc dùng kịch bản mẫu đã chuẩn bị sẵn.</p>
              <p>3. <b>Phân tích kịch bản:</b> Hệ thống sẽ tách các đoạn dựa trên từ khóa như "Shot 1", "Phân cảnh 1". Nếu có từ khóa "Prompt:", phần đó sẽ được dùng làm câu lệnh vẽ ảnh cho AI.</p>
              <p>4. <b>Vẽ Storyboard:</b> Chọn phong cách vẽ và nhấn vẽ. AI sẽ tạo hình ảnh phác thảo mượt mà theo đúng mô tả.</p>
              <p>5. <b>Tải về:</b> Sau khi vẽ xong toàn bộ, nhấn "XUẤT PDF" để nhận file storyboard hoàn chỉnh chuyên nghiệp.</p>
              <p>6. <b>Kéo thả:</b> Bạn có thể dùng biểu tượng kéo ở góc trái mỗi shot để thay đổi thứ tự các phân cảnh.</p>
              <p>7. <b>Chỉnh sửa nhanh:</b> Các nút thêm, vẽ lại và xóa xuất hiện ngay khi bạn di chuột qua shot ở timeline.</p>
            </div>
            <button onClick={() => setShowGuide(false)} className="w-full py-4 bg-[#ff6b00] text-black font-black uppercase rounded-xl">Bắt đầu ngay</button>
          </div>
        </div>
      )}

      {/* PDF Generation Template (Hidden) */}
      <div style={{ position: 'fixed', left: '-20000px', top: 0 }}>
        {scenes.map((s) => (
          <div key={s.id} ref={el => pdfItemRefs.current[s.id] = el} className="w-[1123px] h-[794px] bg-white text-black p-20 flex flex-col box-border">
            <div className="flex justify-between items-end border-b-[8px] border-black pb-8 mb-12">
              <div className="flex items-center gap-8">
                <div className="bg-black text-white px-10 py-4 text-4xl font-black italic">SHOT {s.shotNumber}</div>
                <h1 className="text-4xl font-black uppercase opacity-10 tracking-tighter">AI STORYBOARD CREATOR</h1>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Style</p>
                <p className="text-xl font-black">{s.style.toUpperCase()}</p>
              </div>
            </div>
            <div className="flex-1 flex gap-12 overflow-hidden items-stretch">
              <div className="w-[65%] flex items-center justify-center">
                <div className="w-full relative bg-gray-50 border-[12px] border-black rounded-[40px] overflow-hidden shadow-2xl" style={{ aspectRatio: '16/9' }}>
                  {s.imageUrl ? <img src={s.imageUrl} className="w-full h-full object-contain" crossOrigin="anonymous" /> : null}
                </div>
              </div>
              <div className="w-[35%] flex flex-col gap-8">
                <div className="flex-1 flex flex-col gap-4">
                  <h3 className="text-xs font-black uppercase bg-black text-white px-4 py-1 self-start tracking-widest">Description</h3>
                  <div className="bg-gray-50 p-10 rounded-[40px] border-2 border-dashed border-gray-200 text-lg font-bold italic leading-normal flex-1 overflow-y-auto">
                    {s.visualPrompt || s.description}
                  </div>
                </div>
                <div className="pt-8 border-t-2 border-gray-100 flex justify-between items-center text-[10px] font-black text-gray-300 uppercase tracking-widest">
                  <p>AI Generation • Professional Storyboard</p>
                  <p>Page {s.shotNumber}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;

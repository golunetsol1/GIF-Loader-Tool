import React, { useState, useRef, useEffect } from "react";
import { GIFEncoder, quantize, applyPalette } from "gifenc";
import { 
  Settings2, 
  Download, 
  RotateCw, 
  Sliders, 
  Upload, 
  RefreshCw, 
  FileCode, 
  Check, 
  SlidersHorizontal,
  ChevronRight,
  Palette,
  Layers,
  Image as ImageIcon
} from "lucide-react";
import LoaderCanvas, { LoaderSettings, LoaderArc } from "./components/LoaderCanvas";
import { drawWaveLogo, WAVE_PATH } from "./components/WaveLogo";
import { exportLoaderToGif } from "./utils/gifExporter";

// Presets for the customizable generator
const COLOR_PRESETS = [
  {
    name: "Reference Design (Default)",
    top: "#ff6b1a",
    left: "#0f2a3d",
    bottom: "#111111",
    logo: "#ff6b1a",
  },
  {
    name: "Neon Cyberpunk",
    top: "#00f0ff",
    left: "#ff007f",
    bottom: "#9d00ff",
    logo: "#00f0ff",
  },
  {
    name: "Emerald Forest",
    top: "#059669",
    left: "#065f46",
    bottom: "#047857",
    logo: "#10b981",
  },
  {
    name: "Monochrome Slate",
    top: "#1f2937",
    left: "#4b5563",
    bottom: "#9ca3af",
    logo: "#111827",
  },
  {
    name: "Gold Luxury",
    top: "#d97706",
    left: "#78350f",
    bottom: "#111111",
    logo: "#f59e0b",
  }
];

export default function App() {
  // Main settings state
  const [settings, setSettings] = useState<LoaderSettings>({
    size: 220,
    masterSpeed: 1,
    rotationMode: "dynamic",
    direction: 1,
    backgroundColor: "transparent",
    bgType: "transparent",
    customBgColor: "#ffffff",
    logoStyle: "reference",
    logoColor: "#ff6b1a",
    logoScale: 1.0,
    uploadedLogoUrl: null,
    gifSpeedMultiplier: 1.0,
    logoRotationSpeed: 0.6,
    logoDirection: 1,
    arc1: {
      color: "#1e293b", // Slate 800 - dark charcoal matching video
      radius: 82,
      thickness: 5.0,
      startAngle: 0,
      spanAngle: 220,
      speedMultiplier: 0.8,
      direction: 1, // Clockwise
    },
    arc2: {
      color: "#ff6b1a", // Orange matching video
      radius: 62,
      thickness: 5.0,
      startAngle: 120,
      spanAngle: 160,
      speedMultiplier: 1.4,
      direction: -1, // Counter-Clockwise (alternating direction!)
    },
    arc3: {
      color: "#0f172a", // Slate 900 - dark inner arc
      radius: 42,
      thickness: 5.0,
      startAngle: 240,
      spanAngle: 100,
      speedMultiplier: 2.0,
      direction: 1, // Clockwise
    },
  });

  const [compiledGifFrames, setCompiledGifFrames] = useState<{ canvas: HTMLCanvasElement; delay: number }[]>([]);
  const [logoImageElement, setLogoImageElement] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!settings.uploadedLogoUrl) {
      setCompiledGifFrames([]);
      setLogoImageElement(null);
      return;
    }

    // Load static image fallback
    const img = new Image();
    img.src = settings.uploadedLogoUrl;
    img.onload = () => {
      setLogoImageElement(img);
    };

    // Parse and compile animated GIF frames if it's a GIF
    const parseGIFData = async () => {
      try {
        const response = await fetch(settings.uploadedLogoUrl!);
        const arrayBuffer = await response.arrayBuffer();
        
        const { parseAndCompileGIF } = await import("./utils/gifParser");
        const parsed = await parseAndCompileGIF(arrayBuffer);
        
        if (parsed.frames && parsed.frames.length > 0) {
          setCompiledGifFrames(parsed.frames);
        }
      } catch (err) {
        console.warn("Could not parse as animated GIF (might be a static image):", err);
        setCompiledGifFrames([]); // Fallback to static drawing
      }
    };

    parseGIFData();
  }, [settings.uploadedLogoUrl]);

  // Active configuration tabs
  const [activeTab, setActiveTab] = useState<"colors" | "arcs" | "logo" | "output">("colors");
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);
  const [customSize, setCustomSize] = useState<number>(220);

  // File Upload Handlers
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSettings((prev) => ({
        ...prev,
        logoStyle: "upload",
        uploadedLogoUrl: url,
      }));
    }
  };

  // Preset Applicator
  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setSettings((prev) => ({
      ...prev,
      logoColor: preset.logo,
      arc1: { ...prev.arc1, color: preset.top },
      arc2: { ...prev.arc2, color: preset.left },
      arc3: { ...prev.arc3, color: preset.bottom },
    }));
  };

  // Copy CSS loader code helper
  const copyCSSCode = () => {
    const cssCode = `
/* Premium CSS Animation Alternative */
.loader-container {
  position: relative;
  width: ${settings.size}px;
  height: ${settings.size}px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loader-arc {
  position: absolute;
  border-radius: 50%;
  border: 5px solid transparent;
}

.loader-arc-1 {
  width: ${settings.arc1.radius * 2}px;
  height: ${settings.arc1.radius * 2}px;
  border-top-color: ${settings.arc1.color};
  animation: rotate-arc-1 ${3 / (settings.masterSpeed * (settings.rotationMode === "dynamic" ? settings.arc1.speedMultiplier : 1))}s infinite linear;
}

.loader-arc-2 {
  width: ${settings.arc2.radius * 2}px;
  height: ${settings.arc2.radius * 2}px;
  border-left-color: ${settings.arc2.color};
  animation: rotate-arc-2 ${3 / (settings.masterSpeed * (settings.rotationMode === "dynamic" ? settings.arc2.speedMultiplier : 1))}s infinite linear;
}

.loader-arc-3 {
  width: ${settings.arc3.radius * 2}px;
  height: ${settings.arc3.radius * 2}px;
  border-bottom-color: ${settings.arc3.color};
  animation: rotate-arc-3 ${3 / (settings.masterSpeed * (settings.rotationMode === "dynamic" ? settings.arc3.speedMultiplier : 1))}s infinite linear;
}

${settings.logoStyle !== "none" && settings.logoRotationSpeed && settings.logoRotationSpeed > 0 ? `
.loader-logo {
  animation: rotate-logo ${3 / (settings.masterSpeed * settings.logoRotationSpeed)}s infinite linear;
}
@keyframes rotate-logo {
  from { transform: rotate(0deg); }
  to { transform: rotate(${(settings.logoDirection ?? 1) === 1 ? "360deg" : "-360deg"}); }
}
` : ""}

@keyframes rotate-arc-1 {
  from { transform: rotate(0deg); }
  to { transform: rotate(${(settings.arc1.direction ?? settings.direction) === 1 ? "360deg" : "-360deg"}); }
}

@keyframes rotate-arc-2 {
  from { transform: rotate(0deg); }
  to { transform: rotate(${(settings.arc2.direction ?? settings.direction) === 1 ? "360deg" : "-360deg"}); }
}

@keyframes rotate-arc-3 {
  from { transform: rotate(0deg); }
  to { transform: rotate(${(settings.arc3.direction ?? settings.direction) === 1 ? "360deg" : "-360deg"}); }
}
`;
    navigator.clipboard.writeText(cssCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  // High quality client-side GIF generation with modular gifExporter
  const handleExportGif = async () => {
    if (exporting) return;
    setExporting(true);
    setExportProgress(0);

    try {
      const fps = 25; // Good frame rate for premium smooth looks, lightweight size
      const durationSec = 3.0 / settings.masterSpeed; // Exactly one full rotation cycle
      
      const blob = await exportLoaderToGif(settings, fps, durationSec, (progress) => {
        setExportProgress(progress);
      });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `custom-spinner-loader-${settings.size}px.gif`;
      link.click();
    } catch (err) {
      console.error("Failed to generate and export GIF", err);
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F4F4F5] flex flex-col font-sans text-[#18181B] relative overflow-x-hidden pb-12">
      {/* Decorative Minimalist Corner Elements */}
      <div className="fixed top-0 left-0 w-12 h-12 border-t border-l border-zinc-300 m-4 pointer-events-none hidden md:block"></div>
      <div className="fixed top-0 right-0 w-12 h-12 border-t border-r border-zinc-300 m-4 pointer-events-none hidden md:block"></div>
      <div className="fixed bottom-0 left-0 w-12 h-12 border-b border-l border-zinc-300 m-4 pointer-events-none hidden md:block"></div>
      <div className="fixed bottom-0 right-0 w-12 h-12 border-b border-r border-zinc-300 m-4 pointer-events-none hidden md:block"></div>

      {/* Minimal Header */}
      <nav className="w-full px-6 md:px-12 py-6 md:py-8 flex justify-between items-center border-b border-zinc-200 bg-white/50 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-[#ff6b1a] rounded-full animate-pulse"></div>
          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-zinc-600">GIF Loader Generator</span>
        </div>
        <div className="text-xs uppercase tracking-[0.2em] font-semibold opacity-40 italic hidden sm:block">
          Establishing Preview Studio...
        </div>
      </nav>

      {/* Main Studio Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-12 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 z-20">
        
        {/* Left Hand: Loader Preview & Core Control Actions */}
        <div className="lg:col-span-5 flex flex-col items-center gap-6">
          <div className="w-full bg-white rounded-2xl border border-zinc-200/80 p-8 shadow-sm flex flex-col items-center justify-center relative min-h-[400px]">
            {/* Corner Bracket Accents */}
            <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-zinc-300"></div>
            <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-zinc-300"></div>
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-zinc-300"></div>
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-zinc-300"></div>

            <div className="text-center mb-6">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">
                Live Studio Render
              </span>
            </div>

            {/* Canvas Loader Preview */}
            <LoaderCanvas 
              settings={settings} 
              compiledGifFrames={compiledGifFrames}
              logoImageElement={logoImageElement}
              className="transition-transform duration-300 hover:scale-[1.02]"
            />

            {/* Active Specs */}
            <div className="mt-6 flex flex-wrap justify-center gap-3 text-[11px] font-mono text-zinc-500">
              <span className="bg-zinc-100 px-2.5 py-1 rounded">Size: {settings.size}px</span>
              <span className="bg-zinc-100 px-2.5 py-1 rounded">
                BG: {settings.bgType === "transparent" ? "Alpha" : "Solid"}
              </span>
              <span className="bg-zinc-100 px-2.5 py-1 rounded">Speed: {settings.masterSpeed}x</span>
            </div>
          </div>

          {/* Action Buttons Panel */}
          <div className="w-full bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm flex flex-col gap-3">
            <button
              id="export-gif-btn"
              onClick={handleExportGif}
              disabled={exporting}
              className={`w-full py-4 px-6 rounded-xl font-medium tracking-wide flex items-center justify-center gap-3 shadow-lg shadow-[#ff6b1a]/10 transition-all ${
                exporting 
                ? "bg-zinc-100 text-zinc-400 cursor-not-allowed" 
                : "bg-[#ff6b1a] text-white hover:bg-[#e0560d] active:scale-[0.98]"
              }`}
            >
              {exporting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Encoding GIF ({Math.round(exportProgress * 100)}%)</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Download Transparent GIF</span>
                </>
              )}
            </button>

            {/* Custom Progress Bar */}
            {exporting && (
              <div id="export-progress-container" className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#ff6b1a] h-full transition-all duration-300"
                  style={{ width: `${exportProgress * 100}%` }}
                ></div>
              </div>
            )}

            <button
              id="copy-css-btn"
              onClick={copyCSSCode}
              className="w-full py-3 px-6 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-medium tracking-wide flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
            >
              {copiedCode ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600">Copied CSS Animations!</span>
                </>
              ) : (
                <>
                  <FileCode className="w-4 h-4" />
                  <span>Get CSS Code Alternative</span>
                </>
              )}
            </button>
          </div>

          {/* Server Stats Dashboard */}
          <div className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-6 font-mono text-xs text-zinc-500 grid grid-cols-2 gap-4">
            <div>
              <span className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Server Status</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="font-semibold text-zinc-700 text-[11px]">ACTIVE_NODE_01</span>
              </div>
            </div>
            <div>
              <span className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Latency Output</span>
              <span className="font-semibold text-zinc-700 text-[11px]">11ms @ LOCAL-STUDIO</span>
            </div>
          </div>
        </div>

        {/* Right Hand: Workspace Customizer Panel */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-zinc-200 p-6 md:p-8 shadow-sm flex flex-col">
          
          {/* Section Selector Tab Header */}
          <div className="flex border-b border-zinc-100 pb-4 mb-6 overflow-x-auto gap-2">
            {[
              { id: "colors", label: "Colors & Presets", icon: Palette },
              { id: "arcs", label: "Arcs & Kinetics", icon: SlidersHorizontal },
              { id: "logo", label: "Center Logo / Image", icon: ImageIcon },
              { id: "output", label: "Exporter Output", icon: Settings2 },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-zinc-900 text-white shadow-sm"
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Colors & Presets */}
          {activeTab === "colors" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div>
                <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-3">Color Presets</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {COLOR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => applyPreset(preset)}
                      className="p-3 border border-zinc-200 rounded-xl hover:border-zinc-400 hover:bg-zinc-50 text-left transition-all flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-medium text-zinc-700 block">{preset.name}</span>
                        <div className="flex gap-1.5 mt-1.5">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.top }}></span>
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.left }}></span>
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.bottom }}></span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-6">
                <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-4">Custom Palette Tuning</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Top Arc */}
                  <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <div>
                      <span className="text-xs font-semibold block text-zinc-700">Top Arc Color</span>
                      <span className="text-[10px] font-mono text-zinc-400">{settings.arc1.color}</span>
                    </div>
                    <input
                      type="color"
                      value={settings.arc1.color}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          arc1: { ...prev.arc1, color: e.target.value },
                        }))
                      }
                      className="w-8 h-8 rounded-lg cursor-pointer overflow-hidden border-0 bg-transparent"
                    />
                  </div>

                  {/* Left Arc */}
                  <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <div>
                      <span className="text-xs font-semibold block text-zinc-700">Left Arc Color</span>
                      <span className="text-[10px] font-mono text-zinc-400">{settings.arc2.color}</span>
                    </div>
                    <input
                      type="color"
                      value={settings.arc2.color}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          arc2: { ...prev.arc2, color: e.target.value },
                        }))
                      }
                      className="w-8 h-8 rounded-lg cursor-pointer overflow-hidden border-0 bg-transparent"
                    />
                  </div>

                  {/* Bottom Arc */}
                  <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <div>
                      <span className="text-xs font-semibold block text-zinc-700">Bottom Arc Color</span>
                      <span className="text-[10px] font-mono text-zinc-400">{settings.arc3.color}</span>
                    </div>
                    <input
                      type="color"
                      value={settings.arc3.color}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          arc3: { ...prev.arc3, color: e.target.value },
                        }))
                      }
                      className="w-8 h-8 rounded-lg cursor-pointer overflow-hidden border-0 bg-transparent"
                    />
                  </div>

                  {/* Logo color if using reference */}
                  {settings.logoStyle === "reference" && (
                    <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100 animate-fadeIn">
                      <div>
                        <span className="text-xs font-semibold block text-zinc-700">Center Wave Color</span>
                        <span className="text-[10px] font-mono text-zinc-400">{settings.logoColor}</span>
                      </div>
                      <input
                        type="color"
                        value={settings.logoColor}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            logoColor: e.target.value,
                          }))
                        }
                        className="w-8 h-8 rounded-lg cursor-pointer overflow-hidden border-0 bg-transparent"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Arcs & Kinetics */}
          {activeTab === "arcs" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* Kinetics Parameters */}
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1.5">Master Rotation Speed</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.1"
                      value={settings.masterSpeed}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          masterSpeed: parseFloat(e.target.value),
                        }))
                      }
                      className="flex-1 accent-zinc-800"
                    />
                    <span className="text-xs font-mono font-bold w-12 text-right">{settings.masterSpeed}x</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1.5">Rotation Direction</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSettings((prev) => ({ ...prev, direction: 1 }))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        settings.direction === 1
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                      }`}
                    >
                      Clockwise (CW)
                    </button>
                    <button
                      onClick={() => setSettings((prev) => ({ ...prev, direction: -1 }))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        settings.direction === -1
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                      }`}
                    >
                      Counter-CW (CCW)
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-zinc-600 block mb-1.5">Arc Rotation Coordination</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSettings((prev) => ({ 
                        ...prev, 
                        rotationMode: "synchronized",
                        arc1: { ...prev.arc1, speedMultiplier: 1.0 },
                        arc2: { ...prev.arc2, speedMultiplier: 1.0 },
                        arc3: { ...prev.arc3, speedMultiplier: 1.0 },
                      }))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        settings.rotationMode === "synchronized"
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                      }`}
                    >
                      Synchronized (1:1 speed ratio)
                    </button>
                    <button
                      onClick={() => setSettings((prev) => ({ 
                        ...prev, 
                        rotationMode: "dynamic",
                        arc1: { ...prev.arc1, speedMultiplier: prev.arc1.speedMultiplier === 1.0 ? 1.0 : prev.arc1.speedMultiplier },
                        arc2: { ...prev.arc2, speedMultiplier: prev.arc2.speedMultiplier === 1.0 ? 1.4 : prev.arc2.speedMultiplier },
                        arc3: { ...prev.arc3, speedMultiplier: prev.arc3.speedMultiplier === 1.0 ? 0.7 : prev.arc3.speedMultiplier },
                      }))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        settings.rotationMode === "dynamic"
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                      }`}
                    >
                      Asynchronous (Dynamic organic flow)
                    </button>
                  </div>
                </div>
              </div>

              {/* Arc 1 Settings */}
              <div className="p-4 border border-zinc-200 rounded-xl relative animate-fadeIn">
                <span className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-bold text-[#1e293b] uppercase tracking-widest">
                  Arc Line 1 (Outer - Charcoal)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-2">
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Radius size ({settings.arc1.radius})</label>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={settings.arc1.radius}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          arc1: { ...prev.arc1, radius: parseInt(e.target.value) },
                        }))
                      }
                      className="w-full accent-[#1e293b]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Thickness ({settings.arc1.thickness}px)</label>
                    <input
                      type="range"
                      min="1.0"
                      max="12.0"
                      step="0.5"
                      value={settings.arc1.thickness}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          arc1: { ...prev.arc1, thickness: parseFloat(e.target.value) },
                        }))
                      }
                      className="w-full accent-[#1e293b]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Line Span ({settings.arc1.spanAngle}°)</label>
                    <input
                      type="range"
                      min="10"
                      max="340"
                      value={settings.arc1.spanAngle}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          arc1: { ...prev.arc1, spanAngle: parseInt(e.target.value) },
                        }))
                      }
                      className="w-full accent-[#1e293b]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Direction</label>
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            arc1: { ...prev.arc1, direction: 1 },
                          }))
                        }
                        className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${
                          (settings.arc1.direction ?? 1) === 1
                            ? "bg-[#1e293b] text-white"
                            : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                        }`}
                      >
                        CW (↻)
                      </button>
                      <button
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            arc1: { ...prev.arc1, direction: -1 },
                          }))
                        }
                        className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${
                          (settings.arc1.direction ?? 1) === -1
                            ? "bg-[#1e293b] text-white"
                            : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                        }`}
                      >
                        CCW (↺)
                      </button>
                    </div>
                  </div>
                  <div className="animate-fadeIn">
                    <label className="text-xs text-zinc-500 block mb-1">Speed Multiplier ({settings.arc1.speedMultiplier}x)</label>
                    <input
                      type="range"
                      min="0.1"
                      max="3.0"
                      step="0.1"
                      value={settings.arc1.speedMultiplier}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          rotationMode: "dynamic",
                          arc1: { ...prev.arc1, speedMultiplier: parseFloat(e.target.value) },
                        }))
                      }
                      className="w-full accent-[#1e293b]"
                    />
                  </div>
                </div>
              </div>

              {/* Arc 2 Settings */}
              <div className="p-4 border border-zinc-200 rounded-xl relative animate-fadeIn">
                <span className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-bold text-[#ff6b1a] uppercase tracking-widest">
                  Arc Line 2 (Middle - Orange)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-2">
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Radius size ({settings.arc2.radius})</label>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={settings.arc2.radius}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          arc2: { ...prev.arc2, radius: parseInt(e.target.value) },
                        }))
                      }
                      className="w-full accent-[#ff6b1a]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Thickness ({settings.arc2.thickness}px)</label>
                    <input
                      type="range"
                      min="1.0"
                      max="12.0"
                      step="0.5"
                      value={settings.arc2.thickness}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          arc2: { ...prev.arc2, thickness: parseFloat(e.target.value) },
                        }))
                      }
                      className="w-full accent-[#ff6b1a]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Line Span ({settings.arc2.spanAngle}°)</label>
                    <input
                      type="range"
                      min="10"
                      max="340"
                      value={settings.arc2.spanAngle}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          arc2: { ...prev.arc2, spanAngle: parseInt(e.target.value) },
                        }))
                      }
                      className="w-full accent-[#ff6b1a]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Direction</label>
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            arc2: { ...prev.arc2, direction: 1 },
                          }))
                        }
                        className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${
                          (settings.arc2.direction ?? 1) === 1
                            ? "bg-[#ff6b1a] text-white"
                            : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                        }`}
                      >
                        CW (↻)
                      </button>
                      <button
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            arc2: { ...prev.arc2, direction: -1 },
                          }))
                        }
                        className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${
                          (settings.arc2.direction ?? 1) === -1
                            ? "bg-[#ff6b1a] text-white"
                            : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                        }`}
                      >
                        CCW (↺)
                      </button>
                    </div>
                  </div>
                  <div className="animate-fadeIn">
                    <label className="text-xs text-zinc-500 block mb-1">Speed Multiplier ({settings.arc2.speedMultiplier}x)</label>
                    <input
                      type="range"
                      min="0.1"
                      max="3.0"
                      step="0.1"
                      value={settings.arc2.speedMultiplier}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          rotationMode: "dynamic",
                          arc2: { ...prev.arc2, speedMultiplier: parseFloat(e.target.value) },
                        }))
                      }
                      className="w-full accent-[#ff6b1a]"
                    />
                  </div>
                </div>
              </div>

              {/* Arc 3 Settings */}
              <div className="p-4 border border-zinc-200 rounded-xl relative animate-fadeIn">
                <span className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-bold text-[#0f172a] uppercase tracking-widest">
                  Arc Line 3 (Inner - Charcoal Dark)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-2">
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Radius size ({settings.arc3.radius})</label>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={settings.arc3.radius}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          arc3: { ...prev.arc3, radius: parseInt(e.target.value) },
                        }))
                      }
                      className="w-full accent-[#0f172a]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Thickness ({settings.arc3.thickness}px)</label>
                    <input
                      type="range"
                      min="1.0"
                      max="12.0"
                      step="0.5"
                      value={settings.arc3.thickness}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          arc3: { ...prev.arc3, thickness: parseFloat(e.target.value) },
                        }))
                      }
                      className="w-full accent-[#0f172a]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Line Span ({settings.arc3.spanAngle}°)</label>
                    <input
                      type="range"
                      min="10"
                      max="340"
                      value={settings.arc3.spanAngle}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          arc3: { ...prev.arc3, spanAngle: parseInt(e.target.value) },
                        }))
                      }
                      className="w-full accent-[#0f172a]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Direction</label>
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            arc3: { ...prev.arc3, direction: 1 },
                          }))
                        }
                        className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${
                          (settings.arc3.direction ?? 1) === 1
                            ? "bg-[#0f172a] text-white"
                            : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                        }`}
                      >
                        CW (↻)
                      </button>
                      <button
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            arc3: { ...prev.arc3, direction: -1 },
                          }))
                        }
                        className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${
                          (settings.arc3.direction ?? 1) === -1
                            ? "bg-[#0f172a] text-white"
                            : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                        }`}
                      >
                        CCW (↺)
                      </button>
                    </div>
                  </div>
                  <div className="animate-fadeIn">
                    <label className="text-xs text-zinc-500 block mb-1">Speed Multiplier ({settings.arc3.speedMultiplier}x)</label>
                    <input
                      type="range"
                      min="0.1"
                      max="3.0"
                      step="0.1"
                      value={settings.arc3.speedMultiplier}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          rotationMode: "dynamic",
                          arc3: { ...prev.arc3, speedMultiplier: parseFloat(e.target.value) },
                        }))
                      }
                      className="w-full accent-[#0f172a]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Center Logo / Image Upload */}
          {activeTab === "logo" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div>
                <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-3">Center Display Type</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "reference", label: "Reference Wave Logo" },
                    { id: "upload", label: "Upload Custom GIF/Image" },
                    { id: "none", label: "Empty / Arcs Only" },
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          logoStyle: style.id as any,
                        }))
                      }
                      className={`py-3 px-4 rounded-xl text-xs font-semibold text-center transition-all border ${
                        settings.logoStyle === style.id
                          ? "bg-zinc-900 border-zinc-950 text-white"
                          : "bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-600"
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wave Logo Scaling Option */}
              {settings.logoStyle !== "none" && (
                <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                  <label className="text-xs font-semibold text-zinc-600 block mb-1.5">
                    Center Image/Logo Scale ({Math.round(settings.logoScale * 100)}%)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.05"
                      value={settings.logoScale}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          logoScale: parseFloat(e.target.value),
                        }))
                      }
                      className="flex-1 accent-zinc-800"
                    />
                  </div>
                </div>
              )}

              {/* Center Logo Rotation controls */}
              {settings.logoStyle !== "none" && (
                <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                  <div>
                    <label className="text-xs font-semibold text-zinc-600 block mb-1.5">
                      Logo Rotation Speed ({settings.logoRotationSpeed !== undefined ? settings.logoRotationSpeed : 0.0}x)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0.0"
                        max="3.0"
                        step="0.1"
                        value={settings.logoRotationSpeed !== undefined ? settings.logoRotationSpeed : 0.0}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            logoRotationSpeed: parseFloat(e.target.value),
                          }))
                        }
                        className="flex-1 accent-zinc-800"
                      />
                      <span className="text-xs font-mono font-bold w-12 text-right">
                        {(settings.logoRotationSpeed !== undefined ? settings.logoRotationSpeed : 0.0) === 0 ? "Static" : `${settings.logoRotationSpeed}x`}
                      </span>
                    </div>
                  </div>

                  {(settings.logoRotationSpeed !== undefined && settings.logoRotationSpeed > 0) && (
                    <div className="animate-fadeIn">
                      <label className="text-xs font-semibold text-zinc-600 block mb-1.5">Logo Rotation Direction</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSettings((prev) => ({ ...prev, logoDirection: 1 }))}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            (settings.logoDirection ?? 1) === 1
                              ? "bg-zinc-900 text-white"
                              : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                          }`}
                        >
                          Clockwise (CW)
                        </button>
                        <button
                          onClick={() => setSettings((prev) => ({ ...prev, logoDirection: -1 }))}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            (settings.logoDirection ?? 1) === -1
                              ? "bg-zinc-900 text-white"
                              : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                          }`}
                        >
                          Counter-CW (CCW)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Center GIF Speed Multiplier Option */}
              {settings.logoStyle === "upload" && (
                <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 animate-fadeIn">
                  <label className="text-xs font-semibold text-zinc-600 block mb-1.5">
                    Center GIF Speed Multiplier ({settings.gifSpeedMultiplier}x)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0.1"
                      max="3.0"
                      step="0.1"
                      value={settings.gifSpeedMultiplier}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          gifSpeedMultiplier: parseFloat(e.target.value),
                        }))
                      }
                      className="flex-1 accent-zinc-800"
                    />
                  </div>
                </div>
              )}

              {/* Upload Interface */}
              {settings.logoStyle === "upload" && (
                <div className="border border-dashed border-zinc-300 rounded-xl p-6 bg-zinc-50 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-200/60 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-700 block">Upload Logo File</span>
                    <span className="text-[10px] text-zinc-400 block mt-1">Supports PNG, SVG, JPG, or animated GIFs</span>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="py-1.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs rounded-lg transition-colors"
                  >
                    Select File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />

                  {settings.uploadedLogoUrl && (
                    <div className="mt-4 flex items-center gap-3 p-2.5 bg-white border border-zinc-200 rounded-lg">
                      <img
                        src={settings.uploadedLogoUrl}
                        alt="Uploaded preview"
                        className="w-10 h-10 object-contain rounded border border-zinc-100 bg-zinc-50"
                      />
                      <div className="text-left">
                        <span className="text-xs font-semibold text-zinc-700 block line-clamp-1">Custom Image Active</span>
                        <button
                          onClick={() => setSettings((prev) => ({ ...prev, uploadedLogoUrl: null }))}
                          className="text-[10px] text-red-500 font-bold hover:underline"
                        >
                          Remove Image
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Exporter Settings */}
          {activeTab === "output" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* Output Resolution Settings */}
              <div>
                <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-3">Output Resolution (GIF size)</h3>
                <div className="grid grid-cols-4 gap-3">
                  {[220, 320, 480].map((res) => (
                    <button
                      key={res}
                      onClick={() => {
                        setSettings((prev) => ({ ...prev, size: res }));
                        setCustomSize(res);
                      }}
                      className={`py-3 px-2 rounded-xl text-xs font-mono font-bold text-center border transition-all ${
                        settings.size === res
                          ? "bg-zinc-900 border-zinc-950 text-white"
                          : "bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-600"
                      }`}
                    >
                      {res} × {res}
                    </button>
                  ))}
                  
                  {/* Custom Size Option */}
                  <div className="flex bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden px-2 py-1 items-center">
                    <input
                      type="number"
                      min="64"
                      max="1024"
                      value={customSize}
                      onChange={(e) => {
                        const val = Math.max(64, Math.min(1024, parseInt(e.target.value) || 220));
                        setCustomSize(val);
                        setSettings((prev) => ({ ...prev, size: val }));
                      }}
                      className="w-full bg-transparent text-xs font-mono font-bold text-center text-zinc-700 focus:outline-none"
                    />
                    <span className="text-[9px] font-mono text-zinc-400 mr-1 uppercase">px</span>
                  </div>
                </div>
              </div>

              {/* Background Options */}
              <div className="border-t border-zinc-100 pt-6">
                <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-3">GIF Background Type</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: "transparent", label: "Transparent" },
                    { id: "white", label: "Solid White" },
                    { id: "dark", label: "Solid Slate Dark" },
                    { id: "custom", label: "Custom Hex" },
                  ].map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          bgType: bg.id as any,
                        }))
                      }
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold text-center border transition-all ${
                        settings.bgType === bg.id
                          ? "bg-zinc-900 border-zinc-950 text-white"
                          : "bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-600"
                      }`}
                    >
                      {bg.label}
                    </button>
                  ))}
                </div>

                {settings.bgType === "custom" && (
                  <div className="mt-4 flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl animate-fadeIn">
                    <span className="text-xs font-semibold text-zinc-700">Custom Background Hex</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-zinc-500">{settings.customBgColor}</span>
                      <input
                        type="color"
                        value={settings.customBgColor}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            customBgColor: e.target.value,
                          }))
                        }
                        className="w-8 h-8 rounded-lg cursor-pointer overflow-hidden border-0 bg-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom styling instruction info */}
          <div className="mt-auto pt-8 border-t border-zinc-100 text-[11px] text-zinc-400 leading-relaxed flex items-start gap-2.5">
            <span className="bg-zinc-100 font-mono font-bold text-zinc-600 px-1.5 py-0.5 rounded text-[9px] uppercase">
              Tip
            </span>
            <p>
              To keep file sizes small, use standard 220px resolution. GIFs rendered client-side feature precise, rounded line caps and authentic custom speeds exactly as configured.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

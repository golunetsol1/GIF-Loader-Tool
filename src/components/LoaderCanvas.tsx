import React, { useRef, useEffect } from "react";
import { drawWaveLogo } from "./WaveLogo";

export interface LoaderArc {
  color: string;
  radius: number;
  thickness: number;
  startAngle: number; // in degrees
  spanAngle: number; // in degrees
  speedMultiplier: number;
  direction?: 1 | -1; // Individual arc rotation direction: 1 = CW, -1 = CCW
}

export interface LoaderSettings {
  size: number;
  masterSpeed: number;
  rotationMode: "synchronized" | "dynamic";
  direction: 1 | -1; // 1 = CW, -1 = CCW
  backgroundColor: string; // "transparent" or color hex
  bgType: "transparent" | "white" | "dark" | "custom";
  customBgColor: string;
  logoStyle: "reference" | "none" | "upload";
  logoColor: string;
  logoScale: number;
  uploadedLogoUrl: string | null;
  gifSpeedMultiplier: number;
  logoRotationSpeed?: number; // 0 = static, > 0 = speed multiplier
  logoDirection?: 1 | -1; // Logo rotation direction: 1 = CW, -1 = CCW
  arc1: LoaderArc;
  arc2: LoaderArc;
  arc3: LoaderArc;
}

interface LoaderCanvasProps {
  settings: LoaderSettings;
  isExporting?: boolean;
  exportProgress?: number; // 0 to 1, used when isExporting is true
  className?: string;
  compiledGifFrames?: { canvas: HTMLCanvasElement; delay: number }[];
  logoImageElement?: HTMLImageElement | null;
}

// Converts degrees to radians
const degToRad = (deg: number) => (deg * Math.PI) / 180;

export default function LoaderCanvas({
  settings,
  isExporting = false,
  exportProgress = 0,
  className = "",
  compiledGifFrames = [],
  logoImageElement = null,
}: LoaderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Re-draw helper
  const drawFrame = (ctx: CanvasRenderingContext2D, timeMs: number) => {
    const { size } = settings;
    ctx.clearRect(0, 0, size, size);

    // Fill background if not transparent
    if (settings.bgType !== "transparent") {
      ctx.fillStyle =
        settings.bgType === "white"
          ? "#ffffff"
          : settings.bgType === "dark"
          ? "#0f172a"
          : settings.customBgColor;
      ctx.fillRect(0, 0, size, size);
    }

    const cx = size / 2;
    const cy = size / 2;

    // 1. Draw Center Logo if active with optional rotation
    const logoRotSpeed = settings.logoRotationSpeed !== undefined ? settings.logoRotationSpeed : 0.0;
    const logoRotDir = settings.logoDirection !== undefined ? settings.logoDirection : 1;
    const basePeriodMs = 3000 / settings.masterSpeed;
    const logoRotationRad = logoRotSpeed > 0
      ? ((timeMs % (basePeriodMs / logoRotSpeed)) / (basePeriodMs / logoRotSpeed)) * Math.PI * 2 * logoRotDir
      : 0;

    if (settings.logoStyle === "reference") {
      const logoSize = 65 * settings.logoScale * (size / 220);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(logoRotationRad);
      ctx.translate(-cx, -cy);
      drawWaveLogo(ctx, cx, cy, logoSize, settings.logoColor);
      ctx.restore();
    } else if (settings.logoStyle === "upload") {
      const logoSize = 65 * settings.logoScale * (size / 220);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(logoRotationRad);
      
      if (compiledGifFrames && compiledGifFrames.length > 0) {
        // Draw compiled GIF frame
        const totalDuration = compiledGifFrames.reduce((sum, f) => sum + f.delay, 0);
        if (totalDuration > 0) {
          const speed = settings.gifSpeedMultiplier !== undefined ? settings.gifSpeedMultiplier : 1.0;
          const targetTime = (timeMs * speed) % totalDuration;
          let accum = 0;
          let frameIndex = 0;
          for (let i = 0; i < compiledGifFrames.length; i++) {
            accum += compiledGifFrames[i].delay;
            if (accum >= targetTime) {
              frameIndex = i;
              break;
            }
          }
          const frame = compiledGifFrames[frameIndex];
          ctx.drawImage(frame.canvas, -logoSize / 2, -logoSize / 2, logoSize, logoSize);
        }
      } else if (logoImageElement && logoImageElement.naturalWidth > 0) {
        // Fallback to static image element on canvas
        ctx.drawImage(logoImageElement, -logoSize / 2, -logoSize / 2, logoSize, logoSize);
      }
      ctx.restore();
    }

    // 2. Draw 3 Spinner Arcs
    const drawArc = (arc: LoaderArc, rotationRad: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotationRad);

      ctx.beginPath();
      
      // Arc coordinates
      const radius = arc.radius * (size / 220);
      const startRad = degToRad(arc.startAngle);
      const endRad = startRad + degToRad(arc.spanAngle);

      ctx.arc(0, 0, radius, startRad, endRad, false);

      ctx.strokeStyle = arc.color;
      ctx.lineWidth = arc.thickness * (size / 220);
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();
    };

    // Helper to calculate rotation for a specific arc
    const getArcRotation = (arc: LoaderArc) => {
      const dir = arc.direction !== undefined ? arc.direction : settings.direction;
      const speedMult = settings.rotationMode === "synchronized" ? 1.0 : (arc.speedMultiplier || 1.0);
      if (speedMult === 0) return 0;
      
      const arcPeriod = basePeriodMs / speedMult;
      return ((timeMs % arcPeriod) / arcPeriod) * Math.PI * 2 * dir;
    };

    // Draw Arc 1 (Outer)
    drawArc(settings.arc1, getArcRotation(settings.arc1));

    // Draw Arc 2 (Middle)
    drawArc(settings.arc2, getArcRotation(settings.arc2));

    // Draw Arc 3 (Inner)
    drawArc(settings.arc3, getArcRotation(settings.arc3));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: isExporting });
    if (!ctx) return;

    if (isExporting) {
      // Direct deterministic rendering based on progress prop
      // 1 full cycle of 360 degrees
      const timeMs = exportProgress * 3000;
      drawFrame(ctx, timeMs);
    } else {
      // Interactive animation loop
      const tick = (timestamp: number) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const elapsed = timestamp - startTimeRef.current;

        drawFrame(ctx, elapsed);
        animationRef.current = requestAnimationFrame(tick);
      };

      animationRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [settings, isExporting, exportProgress, compiledGifFrames, logoImageElement]);

  return (
    <div
      id="canvas-container"
      className={`relative rounded-xl overflow-hidden shadow-inner flex items-center justify-center ${className}`}
      style={{
        width: `${settings.size}px`,
        height: `${settings.size}px`,
        // Show checked transparency pattern only if transparent background is selected
        background:
          settings.bgType === "transparent"
            ? "repeating-conic-gradient(#f8fafc 0% 25%, #e2e8f0 0% 50%) 50% / 20px 20px"
            : "none",
      }}
    >
      <canvas
        id="loader-preview-canvas"
        ref={canvasRef}
        width={settings.size}
        height={settings.size}
        className="block"
      />
      {!isExporting && settings.logoStyle === "upload" && settings.uploadedLogoUrl && (!compiledGifFrames || compiledGifFrames.length === 0) && !logoImageElement && (
        <img
          src={settings.uploadedLogoUrl}
          alt="Center Logo Overlay"
          className="absolute pointer-events-none object-contain"
          style={{
            width: `${65 * settings.logoScale * (settings.size / 220)}px`,
            height: `${65 * settings.logoScale * (settings.size / 220)}px`,
          }}
        />
      )}
    </div>
  );
}

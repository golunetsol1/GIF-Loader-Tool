// @ts-ignore
import { GIFEncoder, quantize, applyPalette } from "gifenc";
import { LoaderSettings } from "../components/LoaderCanvas";
import { drawWaveLogo } from "../components/WaveLogo";
import { parseAndCompileGIF, CompiledGIFFrame } from "./gifParser";

/**
 * Renders the custom animated loader frame-by-frame and encodes it into a transparent GIF.
 */
export async function exportLoaderToGif(
  settings: LoaderSettings,
  fps: number = 20,
  durationSec: number = 3.0,
  onProgress: (progress: number, stepName: string) => void
): Promise<Blob> {
  const size = settings.size;
  const totalFrames = Math.floor(durationSec * fps);
  const delay = Math.round(1000 / fps);

  onProgress(0, "Initializing canvas...");
  await new Promise((r) => setTimeout(r, 100));

  // Create offscreen canvas for rendering frames
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create offscreen 2D canvas context.");

  // Using rgba4444 format which supports transparency
  const format = "rgba4444";
  const encoder = GIFEncoder();

  // Pre-load custom center logo if required
  let customImg: HTMLImageElement | null = null;
  let customGifFrames: CompiledGIFFrame[] = [];

  if (settings.logoStyle === "upload" && settings.uploadedLogoUrl) {
    onProgress(0.05, "Pre-loading custom logo and parsing frames...");
    
    // First, try to fetch and parse as animated GIF
    try {
      const response = await fetch(settings.uploadedLogoUrl);
      const arrayBuffer = await response.arrayBuffer();
      const parsed = await parseAndCompileGIF(arrayBuffer);
      if (parsed.frames && parsed.frames.length > 0) {
        customGifFrames = parsed.frames;
      }
    } catch (err) {
      console.warn("Could not parse as animated GIF, falling back to static image:", err);
    }

    // Always load as a static HTMLImageElement fallback/alternative
    customImg = new Image();
    customImg.src = settings.uploadedLogoUrl;
    await new Promise<void>((resolve, reject) => {
      if (!customImg) return resolve();
      if (customImg.complete) return resolve();
      customImg.onload = () => resolve();
      customImg.onerror = () => reject(new Error("Failed to load uploaded logo image for GIF export."));
    });
  }

  const degToRad = (deg: number) => (deg * Math.PI) / 180;

  // Frame drawing routine
  const drawFrameSync = (timeMs: number) => {
    ctx.clearRect(0, 0, size, size);

    // Apply background color if not transparent
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

    // Draw reference wave logo or custom uploaded logo with optional rotation
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

      if (customGifFrames && customGifFrames.length > 0) {
        const totalDuration = customGifFrames.reduce((sum, f) => sum + f.delay, 0);
        if (totalDuration > 0) {
          const speed = settings.gifSpeedMultiplier !== undefined ? settings.gifSpeedMultiplier : 1.0;
          const targetTime = (timeMs * speed) % totalDuration;
          let accum = 0;
          let frameIndex = 0;
          for (let i = 0; i < customGifFrames.length; i++) {
            accum += customGifFrames[i].delay;
            if (accum >= targetTime) {
              frameIndex = i;
              break;
            }
          }
          const activeFrame = customGifFrames[frameIndex];
          ctx.drawImage(activeFrame.canvas, -logoSize / 2, -logoSize / 2, logoSize, logoSize);
        }
      } else if (customImg && customImg.naturalWidth > 0) {
        ctx.drawImage(customImg, -logoSize / 2, -logoSize / 2, logoSize, logoSize);
      }
      ctx.restore();
    }

    // Draw the 3 spinner arcs
    const drawArc = (arc: any, rotationRad: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotationRad);

      ctx.beginPath();
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
    const getArcRotation = (arc: any) => {
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

  // Run the loop and encode frame-by-frame
  for (let f = 0; f < totalFrames; f++) {
    const frameProgress = f / totalFrames;
    const overallProgress = 0.1 + frameProgress * 0.8; // Map loop between 10% and 90% progress
    
    onProgress(overallProgress, `Rendering frame ${f + 1} of ${totalFrames}...`);

    // Deterministic simulation of time based on progress
    const timeMs = frameProgress * durationSec * 1000;
    drawFrameSync(timeMs);

    // Grab frame pixel buffer
    const imgData = ctx.getImageData(0, 0, size, size);
    const rgba = imgData.data;

    // Palette quantization & application using gifenc
    const palette = quantize(rgba, 256, { format });
    const index = applyPalette(rgba, palette, format);

    const frameOpts: any = { palette, delay };

    // Set transparency details
    if (settings.bgType === "transparent") {
      // Find color index with minimum alpha to mark as transparent
      let transparentIndex = -1;
      let minAlpha = 255;
      for (let i = 0; i < palette.length; i++) {
        const col = palette[i];
        const a = col[3];
        if (a < minAlpha) {
          minAlpha = a;
          transparentIndex = i;
        }
      }

      if (transparentIndex !== -1 && minAlpha < 128) {
        frameOpts.transparent = true;
        frameOpts.transparentIndex = transparentIndex;
      }
    }

    encoder.writeFrame(index, size, size, frameOpts);

    // Yield back to main thread periodically to prevent thread freezing
    if (f % 5 === 0) {
      await new Promise<void>((r) => setTimeout(r, 10));
    }
  }

  onProgress(0.92, "Assembling GIF binary stream...");
  await new Promise((r) => setTimeout(r, 100));

  encoder.finish();
  const buffer = encoder.bytes();

  onProgress(1.0, "Export completed!");
  return new Blob([buffer], { type: "image/gif" });
}

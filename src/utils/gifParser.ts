// @ts-ignore
import { parseGIF, decompressFrames } from "gifuct-js";

export interface CompiledGIFFrame {
  canvas: HTMLCanvasElement;
  delay: number;
}

export interface ParsedGIFInfo {
  width: number;
  height: number;
  frames: CompiledGIFFrame[];
}

/**
 * Parses an animated GIF from an ArrayBuffer and pre-compiles all frames
 * into standalone canvases. This handles transparency, frame offsets,
 * and disposal methods (cumulative frames) cleanly.
 */
export async function parseAndCompileGIF(arrayBuffer: ArrayBuffer): Promise<ParsedGIFInfo> {
  const gif = parseGIF(arrayBuffer);
  const frames = decompressFrames(gif, true);

  const width = gif.lsd.width;
  const height = gif.lsd.height;

  const compiledFrames: CompiledGIFFrame[] = [];

  // Create an accumulation canvas to build cumulative frames
  const accumCanvas = document.createElement("canvas");
  accumCanvas.width = width;
  accumCanvas.height = height;
  const accumCtx = accumCanvas.getContext("2d")!;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];

    // Disposal method 3: Restore to previous frame state
    let backupCanvas: HTMLCanvasElement | null = null;
    if (frame.disposalType === 3) {
      backupCanvas = document.createElement("canvas");
      backupCanvas.width = width;
      backupCanvas.height = height;
      backupCanvas.getContext("2d")!.drawImage(accumCanvas, 0, 0);
    }

    // Disposal method 2: Clear region of this frame to transparent/background
    if (frame.disposalType === 2) {
      accumCtx.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height);
    }

    // Draw the frame patch
    const patchImageData = accumCtx.createImageData(frame.dims.width, frame.dims.height);
    patchImageData.data.set(frame.patch);

    const patchCanvas = document.createElement("canvas");
    patchCanvas.width = frame.dims.width;
    patchCanvas.height = frame.dims.height;
    patchCanvas.getContext("2d")!.putImageData(patchImageData, 0, 0);

    // Draw the patch on the cumulative frame canvas
    accumCtx.drawImage(patchCanvas, frame.dims.left, frame.dims.top);

    // Clone the accumulation canvas for this compiled frame
    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = width;
    frameCanvas.height = height;
    const fCtx = frameCanvas.getContext("2d")!;
    fCtx.drawImage(accumCanvas, 0, 0);

    compiledFrames.push({
      canvas: frameCanvas,
      delay: frame.delay || 100, // standard fallback
    });

    // Handle disposal restoration
    if (frame.disposalType === 3 && backupCanvas) {
      accumCtx.clearRect(0, 0, width, height);
      accumCtx.drawImage(backupCanvas, 0, 0);
    }
  }

  return {
    width,
    height,
    frames: compiledFrames,
  };
}

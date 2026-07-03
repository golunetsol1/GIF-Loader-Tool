import React from "react";

interface WaveLogoProps {
  className?: string;
  size?: number;
  color?: string;
}

// Highly accurate SVG path for the wave logo from the reference image.
// Designed on a 100x100 viewport, centered.
export const WAVE_PATH = "M 22,57 C 27,51 34,46 41,53 C 44,56 46,59 48,58 C 50,56 53,49 59,44 C 66,39 74,44 79,49 C 81,51 83,52 84,49 C 78,41 68,36 59,42 C 54,46 51,51 49,51 C 47,51 45,46 41,43 C 33,37 26,45 22,57 Z";

export default function WaveLogo({
  className = "",
  size = 100,
  color = "#ff6b1a",
}: WaveLogoProps) {
  return (
    <svg
      id="wave-logo-svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      style={{ display: "block" }}
    >
      <path
        id="wave-logo-path"
        d={WAVE_PATH}
        fill={color}
        stroke={color}
        strokeWidth="0.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Canvas drawing helper to render the wave logo identically on an HTML5 canvas.
export function drawWaveLogo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  ctx.save();
  // Translate to center, scale to size, then translate back
  ctx.translate(cx, cy);
  const scale = size / 100;
  ctx.scale(scale, scale);
  ctx.translate(-50, -50); // Center the 100x100 coordinate system

  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.beginPath();
  // Drawing the bezier path manually on canvas based on WAVE_PATH
  ctx.moveTo(22, 57);
  ctx.bezierCurveTo(27, 51, 34, 46, 41, 53);
  ctx.bezierCurveTo(44, 56, 46, 59, 48, 58);
  ctx.bezierCurveTo(50, 56, 53, 49, 59, 44);
  ctx.bezierCurveTo(66, 39, 74, 44, 79, 49);
  ctx.bezierCurveTo(81, 51, 83, 52, 84, 49);
  ctx.bezierCurveTo(78, 41, 68, 36, 59, 42);
  ctx.bezierCurveTo(54, 46, 51, 51, 49, 51);
  ctx.bezierCurveTo(47, 51, 45, 46, 41, 43);
  ctx.bezierCurveTo(33, 37, 26, 45, 22, 57);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  ctx.restore();
}

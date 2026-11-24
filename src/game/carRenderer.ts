import type { CarBodyStyle } from './types';

export interface DrawCarOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bodyStyle: CarBodyStyle;
  angle?: number;
  isNight?: boolean;
  nitroActive?: boolean;
  hitFlash?: number;
  blinkSignal?: 'left' | 'right' | null;
  timeSec?: number;
  isPlayer?: boolean;
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function drawTopDownCar(ctx: CanvasRenderingContext2D, opts: DrawCarOptions): void {
  const {
    x,
    y,
    width: w,
    height: h,
    primaryColor,
    secondaryColor,
    accentColor,
    bodyStyle,
    angle = 0,
    isNight = true,
    nitroActive = false,
    hitFlash = 0,
    blinkSignal = null,
    timeSec = 0,
    isPlayer = false,
  } = opts;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Night headlight volumetric beams (drawn underneath car)
  if (isNight) {
    const beamLen = isPlayer ? 155 : 105;
    const beamAlpha = isPlayer ? 0.22 : 0.12;
    [-w * 0.28, w * 0.28].forEach((lx) => {
      const grad = ctx.createLinearGradient(lx, -h * 0.45, lx, -h * 0.45 - beamLen);
      grad.addColorStop(0, `rgba(224, 242, 254, ${beamAlpha})`);
      grad.addColorStop(1, 'rgba(224, 242, 254, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(lx - 4, -h * 0.46);
      ctx.lineTo(lx - w * 0.42, -h * 0.46 - beamLen);
      ctx.lineTo(lx + w * 0.42, -h * 0.46 - beamLen);
      ctx.lineTo(lx + 4, -h * 0.46);
      ctx.closePath();
      ctx.fill();
    });
  }

  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  roundedRectPath(ctx, -w / 2 + 3, -h / 2 + 5, w, h, w * 0.28);
  ctx.fill();

  // Electric blue nitro twin flames
  if (nitroActive) {
    const flicker = 0.85 + Math.sin(timeSec * 55) * 0.15;
    const flameLen = (26 + Math.sin(timeSec * 70) * 8) * flicker;
    [-w * 0.22, w * 0.22].forEach((ex) => {
      const fGrad = ctx.createLinearGradient(ex, h * 0.47, ex, h * 0.47 + flameLen);
      fGrad.addColorStop(0, '#FFFFFF');
      fGrad.addColorStop(0.25, '#38BDF8');
      fGrad.addColorStop(0.65, '#0284C7');
      fGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.moveTo(ex - 5, h * 0.46);
      ctx.quadraticCurveTo(ex, h * 0.46 + flameLen * 1.15, ex + 5, h * 0.46);
      ctx.closePath();
      ctx.fill();
    });
  }

  // Wheels (4 protruding dark tires)
  ctx.fillStyle = '#090D16';
  const tireW = w * 0.14;
  const tireH = h * 0.21;
  const wheelYFront = -h * 0.31;
  const wheelYRear = h * 0.14;
  roundedRectPath(ctx, -w / 2 - 2, wheelYFront, tireW, tireH, 3);
  ctx.fill();
  roundedRectPath(ctx, w / 2 - tireW + 2, wheelYFront, tireW, tireH, 3);
  ctx.fill();
  roundedRectPath(ctx, -w / 2 - 2, wheelYRear, tireW, tireH, 3);
  ctx.fill();
  roundedRectPath(ctx, w / 2 - tireW + 2, wheelYRear, tireW, tireH, 3);
  ctx.fill();

  // Main chassis gradient
  const bodyGrad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  bodyGrad.addColorStop(0, primaryColor);
  bodyGrad.addColorStop(0.55, primaryColor);
  bodyGrad.addColorStop(1, secondaryColor);

  ctx.fillStyle = hitFlash > 0 ? '#FFFFFF' : bodyGrad;
  const cornerRadius =
    bodyStyle === 'prototype' || bodyStyle === 'cyber'
      ? w * 0.22
      : bodyStyle === 'muscle'
      ? w * 0.18
      : w * 0.28;
  roundedRectPath(ctx, -w / 2, -h / 2, w, h, cornerRadius);
  ctx.fill();

  // Body outline highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Style-specific aero details & racing stripes
  if (bodyStyle === 'gt' || bodyStyle === 'muscle') {
    // Dual racing stripes
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(-w * 0.13, -h * 0.47, w * 0.09, h * 0.94);
    ctx.fillRect(w * 0.04, -h * 0.47, w * 0.09, h * 0.94);
    ctx.globalAlpha = 1;
  } else if (bodyStyle === 'hyper' || bodyStyle === 'prototype') {
    // Center aero spine & intake scoops
    ctx.fillStyle = secondaryColor;
    roundedRectPath(ctx, -w * 0.16, -h * 0.46, w * 0.32, h * 0.28, 4);
    ctx.fill();
    ctx.fillStyle = accentColor;
    ctx.fillRect(-w * 0.03, -h * 0.48, w * 0.06, h * 0.95);
  } else if (bodyStyle === 'cyber') {
    // Angular neon trim lines
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, -h * 0.38);
    ctx.lineTo(-w * 0.18, -h * 0.15);
    ctx.lineTo(-w * 0.18, h * 0.22);
    ctx.moveTo(w * 0.34, -h * 0.38);
    ctx.lineTo(w * 0.18, -h * 0.15);
    ctx.lineTo(w * 0.18, h * 0.22);
    ctx.stroke();
  } else {
    // Coupe sculpted hood lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.24, -h * 0.42);
    ctx.lineTo(-w * 0.16, -h * 0.14);
    ctx.moveTo(w * 0.24, -h * 0.42);
    ctx.lineTo(w * 0.16, -h * 0.14);
    ctx.stroke();
  }

  // Cabin / Windshield + Rear glass
  const cabinGrad = ctx.createLinearGradient(0, -h * 0.2, 0, h * 0.28);
  cabinGrad.addColorStop(0, '#0F172A');
  cabinGrad.addColorStop(0.45, '#1E293B');
  cabinGrad.addColorStop(1, '#020617');
  ctx.fillStyle = cabinGrad;
  roundedRectPath(ctx, -w * 0.34, -h * 0.17, w * 0.68, h * 0.44, w * 0.16);
  ctx.fill();

  // Roof panel inside cabin
  ctx.fillStyle = primaryColor;
  roundedRectPath(ctx, -w * 0.26, -h * 0.04, w * 0.52, h * 0.2, w * 0.1);
  ctx.fill();

  // Windshield specular glare
  ctx.fillStyle = 'rgba(224, 242, 254, 0.24)';
  ctx.beginPath();
  ctx.moveTo(-w * 0.26, -h * 0.14);
  ctx.lineTo(w * 0.1, -h * 0.14);
  ctx.lineTo(-w * 0.05, -h * 0.05);
  ctx.lineTo(-w * 0.28, -h * 0.05);
  ctx.closePath();
  ctx.fill();

  // Side mirrors
  ctx.fillStyle = secondaryColor;
  ctx.fillRect(-w / 2 - 3, -h * 0.12, 4, 7);
  ctx.fillRect(w / 2 - 1, -h * 0.12, 4, 7);

  // Rear carbon spoiler on sports/hyper/prototype
  if (bodyStyle !== 'muscle') {
    ctx.fillStyle = '#090D16';
    roundedRectPath(ctx, -w * 0.44, h * 0.36, w * 0.88, h * 0.09, 2);
    ctx.fill();
    ctx.fillStyle = accentColor;
    ctx.fillRect(-w * 0.44, h * 0.36, 3, h * 0.09);
    ctx.fillRect(w * 0.44 - 3, h * 0.36, 3, h * 0.09);
  }

  // Headlights
  ctx.fillStyle = '#F8FAFC';
  roundedRectPath(ctx, -w * 0.38, -h * 0.49, w * 0.22, h * 0.06, 2);
  ctx.fill();
  roundedRectPath(ctx, w * 0.16, -h * 0.49, w * 0.22, h * 0.06, 2);
  ctx.fill();

  // Taillights
  ctx.fillStyle = '#EF4444';
  roundedRectPath(ctx, -w * 0.38, h * 0.44, w * 0.24, h * 0.05, 2);
  ctx.fill();
  roundedRectPath(ctx, w * 0.14, h * 0.44, w * 0.24, h * 0.05, 2);
  ctx.fill();

  // Turn signal telegraph for weaving rivals
  if (blinkSignal && Math.floor(timeSec * 10) % 2 === 0) {
    ctx.fillStyle = '#F59E0B';
    const bx = blinkSignal === 'left' ? -w * 0.47 : w * 0.35;
    ctx.beginPath();
    ctx.arc(bx, -h * 0.42, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx, h * 0.42, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawTruckOrVan(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  isNight: boolean
): void {
  ctx.save();
  ctx.translate(x, y);

  if (isNight) {
    [-w * 0.3, w * 0.3].forEach((lx) => {
      const grad = ctx.createLinearGradient(lx, -h * 0.48, lx, -h * 0.48 - 90);
      grad.addColorStop(0, 'rgba(254, 249, 195, 0.14)');
      grad.addColorStop(1, 'rgba(254, 249, 195, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(lx - 4, -h * 0.48);
      ctx.lineTo(lx - 18, -h * 0.48 - 90);
      ctx.lineTo(lx + 18, -h * 0.48 - 90);
      ctx.lineTo(lx + 4, -h * 0.48);
      ctx.closePath();
      ctx.fill();
    });
  }

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundedRectPath(ctx, -w / 2 + 4, -h / 2 + 5, w, h, 8);
  ctx.fill();

  // Cargo box
  ctx.fillStyle = color;
  roundedRectPath(ctx, -w / 2, -h * 0.18, w, h * 0.68, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Cargo ridges
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 1;
  for (let ry = -h * 0.08; ry < h * 0.45; ry += 14) {
    ctx.beginPath();
    ctx.moveTo(-w * 0.42, ry);
    ctx.lineTo(w * 0.42, ry);
    ctx.stroke();
  }

  // Cab
  ctx.fillStyle = '#334155';
  roundedRectPath(ctx, -w * 0.44, -h * 0.5, w * 0.88, h * 0.3, 6);
  ctx.fill();

  // Cab windshield
  ctx.fillStyle = '#0F172A';
  roundedRectPath(ctx, -w * 0.36, -h * 0.45, w * 0.72, h * 0.12, 3);
  ctx.fill();

  // Headlights & Taillights
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(-w * 0.38, -h * 0.5, 9, 4);
  ctx.fillRect(w * 0.38 - 9, -h * 0.5, 9, 4);
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(-w * 0.38, h * 0.46, 10, 4);
  ctx.fillRect(w * 0.38 - 10, h * 0.46, 10, 4);

  ctx.restore();
}

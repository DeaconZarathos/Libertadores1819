import { CANVAS_HEIGHT, CANVAS_WIDTH, WALK_MAX_Y, WALK_MIN_Y } from './data';
import type { StageTheme } from './types';

function rect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

const skyCache = new Map<StageTheme, HTMLCanvasElement>();
const groundTileCache = new Map<StageTheme, HTMLCanvasElement>();

// River City Ransom (NES) bright, high-readability 8-bit sky & pixel clouds
function getBackdropCanvas(theme: StageTheme): HTMLCanvasElement {
  const cached = skyCache.get(theme);
  if (cached) return cached;

  const h = WALK_MIN_Y - 2;
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const skies: Record<StageTheme, { main: string; low: string; cloud: string; cloudShade: string }> = {
    plaza: { main: '#3cbcfc', low: '#a4e4fc', cloud: '#fcfcfc', cloudShade: '#bcbcbc' },
    murallas: { main: '#0078f8', low: '#3cbcfc', cloud: '#fcfcfc', cloudShade: '#a4e4fc' },
    castillo: { main: '#000088', low: '#2038ec', cloud: '#7c7c7c', cloudShade: '#383838' },
    llanos: { main: '#e45c10', low: '#f8b800', cloud: '#fce4a0', cloudShade: '#f87858' },
    paramo: { main: '#2038ec', low: '#64b0ff', cloud: '#e2e8f0', cloudShade: '#94a3b8' },
    pantano: { main: '#182848', low: '#385878', cloud: '#64748b', cloudShade: '#334155' },
    puente: { main: '#a80020', low: '#f87858', cloud: '#fce4a0', cloudShade: '#d82800' },
  };

  const p = skies[theme];
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 42); // Reserved for NES HUD
  ctx.fillStyle = p.main;
  ctx.fillRect(0, 42, CANVAS_WIDTH, h - 72);
  ctx.fillStyle = p.low;
  ctx.fillRect(0, h - 30, CANVAS_WIDTH, 30);

  // Classic flat-bottomed River City NES clouds
  for (const cx of [36, 174, 332]) {
    const cy = 54 + (cx % 11);
    ctx.fillStyle = p.cloudShade;
    ctx.fillRect(cx, cy + 8, 56, 4);
    ctx.fillStyle = p.cloud;
    ctx.fillRect(cx + 2, cy + 4, 52, 6);
    ctx.fillRect(cx + 10, cy, 34, 6);
    ctx.fillRect(cx + 18, cy - 4, 16, 4);
  }

  skyCache.set(theme, canvas);
  return canvas;
}

// River City Ransom (NES) sidewalk curb + clean street roadway
function getGroundTile(theme: StageTheme): HTMLCanvasElement {
  const cached = groundTileCache.get(theme);
  if (cached) return cached;

  const tileW = 64;
  const tileH = CANVAS_HEIGHT - (WALK_MIN_Y - 4);
  const canvas = document.createElement('canvas');
  canvas.width = tileW;
  canvas.height = tileH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const pal: Record<
    StageTheme,
    { sidewalk: string; curbFace: string; road: string; mark: string; border: string }
  > = {
    plaza: { sidewalk: '#bcbcbc', curbFace: '#7c7c7c', road: '#585858', mark: '#7c7c7c', border: '#000000' },
    murallas: { sidewalk: '#f8d878', curbFace: '#ac7c00', road: '#bcbcbc', mark: '#888888', border: '#000000' },
    castillo: { sidewalk: '#7c7c7c', curbFace: '#383838', road: '#303030', mark: '#505050', border: '#000000' },
    llanos: { sidewalk: '#00a800', curbFace: '#006800', road: '#c87c38', mark: '#9a5418', border: '#000000' },
    paramo: { sidewalk: '#e2e8f0', curbFace: '#64748b', road: '#475569', mark: '#64748b', border: '#000000' },
    pantano: { sidewalk: '#4d7c0f', curbFace: '#1e293b', road: '#273036', mark: '#3f4f59', border: '#000000' },
    puente: { sidewalk: '#d8d8d8', curbFace: '#7c7c7c', road: '#686868', mark: '#888888', border: '#000000' },
  };

  const p = pal[theme];
  ctx.fillStyle = p.road;
  ctx.fillRect(0, 0, tileW, tileH);

  // Classic River City Ransom raised sidewalk strip along top edge of street!
  ctx.fillStyle = p.border;
  ctx.fillRect(0, 0, tileW, 2);
  ctx.fillStyle = p.sidewalk;
  ctx.fillRect(0, 2, tileW, 12);
  ctx.fillStyle = p.curbFace;
  ctx.fillRect(0, 14, tileW, 4);
  ctx.fillStyle = p.border;
  ctx.fillRect(0, 18, tileW, 2);

  // Sidewalk expansion joints
  for (let sx = 0; sx < tileW; sx += 32) {
    ctx.fillStyle = p.curbFace;
    ctx.fillRect(sx, 2, 2, 12);
    ctx.fillStyle = p.border;
    ctx.fillRect(sx, 14, 2, 4);
  }

  // Clean subtle NES road dashes / stones
  for (let y = 30; y < tileH; y += 22) {
    const off = (y * 7) % 32;
    ctx.fillStyle = p.mark;
    ctx.fillRect(off, y, 10, 2);
    ctx.fillRect((off + 32) % tileW, y + 6, 8, 2);
  }

  groundTileCache.set(theme, canvas);
  return canvas;
}

export function drawStageBackground(
  ctx: CanvasRenderingContext2D,
  theme: StageTheme,
  cameraX: number,
  tick: number
) {
  const horizonY = WALK_MIN_Y - 2;

  ctx.drawImage(getBackdropCanvas(theme), 0, 0);

  // Far parallax hills / ocean (clean flat NES silhouettes)
  const farOffset = -(cameraX * 0.2) % 240;
  for (let i = -1; i < 4; i++) {
    const bx = Math.round(farOffset + i * 240);
    if (theme === 'murallas') {
      rect(ctx, 0, 108, CANVAS_WIDTH, horizonY - 108, '#0058c8');
      rect(ctx, 0, 108, CANVAS_WIDTH, 2, '#fcfcfc');
      for (let w = 0; w < 6; w++) {
        const wx = ((w * 42 + Math.floor(tick * 0.45)) % 240) + bx;
        rect(ctx, wx, 118 + (w % 3) * 8, 14, 2, '#a4e4fc');
      }
    } else {
      ctx.fillStyle =
        theme === 'llanos'
          ? '#a84800'
          : theme === 'puente'
          ? '#680018'
          : theme === 'paramo'
          ? '#3858a8'
          : '#006800';
      ctx.beginPath();
      ctx.moveTo(bx, horizonY);
      ctx.lineTo(bx + 65, 82);
      ctx.lineTo(bx + 135, 112);
      ctx.lineTo(bx + 195, 76);
      ctx.lineTo(bx + 250, horizonY);
      ctx.closePath();
      ctx.fill();
    }
  }

  // River City Ransom 8-bit Streetfront Buildings, Shops & Bridges!
  const bayW = 160;
  const midOffset = -(cameraX * 0.68) % bayW;
  for (let i = -1; i < 5; i++) {
    const mx = Math.round(midOffset + i * bayW);

    if (theme === 'plaza') {
      // Classic River City colonial storefront block (Cream wall + red-striped awning + shop window)
      rect(ctx, mx + 6, 56, 148, horizonY - 56, '#000000');
      rect(ctx, mx + 8, 58, 144, horizonY - 60, '#f8e0b0');
      // Red tile roof
      rect(ctx, mx + 4, 48, 152, 12, '#000000');
      rect(ctx, mx + 6, 50, 148, 8, '#d82800');
      // Upstairs windows
      for (const wx of [mx + 22, mx + 68, mx + 114]) {
        rect(ctx, wx, 68, 22, 24, '#000000');
        rect(ctx, wx + 2, 70, 18, 20, '#3cbcfc');
        rect(ctx, wx + 10, 70, 2, 20, '#000000');
      }
      // Classic River City striped storefront awning!
      rect(ctx, mx + 12, 98, 136, 14, '#000000');
      for (let ax = 14; ax < 146; ax += 12) {
        rect(ctx, mx + ax, 100, 6, 10, '#d82800');
        rect(ctx, mx + ax + 6, 100, 6, 10, '#fcfcfc');
      }
      // Door & display glass
      rect(ctx, mx + 22, 114, 28, horizonY - 114, '#000000');
      rect(ctx, mx + 24, 116, 24, horizonY - 116, '#884400');
      rect(ctx, mx + 64, 116, 70, 26, '#000000');
      rect(ctx, mx + 66, 118, 66, 22, '#f8b800');
    } else if (theme === 'murallas') {
      // Seafront stone fortress & rampart shops
      rect(ctx, mx, 80, bayW, horizonY - 80, '#000000');
      rect(ctx, mx, 82, bayW, horizonY - 84, '#d8c090');
      for (let cx = 6; cx < bayW; cx += 40) {
        rect(ctx, mx + cx, 68, 24, 14, '#000000');
        rect(ctx, mx + cx + 2, 70, 20, 12, '#f8e0b0');
      }
      rect(ctx, mx + 24, 96, 36, 56, '#000000');
      rect(ctx, mx + 26, 98, 32, 54, '#78350f');
      rect(ctx, mx + 92, 102, 44, 28, '#000000');
      rect(ctx, mx + 94, 104, 40, 24, '#0058c8');
    } else if (theme === 'castillo') {
      // Brick & stone fortress corridor (River City school/factory vibe!)
      rect(ctx, mx, 52, bayW, horizonY - 52, '#000000');
      rect(ctx, mx + 2, 54, bayW - 4, horizonY - 56, '#a83820');
      for (let by = 66; by < horizonY; by += 14) {
        rect(ctx, mx, by, bayW, 2, '#681808');
      }
      // Iron gate arch
      rect(ctx, mx + 48, 86, 64, horizonY - 86, '#000000');
      for (let bar = 0; bar < 5; bar++) {
        rect(ctx, mx + 56 + bar * 12, 90, 4, horizonY - 90, '#bcbcbc');
      }
      // Torch
      const flameH = 6 + (Math.floor(tick / 5 + i) % 4);
      rect(ctx, mx + 22, 94, 4, 14, '#f8b800');
      rect(ctx, mx + 20, 92 - flameH, 8, flameH, '#e45c10');
      rect(ctx, mx + 22, 93 - flameH, 4, flameH - 1, '#fcfcfc');
    } else if (theme === 'llanos') {
      // River City Park / Ranch road with green NES bushes & wooden fence!
      rect(ctx, mx + 8, 124, 144, 28, '#000000');
      rect(ctx, mx + 10, 126, 140, 24, '#00a800');
      rect(ctx, mx + 20, 118, 48, 12, '#00e800');
      // Ranch house
      rect(ctx, mx + 86, 94, 56, 58, '#000000');
      rect(ctx, mx + 88, 96, 52, 56, '#f8e0b0');
      rect(ctx, mx + 80, 82, 68, 14, '#000000');
      rect(ctx, mx + 82, 84, 64, 10, '#a84800');
      // Wooden fence
      rect(ctx, mx, 138, bayW, 4, '#f8b800');
      for (let px = 12; px < bayW; px += 32) {
        rect(ctx, mx + px, 130, 6, 22, '#78350f');
      }
    } else if (theme === 'paramo') {
      // Frosted mountain wall & frailejones
      rect(ctx, mx + 12, 126, 136, 26, '#475569');
      for (const fx of [mx + 34, mx + 108]) {
        rect(ctx, fx, 112, 8, 40, '#000000');
        rect(ctx, fx + 2, 114, 4, 38, '#006800');
        rect(ctx, fx - 8, 100, 24, 16, '#000000');
        rect(ctx, fx - 6, 102, 20, 12, '#00e800');
      }
    } else if (theme === 'pantano') {
      // Wooden marsh bridge railing & farmhouse
      rect(ctx, mx, 132, bayW, 6, '#78350f');
      for (let px = 8; px < bayW; px += 28) {
        rect(ctx, mx + px, 124, 6, 28, '#451a03');
      }
      rect(ctx, mx + 72, 84, 64, 68, '#000000');
      rect(ctx, mx + 74, 86, 60, 66, '#bcbcbc');
      rect(ctx, mx + 68, 74, 72, 12, '#d82800');
      rect(ctx, mx + 92, 102, 20, 20, '#f8b800');
    } else {
      // Puente de Boyacá: Classic River City Stone Bridge & Flowing River!
      rect(ctx, 0, 112, CANVAS_WIDTH, 40, '#0058c8');
      for (let rx = 0; rx < 5; rx++) {
        rect(ctx, mx + rx * 32, 122 + (rx % 2) * 8, 16, 2, '#3cbcfc');
      }
      rect(ctx, mx, 86, bayW, 44, '#000000');
      rect(ctx, mx, 88, bayW, 40, '#bcbcbc');
      rect(ctx, mx, 84, bayW, 6, '#fcfcfc');
      rect(ctx, mx + 48, 104, 60, 26, '#0058c8');
      // Colombian flag
      const wave = Math.round(Math.sin(tick * 0.16 + i) * 2);
      rect(ctx, mx + 22, 48, 2, 38, '#fcfcfc');
      rect(ctx, mx + 24, 49 + wave, 24, 6, '#f8b800');
      rect(ctx, mx + 24, 55 + wave, 24, 4, '#2038ec');
      rect(ctx, mx + 24, 59 + wave, 24, 4, '#d82800');
    }
  }

  // Walkable River City Street & Curb
  const groundTile = getGroundTile(theme);
  const groundTop = WALK_MIN_Y - 4;
  const tileW = groundTile.width;
  const offsetX = -(Math.floor(cameraX) % tileW);
  for (let x = offsetX; x < CANVAS_WIDTH; x += tileW) {
    ctx.drawImage(groundTile, Math.round(x), groundTop);
  }
  if (theme === 'puente') {
    rect(ctx, 0, WALK_MAX_Y + 4, CANVAS_WIDTH, 3, '#fcfcfc');
    rect(ctx, 0, WALK_MAX_Y + 7, CANVAS_WIDTH, 11, '#7c7c7c');
  }

  if (theme === 'paramo') {
    ctx.fillStyle = '#fcfcfc';
    for (let s = 0; s < 30; s++) {
      const sx = (s * 43 + tick * (1.2 + (s % 3) * 0.3)) % CANVAS_WIDTH;
      const sy = (s * 29 + tick * (1.8 + (s % 2) * 0.4)) % CANVAS_HEIGHT;
      ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2);
    }
  } else if (theme === 'pantano') {
    ctx.fillStyle = '#3cbcfc';
    for (let r = 0; r < 26; r++) {
      const rx = (r * 39 - tick * 3 + CANVAS_WIDTH * 10) % CANVAS_WIDTH;
      const ry = (r * 31 + tick * 6) % CANVAS_HEIGHT;
      ctx.fillRect(Math.round(rx), Math.round(ry), 1, 5);
    }
  }
}

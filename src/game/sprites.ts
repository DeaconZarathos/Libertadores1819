import { ENEMIES } from './data';
import type {
  EnemyEntity,
  FoodKind,
  ItemEntity,
  ParticleEntity,
  PlayerEntity,
  ProjectileEntity,
  PropEntity,
} from './types';

function px(
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

const spriteCache = new Map<string, HTMLCanvasElement>();

function compilePixelBitmap(
  key: string,
  rows: string[],
  palette: Record<string, string>,
  scale = 1
): HTMLCanvasElement {
  const fullKey = `${key}_x${scale}`;
  const cached = spriteCache.get(fullKey);
  if (cached) return cached;

  const h = rows.length;
  const w = rows[0]?.length ?? 1;
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const c = canvas.getContext('2d')!;
  c.imageSmoothingEnabled = false;

  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = palette[ch];
      if (col) {
        c.fillStyle = col;
        c.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }
  spriteCache.set(fullKey, canvas);
  return canvas;
}

export function drawShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number
) {
  const cx = Math.round(x);
  const cy = Math.round(y);
  const rxi = Math.max(5, Math.round(rx));
  const ryi = Math.max(2, Math.round(ry));
  ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
  for (let dy = -ryi; dy <= ryi; dy++) {
    const span = Math.round(rxi * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ryi * ryi + 0.5))));
    if (span > 0) {
      ctx.fillRect(cx - span, cy + dy, span * 2, 1);
    }
  }
}

// 2px NES-snapped disc helper for chunky River City Ransom fists, limbs & curved silhouettes
function drawNesDisc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string
) {
  const r2 = r * r + 0.35;
  const ri = Math.ceil(r);
  ctx.fillStyle = color;
  for (let dy = -ri; dy <= ri; dy += 2) {
    const span = Math.floor(Math.sqrt(Math.max(0, r2 - dy * dy)));
    if (span >= 0) {
      const xStart = Math.round((cx - span) / 2) * 2;
      const w = Math.max(2, Math.round((span * 2 + 1) / 2) * 2);
      ctx.fillRect(xStart, Math.round((cy + dy) / 2) * 2, w, 2);
    }
  }
}

function drawRiverCityLimb(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r1: number,
  r2: number,
  outline: string,
  baseColor: string,
  hiColor?: string,
  steps = 8
) {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    const r = r1 + (r2 - r1) * t;
    drawNesDisc(ctx, x, y, r + 1.8, outline);
  }
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    const r = r1 + (r2 - r1) * t;
    drawNesDisc(ctx, x, y, r, baseColor);
  }
  if (hiColor) {
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = x1 + (x2 - x1) * t - 1;
      const y = y1 + (y2 - y1) * t - 1;
      const r = Math.max(1, (r1 + (r2 - r1) * t) * 0.45);
      drawNesDisc(ctx, x, y, r, hiColor);
    }
  }
}

// Compact River City Ransom NES Gakuran / Colonial Uniform Coat (2px NES grid, tapered shoulders & waist)
function drawRiverCityTorso(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  height: number,
  shoulderHalf: number,
  waistHalf: number,
  hemHalf: number,
  opts: {
    outline: string;
    dark: string;
    mid: string;
    hi: string;
    trim: string;
    gold: string;
  }
) {
  for (let row = 0; row < height; row += 2) {
    const t = row / Math.max(1, height - 2);
    let halfW: number;
    if (t < 0.22) {
      const st = t / 0.22;
      halfW = shoulderHalf * (0.62 + 0.38 * Math.sin((st * Math.PI) / 2));
    } else if (t < 0.72) {
      const wt = (t - 0.22) / 0.5;
      halfW = shoulderHalf + (waistHalf - shoulderHalf) * wt;
    } else {
      const ht = (t - 0.72) / 0.28;
      halfW = waistHalf + (hemHalf - waistHalf) * ht;
    }

    const hw = Math.max(4, Math.round(halfW / 2) * 2);
    const y = Math.round((topY + row) / 2) * 2;
    const left = Math.round((cx - hw) / 2) * 2;
    const width = hw * 2;

    px(ctx, left - 2, y, width + 4, 2, opts.outline);
    if (row === 0 || row >= height - 2) {
      px(ctx, left, y, width, 2, opts.outline);
      continue;
    }

    px(ctx, left, y, width, 2, opts.dark);
    px(ctx, left + 2, y, Math.max(2, width - 4), 2, opts.mid);
    if (t > 0.15 && t < 0.65) {
      px(ctx, Math.round(cx / 2) * 2, y, Math.max(2, hw - 2), 2, opts.hi);
    }
    // Front uniform trim / buttons
    if (t > 0.1 && t < 0.7) {
      px(ctx, Math.round((cx + 2) / 2) * 2, y, 2, 2, opts.trim);
    }
    if (t >= 0.66 && t <= 0.8) {
      px(ctx, left, y, width, 2, opts.gold);
    }
  }
  // Collar
  px(ctx, Math.round(cx - 4), Math.round(topY - 2), 10, 4, opts.outline);
  px(ctx, Math.round(cx - 2), Math.round(topY), 6, 2, opts.trim);
}

function drawPixelSlashArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  startAng: number,
  endAng: number,
  outerColor: string,
  coreColor: string,
  thickness = 4
) {
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ang = startAng + (endAng - startAng) * t;
    const x = Math.round(cx + Math.cos(ang) * radius);
    const y = Math.round(cy + Math.sin(ang) * radius);
    const r = t > 0.2 && t < 0.82 ? thickness * 0.5 : Math.max(1.2, thickness * 0.3);
    drawNesDisc(ctx, x, y, r, outerColor);
    if (r >= 1.8) {
      drawNesDisc(ctx, x, y, r * 0.45, coreColor);
    }
  }
}

// ---- RIVER CITY RANSOM (KUNIO-KUN NES) BIG EXPRESSIVE 2x PIXEL HEADS ----
const RC_HEAD_BOLIVAR = [
  '.....oooooooooo.....',
  '...oohHHHHHHHHhho...',
  '..ohHHHHHHHHHHHHho..',
  '.ohHHHhhhhHHHHHHHho.',
  '.ohHhhsssssssssshho.',
  '.oHhssssbbbbssbbbho.',
  'oSShssswwppssswwpso.',
  'oSshssswwppssswwpso.',
  'oSshhssssssssssssso.',
  '.oohhhsssssmmmssSso.',
  '..oohhhssssssssSSo..',
  '...oohssssssssSSoo..',
  '....ooSSSSSSSSooo...',
  '......oooooooooo....',
];

const RC_HEAD_BOLIVAR_HURT = [
  '.....oooooooooo.....',
  '...oohHHHHHHHHhho...',
  '..ohHHHHHHHHHHHHho..',
  '.ohHHHhhhhHHHHHHHho.',
  '.ohHhhsssssssssshho.',
  '.oHhssbbbbssssbbsho.',
  'oSShsswwwwpssswwpso.',
  'oSshsswwwwpssswwpso.',
  'oSshhssssssssssssso.',
  '.oohhhsssssmmmssSso.',
  '..oohhhssssssssSSo..',
  '...oohssssssssSSoo..',
  '....ooSSSSSSSSooo...',
  '......oooooooooo....',
];

const RC_HEAD_SANTANDER = [
  '.....oooooooooo.....',
  '...oohHHHHHHHHhho...',
  '..ohHHHHHHHHHHHHho..',
  '.ohhhssssssssssshho.',
  '.ohhhssssssssssshho.',
  '.oHhssssbbbbssbbbho.',
  'oSShssswwppssswwpso.',
  'oSshssswwppssswwpso.',
  'oSshsssssssssssssso.',
  '.oohssMMMMMMMMMMsso.',
  '..oohMMMMMMMMMMMSo..',
  '...oohsssmmmmssSoo..',
  '....ooSSSSSSSSooo...',
  '......oooooooooo....',
];

const RC_HEAD_SANTANDER_HURT = [
  '.....oooooooooo.....',
  '...oohHHHHHHHHhho...',
  '..ohHHHHHHHHHHHHho..',
  '.ohhhssssssssssshho.',
  '.oHhssbbbbssssbbsho.',
  'oSShsswwwwpssswwpso.',
  'oSshsswwwwpssswwpso.',
  'oSshsssssssssssssso.',
  '.oohssMMMMMMMMMMsso.',
  '..oohMMMMMMMMMMMSo..',
  '...oohsssmmmmssSoo..',
  '....ooSSSSSSSSooo...',
  '......oooooooooo....',
  '......oooooooooo....',
];

const RC_HEAD_ENEMY = [
  '.....oooooooooo.....',
  '...oohhhhhhhhhhho...',
  '..ohhhhhhhhhhhhhho..',
  '.ohhhssssssssssshho.',
  '.oHhssssbbbbssbbbho.',
  'oSShssswwppssswwpso.',
  'oSshssswwppssswwpso.',
  'oSshsssssssssssssso.',
  '.oohssssssssmmmssso.',
  '..oohssssssssssSSo..',
  '...oohssssssssSSoo..',
  '....ooSSSSSSSSooo...',
  '......oooooooooo....',
];

const RC_HEAD_ENEMY_HURT = [
  '.....oooooooooo.....',
  '...oohhhhhhhhhhho...',
  '..ohhhhhhhhhhhhhho..',
  '.ohhhssssssssssshho.',
  '.oHhssbbbbssssbbsho.',
  'oSShsswwwwpssswwpso.',
  'oSshsswwwwpssswwpso.',
  'oSshsssssssssssssso.',
  '.oohssssssssmmmssso.',
  '..oohssssssssssSSo..',
  '...oohssssssssSSoo..',
  '....ooSSSSSSSSooo...',
  '......oooooooooo....',
];

// 2x NES Hat Bitmaps scaled to fit the big Kunio-kun heads!
const RC_HAT_SHAKO = [
  '......oooo......',
  '.....oRRRRo.....',
  '....oCCCCCCo....',
  '...oCCGGGGCCo...',
  '...oCCCCCCCCo...',
  '...oBBBBBBBBBoo.',
  '...oooooooooooo.',
];

const RC_HAT_BEARSKIN = [
  '....oooooooo....',
  '...oHHHHHHHHo...',
  '..oHHhhhhhhHHo..',
  '..oHHGGGGGGHHo..',
  '..oHHHHHHHHHHo..',
  '..oHHHHHHHHHHo..',
  '..oooooooooooo..',
];

const RC_HAT_BICORNE = [
  '......oooo......',
  '....ooRRRRoo....',
  '..ooCCCRCCCCoo..',
  '.oCCCCGGGGCCCCo.',
  'oCCCCCCCCCCCCCCo',
  '.oooooooooooooo.',
];

const RC_HAT_HELMET = [
  '.....oooooo.....',
  '...ooRRRRRRoo...',
  '..oRRRRrrrrrro..',
  '..oCCCCCCCCCCo..',
  '.oCCChhhhhhCCCo.',
  '.oCCCCCCCCCCCCo.',
  '..oooooooooooo..',
];

const RC_HAT_COMMANDER = [
  '....oooooooo....',
  '..ooRRRRRRRRoo..',
  '.oRRRGGGGGGGRRo.',
  '.oCCCCCCCCCCCCo.',
  'oCCCGGGGGGGGCCCo',
  'oCCCCCCCCCCCCCCo',
  '.oooooooooooooo.',
];

function drawRiverCityHead(
  ctx: CanvasRenderingContext2D,
  cx: number,
  neckY: number,
  opts: {
    skin: string;
    skinMid: string;
    hair: string;
    hairHi: string;
    style: 'bolivar' | 'santander' | 'shako' | 'bicorne' | 'bearskin' | 'helmet' | 'commander';
    hurtFace?: boolean;
    flash?: boolean;
  }
) {
  const o = '#000000';
  const s = opts.flash ? '#ffffff' : opts.skin;
  const S = opts.flash ? '#fef08a' : opts.skinMid;
  const h = opts.flash ? '#ffffff' : opts.hair;
  const H = opts.flash ? '#ffffff' : opts.hairHi;

  const pal: Record<string, string> = {
    o,
    s,
    S,
    h,
    H,
    w: '#ffffff',
    p: '#000000',
    b: '#000000',
    m: opts.hurtFace ? '#dc2626' : '#ffffff',
    M: h,
  };

  let rows: string[];
  let key: string;
  if (opts.style === 'bolivar') {
    rows = opts.hurtFace ? RC_HEAD_BOLIVAR_HURT : RC_HEAD_BOLIVAR;
    key = `rc_bolivar_${Boolean(opts.hurtFace)}_${Boolean(opts.flash)}`;
  } else if (opts.style === 'santander') {
    rows = opts.hurtFace ? RC_HEAD_SANTANDER_HURT : RC_HEAD_SANTANDER;
    key = `rc_santander_${Boolean(opts.hurtFace)}_${Boolean(opts.flash)}`;
  } else {
    rows = opts.hurtFace ? RC_HEAD_ENEMY_HURT : RC_HEAD_ENEMY;
    key = `rc_enemy_${Boolean(opts.hurtFace)}_${Boolean(opts.flash)}`;
  }

  // Drawn at 2x NES pixel scale (~40x28 px big expressive Kunio head!)
  const headBmp = compilePixelBitmap(key, rows, pal, 2);
  const hx = Math.round(cx - headBmp.width / 2);
  const hy = Math.round(neckY - headBmp.height + 4);
  ctx.drawImage(headBmp, hx, hy);

  if (opts.style !== 'bolivar' && opts.style !== 'santander') {
    const hatPal: Record<string, string> = {
      o,
      C: opts.flash ? '#ffffff' : opts.style === 'helmet' ? '#7c7c7c' : '#1e293b',
      B: '#0f172a',
      h: opts.flash ? '#ffffff' : '#e2e8f0',
      H: opts.flash ? '#ffffff' : '#1c1917',
      G: opts.flash ? '#fef08a' : '#f8b800',
      R: opts.flash ? '#ffffff' : '#d82800',
      r: opts.flash ? '#ffffff' : '#f87858',
    };
    const hatRows =
      opts.style === 'shako'
        ? RC_HAT_SHAKO
        : opts.style === 'bearskin'
        ? RC_HAT_BEARSKIN
        : opts.style === 'bicorne'
        ? RC_HAT_BICORNE
        : opts.style === 'helmet'
        ? RC_HAT_HELMET
        : RC_HAT_COMMANDER;
    const hatBmp = compilePixelBitmap(
      `rc_hat_${opts.style}_${Boolean(opts.flash)}`,
      hatRows,
      hatPal,
      2
    );
    ctx.drawImage(hatBmp, Math.round(cx - hatBmp.width / 2), hy - hatBmp.height + 8);
  }
}

function drawChunkyBoot(
  ctx: CanvasRenderingContext2D,
  footX: number,
  footY: number,
  forward: boolean,
  bootDark: string,
  bootHi: string
) {
  drawRiverCityLimb(
    ctx,
    footX - (forward ? 1 : -1),
    footY - 7,
    footX + (forward ? 5 : 3),
    footY - 2,
    3.6,
    3.0,
    '#000000',
    bootDark,
    bootHi,
    4
  );
}

// RIVER CITY RANSOM (KUNIO-KUN NES) HERO RENDERER (~68-74px tall, big expressive head!)
export function drawPlayerSprite(
  ctx: CanvasRenderingContext2D,
  p: PlayerEntity,
  screenX: number,
  tick: number
) {
  if (p.invulnTimer > 0 && Math.floor(p.invulnTimer / 3) % 2 === 1 && p.action !== 'special') {
    return;
  }

  const groundY = Math.round(p.y);
  const drawY = Math.round(p.y - p.z);
  const shadowScale = Math.max(0.55, 1 - p.z / 130);
  drawShadow(ctx, screenX, groundY + 2, 16 * shadowScale, 5 * shadowScale);

  ctx.save();
  ctx.translate(Math.round(screenX), drawY);
  ctx.scale(p.facing, 1);

  const isBolivar = p.heroId === 'bolivar';
  const o = '#000000';

  const coatDark = isBolivar ? '#001878' : '#0c2461';
  const coatMid = isBolivar ? '#1d4ed8' : '#2563eb';
  const coatHi = isBolivar ? '#3cbcfc' : '#60a5fa';
  const trim = isBolivar ? '#f8b800' : '#d82800';
  const gold = '#f8b800';
  const skin = '#fca06c';
  const skinMid = '#d87844';
  const pants = '#e2e8f0';
  const bootDark = '#111827';
  const bootHi = '#64748b';

  // Classic River City knocked-out pose with shocked O_O Kunio head!
  if (p.action === 'knockdown') {
    drawRiverCityLimb(ctx, -12, -8, 4, -8, 6.2, 5.8, o, coatMid, coatHi, 6);
    drawRiverCityLimb(ctx, 4, -8, 16, -7, 4.0, 3.2, o, pants, '#ffffff', 5);
    drawChunkyBoot(ctx, 18, -5, true, bootDark, bootHi);
    drawRiverCityHead(ctx, -18, 2, {
      skin,
      skinMid,
      hair: '#1f1612',
      hairHi: '#4a352a',
      style: isBolivar ? 'bolivar' : 'santander',
      hurtFace: true,
    });
    ctx.restore();
    return;
  }

  const walkCycle =
    p.action === 'walk' || p.action === 'dash' ? Math.sin(p.animFrame * 1.55) : 0;
  const bob =
    p.action === 'idle'
      ? Math.round(Math.sin(tick * 0.16) * 1.2)
      : Math.abs(Math.round(walkCycle * 2.5));
  const lean = p.action === 'dash' || p.action === 'dash_attack' ? 5 : p.action === 'combo3' || p.action === 'jump_attack' ? -4 : 0;
  const isHurt = p.action === 'hurt';

  ctx.translate(isHurt ? -4 : 0, -bob);

  // Special Move Whirlwind
  if (p.action === 'special') {
    const spinDir = Math.floor(tick / 2) % 2 === 0 ? 1 : -1;
    ctx.scale(spinDir, 1);
    drawPixelSlashArc(
      ctx,
      0,
      -34,
      40,
      -Math.PI,
      Math.PI,
      isBolivar ? '#f8b800' : '#3cbcfc',
      '#ffffff',
      4
    );
  }

  // ---- COMPACT RIVER CITY LEGS (~20px tall) ----
  const stride = Math.round(walkCycle * 10);
  const kickPose = p.action === 'combo3' || p.action === 'jump_attack';
  const hipY = -20;

  // Back leg
  drawRiverCityLimb(ctx, -4, hipY, -7 - stride, -7, 4.0, 3.2, o, '#94a3b8', pants, 5);
  drawChunkyBoot(ctx, -8 - stride, -1, false, bootDark, bootHi);

  // Front leg or classic Kunio flying side kick!
  if (kickPose) {
    drawRiverCityLimb(ctx, 2, hipY - 2, 23, -24, 4.2, 3.4, o, pants, '#ffffff', 6);
    drawNesDisc(ctx, 26, -24, 4.5, o);
    drawNesDisc(ctx, 26, -24, 3.2, bootDark);
    drawPixelSlashArc(ctx, 22, -24, 14, -0.5, 0.5, isBolivar ? '#f8b800' : '#3cbcfc', '#ffffff', 3);
  } else {
    drawRiverCityLimb(ctx, 3, hipY, 6 + stride, -7, 4.0, 3.4, o, pants, '#ffffff', 5);
    drawChunkyBoot(ctx, 6 + stride, -1, true, bootDark, bootHi);
  }

  // ---- BACK ARM ----
  if (p.action === 'special' && !isBolivar) {
    drawRiverCityLimb(ctx, -6 + lean, -35, -24, -34, 4.2, 3.4, o, coatMid, coatHi, 6);
    drawNesDisc(ctx, -26, -34, 5.2, o);
    drawNesDisc(ctx, -26, -34, 3.6, skin);
  } else {
    drawRiverCityLimb(ctx, 5 + lean, -34, 12 + lean, -28, 3.6, 3.0, o, coatDark, coatMid, 4);
    drawNesDisc(ctx, 14 + lean, -29, 4.2, o);
    drawNesDisc(ctx, 14 + lean, -29, 2.8, skinMid);
  }

  // ---- COMPACT TAPERED KUNIO UNIFORM TORSO (~22px tall) ----
  const shoulderHalf = isBolivar ? 9 : 11;
  const waistHalf = isBolivar ? 6 : 8;
  const hemHalf = isBolivar ? 8 : 10;
  drawRiverCityTorso(ctx, lean, -40, 22, shoulderHalf, waistHalf, hemHalf, {
    outline: o,
    dark: coatDark,
    mid: coatMid,
    hi: coatHi,
    trim,
    gold,
  });

  // Epaulets
  drawNesDisc(ctx, -shoulderHalf + lean, -39, 3.4, o);
  drawNesDisc(ctx, -shoulderHalf + lean, -39, 2.0, gold);
  drawNesDisc(ctx, shoulderHalf + lean, -39, 3.4, o);
  drawNesDisc(ctx, shoulderHalf + lean, -39, 2.0, gold);

  // ---- BIG EXPRESSIVE RIVER CITY HEAD (~28px tall -> total height ~70px!) ----
  drawRiverCityHead(ctx, lean + 1, -40, {
    skin,
    skinMid,
    hair: '#1f1612',
    hairHi: '#4a352a',
    style: isBolivar ? 'bolivar' : 'santander',
    hurtFace: isHurt,
  });

  // ---- FRONT ARM + BIG CHUNKY KUNIO PUNCH / SABER / BAYONET ----
  const isSwinging =
    p.action === 'combo1' ||
    p.action === 'combo2' ||
    p.action === 'combo4' ||
    p.action === 'dash_attack' ||
    p.action === 'grab_knee';

  if (p.action === 'special' && !isBolivar) {
    drawRiverCityLimb(ctx, 6 + lean, -35, 25, -34, 4.4, 3.4, o, coatMid, coatHi, 6);
    drawNesDisc(ctx, 27, -34, 5.4, o);
    drawNesDisc(ctx, 27, -34, 3.8, skin);
  } else if (isSwinging) {
    if (isBolivar) {
      drawRiverCityLimb(ctx, 2 + lean, -34, 17 + lean, -33, 4.0, 3.2, o, coatMid, coatHi, 6);
      drawNesDisc(ctx, 19 + lean, -33, 4.8, o);
      drawNesDisc(ctx, 19 + lean, -33, 3.2, skin);
      const bladeLen = p.action === 'combo4' || p.action === 'dash_attack' ? 28 : 20;
      drawRiverCityLimb(ctx, 21 + lean, -33, 21 + lean + bladeLen, -35, 2.0, 1.0, o, '#e2e8f0', '#ffffff', 7);
      px(ctx, 19 + lean, -36, 3, 6, gold);
      drawPixelSlashArc(ctx, 16 + lean, -31, 30, -0.75, 0.7, '#f8b800', '#ffffff', 4);
    } else {
      if (p.action === 'combo4' || p.action === 'dash_attack') {
        drawRiverCityLimb(ctx, 2 + lean, -34, 16 + lean, -33, 4.4, 3.4, o, coatMid, coatHi, 5);
        drawRiverCityLimb(ctx, 12 + lean, -33, 33 + lean, -33, 2.2, 1.8, o, '#78350f', '#b45309', 6);
        drawRiverCityLimb(ctx, 33 + lean, -33, 47 + lean, -33, 1.8, 0.8, o, '#f8fafc', '#ffffff', 5);
        drawPixelSlashArc(ctx, 34 + lean, -33, 16, -0.5, 0.5, '#3cbcfc', '#ffffff', 4);
      } else {
        drawRiverCityLimb(ctx, 2 + lean, -34, 21 + lean, -33, 4.4, 3.4, o, coatMid, coatHi, 6);
        drawNesDisc(ctx, 24 + lean, -33, 5.4, o);
        drawNesDisc(ctx, 24 + lean, -33, 3.8, skin);
        drawPixelSlashArc(ctx, 22 + lean, -33, 13, -0.6, 0.6, '#3cbcfc', '#ffffff', 3);
      }
    }
  } else {
    // Classic River City ready brawler fist!
    drawRiverCityLimb(ctx, -3 + lean, -34, 1 + lean, -26, 3.8, 3.0, o, coatMid, coatHi, 4);
    drawRiverCityLimb(ctx, 1 + lean, -26, 9 + lean, -28, 3.0, 2.8, o, coatMid, coatHi, 4);
    drawNesDisc(ctx, 11 + lean, -28, 4.4, o);
    drawNesDisc(ctx, 11 + lean, -28, 3.0, skin);

    if (isBolivar) {
      drawRiverCityLimb(ctx, 12 + lean, -29, 15 + lean, -47, 1.5, 0.9, o, '#e2e8f0', '#ffffff', 6);
      px(ctx, 10 + lean, -30, 4, 2, gold);
    } else {
      drawRiverCityLimb(ctx, -8 + lean, -22, -10 + lean, -47, 1.8, 1.4, o, '#92400e', '#b45309', 7);
      drawRiverCityLimb(ctx, -10 + lean, -47, -10 + lean, -54, 1.2, 0.8, o, '#f8fafc', '#ffffff', 3);
    }
  }

  ctx.restore();
}

// RIVER CITY RANSOM (KUNIO-KUN NES) SPANISH CROWN ENEMIES & JOSÉ MARÍA BARREIRO
export function drawEnemySprite(
  ctx: CanvasRenderingContext2D,
  e: EnemyEntity,
  screenX: number,
  tick: number
) {
  const arch = ENEMIES[e.kind];
  const groundY = Math.round(e.y);
  const drawY = Math.round(e.y - e.z);
  const shadowScale = Math.max(0.55, 1 - e.z / 130);
  drawShadow(ctx, screenX, groundY + 2, 15 * arch.scale * shadowScale, 4.5 * shadowScale);

  if (e.hp <= 0 && Math.floor(tick / 2) % 2 === 1) {
    return;
  }

  ctx.save();
  ctx.translate(Math.round(screenX), drawY);
  ctx.scale(e.facing * arch.scale, arch.scale);

  const flash = e.hitFlashTimer > 0;
  const o = '#000000';
  const coatMid = flash ? '#ffffff' : arch.coatColor;
  const coatDark = flash ? '#fef08a' : '#1e293b';
  const coatHi = flash ? '#ffffff' : arch.coatColor;
  const trim = flash ? '#fef08a' : arch.trimColor;
  const pants = flash ? '#ffffff' : arch.pantsColor;
  const bootDark = '#111827';
  const bootHi = '#64748b';
  const skin = '#fca06c';
  const skinMid = '#d87844';

  // River City knocked-down expression with O_O eyes!
  if (e.state === 'knockdown') {
    drawRiverCityLimb(ctx, -11, -8, 4, -8, 5.8, 5.2, o, coatMid, coatHi, 5);
    drawRiverCityLimb(ctx, 4, -8, 15, -7, 3.8, 3.0, o, pants, undefined, 5);
    drawChunkyBoot(ctx, 17, -5, true, bootDark, bootHi);
    drawRiverCityHead(ctx, -17, 2, {
      skin,
      skinMid,
      hair: '#292524',
      hairHi: '#57534e',
      style: arch.hatStyle,
      hurtFace: true,
      flash,
    });
    ctx.restore();
    return;
  }

  const isMoving = Math.abs(e.vx) > 0.15 || Math.abs(e.vy) > 0.15;
  const walkCycle = isMoving ? Math.sin(e.animFrame * 1.55) : 0;
  const bob = isMoving
    ? Math.abs(Math.round(walkCycle * 2))
    : Math.round(Math.sin(tick * 0.12 + e.id) * 1);
  const isHurt = e.state === 'hurt';
  ctx.translate(isHurt ? -3 : 0, -bob);

  // Flowing Commander / Barreiro Cape
  if (arch.isBoss) {
    const wave = Math.round(Math.sin(tick * 0.16 + e.id) * 3);
    drawRiverCityLimb(ctx, -5, -36, -15 + wave, -10, 5.6, 4.2, o, flash ? '#ffffff' : '#991b1b', flash ? '#ffffff' : '#dc2626', 7);
  }

  // Compact River City Legs
  const stride = Math.round(walkCycle * 8);
  drawRiverCityLimb(ctx, -3, -20, -6 - stride, -7, 3.8, 3.0, o, pants, undefined, 5);
  drawChunkyBoot(ctx, -7 - stride, -1, false, bootDark, bootHi);

  drawRiverCityLimb(ctx, 3, -20, 5 + stride, -7, 3.8, 3.0, o, pants, undefined, 5);
  drawChunkyBoot(ctx, 5 + stride, -1, true, bootDark, bootHi);

  // Compact Uniform Torso
  const shoulderHalf = e.kind === 'coracero' ? 11 : 9;
  const waistHalf = e.kind === 'coracero' ? 7 : 6;
  const hemHalf = e.kind === 'coracero' ? 9 : 7;
  drawRiverCityTorso(ctx, 0, -39, 21, shoulderHalf, waistHalf, hemHalf, {
    outline: o,
    dark: e.kind === 'miliciano' ? '#94a3b8' : coatDark,
    mid: coatMid,
    hi: coatHi,
    trim,
    gold: '#f8b800',
  });

  // Big Expressive River City Head + Hat
  drawRiverCityHead(ctx, 1, -39, {
    skin,
    skinMid,
    hair: '#292524',
    hairHi: '#57534e',
    style: arch.hatStyle,
    hurtFace: isHurt,
    flash,
  });

  if (e.state === 'windup') {
    drawNesDisc(ctx, 0, -76, 4.5, '#000000');
    drawNesDisc(ctx, 0, -76, 3.0, '#f8b800');
    px(ctx, -1, -78, 2, 4, '#d82800');
  }

  // Arms & Weapons
  if (e.state === 'attack' || e.state === 'boss_dash') {
    drawRiverCityLimb(ctx, 2, -33, 19, -32, 3.8, 3.0, o, coatMid, coatHi, 5);
    drawNesDisc(ctx, 21, -32, 4.4, o);
    drawNesDisc(ctx, 21, -32, 3.0, skin);
    if (arch.weapon === 'saber' || arch.weapon === 'halberd') {
      drawRiverCityLimb(ctx, 22, -32, 43, -34, 1.8, 0.9, o, '#e2e8f0', '#ffffff', 6);
      drawPixelSlashArc(ctx, 16, -30, 24, -0.7, 0.7, '#d82800', '#fecaca', 3);
    } else if (arch.weapon === 'bayonet') {
      drawRiverCityLimb(ctx, 13, -32, 32, -32, 2.0, 1.6, o, '#78350f', '#b45309', 5);
      drawRiverCityLimb(ctx, 32, -32, 45, -32, 1.6, 0.8, o, '#f8fafc', '#ffffff', 4);
    } else if (arch.weapon === 'pistol') {
      drawRiverCityLimb(ctx, 21, -33, 30, -33, 2.0, 1.4, o, '#475569', '#94a3b8', 4);
      drawNesDisc(ctx, 32, -33, 3.2, '#fde047');
    }
  } else {
    drawRiverCityLimb(ctx, -2, -33, 0, -25, 3.6, 2.8, o, coatMid, coatHi, 4);
    drawRiverCityLimb(ctx, 0, -25, 8, -27, 2.8, 2.6, o, coatMid, coatHi, 4);
    drawNesDisc(ctx, 10, -27, 3.8, o);
    drawNesDisc(ctx, 10, -27, 2.6, skin);
    if (arch.weapon === 'saber') {
      drawRiverCityLimb(ctx, 11, -28, 13, -44, 1.5, 0.9, o, '#e2e8f0', '#ffffff', 5);
    } else if (arch.weapon === 'bayonet' || arch.weapon === 'halberd') {
      drawRiverCityLimb(ctx, -4, -18, 13, -44, 1.8, 1.4, o, '#78350f', '#b45309', 7);
      drawRiverCityLimb(ctx, 13, -44, 17, -51, 1.4, 0.8, o, '#e2e8f0', '#ffffff', 3);
    }
  }

  ctx.restore();
}

const PROP_CRATE_ROWS = [
  'ooooooooooooo',
  'oBBBBBBBBBBBo',
  'oBhhhBbbBhhBo',
  'oBhbBmmmBbhBo',
  'oBBBBBBBBBBBo',
  'oBmBddBddBmBo',
  'oBmmdddddmmBo',
  'oBBBBBBBBBBBo',
  'oBddBdddBddBo',
  'oBBBBBBBBBBBo',
  'ooooooooooooo',
];

const PROP_BARREL_ROWS = [
  '...ooooooo...',
  '.ooBBBBBBBoo.',
  'oBhhmmmddddBo',
  'oIIIIIIIIIIIo',
  'oBhmBmddBddBo',
  'oBhmBmddBddBo',
  'oIIIIIIIIIIIo',
  '.oBmmddddBBo.',
  '...ooooooo...',
];

export function drawPropSprite(ctx: CanvasRenderingContext2D, prop: PropEntity, screenX: number) {
  const x = Math.round(screenX);
  const y = Math.round(prop.y);
  drawShadow(ctx, x, y + 1, 14, 4.5);

  const flash = prop.hitFlashTimer > 0;
  if (prop.kind === 'caja') {
    const bmp = compilePixelBitmap(
      `crate_rc_${flash}`,
      PROP_CRATE_ROWS,
      {
        o: '#000000',
        B: flash ? '#ffffff' : '#451a03',
        h: flash ? '#ffffff' : '#f8b800',
        m: flash ? '#fef08a' : '#b45309',
        b: flash ? '#fef08a' : '#92400e',
        d: flash ? '#fef08a' : '#78350f',
      },
      2
    );
    ctx.drawImage(bmp, x - 13, y - 22);
  } else {
    const isPowder = prop.kind === 'polvora';
    const bmp = compilePixelBitmap(
      `barrel_rc_${prop.kind}_${flash}`,
      PROP_BARREL_ROWS,
      {
        o: '#000000',
        B: flash ? '#ffffff' : isPowder ? '#7f1d1d' : '#451a03',
        h: flash ? '#ffffff' : isPowder ? '#f87858' : '#f8b800',
        m: flash ? '#fef08a' : isPowder ? '#d82800' : '#b45309',
        d: flash ? '#fef08a' : isPowder ? '#991b1b' : '#78350f',
        I: flash ? '#ffffff' : '#334155',
      },
      2
    );
    ctx.drawImage(bmp, x - 13, y - 18);
    if (isPowder) {
      px(ctx, x - 2, y - 11, 4, 4, '#f8b800');
      px(ctx, x - 1, y - 20, 2, 3, '#fde047');
    }
  }
}

export function drawFoodItem(
  ctx: CanvasRenderingContext2D,
  item: ItemEntity,
  screenX: number,
  tick: number
) {
  const x = Math.round(screenX);
  const bob = Math.round(Math.sin(tick * 0.14 + item.bobPhase) * 1.5);
  const y = Math.round(item.y - item.z) + bob;

  drawShadow(ctx, x, Math.round(item.y) + 1, 10, 3.5);

  if (Math.floor(tick / 10 + item.id) % 4 === 0) {
    px(ctx, x - 11, y - 16, 2, 2, '#fef08a');
    px(ctx, x + 9, y - 5, 2, 2, '#ffffff');
  }

  const o = '#000000';
  switch (item.kind as FoodKind) {
    case 'arepa': {
      drawNesDisc(ctx, x, y - 6, 8, o);
      drawNesDisc(ctx, x, y - 6, 6.5, '#d97706');
      drawNesDisc(ctx, x, y - 7, 5, '#f8b800');
      px(ctx, x - 3, y - 8, 2, 2, '#78350f');
      px(ctx, x + 2, y - 6, 2, 2, '#78350f');
      break;
    }
    case 'tamal': {
      drawRiverCityLimb(ctx, x - 6, y - 6, x + 6, y - 6, 5, 5, o, '#00a800', '#4ade80', 6);
      px(ctx, x - 1, y - 12, 2, 11, '#fde68a');
      px(ctx, x - 8, y - 7, 16, 2, '#fde68a');
      break;
    }
    case 'changua': {
      drawNesDisc(ctx, x, y - 6, 7.5, o);
      drawNesDisc(ctx, x, y - 6, 6, '#9a3412');
      px(ctx, x - 6, y - 12, 12, 4, '#fcfcfc');
      px(ctx, x - 2, y - 12, 4, 2, '#f8b800');
      px(ctx, x + 3, y - 12, 2, 2, '#00a800');
      break;
    }
    case 'bocadillo': {
      drawRiverCityLimb(ctx, x - 5, y - 5, x + 5, y - 5, 4.2, 4.2, o, '#d82800', '#f87858', 6);
      px(ctx, x - 7, y - 9, 5, 8, '#b45309');
      break;
    }
    case 'ajiaco': {
      drawNesDisc(ctx, x, y - 6, 8.5, o);
      drawNesDisc(ctx, x, y - 5, 7, '#7c2d12');
      px(ctx, x - 8, y - 12, 16, 5, '#fef08a');
      px(ctx, x - 5, y - 13, 4, 3, '#f8b800');
      px(ctx, x + 2, y - 12, 3, 2, '#00a800');
      break;
    }
    case 'bandeja': {
      drawRiverCityLimb(ctx, x - 8, y - 7, x + 8, y - 7, 6, 6, o, '#cbd5e1', '#ffffff', 7);
      px(ctx, x - 8, y - 10, 6, 6, '#ffffff');
      px(ctx, x - 2, y - 10, 6, 6, '#7f1d1d');
      px(ctx, x + 4, y - 10, 4, 4, '#f8b800');
      px(ctx, x - 6, y - 8, 3, 3, '#facc15');
      px(ctx, x + 4, y - 6, 4, 3, '#00a800');
      break;
    }
    case 'moneda': {
      drawNesDisc(ctx, x, y - 7, 6, o);
      drawNesDisc(ctx, x, y - 7, 4.8, '#f8b800');
      px(ctx, x - 1, y - 10, 2, 6, '#b45309');
      break;
    }
    case 'esmeralda': {
      drawNesDisc(ctx, x, y - 7, 6.5, o);
      drawNesDisc(ctx, x, y - 7, 5, '#00a800');
      px(ctx, x - 3, y - 10, 3, 3, '#a7f3d0');
      break;
    }
  }
}

export function drawProjectile(
  ctx: CanvasRenderingContext2D,
  proj: ProjectileEntity,
  screenX: number
) {
  const x = Math.round(screenX);
  const y = Math.round(proj.y - proj.z);
  drawShadow(ctx, x, Math.round(proj.y), 5, 2);
  drawRiverCityLimb(ctx, x - 4, y, x + 4, y, 2.2, 1.5, '#000000', proj.color, '#ffffff', 4);
}

export function drawParticle(
  ctx: CanvasRenderingContext2D,
  pt: ParticleEntity,
  screenX: number
) {
  const alpha = Math.max(0, pt.life / pt.maxLife);
  ctx.save();
  ctx.globalAlpha = alpha;
  const x = Math.round(screenX);
  const y = Math.round(pt.y - pt.z);
  if (pt.kind === 'shockwave') {
    const rad = Math.round(pt.size * (1.5 - alpha * 0.5));
    drawPixelSlashArc(ctx, x, y, rad, -Math.PI, Math.PI, pt.color, '#ffffff', 3);
  } else {
    drawNesDisc(ctx, x, y, pt.size * 0.5, pt.color);
  }
  ctx.restore();
}

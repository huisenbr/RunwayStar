'use strict';

// Always start at the top on load or refresh (the dress screen is tall)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

// ─── CANVAS SETUP ────────────────────────────────────────────────────────────
const CW = 48; // canvas pixel width
const CH = 64; // canvas pixel height

// ─── ASSET REGISTRY ──────────────────────────────────────────────────────────
// To swap in an Aseprite PNG:
//   1. Export sprite as PNG at 48×64 px with transparent background
//   2. Save to the assets/ folder
//   3. Uncomment the matching entry below
//
// tint: true  → draw the sprite in GREYSCALE in Aseprite (white = full color,
//               grey = shadow, black = outline). The color picker tints it at
//               runtime — one file covers every color automatically.
//
// tint: false → draw in full color in Aseprite; color picker is ignored.
//               Use this for eyes or anything with specific painted colors.
// ─────────────────────────────────────────────────────────────────────────────
const SPRITE_PATHS = {
  body_tone1:          { path: 'assets/Base.png',        tint: false },
  body_tone2:          { path: 'assets/base-tone2.png',  tint: false },
  body_tone3:          { path: 'assets/base-tone3.png',  tint: false },
  body_tone4:          { path: 'assets/base-tone4.png',  tint: false },
  body_tone5:          { path: 'assets/base-tone5.png',  tint: false },
  // hair_bun:          { path: 'assets/hair/bun.png',          tint: true  },
  // hair_long:         { path: 'assets/hair/long.png',         tint: true  },
  hair_curly:          { path: 'assets/hair-curly.png',        tint: true  },
  // hair_short:        { path: 'assets/hair/short.png',        tint: true  },
  mouth_smile:         { path: 'assets/mouth-smile.png',       tint: false },
  // eyes_round:        { path: 'assets/eyes/round.png',        tint: false },
  // eyes_cat:          { path: 'assets/eyes/cat.png',          tint: false },
  // eyes_star:         { path: 'assets/eyes/star.png',         tint: false },
  // eyes_sleepy:       { path: 'assets/eyes/sleepy.png',       tint: false },
  // top_tshirt:        { path: 'assets/top/tshirt.png',        tint: true  },
  top_blouse:          { path: 'assets/shirt-blouse.png',      tint: true  },
  // top_jacket:        { path: 'assets/top/jacket.png',        tint: true  },
  // top_crop:          { path: 'assets/top/crop.png',          tint: true  },
  // bottom_jeans:      { path: 'assets/bottom/jeans.png',      tint: true  },
  // bottom_skirt:      { path: 'assets/bottom/skirt.png',      tint: true  },
  // bottom_shorts:     { path: 'assets/bottom/shorts.png',     tint: true  },
  // bottom_dress:      { path: 'assets/bottom/dress.png',      tint: true  },
  // shoes_sneakers:    { path: 'assets/shoes/sneakers.png',    tint: true  },
  // shoes_heels:       { path: 'assets/shoes/heels.png',       tint: true  },
  // shoes_boots:       { path: 'assets/shoes/boots.png',       tint: true  },
  shoes_sandals:       { path: 'assets/shoe-sandal.png',       tint: true  },
  // accessory_hat:     { path: 'assets/accessory/hat.png',     tint: false },
  // accessory_bow:     { path: 'assets/accessory/bow.png',     tint: false },
  // accessory_bag:     { path: 'assets/accessory/bag.png',     tint: false },
  // accessory_sunglasses: { path: 'assets/accessory/sunglasses.png', tint: false },
  // accessory_crown:   { path: 'assets/accessory/crown.png',   tint: false },
};

const _imgCache = {};

function loadSprite(key, onLoad) {
  const entry = SPRITE_PATHS[key];
  if (!entry) return null;
  if (_imgCache[key]) return _imgCache[key].complete ? _imgCache[key] : null;
  const img = new Image();
  img.onload = () => { _imgCache[key] = img; onLoad && onLoad(); };
  img.src = entry.path;
  _imgCache[key] = img;
  return null;
}

function spriteReady(key) {
  const img = _imgCache[key];
  return !!(img && img.complete && img.naturalWidth > 0);
}

// Apply a color tint to a greyscale sprite using multiply compositing.
// White pixels → full tint color. Grey → shadowed. Black → black. Transparent → transparent.
const _tintCanvas = document.createElement('canvas');
_tintCanvas.width = CW; _tintCanvas.height = CH;
const _tintCtx = _tintCanvas.getContext('2d');

function drawTinted(ctx, img, color) {
  const off = _tintCanvas;
  const o = _tintCtx;
  o.globalCompositeOperation = 'source-over';
  o.clearRect(0, 0, CW, CH);
  o.fillStyle = color;
  o.fillRect(0, 0, CW, CH);
  o.globalCompositeOperation = 'multiply';
  o.drawImage(img, 0, 0, CW, CH);
  o.globalCompositeOperation = 'destination-in';
  o.drawImage(img, 0, 0, CW, CH);
  ctx.drawImage(off, 0, 0);
}

// Draw a PNG asset if loaded (tinting if flagged), otherwise run pixelFn fallback.
// Pass tintColor only for items that respect the color picker (hair, clothing, shoes).
function layer(ctx, key, tintColor, pixelFn) {
  const entry = SPRITE_PATHS[key];
  if (entry) {
    const img = loadSprite(key, () => redrawAll());
    if (img) {
      if (entry.tint && tintColor) drawTinted(ctx, img, tintColor);
      else ctx.drawImage(img, 0, 0, CW, CH);
      return;
    }
  }
  pixelFn(ctx);
}

function redrawAll() {
  drawCharacter('character');
  drawCharacter('runway-character');
  refreshThumbs();
}

// ─── SHORTHAND HELPERS ───────────────────────────────────────────────────────
function px(ctx, color, rects) {
  ctx.fillStyle = color;
  for (const [x, y, w, h] of rects) ctx.fillRect(x, y, w, h);
}

// ─── OUTFIT STATE ─────────────────────────────────────────────────────────────
const outfit = {
  skin:        'tone1',
  eyes:        null,
  mouth:       null,
  hair:        null,
  haircolor:   'black',
  top:         null,
  topcolor:    'red',
  bottom:      null,
  bottomcolor: 'blue',
  shoes:       null,
  shoecolor:   'black',
  accessory:   'none',
  accessory2:  'none',
};

const SKIN_COLORS = {
  tone1: '#FDDBB4',
  tone2: '#F5C08A',
  tone3: '#D4956A',
  tone4: '#A0633A',
  tone5: '#6B3A2A',
};

const COLOR_MAP = {
  red:    '#E74C3C', blue:   '#3498DB', green:  '#2ECC71', yellow: '#F1C40F',
  purple: '#9B59B6', pink:   '#FF69B4', white:  '#ECEDEE', black:  '#2C3E50',
  denim:  '#5B7A99', gold:   '#F5C518', brown:  '#7B4F2E',
  silver: '#BDC3C7', neon:   '#39FF14',
};

const HAIR_COLORS = {
  black: '#1a1a1a', brown: '#7B4F2E', blonde: '#F5D86E',
  red:   '#C0392B', pink:  '#F48FB1', blue:   '#5DADE2', purple: '#9B59B6',
  petal: '#FFC4DD',
};

function skinColor()      { return SKIN_COLORS[outfit.skin]        || '#FDDBB4'; }
function hairColor()      { return HAIR_COLORS[outfit.haircolor]   || '#1a1a1a'; }
function clothColor(slot) { return COLOR_MAP[outfit[slot]]         || '#ccc'; }
function darken(hex, amt) {
  // Simple darken: reduce each channel by amt (0-255)
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - amt);
  const g = Math.max(0, ((n >> 8) & 0xff) - amt);
  const b = Math.max(0, (n & 0xff) - amt);
  return `rgb(${r},${g},${b})`;
}

// ─── CHARACTER DRAW ───────────────────────────────────────────────────────────
function drawCharacter(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  paintCharacter(canvas.getContext('2d'));
}

function paintCharacter(ctx) {
  ctx.clearRect(0, 0, CW, CH);

  drawBody(ctx);
  drawBottom(ctx);
  drawTop(ctx);
  drawShoes(ctx);
  drawFace(ctx);
  drawHair(ctx);
  drawAccessory(ctx);
}

// ─── BODY / SKIN ─────────────────────────────────────────────────────────────
function drawBody(ctx) {
  layer(ctx, `body_${outfit.skin}`, null, () => drawBodyPixels(ctx));
}

function drawBodyPixels(ctx) {
  const s = skinColor();
  // Head
  px(ctx, s, [
    [13,  1, 22,  1],  // top
    [11,  2, 26, 19],  // main head
    [12, 21, 24,  1],  // jaw
    [14, 22, 20,  1],  // chin
    [16, 23, 16,  1],  // lower chin
  ]);
  // Neck
  px(ctx, s, [[21, 24, 6, 3]]);
  // Torso
  px(ctx, s, [[14, 27, 20, 15]]);
  // Arms
  px(ctx, s, [
    [8,  28, 6, 13],  // left
    [34, 28, 6, 13],  // right
  ]);
  // Legs
  px(ctx, s, [
    [14, 42, 9, 18],  // left
    [25, 42, 9, 18],  // right
  ]);
  // Feet base (shows when no shoes)
  px(ctx, darken(s, 20), [
    [12, 60, 12, 4],  // left
    [24, 60, 12, 4],  // right
  ]);
  // Cheeks
  ctx.fillStyle = 'rgba(240,140,140,0.35)';
  ctx.fillRect(12, 16, 6, 3);
  ctx.fillRect(30, 16, 6, 3);
}

// ─── FACE / EYES ─────────────────────────────────────────────────────────────
function drawFace(ctx) {
  // Nose
  if (!spriteReady(`body_${outfit.skin}`)) px(ctx, darken(skinColor(), 30), [[22, 17, 4, 1]]);

  // Mouth
  if (outfit.mouth) layer(ctx, `mouth_${outfit.mouth}`, null, () => drawMouthPixels(ctx, outfit.mouth));

  if (!outfit.eyes) return;
  layer(ctx, `eyes_${outfit.eyes}`, null, () => drawEyePixels(ctx, outfit.eyes));
}

function drawMouthPixels(ctx, style) {
  const lip = '#d4607a';
  const dark = '#a03050';
  const teeth = '#f5f5f5';

  if (style === 'smile') {
    // Simple curved smile
    px(ctx, lip, [
      [19, 19, 10, 1],
      [18, 20,  2, 1],
      [28, 20,  2, 1],
    ]);
  } else if (style === 'grin') {
    // Wide open grin with teeth
    px(ctx, dark,   [[18, 19, 12, 4]]);  // mouth opening
    px(ctx, teeth,  [[19, 20, 10, 2]]);  // teeth
    px(ctx, lip,    [
      [18, 19, 12, 1],                   // top lip
      [18, 22,  2, 1], [28, 22, 2, 1],  // corner curves
    ]);
  } else if (style === 'pout') {
    // Small pouty lips
    px(ctx, lip, [
      [21, 19, 6, 1],   // top lip
      [20, 20, 8, 2],   // lower lip (fuller)
      [20, 22, 8, 1],
    ]);
    px(ctx, dark, [[21, 20, 6, 1]]); // lip line
  } else if (style === 'tongue') {
    // Grin with tongue sticking out
    px(ctx, dark,  [[18, 19, 12, 3]]);   // mouth opening
    px(ctx, '#F48FB1', [[21, 20, 6, 4]]);// tongue
    px(ctx, lip,   [
      [18, 19, 12, 1],                   // top lip
      [18, 21,  2, 1], [28, 21, 2, 1],  // corners
    ]);
  }
}

function drawEyePixels(ctx, style) {
  if (style === 'round') {
    drawEye(ctx, 14, false);
    drawEye(ctx, 27, false);
  } else if (style === 'cat') {
    drawEye(ctx, 14, false, true);
    drawEye(ctx, 27, false, true);
  } else if (style === 'star') {
    drawStarEye(ctx, 14);
    drawStarEye(ctx, 27);
  } else if (style === 'sleepy') {
    drawSleepyEye(ctx, 14);
    drawSleepyEye(ctx, 27);
  } else if (style === 'visor') {
    // Space visor: one wraparound lens
    px(ctx, '#7F8C8D', [[11, 8, 26, 9]]);
    px(ctx, '#00E5FF', [[12, 9, 24, 7]]);
    px(ctx, '#00B8D4', [[12, 14, 24, 2]]);
    px(ctx, '#E0FFFF', [[14, 10, 5, 1], [14, 11, 2, 1]]);
  }
}

function drawEye(ctx, ex, flip, cat = false) {
  // White
  px(ctx, '#ffffff', [[ex, 9, 7, 7]]);
  // Iris (blue)
  px(ctx, '#5DADE2', [[ex + 1, 9, 5, 6]]);
  // Pupil
  px(ctx, '#1a2a3a', [[ex + 2, 10, 3, 4]]);
  // Highlight
  px(ctx, '#ffffff', [[ex + 2, 10, 1, 1]]);
  // Top lash bar
  px(ctx, '#1a1a1a', [
    [ex - 1, 8, 9, 1],  // wide lash
    [ex,     9, 7, 1],  // lash base
  ]);
  // Bottom lash
  px(ctx, '#1a1a1a', [[ex, 16, 7, 1]]);
  // Cat eye wing
  if (cat) {
    const wingX = flip ? ex - 2 : ex + 6;
    px(ctx, '#1a1a1a', [
      [wingX, 7, 2, 1],
      [wingX + (flip ? -1 : 1), 6, 1, 1],
    ]);
  }
}

function drawStarEye(ctx, ex) {
  px(ctx, '#ffffff', [[ex, 9, 7, 7]]);
  // Star in yellow
  px(ctx, '#F1C40F', [
    [ex + 3, 9,  1, 2],  // top spike
    [ex + 1, 10, 5, 1],  // wide middle
    [ex + 2, 11, 3, 1],
    [ex + 1, 12, 5, 1],
    [ex + 3, 13, 1, 2],  // bottom spike
  ]);
  px(ctx, '#ffffff', [[ex + 3, 11, 1, 1]]); // highlight
  px(ctx, '#1a1a1a', [
    [ex - 1, 8, 9, 1],
    [ex,     16, 7, 1],
  ]);
}

function drawSleepyEye(ctx, ex) {
  px(ctx, '#ffffff', [[ex, 12, 7, 4]]);
  px(ctx, '#5DADE2', [[ex + 1, 12, 5, 3]]);
  px(ctx, '#1a2a3a', [[ex + 2, 12, 3, 2]]);
  px(ctx, '#ffffff', [[ex + 2, 12, 1, 1]]);
  // Heavy drooped lid
  px(ctx, skinColor(), [[ex, 9, 7, 3]]);
  px(ctx, '#1a1a1a', [
    [ex - 1, 11, 9, 1],
    [ex,     16, 7, 1],
  ]);
}

// ─── HAIR ─────────────────────────────────────────────────────────────────────
function drawHair(ctx) {
  if (!outfit.hair) return;
  layer(ctx, `hair_${outfit.hair}`, hairColor(), () => drawHairPixels(ctx, outfit.hair));
}

function drawHairPixels(ctx, style) {
  const h = hairColor();
  const hd = darken(h, 25); // shadow shade

  if (style === 'bun') {
    // Scalp cap
    px(ctx, h, [
      [12, 0, 24, 1],
      [11, 1, 26, 7],
      [10, 7,  4, 6],  // left side
      [34, 7,  4, 6],  // right side
    ]);
    // Bun (raised circle)
    px(ctx, h, [
      [19, 0, 10, 1],
      [17, 1, 14, 6],
      [19, 7, 10, 2],
    ]);
    px(ctx, hd, [[20, 3, 4, 2]]); // bun shadow
  }

  else if (style === 'long') {
    // Top cap
    px(ctx, h, [
      [12, 0, 24, 1],
      [10, 1, 28, 8],
      [9,  8,  4, 40],  // left fall
      [35, 8,  4, 40],  // right fall
    ]);
    px(ctx, hd, [
      [9,  8, 2, 40],   // left shadow edge
      [37, 8, 2, 40],   // right shadow edge
    ]);
  }

  else if (style === 'curly') {
    // Big poofy top
    px(ctx, h, [
      [13, 0, 22, 1],
      [10, 1, 28, 2],
      [8,  3, 32, 8],
      [7,  8,  5, 16],  // left puff
      [36, 8,  5, 16],  // right puff
    ]);
    // Curly texture dots (darker)
    px(ctx, hd, [
      [10, 3, 2, 2], [16, 2, 2, 2], [22, 1, 2, 2], [28, 3, 2, 2],
      [8,  8, 2, 2], [37, 8, 2, 2],
    ]);
  }

  else if (style === 'short') {
    // Clean tidy cap
    px(ctx, h, [
      [13, 0, 22, 1],
      [11, 1, 26, 7],
      [10, 7,  3, 9],  // left side
      [35, 7,  3, 9],  // right side
    ]);
    px(ctx, hd, [[11, 5, 26, 2]]); // parting shadow
  }

  else if (style === 'spiky') {
    // Rock-star spikes
    px(ctx, h, [
      [12, 2, 24, 6],
      [10, 6, 3, 8], [35, 6, 3, 8],              // sides
      [12, 0, 2, 2], [17, 0, 3, 2], [23, 0, 2, 2], [28, 0, 3, 2], [34, 0, 2, 2],  // spikes
      [8, 3, 4, 2], [36, 3, 4, 2], [7, 2, 2, 1], [39, 2, 2, 1],                   // side spikes
    ]);
    px(ctx, hd, [[14, 2, 1, 4], [19, 2, 1, 4], [24, 2, 1, 4], [29, 2, 1, 4], [12, 7, 24, 1]]);
  }
}

// ─── TOP ──────────────────────────────────────────────────────────────────────
function drawTop(ctx) {
  if (!outfit.top) return;
  layer(ctx, `top_${outfit.top}`, clothColor('topcolor'), () => drawTopPixels(ctx, outfit.top));
}

function drawTopPixels(ctx, style) {
  const c  = clothColor('topcolor');
  const cd = darken(c, 30);

  if (style === 'tshirt') {
    px(ctx, c, [
      [14, 27, 20, 14],   // torso
      [8,  28,  6,  8],   // left short sleeve
      [34, 28,  6,  8],   // right short sleeve
    ]);
    px(ctx, cd, [
      [14, 27, 1, 14],    // left edge shadow
      [33, 27, 1, 14],    // right edge shadow
    ]);
    // Collar
    px(ctx, cd, [[19, 27, 10, 2]]);
  }

  else if (style === 'blouse') {
    px(ctx, c, [
      [14, 27, 20, 15],
      [8,  28,  6, 13],   // 3/4 sleeves
      [34, 28,  6, 13],
    ]);
    // Collar frill
    px(ctx, '#ffffff', [[19, 27, 10, 3]]);
    px(ctx, cd, [[14, 27, 1, 15], [33, 27, 1, 15]]);
    // Buttons
    px(ctx, cd, [[23, 29, 2, 1], [23, 32, 2, 1], [23, 35, 2, 1]]);
  }

  else if (style === 'jacket') {
    px(ctx, c, [
      [14, 27, 20, 15],
      [8,  28,  6, 13],   // full sleeves
      [34, 28,  6, 13],
    ]);
    // Lapels
    px(ctx, cd, [
      [14, 27, 4, 15],    // left lapel dark
      [30, 27, 4, 15],    // right lapel dark
      [17, 27, 2,  8],    // lapel fold
      [29, 27, 2,  8],
    ]);
    // Collar
    px(ctx, cd, [[14, 27, 20, 2]]);
  }

  else if (style === 'crop') {
    px(ctx, c, [
      [14, 27, 20, 7],    // short torso only
    ]);
    px(ctx, cd, [
      [14, 27, 1, 7],
      [33, 27, 1, 7],
    ]);
    // Thin strap lines
    px(ctx, c, [[19, 24, 4, 3], [25, 24, 4, 3]]);
  }

  else if (style === 'puffer') {
    // Big quilted winter coat
    px(ctx, c, [[13, 26, 22, 17], [7, 28, 7, 13], [34, 28, 7, 13], [18, 25, 12, 2]]);
    px(ctx, cd, [
      [13, 30, 22, 1], [13, 34, 22, 1], [13, 38, 22, 1],
      [7, 32, 7, 1], [34, 32, 7, 1], [7, 36, 7, 1], [34, 36, 7, 1],
      [23, 26, 2, 17],                       // zipper
    ]);
  }

  else if (style === 'bodysuit') {
    // Hero suit with a chest emblem and belt
    px(ctx, c, [[14, 27, 20, 15], [8, 28, 6, 13], [34, 28, 6, 13]]);
    px(ctx, cd, [[14, 27, 1, 15], [33, 27, 1, 15], [8, 40, 6, 1], [34, 40, 6, 1]]);
    px(ctx, '#F1C40F', [[23, 29, 2, 1], [21, 30, 6, 1], [20, 31, 8, 2], [21, 33, 6, 1], [23, 34, 2, 1], [14, 40, 20, 2]]);
    px(ctx, '#C0392B', [[23, 31, 2, 1]]);
  }

  else if (style === 'jersey') {
    // Sleeveless team jersey with a number
    px(ctx, c, [[14, 27, 20, 15]]);
    px(ctx, '#ffffff', [
      [14, 27, 2, 9], [32, 27, 2, 9],        // armhole trim
      [20, 27, 8, 1], [21, 28, 6, 1], [22, 29, 4, 1],   // v-neck
      [21, 31, 7, 2], [25, 33, 2, 2], [24, 35, 2, 2], [23, 37, 2, 2],  // number 7
    ]);
    px(ctx, cd, [[14, 41, 20, 1]]);
  }

  else if (style === 'striped') {
    // Long-sleeve sailor stripes
    px(ctx, c, [[14, 27, 20, 15], [8, 28, 6, 13], [34, 28, 6, 13]]);
    px(ctx, '#ffffff', [29, 32, 35, 38].flatMap(y => [[14, y, 20, 1], [8, y, 6, 1], [34, y, 6, 1]]));
    px(ctx, cd, [[19, 27, 10, 1]]);
  }

  else if (style === 'leather') {
    // Leather jacket: off-center zip and studs
    px(ctx, c, [[14, 27, 20, 15], [8, 28, 6, 13], [34, 28, 6, 13]]);
    px(ctx, cd, [[14, 27, 5, 7], [29, 27, 5, 7], [14, 27, 20, 1], [8, 39, 6, 2], [34, 39, 6, 2]]);
    px(ctx, '#ECF0F1', [[20, 28, 1, 3], [21, 31, 1, 3], [22, 34, 1, 3], [23, 37, 1, 4]]);
    px(ctx, '#BDC3C7', [[9, 28, 1, 1], [11, 28, 1, 1], [36, 28, 1, 1], [38, 28, 1, 1]]);
    px(ctx, 'rgba(255,255,255,0.25)', [[10, 30, 1, 8], [36, 30, 1, 8]]);
  }

  else if (style === 'blazer') {
    // Tailored blazer over a white shirt
    px(ctx, c, [[14, 27, 20, 15], [8, 28, 6, 13], [34, 28, 6, 13]]);
    px(ctx, '#ffffff', [[20, 27, 8, 2], [21, 29, 6, 2], [22, 31, 4, 2], [23, 33, 2, 1]]);
    px(ctx, cd, [[19, 27, 1, 7], [28, 27, 1, 7], [14, 27, 1, 15], [33, 27, 1, 15], [27, 37, 4, 1]]);
    px(ctx, '#1a1a1a', [[23, 35, 2, 1], [23, 38, 2, 1]]);
  }

  else if (style === 'robe') {
    // Fuzzy bathrobe, long enough to cover the knees
    px(ctx, c, [[13, 27, 22, 26], [7, 28, 7, 12], [34, 28, 7, 12]]);
    px(ctx, '#ffffff', [[7, 38, 7, 2], [34, 38, 7, 2], [19, 27, 3, 9], [26, 27, 3, 9]]);
    px(ctx, cd, [[13, 40, 22, 2], [22, 42, 2, 5], [25, 42, 2, 4], [13, 27, 1, 26], [34, 27, 1, 26]]);
  }

  else if (style === 'tiedye') {
    // Tie-dye tee with color swirls
    px(ctx, c, [[14, 27, 20, 14], [8, 28, 6, 8], [34, 28, 6, 8]]);
    px(ctx, '#FF69B4', [[16, 29, 4, 2], [27, 33, 4, 3], [9, 30, 3, 2], [20, 38, 3, 2]]);
    px(ctx, '#F1C40F', [[22, 31, 4, 3], [15, 36, 4, 2], [35, 31, 3, 2], [29, 38, 3, 2]]);
    px(ctx, '#5DADE2', [[28, 28, 3, 2], [19, 33, 3, 2], [24, 36, 4, 2], [10, 33, 3, 2]]);
    px(ctx, cd, [[19, 27, 10, 2]]);
  }
}

// ─── BOTTOM ───────────────────────────────────────────────────────────────────
function drawBottom(ctx) {
  if (!outfit.bottom) return;
  layer(ctx, `bottom_${outfit.bottom}`, clothColor('bottomcolor'), () => drawBottomPixels(ctx, outfit.bottom));
}

function drawBottomPixels(ctx, style) {
  const c  = clothColor('bottomcolor');
  const cd = darken(c, 30);

  if (style === 'jeans') {
    px(ctx, c, [
      [14, 41, 20, 2],    // waistband
      [14, 43,  9, 17],   // left leg
      [25, 43,  9, 17],   // right leg
    ]);
    px(ctx, cd, [
      [22, 43, 3, 17],    // center seam
      [14, 43, 1, 17],    // left edge
      [33, 43, 1, 17],    // right edge
    ]);
  }

  else if (style === 'skirt') {
    // Flared A-line
    px(ctx, c, [
      [14, 41, 20,  2],   // waistband
      [13, 43, 22,  4],
      [11, 47, 26,  4],
      [9,  51, 30,  8],
    ]);
    px(ctx, cd, [
      [9, 51, 2, 8], [35, 51, 2, 8],   // side shadows
    ]);
  }

  else if (style === 'shorts') {
    px(ctx, c, [
      [14, 41, 20, 2],
      [14, 43, 9,  9],    // left short leg
      [25, 43, 9,  9],    // right short leg
    ]);
    px(ctx, cd, [
      [22, 43, 3, 9],
      [14, 43, 1, 9],
      [33, 43, 1, 9],
    ]);
  }

  else if (style === 'dress') {
    // Full dress from waist down
    px(ctx, c, [
      [14, 41, 20,  2],   // waist
      [12, 43, 24,  5],
      [10, 48, 28,  5],
      [8,  53, 32,  7],
    ]);
    px(ctx, cd, [
      [8, 53, 2, 7], [38, 53, 2, 7],
      [14, 41, 1, 19], [33, 41, 1, 19],
    ]);
    // Hem detail
    px(ctx, '#ffffff', [[9, 59, 30, 1]]);
  }

  else if (style === 'leggings') {
    px(ctx, c, [[14, 41, 20, 2], [15, 43, 8, 17], [25, 43, 8, 17]]);
    px(ctx, cd, [[15, 43, 1, 17], [32, 43, 1, 17], [14, 41, 20, 1]]);
  }

  else if (style === 'track') {
    // Track pants with side stripes
    px(ctx, c, [[14, 41, 20, 2], [14, 43, 9, 17], [25, 43, 9, 17]]);
    px(ctx, cd, [[22, 43, 3, 17], [14, 58, 9, 2], [25, 58, 9, 2]]);
    px(ctx, '#ffffff', [[14, 43, 1, 15], [15, 43, 1, 15], [32, 43, 1, 15], [33, 43, 1, 15], [22, 41, 1, 3], [25, 41, 1, 3]]);
  }

  else if (style === 'tulle') {
    // Puffy fairy skirt with sparkles
    px(ctx, c, [[14, 41, 20, 2], [11, 43, 26, 4], [9, 47, 30, 5]]);
    px(ctx, 'rgba(255,255,255,0.4)', [[10, 45, 28, 2], [8, 50, 32, 2]]);
    px(ctx, '#ffffff', [[13, 48, 1, 1], [20, 44, 1, 1], [28, 49, 1, 1], [34, 46, 1, 1], [17, 51, 1, 1], [31, 51, 1, 1]]);
  }

  else if (style === 'jumpsuit') {
    // Space suit legs with belt and knee pads
    px(ctx, c, [[14, 41, 20, 2], [14, 43, 9, 17], [25, 43, 9, 17]]);
    px(ctx, cd, [[22, 43, 3, 17], [15, 50, 7, 3], [26, 50, 7, 3], [15, 45, 3, 2], [30, 45, 3, 2]]);
    px(ctx, '#BDC3C7', [[14, 41, 20, 2]]);
    px(ctx, '#F1C40F', [[23, 41, 2, 2]]);
  }

  else if (style === 'leatherpants') {
    px(ctx, c, [[14, 41, 20, 2], [14, 43, 9, 17], [25, 43, 9, 17]]);
    px(ctx, cd, [[22, 43, 3, 17], [14, 43, 1, 17], [33, 43, 1, 17]]);
    px(ctx, 'rgba(255,255,255,0.35)', [[16, 44, 1, 14], [27, 44, 1, 14]]);
    px(ctx, '#1a1a1a', [[14, 41, 20, 1]]);
    px(ctx, '#BDC3C7', [[23, 41, 2, 2]]);
  }

  else if (style === 'slacks') {
    // Pressed dress pants
    px(ctx, c, [[14, 41, 20, 2], [14, 43, 9, 17], [25, 43, 9, 17]]);
    px(ctx, cd, [[14, 41, 20, 1], [22, 43, 3, 17], [18, 44, 1, 16], [29, 44, 1, 16]]);
  }

  else if (style === 'pajamas') {
    // Loose PJ pants with polka dots
    px(ctx, c, [[14, 41, 20, 2], [13, 43, 10, 17], [25, 43, 10, 17]]);
    px(ctx, cd, [[14, 41, 20, 1], [13, 58, 10, 2], [25, 58, 10, 2]]);
    px(ctx, '#ffffff', [[16, 45, 1, 1], [20, 48, 1, 1], [16, 52, 1, 1], [20, 55, 1, 1], [27, 46, 1, 1], [31, 49, 1, 1], [28, 53, 1, 1], [32, 56, 1, 1]]);
  }

  else if (style === 'flowy') {
    // Long flowy festival skirt
    px(ctx, c, [[14, 41, 20, 2], [12, 43, 24, 6], [10, 49, 28, 6], [9, 55, 30, 5]]);
    px(ctx, cd, [[9, 59, 4, 1], [17, 59, 4, 1], [25, 59, 4, 1], [33, 59, 4, 1], [9, 55, 1, 5], [38, 55, 1, 5], [18, 44, 1, 14], [29, 44, 1, 14]]);
  }
}

// ─── SHOES ────────────────────────────────────────────────────────────────────
function drawShoes(ctx) {
  if (!outfit.shoes) return;
  layer(ctx, `shoes_${outfit.shoes}`, clothColor('shoecolor'), () => drawShoePixels(ctx, outfit.shoes));
}

function drawShoePixels(ctx, style) {
  const c  = clothColor('shoecolor');
  const cd = darken(c, 40);

  if (style === 'sneakers') {
    px(ctx, c, [
      [11, 60, 13, 4],   // left shoe
      [24, 60, 13, 4],   // right shoe
    ]);
    px(ctx, '#ffffff', [
      [11, 60, 13, 1],   // left sole stripe
      [24, 60, 13, 1],
    ]);
    px(ctx, cd, [
      [11, 63, 13, 1],   // left sole
      [24, 63, 13, 1],
    ]);
  }

  else if (style === 'heels') {
    // Main shoe
    px(ctx, c, [
      [11, 61, 10, 3],   // left toe
      [24, 61, 10, 3],   // right toe
    ]);
    // Heel spike
    px(ctx, cd, [
      [21, 62,  3, 2],   // left heel
      [34, 62,  3, 2],
    ]);
    // Strap
    px(ctx, c, [
      [12, 60, 8, 1],
      [25, 60, 8, 1],
    ]);
  }

  else if (style === 'boots') {
    // Tall boots — cover lower leg too
    px(ctx, c, [
      [13, 52, 10, 12],  // left boot
      [25, 52, 10, 12],  // right boot
    ]);
    px(ctx, cd, [
      [13, 52, 1, 12], [22, 52, 1, 12],   // left boot edges
      [25, 52, 1, 12], [34, 52, 1, 12],   // right boot edges
      [13, 63, 10, 1], [25, 63, 10, 1],   // soles
    ]);
    // Boot top cuff
    px(ctx, '#ffffff', [
      [13, 52, 10, 2],
      [25, 52, 10, 2],
    ]);
  }

  else if (style === 'sandals') {
    // Thin straps
    px(ctx, c, [
      [11, 61, 13, 2],   // left sole
      [24, 61, 13, 2],   // right sole
      [13, 59,  3, 2],   // left strap
      [18, 59,  3, 2],
      [26, 59,  3, 2],   // right strap
      [31, 59,  3, 2],
    ]);
  }

  else if (style === 'snowboots') {
    px(ctx, c, [[12, 53, 11, 11], [25, 53, 11, 11]]);
    px(ctx, '#ffffff', [[11, 51, 13, 3], [24, 51, 13, 3]]);
    px(ctx, cd, [[12, 62, 11, 2], [25, 62, 11, 2], [12, 57, 11, 1], [25, 57, 11, 1]]);
  }

  else if (style === 'hightops') {
    px(ctx, c, [[13, 55, 9, 5], [26, 55, 9, 5], [11, 60, 13, 3], [24, 60, 13, 3]]);
    px(ctx, '#ffffff', [[11, 62, 13, 1], [24, 62, 13, 1], [16, 56, 3, 1], [16, 58, 3, 1], [29, 56, 3, 1], [29, 58, 3, 1], [13, 55, 9, 1], [26, 55, 9, 1]]);
    px(ctx, cd, [[11, 63, 13, 1], [24, 63, 13, 1]]);
  }

  else if (style === 'platforms') {
    px(ctx, c, [[13, 55, 9, 3], [26, 55, 9, 3], [11, 58, 13, 3], [24, 58, 13, 3]]);
    px(ctx, cd, [[11, 61, 13, 3], [24, 61, 13, 3]]);
    px(ctx, '#BDC3C7', [[16, 56, 3, 1], [29, 56, 3, 1]]);
  }

  else if (style === 'loafers') {
    px(ctx, c, [[11, 61, 13, 3], [24, 61, 13, 3]]);
    px(ctx, cd, [[13, 61, 7, 1], [26, 61, 7, 1], [11, 63, 13, 1], [24, 63, 13, 1]]);
    px(ctx, '#F5C518', [[16, 61, 2, 1], [29, 61, 2, 1]]);
  }

  else if (style === 'slippers') {
    // Bunny slippers
    px(ctx, c, [[10, 59, 15, 5], [23, 59, 15, 5], [12, 55, 2, 4], [17, 55, 2, 4], [26, 55, 2, 4], [31, 55, 2, 4]]);
    px(ctx, '#F48FB1', [[12, 56, 1, 2], [17, 56, 1, 2], [26, 56, 1, 2], [31, 56, 1, 2], [15, 61, 2, 1], [28, 61, 2, 1]]);
    px(ctx, '#1a1a1a', [[13, 60, 1, 1], [18, 60, 1, 1], [26, 60, 1, 1], [31, 60, 1, 1]]);
  }

  else if (style === 'cowboy') {
    px(ctx, c, [[13, 50, 10, 10], [25, 50, 10, 10], [10, 60, 13, 3], [24, 60, 13, 3]]);
    px(ctx, cd, [[13, 50, 10, 1], [25, 50, 10, 1], [10, 63, 11, 1], [24, 63, 11, 1], [21, 62, 2, 2], [35, 62, 2, 2]]);
    px(ctx, '#F5C518', [[15, 53, 6, 1], [27, 53, 6, 1], [16, 55, 4, 1], [28, 55, 4, 1]]);
  }
}

// ─── ACCESSORY ────────────────────────────────────────────────────────────────
function drawAccessory(ctx) {
  [outfit.accessory, outfit.accessory2].forEach(acc => {
    if (!acc || acc === 'none') return;
    layer(ctx, `accessory_${acc}`, null, () => drawAccessoryPixels(ctx, acc));
  });
}

function drawAccessoryPixels(ctx, style) {
  if (style === 'hat') {
    px(ctx, '#2C3E50', [
      [10, 0, 28,  1],   // brim
      [14, 1, 20,  7],   // hat body
    ]);
    px(ctx, '#4a4a4a', [[14, 1, 20, 2]]); // hat highlight
    px(ctx, '#E74C3C', [[14, 5, 20, 2]]); // hat band
  }

  else if (style === 'bow') {
    px(ctx, '#E91E63', [
      [30, 0,  8,  5],   // right bow loop
      [22, 0,  8,  5],   // left bow loop
      [26, 1,  4,  3],   // center knot
    ]);
    px(ctx, '#c2185b', [
      [30, 0, 2, 5], [26, 1, 2, 1],
    ]);
  }

  else if (style === 'bag') {
    // Shoulder strap
    px(ctx, '#c2185b', [[8, 30, 2, 18]]);
    // Bag body
    px(ctx, '#E91E63', [[4, 48, 14, 12]]);
    px(ctx, '#c2185b', [
      [4, 48, 1, 12], [17, 48, 1, 12],
      [4, 59, 14, 1],
    ]);
    // Clasp
    px(ctx, '#F5C518', [[9, 51, 4, 3]]);
  }

  else if (style === 'sunglasses') {
    px(ctx, '#1a1a1a', [
      [13, 11, 8,  5],   // left lens frame
      [27, 11, 8,  5],   // right lens frame
      [21, 13, 6,  1],   // bridge
      [11, 12, 2,  2],   // left arm
      [35, 12, 2,  2],   // right arm
    ]);
    px(ctx, 'rgba(0,0,0,0.65)', [
      [14, 12, 6, 3],    // left tint
      [28, 12, 6, 3],    // right tint
    ]);
  }

  else if (style === 'crown') {
    // Band
    px(ctx, '#F5C518', [[12, 2, 24, 4]]);
    // Three points
    px(ctx, '#F5C518', [
      [12, 0, 4, 2],
      [22, 0, 4, 2],
      [32, 0, 4, 2],
    ]);
    // Band shadow
    px(ctx, '#C9A00F', [[12, 5, 24, 1]]);
    // Jewels
    px(ctx, '#E74C3C', [[16, 3, 3, 2]]);
    px(ctx, '#3498DB', [[23, 3, 3, 2]]);
    px(ctx, '#E74C3C', [[31, 3, 3, 2]]);
  }

  else if (style === 'beanie') {
    px(ctx, '#E74C3C', [[11, 1, 26, 6]]);
    px(ctx, '#C0392B', [[10, 6, 28, 3], [14, 1, 1, 5], [19, 1, 1, 5], [24, 1, 1, 5], [29, 1, 1, 5], [34, 1, 1, 5]]);
    px(ctx, '#ffffff', [[21, 0, 6, 2]]);
  }

  else if (style === 'cape') {
    px(ctx, '#C0392B', [[8, 26, 6, 2], [34, 26, 6, 2], [5, 27, 3, 31], [40, 27, 3, 31], [4, 52, 4, 6], [40, 52, 4, 6]]);
    px(ctx, '#922B21', [[5, 27, 1, 31], [42, 27, 1, 31]]);
    px(ctx, '#F1C40F', [[16, 26, 2, 2], [30, 26, 2, 2]]);
  }

  else if (style === 'mask') {
    // Hero mask with eye holes
    px(ctx, '#2C3E50', [[11, 8, 26, 1], [11, 9, 3, 7], [21, 9, 6, 7], [34, 9, 3, 7], [11, 16, 26, 1], [9, 10, 2, 2], [37, 10, 2, 2]]);
  }

  else if (style === 'headband') {
    px(ctx, '#ffffff', [[10, 5, 28, 3]]);
    px(ctx, '#E74C3C', [[10, 6, 28, 1]]);
  }

  else if (style === 'wings') {
    px(ctx, 'rgba(174,214,241,0.8)', [[1, 26, 7, 10], [40, 26, 7, 10], [2, 37, 6, 7], [40, 37, 6, 7]]);
    px(ctx, '#85C1E9', [[1, 26, 1, 10], [46, 26, 1, 10], [2, 37, 1, 7], [45, 37, 1, 7], [1, 26, 7, 1], [40, 26, 7, 1]]);
    px(ctx, '#ffffff', [[3, 29, 1, 1], [43, 30, 1, 1], [4, 40, 1, 1], [42, 41, 1, 1]]);
  }

  else if (style === 'piratehat') {
    px(ctx, '#1a1a1a', [[12, 0, 24, 4], [8, 4, 32, 3], [6, 2, 4, 3], [38, 2, 4, 3]]);
    px(ctx, '#F5C518', [[8, 6, 32, 1]]);
    px(ctx, '#ffffff', [[22, 1, 4, 2], [21, 3, 6, 1]]);
    px(ctx, '#1a1a1a', [[23, 1, 1, 1], [25, 1, 1, 1]]);
  }

  else if (style === 'eyepatch') {
    px(ctx, '#1a1a1a', [[10, 8, 28, 1], [13, 9, 8, 7]]);
  }

  else if (style === 'sash') {
    // Diagonal sash from shoulder to hip
    for (let i = 0; i < 15; i++) {
      px(ctx, '#E74C3C', [[14 + Math.round(i * 1.2), 27 + i, 4, 1]]);
      px(ctx, '#F5C518', [[14 + Math.round(i * 1.2), 27 + i, 1, 1]]);
    }
  }

  else if (style === 'helmet') {
    // Glass space helmet
    px(ctx, 'rgba(190,225,255,0.3)', [[8, 1, 32, 23]]);
    px(ctx, '#ECF0F1', [[10, 0, 28, 1], [8, 1, 2, 2], [38, 1, 2, 2], [7, 3, 1, 20], [40, 3, 1, 20], [8, 23, 2, 1], [38, 23, 2, 1]]);
    px(ctx, '#BDC3C7', [[12, 24, 24, 3]]);
    px(ctx, '#ffffff', [[11, 3, 3, 1], [10, 4, 1, 3]]);
  }

  else if (style === 'bowtie') {
    px(ctx, '#1a1a1a', [[17, 24, 5, 3], [26, 24, 5, 3]]);
    px(ctx, '#34495E', [[22, 24, 4, 3]]);
  }

  else if (style === 'pearls') {
    const ys = [27, 28, 29, 29, 28, 27];
    [15, 18, 21, 24, 27, 30].forEach((x, i) => {
      px(ctx, '#FDFEFE', [[x, ys[i], 2, 2]]);
      px(ctx, '#D5D8DC', [[x + 1, ys[i] + 1, 1, 1]]);
    });
  }

  else if (style === 'sleepmask') {
    px(ctx, '#F8BBD0', [[11, 9, 26, 7], [9, 10, 2, 2], [37, 10, 2, 2]]);
    px(ctx, '#1a1a1a', [[15, 12, 5, 1], [28, 12, 5, 1], [15, 13, 1, 1], [17, 13, 1, 1], [19, 13, 1, 1], [28, 13, 1, 1], [30, 13, 1, 1], [32, 13, 1, 1]]);
  }

  else if (style === 'flowercrown') {
    px(ctx, '#27AE60', [[10, 4, 28, 1], [15, 3, 2, 1], [27, 3, 2, 1], [21, 4, 2, 1]]);
    px(ctx, '#FF69B4', [[11, 2, 3, 3], [23, 1, 3, 3], [35, 2, 3, 3]]);
    px(ctx, '#F1C40F', [[17, 2, 3, 3], [29, 2, 3, 3], [12, 3, 1, 1], [24, 2, 1, 1], [36, 3, 1, 1]]);
    px(ctx, '#ffffff', [[18, 3, 1, 1], [30, 3, 1, 1]]);
  }
}

// ─── UNLOCKS & GOALS ─────────────────────────────────────────────────────────
// Everything in the dressing room is keyed "slot:value" (themes are "theme:id").
// You start with a basic outfit. Finishing goals unlocks items, colors and themes.
// Progress is saved in the browser (localStorage). Skin tones are always free.
const SAVE_KEY         = 'runwayStar.progress.v1';
const MAX_ACTIVE_GOALS = 3;

const STARTER_UNLOCKS = [
  'eyes:round', 'mouth:smile', 'hair:curly', 'top:blouse', 'bottom:jeans', 'shoes:sandals',
  'accessory:none',
  'haircolor:black',   'haircolor:brown',
  'topcolor:red',      'topcolor:white',
  'bottomcolor:blue',  'bottomcolor:denim', 'bottomcolor:black',
  'shoecolor:black',   'shoecolor:brown',   'shoecolor:white',
];

const STARTER_PICKS = {
  eyes: 'round', mouth: 'smile', hair: 'curly', top: 'blouse', bottom: 'jeans', shoes: 'sandals', accessory: 'none', accessory2: 'none',
  skin: 'tone1', haircolor: 'black', topcolor: 'red', bottomcolor: 'blue', shoecolor: 'black',
};
const OUTFIT_SLOTS = Object.keys(STARTER_PICKS);
let savedOutfit = null;   // outfit restored from the last visit

const DEFAULT_PICKS = { skin: 'tone1', haircolor: 'black', topcolor: 'red', bottomcolor: 'blue', shoecolor: 'black' };
const FREE_STYLE = { name: 'Free Style', emoji: '✨', blurb: 'No theme tonight. Wear whatever you like!' };
const COLOR_SLOT_LABEL = { haircolor: 'hair', topcolor: 'top', bottomcolor: 'bottom', shoecolor: 'shoes' };

// Each goal: id, text, requires (goal ids that must be done first), reward (unlock keys),
// test(c) where c = { outfit, scores, total, themeId, themeRaw } for the round just judged.
// Up to MAX_ACTIVE_GOALS available goals are shown at a time, in this order.
const GOALS = [
  { id: 'first-walk',  requires: [],              text: 'Finish a runway walk',
    reward: ['accessory:sunglasses', 'mouth:grin', 'hair:short', 'topcolor:blue'],
    test: c => true },
  { id: 'shades',      requires: ['first-walk'],  text: 'Score 19+ while wearing sunglasses',
    reward: ['theme:beach', 'bottom:shorts', 'top:crop', 'topcolor:yellow', 'shoecolor:pink'],
    test: c => c.total >= 19 && wears(c.outfit, 'sunglasses') },
  { id: 'judge-fans',  requires: ['first-walk'],  text: 'Get 4+ from all three judges',
    reward: ['eyes:cat', 'eyes:star', 'hair:bun', 'hair:long', 'haircolor:blonde', 'haircolor:red'],
    test: c => Object.values(c.scores).every(v => v >= 4) },
  { id: 'beach-pro', theme: 'beach',   requires: ['shades'],      text: 'Score 23+ on Beach Day',
    reward: ['theme:street', 'shoes:sneakers', 'top:tshirt', 'accessory:hat', 'topcolor:black', 'shoecolor:blue'],
    test: c => c.themeId === 'beach' && c.total >= 23 },
  { id: 'on-theme',    requires: ['shades'],      text: 'Get "Nailed it" in a themed round',
    reward: ['eyes:sleepy', 'mouth:pout', 'topcolor:green', 'bottomcolor:red', 'bottomcolor:green'],
    test: c => !!c.themeId && c.themeRaw >= 5 },
  { id: 'color-crazy', requires: ['judge-fans'],  text: 'Wear four different colors (hair, top, bottom and shoes)',
    reward: ['mouth:tongue', 'topcolor:purple', 'bottomcolor:yellow', 'bottomcolor:purple', 'haircolor:blue', 'haircolor:purple'],
    test: c => new Set([c.outfit.haircolor, c.outfit.topcolor, c.outfit.bottomcolor, c.outfit.shoecolor]).size === 4 },
  { id: 'street-star', theme: 'street', requires: ['beach-pro'],   text: 'Score 23+ on Street Style',
    reward: ['theme:garden', 'feature:accessory2', 'bottom:skirt', 'bottom:dress', 'accessory:bow', 'topcolor:pink', 'bottomcolor:pink', 'haircolor:pink'],
    test: c => c.themeId === 'street' && c.total >= 23 },
  { id: 'garden-queen', theme: 'garden', requires: ['street-star'], text: 'Score 21+ on Garden Party',
    reward: ['theme:gala', 'shoes:heels', 'top:jacket', 'accessory:crown', 'shoecolor:red', 'shoecolor:gold'],
    test: c => c.themeId === 'garden' && c.total >= 21 },
  { id: 'gala-star', theme: 'gala',   requires: ['garden-queen'], text: 'Score 25+ on Royal Gala',
    reward: ['theme:rainy', 'shoes:boots', 'accessory:bag'],
    test: c => c.themeId === 'gala' && c.total >= 25 },
  // After the gala, two branches open: a cozy one (Winter, Fairy, Pajama, Festival)
  // and a bold one (Superhero, Sports, Pirate, Space, Glam, Black Tie).
  { id: 'rainy-star',  requires: ['gala-star'],   theme: 'rainy',     min: 26,
    reward: ['theme:winter', 'top:puffer', 'bottom:leggings', 'shoes:snowboots', 'accessory:beanie'] },
  { id: 'hero-time',   requires: ['gala-star'],   text: 'Score 25+ wearing two accessories',
    reward: ['theme:superhero', 'top:bodysuit', 'accessory:cape', 'accessory:mask'],
    test: c => c.total >= 25 && c.outfit.accessory !== 'none' && c.outfit.accessory2 !== 'none' },
  { id: 'winter-star', requires: ['rainy-star'],  theme: 'winter',    min: 22,
    reward: ['theme:fairy', 'bottom:tulle', 'accessory:wings', 'haircolor:petal'] },
  { id: 'hero-star',   requires: ['hero-time'],   theme: 'superhero', min: 23,
    reward: ['theme:sports', 'top:jersey', 'bottom:track', 'shoes:hightops', 'accessory:headband'] },
  { id: 'fairy-star',  requires: ['winter-star'], theme: 'fairy',     min: 22,
    reward: ['theme:pajama', 'top:robe', 'bottom:pajamas', 'shoes:slippers', 'accessory:sleepmask'] },
  { id: 'sports-star', requires: ['hero-star'],   theme: 'sports',    min: 22,
    reward: ['theme:pirate', 'top:striped', 'accessory:piratehat', 'accessory:eyepatch', 'accessory:sash'] },
  { id: 'pajama-star', requires: ['fairy-star'],  theme: 'pajama',    min: 20,
    reward: ['theme:festival', 'top:tiedye', 'bottom:flowy', 'shoes:cowboy', 'accessory:flowercrown'] },
  { id: 'pirate-star', requires: ['sports-star'], theme: 'pirate',    min: 23,
    reward: ['theme:space', 'bottom:jumpsuit', 'eyes:visor', 'accessory:helmet', 'topcolor:silver', 'bottomcolor:silver', 'shoecolor:silver', 'topcolor:neon', 'bottomcolor:neon', 'shoecolor:neon'] },
  { id: 'festival-star', requires: ['pajama-star'], theme: 'festival', min: 21,
    reward: [] },
  { id: 'space-star',  requires: ['pirate-star'], theme: 'space',     min: 22,
    reward: ['theme:glam', 'top:leather', 'bottom:leatherpants', 'shoes:platforms', 'hair:spiky'] },
  { id: 'glam-star',   requires: ['space-star'],  theme: 'glam',      min: 23,
    reward: ['theme:blacktie', 'top:blazer', 'bottom:slacks', 'shoes:loafers', 'accessory:bowtie', 'accessory:pearls'] },
  { id: 'blacktie-star', requires: ['glam-star'], theme: 'blacktie',  min: 21,
    reward: [] },
  { id: 'perfect-run', requires: ['gala-star'],   text: 'Score a perfect 30 in a themed round',
    reward: [],
    test: c => !!c.themeId && c.total >= 30 },
];

// "Score N+ on <theme>" goals just list theme and min; fill in their text and test here
GOALS.forEach(g => {
  if (!g.theme || g.test) return;
  Object.defineProperty(g, 'text', {
    get() { const t = THEMES.find(t => t.id === g.theme); return `Score ${g.min}+ on ${t ? t.name : g.theme}`; },
    enumerable: true,
  });
  g.test = c => c.themeId === g.theme && c.total >= g.min;
});

let progress = { unlocked: new Set(STARTER_UNLOCKS), done: new Set() };
let newlyUnlocked = new Set();   // gets a sparkle in the dressing room until picked
let resetArmed = false;

function loadProgress() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    (data.unlocked || []).forEach(k => progress.unlocked.add(k));
    (data.done || []).forEach(id => { if (GOALS.some(g => g.id === id)) progress.done.add(id); });
    if (data.outfit && typeof data.outfit === 'object') savedOutfit = data.outfit;
    if (typeof data.theme === 'string') savedThemeId = data.theme;
  } catch (e) { /* storage blocked or bad data: just start fresh */ }
}

function saveProgress() {
  try {
    const current = {};
    OUTFIT_SLOTS.forEach(slot => { if (outfit[slot]) current[slot] = outfit[slot]; });
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      unlocked: [...progress.unlocked], done: [...progress.done], outfit: current,
      theme: currentTheme ? currentTheme.id : '',
    }));
  } catch (e) { /* ignore */ }
}

function isUnlocked(slot, value) {
  return slot === 'skin' || progress.unlocked.has(`${slot}:${value}`);
}

// True if the outfit has this accessory in either accessory slot
function wears(o, x) { return o.accessory === x || o.accessory2 === x; }

function hasSecondAccessory() { return progress.unlocked.has('feature:accessory2'); }

function unlockedThemes() {
  return THEMES.filter(t => progress.unlocked.has(`theme:${t.id}`));
}

function activeGoals() {
  return GOALS
    .filter(g => !progress.done.has(g.id) && g.requires.every(r => progress.done.has(r)))
    .slice(0, MAX_ACTIVE_GOALS);
}

function labelFor(key) {
  if (key === 'feature:accessory2') return 'Wear two accessories';
  if (key.startsWith('theme:')) {
    const t = THEMES.find(t => t.id === key.slice(6));
    return t ? `${t.name} theme` : key;
  }
  const [slot, value] = key.split(':');
  const el = document.querySelector(`[data-slot="${slot}"][data-value="${value}"]`);
  if (!el) return key;
  if (COLOR_SLOT_LABEL[slot]) return `${el.getAttribute('title') || value} ${COLOR_SLOT_LABEL[slot]}`;
  return el.dataset.label || el.textContent.trim();
}

function lockHint(slot, value) {
  const key = `${slot}:${value}`;
  const goal = GOALS.find(g => g.reward.includes(key));
  if (!goal) return 'Locked.';
  const available = goal.requires.every(r => progress.done.has(r));
  return `🔒 Locked. Unlock it with the goal: ${goal.text}.` + (available ? '' : ' (Finish earlier goals first.)');
}

function refreshLocks() {
  const reach = new Set(activeGoals().flatMap(g => g.reward));
  document.querySelectorAll('[data-slot]').forEach(el => {
    const { slot, value } = el.dataset;
    const locked = !isUnlocked(slot, value);
    el.classList.toggle('locked', locked);
    el.classList.toggle('is-new', !locked && newlyUnlocked.has(`${slot}:${value}`));
    if (locked) el.setAttribute('aria-disabled', 'true'); else el.removeAttribute('aria-disabled');
    // Locked items stay hidden until one of your open goals would unlock them
    el.hidden = locked && !reach.has(`${slot}:${value}`);
  });
  syncAccessoryUI();
  refreshSelectorUI();
}

// Highlight every worn accessory and explain the second slot
function syncAccessoryUI() {
  const none = outfit.accessory === 'none' && outfit.accessory2 === 'none';
  document.querySelectorAll('[data-slot="accessory"]').forEach(el => {
    const v = el.dataset.value;
    const on = v === 'none' ? none : (v === outfit.accessory || v === outfit.accessory2);
    el.classList.toggle('selected', on);
    el.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const note = document.getElementById('accessory-note');
  if (!note) return;
  if (hasSecondAccessory()) {
    note.textContent = 'You can wear two accessories. Tap one again to take it off.';
  } else {
    const goal = GOALS.find(g => g.reward.includes('feature:accessory2'));
    note.textContent = goal ? `🔒 Wearing two accessories unlocks with the goal: ${goal.text}.` : '';
  }
}

// Pick or remove an accessory. With the second slot unlocked you can wear two.
function toggleAccessory(value) {
  const hintEl = document.getElementById('hint-msg');
  if (value === 'none') {
    outfit.accessory = 'none'; outfit.accessory2 = 'none';
  } else if (!hasSecondAccessory()) {
    outfit.accessory = value; outfit.accessory2 = 'none';
  } else if (value === outfit.accessory) {
    outfit.accessory = outfit.accessory2; outfit.accessory2 = 'none';
  } else if (value === outfit.accessory2) {
    outfit.accessory2 = 'none';
  } else if (outfit.accessory === 'none') {
    outfit.accessory = value;
  } else if (outfit.accessory2 === 'none') {
    outfit.accessory2 = value;
  } else {
    outfit.accessory = outfit.accessory2; outfit.accessory2 = value;
    hintEl.textContent = 'You can wear two accessories, so the oldest one came off.';
  }
  syncAccessoryUI();
  drawCharacter('character');
}

function summarize(keys, max = 4) {
  const labels = keys.map(labelFor);
  return labels.length > max ? `${labels.slice(0, max).join(', ')} +${labels.length - max} more` : labels.join(', ');
}

function renderGoals() {
  const list = document.getElementById('goals-list');
  list.textContent = '';
  const goals = activeGoals();
  if (!goals.length) {
    const li = document.createElement('li');
    li.className = 'goal-done';
    li.textContent = 'All goals complete! You unlocked everything. 🎉';
    list.appendChild(li);
    return;
  }
  goals.forEach(g => {
    const li = document.createElement('li');
    const text = document.createElement('span');
    text.className = 'goal-text';
    text.textContent = g.text;
    li.appendChild(text);
    if (g.reward.length) {
      const reward = document.createElement('span');
      reward.className = 'goal-reward';
      reward.textContent = `Unlocks: ${summarize(g.reward)}`;
      li.appendChild(reward);
    }
    list.appendChild(li);
  });
}

function renderUnlockResult(completed, gained) {
  const box = document.getElementById('unlock-result');
  box.textContent = '';
  if (!completed.length) return;
  const head = document.createElement('div');
  head.className = 'unlock-head';
  head.textContent = completed.length > 1 ? '🎉 Goals complete!' : '🎉 Goal complete!';
  box.appendChild(head);
  completed.forEach(g => {
    const line = document.createElement('div');
    line.className = 'unlock-goal';
    line.textContent = g.text;
    box.appendChild(line);
  });
  if (gained.length) {
    const un = document.createElement('div');
    un.className = 'unlock-items';
    un.textContent = `Unlocked: ${summarize(gained, 8)}`;
    box.appendChild(un);
  }
  if (gained.some(k => k.startsWith('theme:')) && currentTheme) {
    const nx = document.createElement('div');
    nx.className = 'unlock-items';
    nx.textContent = `Next round: ${currentTheme.emoji} ${currentTheme.name}. You can change it in the dressing room.`;
    box.appendChild(nx);
  }
}

// Called once the judges have scored the round
function processGoals(scores, total) {
  const ctx = {
    outfit: { ...outfit }, scores, total,
    themeId: currentTheme ? currentTheme.id : null,
    themeRaw: themeEval.raw,
  };
  const completed = activeGoals().filter(g => g.test(ctx));
  const gained = [];
  completed.forEach(g => {
    progress.done.add(g.id);
    g.reward.forEach(k => {
      if (!progress.unlocked.has(k)) { progress.unlocked.add(k); newlyUnlocked.add(k); gained.push(k); }
    });
  });
  const newTheme = gained.filter(k => k.startsWith('theme:')).pop();
  if (newTheme) setTheme(newTheme.slice(6));     // jump straight to the theme you just unlocked
  saveProgress();
  renderUnlockResult(completed, gained);
  return completed;
}

function refreshProgressUI() {
  refreshLocks();
  renderGoals();
}

// Two-tap reset so there is no pop-up dialog
function onResetClick() {
  const btn = document.getElementById('btn-reset');
  if (!resetArmed) {
    resetArmed = true;
    btn.textContent = 'Tap again to erase progress';
    btn.classList.add('armed');
    setTimeout(() => { resetArmed = false; btn.textContent = 'Reset progress'; btn.classList.remove('armed'); }, 3000);
    return;
  }
  resetArmed = false;
  btn.textContent = 'Reset progress';
  btn.classList.remove('armed');
  progress = { unlocked: new Set(STARTER_UNLOCKS), done: new Set() };
  newlyUnlocked = new Set();
  resetOutfitSelections();
  setTheme('');
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  refreshProgressUI();
  document.getElementById('hint-msg').textContent = 'Progress reset. Back to the basics!';
}

// ─── OUTFIT STATE / UI ───────────────────────────────────────────────────────
const REQUIRED = ['eyes', 'mouth', 'hair', 'top', 'bottom', 'shoes'];

document.addEventListener('DOMContentLoaded', () => {
  loadProgress();
  buildSelector();
  applyOutfit(savedOutfit || STARTER_PICKS);
  initTheme();
  document.getElementById('theme-select').addEventListener('change', e => setTheme(e.target.value));
  refreshProgressUI();

  document.querySelectorAll('[data-slot]').forEach(el => {
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.addEventListener('click', () => chooseOption(el));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        chooseOption(el);
      }
    });
  });
  document.getElementById('btn-reset').addEventListener('click', onResetClick);
});

// A click on any option: locked ones just explain how to unlock them
function chooseOption(el) {
  const { slot, value } = el.dataset;
  const hintEl = document.getElementById('hint-msg');
  if (!isUnlocked(slot, value)) {
    hintEl.textContent = lockHint(slot, value);
    return;
  }
  hintEl.textContent = '';
  newlyUnlocked.delete(`${slot}:${value}`);
  el.classList.remove('is-new');
  if (slot === 'accessory') toggleAccessory(value);
  else selectOption(slot, value);
  refreshSelectorUI();
  saveProgress();
}

// Put an outfit on the character. Anything missing or still locked falls back to the
// starter pick, so every slot always has something selected.
function applyOutfit(picks) {
  document.querySelectorAll('.item-btn.selected, .swatch.selected').forEach(el => el.classList.remove('selected'));
  OUTFIT_SLOTS.forEach(slot => {
    const want = picks[slot];
    let valid;
    if (slot === 'accessory2') {
      valid = want && want !== 'none' && hasSecondAccessory() && outfit.accessory !== 'none' &&
        want !== outfit.accessory && isUnlocked('accessory', want);
    } else {
      valid = want && isUnlocked(slot, want) &&
        document.querySelector(`[data-slot="${slot}"][data-value="${want}"]`);
    }
    selectOption(slot, valid ? want : STARTER_PICKS[slot]);
  });
}

// Back to the basic starting outfit
function resetOutfitSelections() {
  applyOutfit(STARTER_PICKS);
}

function selectOption(slot, value) {
  outfit[slot] = value;
  if (slot === 'accessory' || slot === 'accessory2') {
    syncAccessoryUI();
    drawCharacter('character');
    return;
  }
  document.querySelectorAll(`[data-slot="${slot}"]`).forEach(e => {
    e.classList.remove('selected');
    e.setAttribute('aria-pressed', 'false');
  });
  const t = document.querySelector(`[data-slot="${slot}"][data-value="${value}"]`);
  if (t) { t.classList.add('selected'); t.setAttribute('aria-pressed', 'true'); }
  drawCharacter('character');
  refreshThumbs();
}

// ─── RUNWAY ───────────────────────────────────────────────────────────────────
let runwayTimers = [];
function clearRunwayTimers() {
  runwayTimers.forEach(clearTimeout);
  runwayTimers = [];
}

function goToRunway() {
  const missing = REQUIRED.filter(s => !outfit[s]);
  const hintEl = document.getElementById('hint-msg');
  if (missing.length > 0) {
    hintEl.textContent = `Please choose: ${missing.join(', ')}`;
    return;
  }
  hintEl.textContent = '';
  showScreen('screen-runway');
  drawCharacter('runway-character');

  const wrap = document.getElementById('runway-char-wrap');
  const char = document.getElementById('runway-character');
  let done = false;

  // Move to the judges the moment the walk animation ends
  const finish = () => {
    if (done) return;
    done = true;
    wrap.removeEventListener('animationend', onEnd);
    clearRunwayTimers();
    goToJudges();
  };
  const onEnd = e => {
    if (e.target === wrap && e.animationName === 'walkRunway') finish();
  };
  wrap.addEventListener('animationend', onEnd);

  clearRunwayTimers();
  runwayTimers.push(setTimeout(() => {
    wrap.classList.add('walking');
    char.classList.add('walking');
  }, 600));
  // Safety net in case the animation never fires (reduced motion, background tab)
  runwayTimers.push(setTimeout(finish, 6000));
}

// ─── JUDGES ───────────────────────────────────────────────────────────────────
const JUDGES = {
  coco: {
    low:  ["Mon dieu… this is a catastrophe.", "I have seen better outfits on a scarecrow. Hmph.", "Zis color makes my eyes water. Non non non.", "I weep for fashion today. Truly I weep."],
    mid:  ["Eez… acceptable. But only barely, darling.", "Some potential, but you need more drama!", "A safe choice. Too safe. Fashion is about risks!", "I have seen worse. That is the best I can say."],
    high: ["Oh là là! Now ZIS is fashion! Magnifique!", "I am moved. I am inspired. Coco's seal of approval!", "Superbe! The judges — well, I — am very impressed!", "Finally, someone understands style! Brava, chérie!"],
  },
  rose: {
    low:  ["Oh sweetheart, every great designer has bad days!", "It's a little unusual, dear, but Grandma Rose still loves you!", "Hmm, not quite my cup of tea, but you tried so hard!", "Oh honey, maybe try some brighter colors next time!"],
    mid:  ["Oh that's lovely dear! Grandma Rose thinks you look wonderful!", "Very nice! I especially love the color choice, sweetheart!", "You look so adorable! Grandma is so proud!", "What a darling outfit! I want to pinch your cheeks!"],
    high: ["Oh my goodness! You look absolutely GORGEOUS, my dear!", "I'm crying actual tears of joy! You're a fashion star!", "TEN out of ten! Grandma Rose gives you extra cookies tonight!", "The MOST beautiful outfit I have ever seen! My heart is full!"],
  },
  zach: {
    low:  ["Bruh. No. Just… no. That's not it chief.", "Lowkey kinda a yikes situation ngl.", "I ain't gonna lie, that's giving off-season clearance rack vibes.", "Big RIP to that fit fam. We don't talk about this one."],
    mid:  ["Okay okay, it's decent. Not fire but not terrible.", "Lowkey has some potential. A few tweaks and we're cooking.", "It's giving mid-tier energy but like… the good kind?", "I've seen worse. You got some drip instincts, keep it up."],
    high: ["YO. That fit is absolutely BUSSIN no cap!", "Sheeeesh! That drip is INSANE. W outfit, full send!", "Okay bestie WENT OFF. That's a certified banger look!", "Big W. This is giving main character energy and I am HERE for it!"],
  },
};

const TOTAL_MSGS = [
  { min: 0,  max: 14, msg: "Keep practicing — every star starts somewhere! 🌱" },
  { min: 15, max: 21, msg: "Not bad! You've got the fashion spark! ✨" },
  { min: 22, max: 29, msg: "Great job! You're a rising runway star! 🌟" },
  { min: 30, max: 30, msg: "PERFECT SCORE! You are a true Runway Star! 👑✨" },
];

function goToJudges() {
  evaluateTheme();
  showScreen('screen-judges');
  ['coco','rose','zach'].forEach(j => {
    document.getElementById(`judge-${j}`).classList.remove('revealed');
    document.getElementById(`score-${j}`).textContent = '—';
    document.getElementById(`quote-${j}`).textContent = '';
  });
  document.getElementById('total-wrap').style.display = 'none';

  const scores = {};
  [500, 1400, 2300].forEach((delay, i) => {
    setTimeout(() => revealJudge(['coco','rose','zach'][i], scores), delay);
  });
  setTimeout(() => showTotal(scores), 3600);
}

// ─── ROUND THEMES ─────────────────────────────────────────────────────────────
// A theme is picked each round and shown up front. Each rule is
// [points, text, test(outfit)]. The summed points become a shared bonus for all
// judges (capped to THEME_MAX_BONUS / THEME_MAX_PENALTY) so judge taste still matters.
const THEME_MAX_BONUS   = 2;
const THEME_MAX_PENALTY = -2;
const BRIGHT_COLORS = ['red', 'yellow', 'pink', 'green', 'blue', 'purple'];

const THEMES = [
  {
    id: 'beach', name: 'Beach Day', emoji: '🏖️',
    blurb: 'Sun, sand and good vibes. Dress for the shore!',
    rules: [
      [+2, 'Sandals are perfect for the beach.',  o => o.shoes === 'sandals'],
      [+2, 'Shorts are totally beach ready.',     o => o.bottom === 'shorts'],
      [+1, 'Sunglasses for the sunshine.',        o => wears(o, 'sunglasses')],
      [+1, 'Bright colors fit the sunny mood.',   o => BRIGHT_COLORS.includes(o.topcolor)],
      [-2, 'Boots at the beach? Sandy socks ahead.', o => o.shoes === 'boots'],
      [-1, 'A jacket in the sun?',                o => o.top === 'jacket'],
    ],
  },
  {
    id: 'gala', name: 'Royal Gala', emoji: '👑',
    blurb: 'A night of glamour. Show up like royalty!',
    rules: [
      [+2, 'A dress is made for a gala.',         o => o.bottom === 'dress'],
      [+2, 'Heels complete the royal look.',      o => o.shoes === 'heels'],
      [+2, 'A crown for the gala? Of course.',    o => wears(o, 'crown')],
      [+1, 'The jacket looks very formal.',       o => o.top === 'jacket'],
      [-2, 'Sneakers at a royal gala?',           o => o.shoes === 'sneakers'],
      [-1, 'A t-shirt is too casual for tonight.', o => o.top === 'tshirt'],
    ],
  },
  {
    id: 'street', name: 'Street Style', emoji: '🛹',
    blurb: 'Casual, cool and effortless. Own the sidewalk!',
    rules: [
      [+2, 'Sneakers are street style staples.',  o => o.shoes === 'sneakers'],
      [+2, 'Jeans fit the street look perfectly.', o => o.bottom === 'jeans'],
      [+1, 'A tee keeps it easygoing.',           o => o.top === 'tshirt'],
      [+1, 'The hat adds attitude.',              o => wears(o, 'hat')],
      [+1, 'A neutral palette looks effortless.', o => NEUTRALS.includes(o.topcolor) || NEUTRALS.includes(o.bottomcolor)],
      [-2, 'Heels are too dressy for the street.', o => o.shoes === 'heels'],
      [-1, 'A crown is a bit much for the sidewalk.', o => wears(o, 'crown')],
    ],
  },
  {
    id: 'garden', name: 'Garden Party', emoji: '🌷',
    blurb: 'Soft, sweet and springy. Think flowers and sunshine!',
    rules: [
      [+2, 'A blouse is lovely for a garden party.', o => o.top === 'blouse'],
      [+2, 'The dress is perfect for the garden.', o => o.bottom === 'dress'],
      [+1, 'A skirt twirls nicely on the lawn.',  o => o.bottom === 'skirt'],
      [+2, 'The hair bow is so sweet.',           o => wears(o, 'bow')],
      [+1, 'Soft colors fit the garden.',         o => SOFT_COLORS.includes(o.topcolor)],
      [-1, 'The jacket is too heavy for spring.', o => o.top === 'jacket'],
      [-1, 'Boots will sink into the flower beds.', o => o.shoes === 'boots'],
    ],
  },
  {
    id: 'rainy', name: 'Rainy Day', emoji: '🌧️',
    blurb: 'Gray skies ahead. Look great and stay dry!',
    rules: [
      [+2, 'Boots are smart for puddles.',        o => o.shoes === 'boots'],
      [+2, 'A jacket keeps the rain off.',        o => o.top === 'jacket'],
      [+1, 'The hat helps with the drizzle.',     o => wears(o, 'hat')],
      [+1, 'Jeans stay warm and sturdy.',         o => o.bottom === 'jeans'],
      [-2, 'Sandals in the rain? Soggy toes.',    o => o.shoes === 'sandals'],
      [-1, 'Shorts will get chilly and wet.',     o => o.bottom === 'shorts'],
      [-1, 'A crop top will not keep you dry.',   o => o.top === 'crop'],
    ],
  },
  {
    id: 'winter', name: 'Winter Wonderland', emoji: '⛄',
    blurb: 'Snow is falling. Bundle up and look cozy!',
    rules: [
      [+2, 'A puffer coat is perfect for the snow.', o => o.top === 'puffer'],
      [+2, 'Snow boots, smart and warm.',          o => o.shoes === 'snowboots'],
      [+1, 'The beanie keeps your ears toasty.',   o => wears(o, 'beanie')],
      [+1, 'Leggings are cozy under a coat.',      o => o.bottom === 'leggings'],
      [+1, 'Icy colors look like fresh snow.',     o => ['white', 'blue', 'silver', 'purple'].includes(o.topcolor)],
      [-2, 'Sandals in the snow? Brrr.',           o => o.shoes === 'sandals'],
      [-1, 'Shorts in winter? Chilly!',            o => o.bottom === 'shorts'],
      [-1, 'A crop top will not keep you warm.',   o => o.top === 'crop'],
    ],
  },
  {
    id: 'superhero', name: 'Superhero Night', emoji: '🦸',
    blurb: 'Bold, brave and ready to save the day!',
    rules: [
      [+2, 'A cape! Ready to fly.',                o => wears(o, 'cape')],
      [+2, 'The hero suit means business.',        o => o.top === 'bodysuit'],
      [+1, 'A mask keeps your secret identity.',   o => wears(o, 'mask')],
      [+1, 'Leggings let you move fast.',          o => o.bottom === 'leggings'],
      [+1, 'Bold hero colors!',                    o => ['red', 'blue', 'yellow'].includes(o.topcolor)],
      [-1, 'A bathrobe is not hero gear.',         o => o.top === 'robe'],
      [-1, 'Bunny slippers will not catch villains.', o => o.shoes === 'slippers'],
    ],
  },
  {
    id: 'sports', name: 'Sports Day', emoji: '🏀',
    blurb: 'Team spirit time. Dress to play!',
    rules: [
      [+2, 'The jersey shows team spirit.',        o => o.top === 'jersey'],
      [+2, 'High-tops are made for the court.',    o => o.shoes === 'hightops'],
      [+1, 'Sneakers are ready to run.',           o => o.shoes === 'sneakers'],
      [+1, 'Track pants for warmups.',             o => o.bottom === 'track'],
      [+1, 'Shorts for the big game.',             o => o.bottom === 'shorts'],
      [+1, 'A headband catches the sweat.',        o => wears(o, 'headband')],
      [-2, 'Heels on the court? Ouch.',            o => o.shoes === 'heels'],
      [-1, 'A dress is hard to play in.',          o => o.bottom === 'dress'],
    ],
  },
  {
    id: 'fairy', name: 'Fairy Tale', emoji: '🧚',
    blurb: 'Once upon a time... Sparkle like magic!',
    rules: [
      [+2, 'Fairy wings! Pure magic.',             o => wears(o, 'wings')],
      [+2, 'The tulle skirt is so twirly.',        o => o.bottom === 'tulle'],
      [+1, 'Star eyes sparkle like fairy dust.',   o => o.eyes === 'star'],
      [+1, 'Petal pink hair, like a flower fairy.', o => o.haircolor === 'petal'],
      [+1, 'A crown fit for a fairy princess.',    o => wears(o, 'crown')],
      [-1, 'Track pants are not very magical.',    o => o.bottom === 'track'],
      [-1, 'Sneakers do not fit the storybook.',   o => o.shoes === 'sneakers'],
    ],
  },
  {
    id: 'pirate', name: 'Pirate Adventure', emoji: '🏴‍☠️',
    blurb: 'Ahoy! Set sail in swashbuckling style!',
    rules: [
      [+2, 'A proper pirate hat. Arr!',            o => wears(o, 'piratehat')],
      [+2, 'Stripes, just like a sailor.',         o => o.top === 'striped'],
      [+1, 'The eyepatch is very piratey.',        o => wears(o, 'eyepatch')],
      [+1, 'A sash for your treasure map.',        o => wears(o, 'sash')],
      [+1, 'Boots for walking the plank.',         o => o.shoes === 'boots'],
      [-1, 'Heels on a ship deck? Slippery.',      o => o.shoes === 'heels'],
      [-1, 'Pirates did not have sunglasses.',     o => wears(o, 'sunglasses')],
    ],
  },
  {
    id: 'space', name: 'Space Explorer', emoji: '🚀',
    blurb: 'Blast off! Dress for zero gravity.',
    rules: [
      [+2, 'A space helmet! Ready for liftoff.',   o => wears(o, 'helmet')],
      [+2, 'Space pants for a moonwalk.',          o => o.bottom === 'jumpsuit'],
      [+1, 'The visor sees the stars.',            o => o.eyes === 'visor'],
      [+1, 'Shiny space colors.',                  o => ['silver', 'neon', 'white'].includes(o.topcolor)],
      [+1, 'Boots for walking on the moon.',       o => o.shoes === 'boots' || o.shoes === 'snowboots'],
      [-1, 'Sandals in space? Cold toes.',         o => o.shoes === 'sandals'],
      [-1, 'Flowers do not grow on the moon.',     o => wears(o, 'flowercrown')],
    ],
  },
  {
    id: 'glam', name: 'Glam Rock', emoji: '🎸',
    blurb: 'Loud, proud and a little bit leather!',
    rules: [
      [+2, 'The leather jacket rocks.',            o => o.top === 'leather'],
      [+2, 'Leather pants, very rock and roll.',   o => o.bottom === 'leatherpants'],
      [+1, 'Platforms make you taller on stage.',  o => o.shoes === 'platforms'],
      [+1, 'Spiky hair! Total rock star.',         o => o.hair === 'spiky'],
      [+1, 'Black and neon look loud.',            o => ['black', 'neon'].includes(o.topcolor)],
      [-1, 'A blouse is too sweet for a rock show.', o => o.top === 'blouse'],
      [-1, 'The bow is a bit too cute.',           o => wears(o, 'bow')],
    ],
  },
  {
    id: 'blacktie', name: 'Black Tie Dinner', emoji: '🍽️',
    blurb: 'A fancy dinner. Formal and elegant!',
    rules: [
      [+2, 'A blazer is perfect for dinner.',      o => o.top === 'blazer'],
      [+2, 'Slacks look sharp and formal.',        o => o.bottom === 'slacks'],
      [+1, 'Loafers are classic dinner shoes.',    o => o.shoes === 'loafers'],
      [+1, 'A bow tie is very black tie.',         o => wears(o, 'bowtie')],
      [+1, 'Pearls are so elegant.',               o => wears(o, 'pearls')],
      [+1, 'Heels are dressy enough.',             o => o.shoes === 'heels'],
      [-2, 'Sneakers at a fancy dinner?',          o => o.shoes === 'sneakers' || o.shoes === 'hightops'],
      [-1, 'A jersey is too casual.',              o => o.top === 'jersey' || o.top === 'tshirt'],
    ],
  },
  {
    id: 'pajama', name: 'Pajama Party', emoji: '🧸',
    blurb: 'Comfy, cozy and a little bit silly!',
    rules: [
      [+2, 'A robe! Cozy as can be.',              o => o.top === 'robe'],
      [+2, 'PJ pants are perfect.',                o => o.bottom === 'pajamas'],
      [+2, 'Bunny slippers! So cute.',             o => o.shoes === 'slippers'],
      [+1, 'A sleep mask for beauty sleep.',       o => wears(o, 'sleepmask')],
      [+1, 'Sleepy eyes fit the mood.',            o => o.eyes === 'sleepy'],
      [-1, 'Heels at a sleepover?',                o => o.shoes === 'heels'],
      [-1, 'A jacket is too stiff for bedtime.',   o => o.top === 'jacket' || o.top === 'blazer'],
    ],
  },
  {
    id: 'festival', name: 'Music Festival', emoji: '🎪',
    blurb: 'Free spirit, good tunes and sunshine!',
    rules: [
      [+2, 'A flower crown is festival magic.',    o => wears(o, 'flowercrown')],
      [+2, 'Tie-dye, so groovy.',                  o => o.top === 'tiedye'],
      [+1, 'A flowy skirt for dancing.',           o => o.bottom === 'flowy'],
      [+1, 'Cowboy boots for the fields.',         o => o.shoes === 'cowboy'],
      [+1, 'Sunglasses for the main stage.',       o => wears(o, 'sunglasses')],
      [-1, 'Slacks are too stiff for a festival.', o => o.bottom === 'slacks'],
      [-1, 'A blazer in a field?',                 o => o.top === 'blazer'],
    ],
  },
];

let currentTheme = null;
let themeEval    = { bonus: 0, notes: [], raw: 0 };

let savedThemeId;   // theme chosen on the last visit (undefined = none saved)

// Themes in the order you unlock them
function themesInUnlockOrder() {
  const order = [];
  GOALS.forEach(goal => goal.reward.forEach(k => { if (k.startsWith('theme:')) order.push(k.slice(6)); }));
  return order.map(id => THEMES.find(t => t.id === id)).filter(t => t && progress.unlocked.has(`theme:${t.id}`));
}

// Fill the theme dropdown: Free Style plus every unlocked theme
function renderThemeSelect() {
  const sel = document.getElementById('theme-select');
  if (!sel) return;
  const opts = [{ id: '', label: `${FREE_STYLE.emoji} ${FREE_STYLE.name}` }]
    .concat(themesInUnlockOrder().map(t => ({
      id: t.id, label: `${t.emoji} ${t.name}${newlyUnlocked.has(`theme:${t.id}`) ? ' (new!)' : ''}`,
    })));
  sel.innerHTML = '';
  opts.forEach(o => { const op = document.createElement('option'); op.value = o.id; op.textContent = o.label; sel.appendChild(op); });
  sel.value = currentTheme ? currentTheme.id : '';
}

// Set the round's theme ('' or null = Free Style) and update the banner
function setTheme(id) {
  const t = id ? THEMES.find(t => t.id === id) : null;
  currentTheme = t && progress.unlocked.has(`theme:${t.id}`) ? t : null;
  if (currentTheme) newlyUnlocked.delete(`theme:${currentTheme.id}`);
  const shown = currentTheme || FREE_STYLE;
  document.getElementById('theme-emoji').textContent = shown.emoji;
  document.getElementById('theme-blurb').textContent = shown.blurb;
  document.getElementById('runway-theme').textContent = `Theme: ${shown.name} ${shown.emoji}`;
  renderThemeSelect();
  saveProgress();
}

// On load: the saved choice if it's still unlocked, otherwise the newest theme
function initTheme() {
  const open = themesInUnlockOrder();
  if (savedThemeId !== undefined && (savedThemeId === '' || open.some(t => t.id === savedThemeId))) setTheme(savedThemeId);
  else setTheme(open.length ? open[open.length - 1].id : '');
}

function evaluateTheme() {
  if (!currentTheme) {                       // Free Style: no theme bonus
    themeEval = { bonus: 0, notes: [], raw: 0 };
    return themeEval;
  }
  const hits = currentTheme.rules
    .filter(([, , test]) => test(outfit))
    .map(([pts, text]) => [pts, text]);
  const raw = hits.reduce((sum, h) => sum + h[0], 0);
  const bonus = Math.max(THEME_MAX_PENALTY, Math.min(THEME_MAX_BONUS, raw));
  themeEval = { bonus, notes: hits, raw };
  return themeEval;
}

function themeRating(raw) {
  if (raw >= 5) return 'Nailed it! 🎯';
  if (raw >= 3) return 'On theme! ✅';
  if (raw >= 1) return 'Kind of on theme 🤔';
  return 'Off theme 🙈';
}

// ─── JUDGES vs THEMES ────────────────────────────────────────────────────────
// How much each judge cares about each theme. 1.5 = loves it (theme bonus or penalty
// is amplified), 1 = neutral, 0.5 = lukewarm (halved). Each theme's weights add up to 3
// so the round stays balanced overall.
const THEME_WEIGHTS = {
  beach:  { coco: 0.5, rose: 1,   zach: 1.5 },
  street: { coco: 0.5, rose: 1,   zach: 1.5 },
  garden: { coco: 1,   rose: 1.5, zach: 0.5 },
  gala:   { coco: 1.5, rose: 1,   zach: 0.5 },
  rainy:  { coco: 0.5, rose: 1.5, zach: 1   },
  winter:    { coco: 1,   rose: 1.5, zach: 0.5 },
  superhero: { coco: 1,   rose: 0.5, zach: 1.5 },
  sports:    { coco: 0.5, rose: 1,   zach: 1.5 },
  fairy:     { coco: 1,   rose: 1.5, zach: 0.5 },
  pirate:    { coco: 1,   rose: 0.5, zach: 1.5 },
  space:     { coco: 1.5, rose: 0.5, zach: 1   },
  glam:      { coco: 1.5, rose: 0.5, zach: 1   },
  blacktie:  { coco: 1.5, rose: 1,   zach: 0.5 },
  pajama:    { coco: 0.5, rose: 1.5, zach: 1   },
  festival:  { coco: 1.5, rose: 1,   zach: 0.5 },
};

function themeWeight(judge) {
  return (currentTheme && THEME_WEIGHTS[currentTheme.id] && THEME_WEIGHTS[currentTheme.id][judge]) || 1;
}

// Loves it: round away from zero (1 -> 2, 2 -> 3). Lukewarm: round toward zero (1 -> 0, 2 -> 1).
function scaleBonus(bonus, weight) {
  const x = Math.abs(bonus) * weight;
  const mag = weight > 1 ? Math.ceil(x) : weight < 1 ? Math.floor(x) : x;
  return Math.sign(bonus) * mag;
}

// Reaction lines in each judge's voice. {theme} is replaced with the theme name.
const THEME_REACTIONS = {
  coco: {
    nailed: '{theme}? You understood ze assignment perfectly!',
    on:     'Ze {theme} theme, I see it. Not bad, darling.',
    close:  'Ze {theme} theme, it is... somewhere in zere.',
    off:    'Zis is supposed to be {theme}? I do not see it, chérie.',
    loves:  'I live for {theme}, so I am watching closely!',
    meh:    '{theme} is not my favorite, but I will judge fairly.',
  },
  rose: {
    nailed: "It's just perfect for {theme}, dear!",
    on:     'I can see the {theme} spirit in there, sweetheart!',
    close:  'A little bit of {theme}, I think! Bless your heart.',
    off:    "Hmm, I'm not sure where the {theme} went, dear.",
    loves:  'I do adore {theme}, you know!',
    meh:    "{theme} was never my cup of tea, but I'm trying!",
  },
  zach: {
    nailed: 'That is {theme} to the core. Respect.',
    on:     "Okay, I see the {theme} vibe. We're cooking.",
    close:  'Lowkey {theme}? Like 40 percent.',
    off:    "Where's the {theme}? Never heard of her.",
    loves:  '{theme} is literally my favorite, so no pressure.',
    meh:    "{theme} isn't really my thing, ngl.",
  },
};

function themeReaction(judge) {
  if (!currentTheme) return '';
  const raw = themeEval.raw;
  const tier = raw >= 5 ? 'nailed' : raw >= 3 ? 'on' : raw >= 1 ? 'close' : 'off';
  const lines = THEME_REACTIONS[judge];
  const w = themeWeight(judge);
  let text = lines[tier];
  if (w > 1) text += ' ' + lines.loves;
  else if (w < 1) text += ' ' + lines.meh;
  return text.replace(/\{theme\}/g, currentTheme.name);
}

// ─── OUTFIT SCORING ───────────────────────────────────────────────────────────
// Each judge has their own taste. A rule is: [points, text] pushed into `notes`.
// Final score = 3 + sum of points + a little luck (-1, 0 or +1), clamped to 0-10.
// The note with the biggest swing becomes the judge's callout under their quote.
const NEUTRALS   = ['white', 'black', 'denim'];
const SOFT_COLORS = ['pink', 'yellow', 'white', 'purple'];

function judgeOutfit(judge) {
  const o = outfit;
  const notes = [];
  const add = (cond, pts, text) => { if (cond) notes.push([pts, text]); };
  const sameColor = o.topcolor === o.bottomcolor;
  const topNeutral = NEUTRALS.includes(o.topcolor);
  const botNeutral = NEUTRALS.includes(o.bottomcolor);

  if (judge === 'coco') {
    add(o.shoes === 'heels',        +2, 'Zose heels! Zey scream confidence.');
    add(o.shoes === 'sneakers',     -1, 'Sneakers on my runway? Non.');
    add(o.shoes === 'boots',        +1, 'Boots, zey have attitude. I like.');
    add(o.top === 'jacket',         +2, 'Ze jacket has structure, darling!');
    add(o.bottom === 'dress',       +2, 'Ze dress is très elegant.');
    add(wears(o, 'crown'),    +2, 'A crown! You are not afraid of drama.');
    add(wears(o, 'hat'),      +1, 'Ze hat, it is très chic.');
    add(wears(o, 'sunglasses'), +1, 'Sunglasses indoors. Mysterious. I approve.');
    add(o.accessory === 'none',     -1, 'No accessory? Ze outfit feels naked.');
    add(o.accessory2 && o.accessory2 !== 'none', +1, 'Two accessories? Layers are ze secret, darling.');
    add(o.hair === 'bun',           +1, 'Ze bun is so Parisian.');
    add(o.mouth === 'pout',         +1, 'Ze pout! Zis is how we do it.');
    add(o.mouth === 'tongue',       -1, 'Ze tongue? Zis is not ze circus.');
    add(sameColor && !topNeutral,   -2, 'Ze top and bottom are ze same color. So boring.');
    add(!sameColor && !topNeutral && !botNeutral, +1, 'Bold color against bold color. Daring!');
    add(o.top === 'blazer',         +2, 'Ze blazer! Tailoring is everything.');
    add(o.top === 'leather',        +1, 'Leather. Dangerous. I love it.');
    add(wears(o, 'cape'),           +1, 'A cape! Finally, some drama.');
    add(wears(o, 'pearls'),         +1, 'Pearls, ze timeless classic.');
    add(o.shoes === 'platforms',    +1, 'Platforms! Height is power, darling.');
    add(o.top === 'jersey',         -1, 'A jersey? Zis is a runway, not a gym.');
    add(o.shoes === 'slippers',     -1, 'Bunny slippers. I have no words.');
  }

  else if (judge === 'rose') {
    add(wears(o, 'bow'),      +2, 'That hair bow is just darling!');
    add(wears(o, 'bag'),      +1, 'What a sweet little bag!');
    add(wears(o, 'crown'),    +1, 'A crown for my little princess!');
    add(o.top === 'blouse',         +2, 'Such a pretty blouse, dear!');
    add(o.bottom === 'dress',       +2, 'A dress! You look like a storybook!');
    add(o.bottom === 'skirt',       +1, 'A twirly skirt, how lovely!');
    add(o.mouth === 'smile',        +2, 'That smile lights up the whole room!');
    add(o.mouth === 'grin',         +1, 'What a happy grin!');
    add(o.mouth === 'tongue',       +1, 'The silly tongue made me giggle!');
    add(o.shoes === 'heels',        -1, 'Those heels will hurt your feet, dear.');
    add(o.shoes === 'sandals' || o.shoes === 'sneakers', +1, 'Comfy shoes, very sensible!');
    add(SOFT_COLORS.includes(o.topcolor), +1, 'Such a soft, lovely color on top!');
    add(o.hair === 'curly',         +1, 'Curly hair, just like mine used to be!');
    add(o.eyes === 'star',          +1, 'Star eyes! They sparkle so much!');
    add(wears(o, 'sunglasses'), -1, 'Sunglasses? I want to see those pretty eyes!');
    add(wears(o, 'wings'),          +1, 'Little fairy wings! How precious!');
    add(o.bottom === 'tulle',       +1, 'That tulle skirt is like a cupcake!');
    add(o.top === 'puffer' || o.top === 'robe', +1, 'Nice and warm, just how I like it!');
    add(o.shoes === 'slippers',     +1, 'Bunny slippers! I need a pair, dear.');
    add(wears(o, 'flowercrown'),    +1, 'Flowers in your hair, how sweet!');
    add(wears(o, 'eyepatch'),       -1, 'An eyepatch? Did you hurt yourself, dear?');
  }

  else if (judge === 'zach') {
    add(o.shoes === 'sneakers',     +2, 'Fresh kicks. Respect.');
    add(o.shoes === 'boots',        +1, 'Boots? Lowkey hard.');
    add(o.shoes === 'heels',        -1, 'Heels with that? Risky.');
    add(o.top === 'tshirt',         +2, 'The tee is clean. Classic.');
    add(o.top === 'jacket',         +1, 'Jacket adds layers. Nice.');
    add(o.top === 'blouse',         -1, 'Blouse is giving grandma. No offense.');
    add(o.bottom === 'jeans',       +2, 'Jeans. You cannot go wrong.');
    add(o.bottom === 'shorts',      +1, 'Shorts are a vibe.');
    add(wears(o, 'sunglasses'), +2, 'The shades are immaculate.');
    add(wears(o, 'hat'),      +1, 'That hat is a whole mood.');
    add(wears(o, 'crown'),    +1, 'Crown? Main character energy.');
    add(wears(o, 'bow'),      -1, 'The bow is not it, chief.');
    add(o.mouth === 'tongue',       +1, 'Tongue out. Big mood.');
    add(o.eyes === 'cat',           +1, 'Cat eyes are cold, ngl.');
    add(topNeutral || botNeutral,   +1, 'Clean neutral palette. Love it.');
    add(o.top === 'jersey',         +2, 'The jersey? Game day energy.');
    add(o.shoes === 'hightops',     +1, 'High-tops are a whole flex.');
    add(o.top === 'leather',        +1, 'Leather jacket is lowkey iconic.');
    add(wears(o, 'beanie') || wears(o, 'headband'), +1, 'The headwear is a vibe.');
    add(wears(o, 'pearls'),         -1, 'Pearls? Bit stiff, ngl.');
    add(o.bottom === 'tulle',       -1, 'The tutu is a lot, chief.');
  }

  let score = 3 + notes.reduce((sum, n) => sum + n[0], 0) + scaleBonus(themeEval.bonus, themeWeight(judge)) + (Math.floor(Math.random() * 3) - 1);
  score = Math.max(0, Math.min(10, score));

  // Biggest swing (good or bad) becomes the callout
  let callout = '';
  if (notes.length) {
    callout = notes.reduce((best, n) => Math.abs(n[0]) > Math.abs(best[0]) ? n : best)[1];
  }
  return { score, callout };
}

function revealJudge(judge, scores) {
  const { score, callout } = judgeOutfit(judge);
  scores[judge] = score;
  const tier  = score <= 3 ? 'low' : score <= 7 ? 'mid' : 'high';
  const quotes = JUDGES[judge][tier];
  const quote  = quotes[Math.floor(Math.random() * quotes.length)];
  const quoteEl = document.getElementById(`quote-${judge}`);
  quoteEl.textContent = `"${quote}"`;
  if (callout) {
    const note = document.createElement('div');
    note.className = 'judge-note';
    note.textContent = callout;
    quoteEl.appendChild(note);
  }
  const reaction = themeReaction(judge);
  if (reaction) {
    const tn = document.createElement('div');
    tn.className = 'judge-theme';
    tn.textContent = reaction;
    quoteEl.appendChild(tn);
  }
  document.getElementById(`score-${judge}`).textContent = `${score}/10`;
  document.getElementById(`judge-${judge}`).classList.add('revealed');
}

function showTotal(scores) {
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const entry = TOTAL_MSGS.find(t => total >= t.min && total <= t.max) || TOTAL_MSGS.at(-1);
  document.getElementById('total-score').textContent = `${total}/30`;
  document.getElementById('total-msg').textContent   = entry.msg;
  if (currentTheme) {
    const best = themeEval.notes.slice().sort((a, b) => Math.abs(b[0]) - Math.abs(a[0])).slice(0, 2).map(n => n[1]);
    const detail = best.length ? ' ' + best.join(' ') : ' Nothing matched the theme this time.';
    document.getElementById('theme-result').textContent =
      `${currentTheme.emoji} ${currentTheme.name}: ${themeRating(themeEval.raw)}${detail}`;
  } else {
    document.getElementById('theme-result').textContent = `${FREE_STYLE.emoji} Free Style: no theme this round.`;
  }
  processGoals(scores, total);
  document.getElementById('total-wrap').style.display = 'block';
}

// ─── PLAY AGAIN ───────────────────────────────────────────────────────────────
function playAgain() {
  clearRunwayTimers();
  // Reset runway animation
  const wrap = document.getElementById('runway-char-wrap');
  const char = document.getElementById('runway-character');
  wrap.classList.remove('walking');
  char.classList.remove('walking');
  void wrap.offsetWidth;

  // Keep the current outfit so the player can tweak it with their new unlocks
  document.getElementById('hint-msg').textContent = '';
  document.getElementById('unlock-result').textContent = '';
  renderThemeSelect();
  refreshProgressUI();
  showScreen('screen-dress');
}

// ─── SCREEN HELPER ────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}


// ─── WARDROBE SELECTOR (tabs, thumbnail tiles, theme groups) ─────────────────
// Part of the 48x64 canvas to show for each slot's tile: [x, y, w, h]
const THUMB_CROP = {
  eyes: [10, 5, 28, 16], mouth: [12, 14, 24, 12], hair: [4, 0, 40, 32],
  top: [6, 26, 36, 18], bottom: [6, 40, 36, 22], shoes: [6, 52, 36, 12],
  accessory: [0, 0, 48, 64],
};
// Accessories worn on the body need a bigger view than the head crop
const ACCESSORY_CROP = {
  bag: [0, 0, 48, 64], cape: [0, 14, 48, 50], wings: [0, 16, 48, 34], sash: [6, 22, 36, 24],
  bowtie: [12, 16, 24, 18], pearls: [10, 18, 28, 16],
};
let _thumbSrc = null;
let _thumbQueued = false;
let activeTab = null;

// Draw one tile's picture: the current outfit with this tile's item swapped in
function renderThumb(el) {
  const { slot, value } = el.dataset;
  const crop = slot === 'accessory' ? (ACCESSORY_CROP[value] || [6, 0, 36, 30]) : THUMB_CROP[slot];
  const cv = el.querySelector('canvas');
  if (!crop || !cv) return;
  if (!_thumbSrc) { _thumbSrc = document.createElement('canvas'); _thumbSrc.width = CW; _thumbSrc.height = CH; }
  const saved = { ...outfit };
  outfit[slot] = value;
  if (slot === 'accessory') outfit.accessory2 = 'none';
  const sctx = _thumbSrc.getContext('2d');
  paintCharacter(sctx);
  Object.assign(outfit, saved);
  cv.width = crop[2]; cv.height = crop[3];
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, crop[2], crop[3]);
  ctx.drawImage(_thumbSrc, crop[0], crop[1], crop[2], crop[3], 0, 0, crop[2], crop[3]);
}

function refreshThumbs() {
  if (_thumbQueued) return;
  _thumbQueued = true;
  const run = () => {
    _thumbQueued = false;
    document.querySelectorAll('.item-btn[data-slot]').forEach(renderThumb);
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run); else run();
}

// Which theme "era" each item belongs to: whatever theme was most recently unlocked
// by the time the goal rewarding that item comes up. Everything else is Basics.
function itemGroupMap() {
  const map = {}; let current = 'basics';
  GOALS.forEach(g => {
    const th = g.reward.find(k => k.startsWith('theme:'));
    if (th) current = th.slice(6);
    g.reward.forEach(k => { if (!k.startsWith('theme:') && !k.startsWith('feature:')) map[k] = current; });
  });
  return map;
}
function groupLabel(id) {
  if (id === 'basics') return 'Basics';
  const t = THEMES.find(t => t.id === id);
  return t ? `${t.emoji} ${t.name}` : id;
}

function buildSelector() {
  const groupOf = itemGroupMap();
  const order = ['basics'];
  GOALS.forEach(g => g.reward.forEach(k => {
    if (k.startsWith('theme:') && !order.includes(k.slice(6))) order.push(k.slice(6));
  }));

  // Tiles: thumbnail on top, name underneath
  document.querySelectorAll('.item-btn[data-slot]').forEach(el => {
    const text = el.textContent.trim();
    const m = text.match(/^(\S+)\s+(.*)$/);
    const emoji = m ? m[1] : '', name = m ? m[2] : text;
    el.dataset.label = name;
    el.dataset.group = groupOf[`${el.dataset.slot}:${el.dataset.value}`] || 'basics';
    const noPic = !THUMB_CROP[el.dataset.slot] || (el.dataset.slot === 'accessory' && el.dataset.value === 'none');
    el.innerHTML = `<span class="thumb">${noPic ? emoji : '<canvas width="24" height="24"></canvas>'}</span><span class="lbl">${name}</span>`;
  });

  // Order each tile grid by group and add group headings
  document.querySelectorAll('.item-row').forEach(row => {
    const tiles = [...row.querySelectorAll('.item-btn')];
    if (!tiles.length) return;
    tiles.sort((a, b) => order.indexOf(a.dataset.group) - order.indexOf(b.dataset.group));
    row.innerHTML = '';
    tiles.forEach(t => {
      if (t.dataset.group !== 'basics') {
        const tag = document.createElement('span');
        tag.className = 'theme-tag'; tag.textContent = groupLabel(t.dataset.group).split(' ')[0];
        t.title = groupLabel(t.dataset.group);
        t.appendChild(tag);
      }
      row.appendChild(t);
    });
    const note = document.createElement('p');
    note.className = 'more-note'; note.hidden = true;
    row.after(note);
  });

  // Tabs, one per option group
  const tabs = document.getElementById('tabs');
  document.querySelectorAll('.option-group').forEach((grp, i) => {
    const name = grp.querySelector('h3').textContent.trim();
    grp.dataset.tab = name;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tab'; b.setAttribute('role', 'tab'); b.dataset.tab = name;
    b.innerHTML = `<span>${name}</span><span class="tab-new" hidden>✨</span>`;
    b.addEventListener('click', () => showTab(name));
    tabs.appendChild(b);
    if (i === 0) activeTab = name;
  });
  showTab(activeTab);
  refreshThumbs();
}

function showTab(name) {
  activeTab = name;
  document.querySelectorAll('.option-group').forEach(g => g.classList.toggle('active-tab', g.dataset.tab === name));
  document.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === name ? 'true' : 'false'));
}

// Count what's still hidden
// and put a sparkle on tabs that hold new unlocks
function refreshSelectorUI() {
  document.querySelectorAll('.item-row').forEach(row => {
    const hiddenCount = [...row.querySelectorAll('.item-btn')].filter(t => t.hidden).length;
    const note = row.nextElementSibling;
    if (note && note.classList.contains('more-note')) {
      note.hidden = hiddenCount === 0;
      note.textContent = hiddenCount ? `🔒 ${hiddenCount} more to discover. Finish goals to reveal them.` : '';
    }
  });
  document.querySelectorAll('.tab').forEach(b => {
    const grp = document.querySelector(`.option-group[data-tab="${b.dataset.tab}"]`);
    const fresh = grp && grp.querySelector('.is-new:not([hidden])');
    b.querySelector('.tab-new').hidden = !fresh;
  });
}

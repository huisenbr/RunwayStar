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
};

const HAIR_COLORS = {
  black: '#1a1a1a', brown: '#7B4F2E', blonde: '#F5D86E',
  red:   '#C0392B', pink:  '#F48FB1', blue:   '#5DADE2', purple: '#9B59B6',
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
  const ctx = canvas.getContext('2d');
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
}

// ─── ACCESSORY ────────────────────────────────────────────────────────────────
function drawAccessory(ctx) {
  if (!outfit.accessory || outfit.accessory === 'none') return;
  layer(ctx, `accessory_${outfit.accessory}`, null, () => drawAccessoryPixels(ctx, outfit.accessory));
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
}

// ─── OUTFIT STATE / UI ───────────────────────────────────────────────────────
const REQUIRED = ['eyes', 'mouth', 'hair', 'top', 'bottom', 'shoes'];

document.addEventListener('DOMContentLoaded', () => {
  pickTheme();
  selectOption('skin',        'tone1');
  selectOption('haircolor',   'black');
  selectOption('topcolor',    'red');
  selectOption('bottomcolor', 'blue');
  selectOption('shoecolor',   'black');

  document.querySelectorAll('[data-slot]').forEach(el => {
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.addEventListener('click', () => selectOption(el.dataset.slot, el.dataset.value));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectOption(el.dataset.slot, el.dataset.value);
      }
    });
  });
});

function selectOption(slot, value) {
  outfit[slot] = value;
  document.querySelectorAll(`[data-slot="${slot}"]`).forEach(e => {
    e.classList.remove('selected');
    e.setAttribute('aria-pressed', 'false');
  });
  const t = document.querySelector(`[data-slot="${slot}"][data-value="${value}"]`);
  if (t) { t.classList.add('selected'); t.setAttribute('aria-pressed', 'true'); }
  drawCharacter('character');
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
      [+1, 'Sunglasses for the sunshine.',        o => o.accessory === 'sunglasses'],
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
      [+2, 'A crown for the gala? Of course.',    o => o.accessory === 'crown'],
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
      [+1, 'The hat adds attitude.',              o => o.accessory === 'hat'],
      [+1, 'A neutral palette looks effortless.', o => NEUTRALS.includes(o.topcolor) || NEUTRALS.includes(o.bottomcolor)],
      [-2, 'Heels are too dressy for the street.', o => o.shoes === 'heels'],
      [-1, 'A crown is a bit much for the sidewalk.', o => o.accessory === 'crown'],
    ],
  },
  {
    id: 'garden', name: 'Garden Party', emoji: '🌷',
    blurb: 'Soft, sweet and springy. Think flowers and sunshine!',
    rules: [
      [+2, 'A blouse is lovely for a garden party.', o => o.top === 'blouse'],
      [+2, 'The dress is perfect for the garden.', o => o.bottom === 'dress'],
      [+1, 'A skirt twirls nicely on the lawn.',  o => o.bottom === 'skirt'],
      [+2, 'The hair bow is so sweet.',           o => o.accessory === 'bow'],
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
      [+1, 'The hat helps with the drizzle.',     o => o.accessory === 'hat'],
      [+1, 'Jeans stay warm and sturdy.',         o => o.bottom === 'jeans'],
      [-2, 'Sandals in the rain? Soggy toes.',    o => o.shoes === 'sandals'],
      [-1, 'Shorts will get chilly and wet.',     o => o.bottom === 'shorts'],
      [-1, 'A crop top will not keep you dry.',   o => o.top === 'crop'],
    ],
  },
];

let currentTheme = null;
let themeEval    = { bonus: 0, notes: [], raw: 0 };

function pickTheme() {
  const pool = THEMES.filter(t => !currentTheme || t.id !== currentTheme.id);
  currentTheme = pool[Math.floor(Math.random() * pool.length)];
  document.getElementById('theme-emoji').textContent = currentTheme.emoji;
  document.getElementById('theme-name').textContent  = currentTheme.name;
  document.getElementById('theme-blurb').textContent = currentTheme.blurb;
  document.getElementById('runway-theme').textContent = `Theme: ${currentTheme.name} ${currentTheme.emoji}`;
}

function evaluateTheme() {
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
    add(o.accessory === 'crown',    +2, 'A crown! You are not afraid of drama.');
    add(o.accessory === 'hat',      +1, 'Ze hat, it is très chic.');
    add(o.accessory === 'sunglasses', +1, 'Sunglasses indoors. Mysterious. I approve.');
    add(o.accessory === 'none',     -1, 'No accessory? Ze outfit feels naked.');
    add(o.hair === 'bun',           +1, 'Ze bun is so Parisian.');
    add(o.mouth === 'pout',         +1, 'Ze pout! Zis is how we do it.');
    add(o.mouth === 'tongue',       -1, 'Ze tongue? Zis is not ze circus.');
    add(sameColor && !topNeutral,   -2, 'Ze top and bottom are ze same color. So boring.');
    add(!sameColor && !topNeutral && !botNeutral, +1, 'Bold color against bold color. Daring!');
  }

  else if (judge === 'rose') {
    add(o.accessory === 'bow',      +2, 'That hair bow is just darling!');
    add(o.accessory === 'bag',      +1, 'What a sweet little bag!');
    add(o.accessory === 'crown',    +1, 'A crown for my little princess!');
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
    add(o.accessory === 'sunglasses', -1, 'Sunglasses? I want to see those pretty eyes!');
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
    add(o.accessory === 'sunglasses', +2, 'The shades are immaculate.');
    add(o.accessory === 'hat',      +1, 'That hat is a whole mood.');
    add(o.accessory === 'crown',    +1, 'Crown? Main character energy.');
    add(o.accessory === 'bow',      -1, 'The bow is not it, chief.');
    add(o.mouth === 'tongue',       +1, 'Tongue out. Big mood.');
    add(o.eyes === 'cat',           +1, 'Cat eyes are cold, ngl.');
    add(topNeutral || botNeutral,   +1, 'Clean neutral palette. Love it.');
  }

  let score = 3 + notes.reduce((sum, n) => sum + n[0], 0) + themeEval.bonus + (Math.floor(Math.random() * 3) - 1);
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
  document.getElementById(`score-${judge}`).textContent = `${score}/10`;
  document.getElementById(`judge-${judge}`).classList.add('revealed');
}

function showTotal(scores) {
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const entry = TOTAL_MSGS.find(t => total >= t.min && total <= t.max) || TOTAL_MSGS.at(-1);
  document.getElementById('total-score').textContent = `${total}/30`;
  document.getElementById('total-msg').textContent   = entry.msg;
  const best = themeEval.notes.slice().sort((a, b) => Math.abs(b[0]) - Math.abs(a[0])).slice(0, 2).map(n => n[1]);
  const detail = best.length ? ' ' + best.join(' ') : ' Nothing matched the theme this time.';
  document.getElementById('theme-result').textContent =
    `${currentTheme.emoji} ${currentTheme.name}: ${themeRating(themeEval.raw)}${detail}`;
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

  // Reset outfit to defaults (keep color pickers, clear choices)
  outfit.eyes   = null;
  outfit.mouth  = null;
  outfit.hair   = null;
  outfit.top    = null;
  outfit.bottom = null;
  outfit.shoes  = null;
  outfit.accessory = 'none';

  // Clear all selected highlights
  document.querySelectorAll('.item-btn.selected, .swatch.selected').forEach(el => {
    el.classList.remove('selected');
  });

  // Re-apply default color swatch selections
  selectOption('skin',        outfit.skin);
  selectOption('haircolor',   outfit.haircolor);
  selectOption('topcolor',    outfit.topcolor);
  selectOption('bottomcolor', outfit.bottomcolor);
  selectOption('shoecolor',   outfit.shoecolor);

  document.getElementById('hint-msg').textContent = '';
  pickTheme();
  showScreen('screen-dress');
}

// ─── SCREEN HELPER ────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

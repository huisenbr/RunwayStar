# Runway Star!

A pixel-art dress-up game. Design a look, walk the runway, and get scored by three judges. No build step, just HTML, CSS and JavaScript.

## Run it

Open `index.html` in a browser. Or serve the folder if you prefer:

```
npx serve .
```

## How it plays

1. **Dressing room.** Pick skin, eyes, mouth, hair, top, bottom, shoes and an accessory, plus colors. A theme for the round (Beach Day, Royal Gala, Street Style, Garden Party or Rainy Day) is shown up front.
2. **Runway.** Your character walks out, and the game moves on to the judges when the walk ends.
3. **Judges.** Madame Coco, Grandma Rose and Zach Attack each score 0 to 10 based on their own taste plus a shared theme bonus. Each one calls out the piece of the outfit that mattered most. A perfect 30 is rare.

## Project layout

| File | What it does |
|---|---|
| `index.html` | The three screens (dressing room, runway, judges) |
| `style.css` | All styling and the runway animation |
| `game.js` | Character drawing, themes, judge scoring, screen flow |
| `assets/` | Sprite PNGs and the Aseprite source (`Master.ase`) |
| `runway-star.gpl` | Color palette for Aseprite and GIMP |
| `export-sprites.html` | Dev tool that exports the code-drawn sprites as PNGs |
| `GROWTH.md` | Ideas and cleanup to pick up later |

## Art pipeline

Characters are 48x64 pixels. Every item is drawn in code by default. Real art takes over through the `SPRITE_PATHS` registry at the top of `game.js`.

- **Tinted sprites** (hair, tops, bottoms, shoes) are drawn in greyscale: white for the main area, grey for shadows. The color picker tints them at runtime, so one file covers every color.
- **Full-color sprites** (eyes, mouths, accessories) are drawn as-is.
- **Body** has one file per skin tone: `Base.png` and `base-tone2.png` to `base-tone5.png`.
- `assets/Master.ase` holds all the layers. Items that are still code-drawn are in the hidden "code-drawn (redraw these)" group, ready to be redrawn.

To use a new sprite, export that layer as a 48x64 PNG with a transparent background into `assets/`, then uncomment or add its line in `SPRITE_PATHS`.

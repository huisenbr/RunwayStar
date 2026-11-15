# Runway Star!

A pixel-art dress-up game. Design a look, walk the runway, and get scored by three judges. No build step, just HTML, CSS and JavaScript.

## Run it

Open `index.html` in a browser. Or serve the folder if you prefer:

```
npx serve .
```

## How it plays

1. **Dressing room.** Pick skin, eyes, mouth, hair, top, bottom, shoes and an accessory, plus colors. You pick the round's theme from a dropdown in the banner (Free Style or any unlocked theme). Unlocking a theme switches to it automatically, and your choice is saved. There are 15 themes: Beach Day, Street Style, Garden Party, Royal Gala, Rainy Day, Winter Wonderland, Superhero Night, Sports Day, Fairy Tale, Pirate Adventure, Space Explorer, Glam Rock, Black Tie Dinner, Pajama Party and Music Festival.
2. **Runway.** Your character walks out, and the game moves on to the judges when the walk ends.
3. **Judges.** Madame Coco, Grandma Rose and Zach Attack each score 0 to 10 based on their own taste plus the theme bonus. Each judge has their own feelings about each theme: a judge who loves a theme amplifies its bonus or penalty, and a lukewarm judge halves it (`THEME_WEIGHTS` in `game.js`). Each one calls out the piece of the outfit that mattered most and reacts to how well you matched the theme.

## Unlocks and goals

You start with a basic outfit and a "Free Style" round with no theme. Finishing goals unlocks items, colors and themes, for example "Score 19+ while wearing sunglasses" unlocks the Beach Day theme and beach clothes. Up to three goals are open at a time. Locked options show a lock, and tapping one tells you how to unlock it. Progress is saved in the browser (localStorage), and a "Reset progress" button (two taps to confirm) starts over.

Wearing two accessories is itself an unlock (`feature:accessory2`, a reward for the Street Style goal). Once unlocked, you can tick two accessories in the same row, and tapping a worn one takes it off.

After the Royal Gala goal, the path splits in two: a cozy branch (Rainy Day, Winter Wonderland, Fairy Tale, Pajama Party, Music Festival) and a bold branch that starts with "Score 25+ wearing two accessories" (Superhero Night, Sports Day, Pirate Adventure, Space Explorer, Glam Rock, Black Tie Dinner). Each goal unlocks the next theme plus its clothes. A goal written as `{ theme: 'x', min: N }` gets its text and test filled in automatically.

Goals, rewards and the starting wardrobe live in `GOALS` and `STARTER_UNLOCKS` in `game.js`. Skin tones are always unlocked.

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

## Dressing room
Items are split into category tabs with thumbnail tiles. Locked items stay hidden until one of your current goals would unlock them (a count shows how many are still hidden). A small emoji on a tile shows which theme era it belongs to.

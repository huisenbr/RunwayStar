# Runway Star! Growth List

Ideas and cleanup to pick up later.

## Gameplay
- Per-judge theme reactions (Rose loves Garden Party, Zach is lukewarm on it, Coco wants drama for Royal Gala). Themes currently give one shared bonus.
- More themes beyond the first five (Beach Day, Royal Gala, Street Style, Garden Party, Rainy Day).
- Judge quotes that mention the theme, not just the outfit pieces.

## Art
- Base sprite is wired in with one file per skin tone (Base.png, base-tone2..5.png). If the base art changes, regenerate the tone files so they stay in sync.
- Finish sprites. Done so far in the game: curly hair, smile, blouse (now greyscale), sandals, body. Still code-drawn: see the hidden 'code-drawn (redraw these)' group in Master.ase, which has a starter layer for each one.
- Redraw the curly hair with a filled scalp, in white with grey shadows (it is only an outline now).
- Export eye-normal, eye-dreamy and mouth-grin from Master.ase as eyes_round, eyes_sleepy and mouth_grin, then uncomment them in SPRITE_PATHS.
- Identify the unnamed 'Layer 1' in Master.ase.

## Tech
- Runway now advances on animationend and its timers are cancellable. Judge reveal timers (goToJudges) still are not; do that before adding a skip or back button.
- Cleanup: remove the game.js.bak*, index.html.bak3 backup files when no longer needed.

# Runway Star! Growth List

Ideas and cleanup to pick up later.

## Gameplay
- Per-judge theme taste is in (see THEME_WEIGHTS in game.js). Next step: theme-specific lines per judge instead of the shared tier lines, and judges who comment on the exact item that fit or missed the theme.
- DONE: 10 more themes (15 total) with ~40 new items, in two goal branches after the gala. Thresholds were set with the casual-player simulation (about 50% pass). Still to try: the non-theme extras (braids, ponytail, mohawk, afro puffs, heart and wink eyes, kiss and surprised mouths, gold and rainbow hair), and a final reward for finishing both branches.
- The new items add more judge-pleasing options, which pushes the perfect-score ceiling up further. Factor that into the perfect-score fix below.
- Judge quotes that mention the theme, not just the outfit pieces.

- Two accessories raised the scoring ceiling: with both slots, best play hits a perfect 30 essentially every time (it was about 45% with one slot). Madame Coco also gets +1 for layering (remove it in judgeOutfit if you want less stacking). Any fix for the perfect-score balance should be re-simulated with two accessories on.
- Perfect-score balance: with the full wardrobe unlocked, the best outfit scores 29 to 30 almost every time, so a perfect score becomes routine once a player learns the judges' tastes. Options: diminishing returns above 8, a per-round "mood" for each judge, or fewer points per item.
- Unlock follow-ups: show every unlocked item on the results screen (it truncates at 8), a trophy or title for finishing all goals, and a way to replay finished goals.
- Goal tuning: thresholds are set so a casual player who follows the theme (but does not know the judges' tastes) passes about half the time. Tuning against perfect play was far too hard. Re-check with a simulation whenever scoring rules or rewards change.
- Theme hints: theme rules are hidden, so players guess. Consider a "Try: sandals, shorts, sunglasses" hint line in the theme banner.

## Art
- Base sprite is wired in with one file per skin tone (Base.png, base-tone2..5.png). If the base art changes, regenerate the tone files so they stay in sync.
- Finish sprites. Done so far in the game: curly hair, smile, blouse (now greyscale), sandals, body. Still code-drawn: see the hidden 'code-drawn (redraw these)' group in Master.ase, which has a starter layer for each one.
- Redraw the curly hair with a filled scalp, in white with grey shadows (it is only an outline now).
- Export eye-normal, eye-dreamy and mouth-grin from Master.ase as eyes_round, eyes_sleepy and mouth_grin, then uncomment them in SPRITE_PATHS.
- Identify the unnamed 'Layer 1' in Master.ase.
- The ~40 items from the theme expansion are all code-drawn and do not have starter layers in Master.ase yet. Body-worn accessories (cape, wings, sash) are drawn on top of the arms' outer edge, so a real sprite pass could put the cape and wings behind the body.

## UI
- DONE: the dressing room uses category tabs, thumbnail tiles drawn from the sprite/draw code, hides locked items unless an open goal would unlock them, and tags items with their theme. Still to try: a search or "recently unlocked" strip once there are 100+ items, and per-theme outfit presets.

## Tech
- Runway now advances on animationend and its timers are cancellable. Judge reveal timers (goToJudges) still are not; do that before adding a skip or back button.
- Cleanup: remove the game.js.bak*, index.html.bak3 backup files when no longer needed.

# Penalty Kick

A mobile-friendly arcade penalty game built with Three.js.

## Run locally

```
cd game
npm install
npm run dev
```

Open the printed URL on your phone (same Wi-Fi) or in the browser.

## How to play

Swipe up on the pitch to shoot:

- **Direction** — angle of your swipe sets aim left/right
- **Length / speed** — sets shot power
- **Curl** — curve your finger mid-swipe to bend the ball

The keeper dives based on your aim with a reaction delay that gets faster
each level. Higher shots are harder for the keeper to reach. Place it in
the corners.

## Progression

10 challenges, each unlocks the next. Progress is saved in
`localStorage` (`penalty_progress_v1`). Clear that key to reset.

## Layout

- `src/main.js` — game loop, state machine, glue
- `src/scene.js` — pitch, stadium, goal, lighting
- `src/ball.js` — ball mesh + procedural texture
- `src/keeper.js` — keeper mesh, idle, dive animation, hitbox
- `src/physics.js` — arcade ball trajectory + outcome detection
- `src/input.js` — swipe → power/aim/curve
- `src/fx.js` — particles, trail, screen shake, net ripple, flash, toast
- `src/audio.js` — synthesized SFX (no asset files)
- `src/progression.js` — challenges and unlocks
- `src/ui.js` — overlay & HUD
- `src/style.css` — HUD/overlay styles

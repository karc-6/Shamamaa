# Shamama Sis — Transmission (v8, sister edition, maroon & red)

A one-slide birthday site: a cinematic opening film, then an entrance that opens four rooms as panels.
Pure HTML, CSS and vanilla JavaScript. No build step, no install, no backend.

```
birthday-shamama/
├── index.html
├── css/style.css
├── js/config.js     EDIT THIS: name, captions, candles, song title, final message
├── js/script.js     the engine
├── images/          photo1.jpg … photo17.jpg
├── videos/          video1.mp4 … video3.mp4
├── audio/           birthday-song.mp3
└── .vscode/         Live Server + settings
```

## Run it in VS Code
1. `File → Open Folder…` → `birthday-shamama`. Accept the recommended extension (Live Server).
2. Right-click `index.html` → **Open with Live Server**. (Double-clicking the file also works; the microphone in "Make a Wish" needs Live Server or https.)

## Add her things
Photos → `images/photo1.jpg` … `photo17.jpg` (17 slots; each can be .jpg, .jpeg, .png or .webp, and an empty slot shows its file name), videos → `videos/video1.mp4` … `video3.mp4`, song → `audio/birthday-song.mp3`.
Names, captions, candle count, the final message and `AUTOPLAY_SONG` are in `js/config.js`. Missing files show soft placeholders, never errors.

## Design
v9 is a design-system pass: Playfair Display for headings and quotes, Space Grotesk for small labels, Unbounded only for her name, hairline borders, one button style, calmer glass panels, a thin frame around the page, and numbered rooms (I to V). Colours live at the top of `css/style.css` (`--red`, `--crimson`, `--rose`, `--gold`, `--maroon`).

## Make it hers (all in `js/config.js`)
`NAME` is what gets built letter by letter in "Her Name" (one row per word, so "SHAMAMA SIS" is 7 + 3 slots). `DISPLAY_NAME`, `TAGLINE`, `FOOTER` and `SIGNAL_TEXT` change the words on the entrance, in the film and in the final reveal.

## What's inside
- **Opening film** (13 s, rebuilt in v8 for smoothness: sharp on retina screens, photos pre-rendered, one continuous camera curve, soft glows instead of hard flashes, a fade-and-push-in handover into the site): heartbeat → warp with her photos rushing past → her name in particles → "Happy Birthday" burst → the screen collapses and the site opens. Skip with the button or Esc; "replay intro" runs it again.
- **Background:** layered maroon and red, slow silk ribbons, a constellation that bends away from the cursor, and photos and videos that fall (the cursor pushes them, a tap opens them, tapping empty space fountains a burst).
- **The Collection:** wall and 3D flow layouts, filters, hearts (saved on her device), shuffle, and a viewer with swipe, zoom, thumbnails and a slideshow.
- **Her Name:** memories orbit and spin to your cursor; drop one into each letter (magnetic targets, sparks, assemble-for-me).
- **The Signal (v10):** a two-step panel (tune, then decode) with a live oscilloscope that gets noisy when you are off-frequency, a frequency readout, a signal-strength meter and a status chip. Holding the core charges it, and the finale is an opaque "transmission received" stage where her message forms from fine serif particles that leave the core, shimmer, and flee your cursor, with fireworks (tap anywhere) and rising embers. Older description: tune the oscilloscope wave to lock on, hold the core to charge, then her message bursts into particles and fireworks.
- **Make a Wish:** a cake with candles. Tap the flames, press blow, or blow into your microphone; type a wish and it floats away on a lantern.
- Synthesized sound effects (toggle "sound"), "reduce motion" (also respects the OS setting), full keyboard support, mobile layouts.

## Put it on GitHub Pages
1. VS Code → Source Control → **Publish to GitHub** (this folder is already a git repo), or use GitHub Desktop.
2. GitHub → **Settings → Pages → Deploy from a branch → main → / (root) → Save**.
3. Send her `https://<you>.github.io/<repo>/`.

# 🐴 Neon Defense

A polished single-file HTML5 tower defense game (vanilla JS + Canvas).

Play: **https://mmacaula.github.io/neon-defense/**

- 6 towers: Gunner, Sniper, Cannon, Cryo (slow), Flamer, Tesla — 5 upgrade levels + prestige
- 3 maps with distinct paths, 24 enemy types, boss every 10 waves
- Wave checkpoints: auto-save between waves (localStorage), plus manual 💾 Save
- Sound via WebAudio, keyboard shortcuts, 1×/2×/3× speed

## Layout
- `index.html` — the built game (what Pages serves); also works opened directly from disk
- `src/01..04*.js` — game modules; `src/template.html` — HTML/CSS shell
- `python3 build.py` — concatenates src/*.js into the template → `dist/neon-defense.html`

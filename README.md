[README.md](https://github.com/user-attachments/files/29745800/README.md)
# The Automation Saga

A free-roaming **3D portfolio world** (Bruno-Simon-style) with a God of War soul, built in
Three.js. You play **Warrior-Taha** wielding the **Automation Axe** (throw it — it works
even when it leaves your hand), accompanied by **BOTREUS**, a floating chatbot companion
(the stage persona of GymCRM) who narrates the saga and answers questions about Taha.

Roam a night valley through four chronological career chapters, fight three bosses,
knock down the CSV-crate bowling alley, and reach the Gates of Valhalla at the end
with LinkedIn / GitHub / mincac.com / email links.

## Play locally

No build step — a single HTML page + one JS file (Three.js loads from CDN).

```sh
cd taha-saga
python3 -m http.server 4173
# open http://localhost:4173
```

## Controls

| Input | Action |
|---|---|
| W A S D / arrows | Roam the realm |
| Space | Jump |
| J | Melee combo (3rd hit is heavy) |
| K | Throw / recall the Automation Axe |
| E | Read runestones, open gates |
| C | Talk to BOTREUS |

Touch controls appear automatically on mobile.

## Deploy (free)

**GitHub Pages:** push to `main`, then Settings → Pages → Deploy from branch → `main` / root.
Live at `https://tahaiftikhar01.github.io/taha-saga/`.

## Structure

- `index.html` — markup, CSS, HUD, overlays (title, dialog, runestone cards, BOTREUS chat, death, victory), touch UI
- `game.js` — the whole engine: world data, dialog script, free-roam movement, combat, three bosses, CSV bowling, Three.js renderer, synth SFX

### Editing content

All career content lives in plain data structures at the top of `game.js`:
`SIGNS` (runestone lore cards), `GATES` (end-of-game links), `DIALOGS` (cutscene lines),
`CHAT_QA` (BOTREUS answers). Edit those — no game-logic knowledge needed.

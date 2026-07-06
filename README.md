# The Automation Saga

A God of War–style 2.5D action portfolio game. You play **Warrior-Taha** wielding the
**Automation Axe** (throw it — it works even when it leaves your hand), accompanied by
**BOTREUS**, a floating chatbot companion (the stage persona of GymCRM) who narrates the
saga and answers questions about Taha.

Four chronological chapters, three boss fights, and the Gates of Valhalla at the end
with LinkedIn / GitHub / mincac.com / email links.

## Play locally

No build step — it's a single HTML page + one JS file.

```sh
cd taha-saga
python3 -m http.server 4173
# open http://localhost:4173
```

## Controls

| Input | Action |
|---|---|
| A / D or ◀ ▶ | Move |
| W / Space | Jump |
| J | Melee combo (3rd hit is heavy) |
| K | Throw / recall the Automation Axe |
| E | Read runestones, open gates |
| C | Talk to BOTREUS |

Touch controls appear automatically on mobile.

## Deploy (free)

**Vercel** (fastest):
```sh
npx vercel --prod
```

**GitHub Pages:**
```sh
git init && git add . && git commit -m "The Automation Saga"
gh repo create taha-saga --public --source=. --push
gh api repos/tahaiftikhar01/taha-saga/pages -X POST -f 'source[branch]=main' -f 'source[path]=/'
# live at https://tahaiftikhar01.github.io/taha-saga/
```

## Structure

- `index.html` — markup, CSS, overlays (title, dialog, runestone cards, BOTREUS chat, death, victory), touch UI
- `game.js` — the whole engine: world/chapter data, dialog script, combat, three bosses, rendering, synth SFX

### Editing content

All career content lives in plain data structures at the top of `game.js`:
`SIGNS` (runestone lore cards), `GATES` (end-of-game links), `DIALOGS` (cutscene lines),
`CHAT_QA` (BOTREUS answers). Edit those — no game-logic knowledge needed.

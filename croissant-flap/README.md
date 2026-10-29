# Croissant Flap

A Flappy Bird-style bakery game for a prize competition. The whole game is one file, `index.html`: no install, no internet needed.

- **1st place:** Stand Mixer
- **2nd and 3rd place:** Kitchen Scale

## How to play

| | Computer | Phone / tablet |
|---|---|---|
| Flap | Space, ↑, W or click | Tap anywhere |
| Pause | P or Esc (or the ⏸ button) | ⏸ button |
| Mute | M (or the 🔊 button) | 🔊 button |

Everyone starts at Level 1. The game speeds up at 10, 20, 30, 45, 60 and 80 points (Level 7 is the last level and continues until you crash).

## Running the competition

The leaderboard is saved **on the device the game runs on**. Run the competition on **one shared device** (a tablet or laptop at the counter). Scores played on other phones only appear on those phones.

### Before the event

1. Open `index.html` in a text editor and change `EVENT_CONFIG` at the top of the script:
   - `adminPin`: **change this from 2468**.
   - `shopName`: your shop's name (shown on the menu and in the consent text).
   - `eventEndText`: when and how winners are announced.
   - `prizes` and `termsText` if anything changes.
2. Copy `index.html` to the event device and open it in Chrome, Safari or Edge. Double-clicking the file works on a laptop. On a tablet, use the hosted link (see below).
3. Do a test round, then clear the leaderboard (see the staff panel below).
4. Optional: lock the device to the game (iPad: Guided Access; Android: Screen pinning; Windows/Mac: Chrome kiosk or full screen).

### Staff panel

On the main menu, **press and hold the "Croissant Flap" title for 3 seconds**, then enter the PIN. The staff panel shows contacts and has:

- **Export CSV** (opens in Excel) and **Export JSON** (backup).
- **Clear all**, which asks for confirmation first.

### After the event

1. Open the staff panel and export the CSV (and the JSON as a backup).
2. Check the top 3: one prize per person, and ties go to whoever reached the score first (the list is already ordered this way).
3. Contact the winners, then **Clear all** so contact details don't stay on the device.

## Putting it online (GitHub Pages)

1. In the GitHub repository: **Settings → Pages → Build and deployment → Deploy from a branch**, choose the branch and `/ (root)`, then save.
2. After a minute the game is at `https://<owner>.github.io/<repo>/croissant-flap/`.

Each phone that opens the link keeps its own scores. For the prize competition, use the shared event device.

## Tuning difficulty

The `LEVELS` table at the top of the script controls speed, gravity, flap strength, gap height, obstacle spacing and the largest jump between gaps for each level. Keep `flap² / (2 × gravity)` at about 55 px. After any change, run the tests: the autopilot check proves every level can still be beaten.

## Tests

```bash
cd croissant-flap/tests
npm install
npx playwright install chromium
npm test
```

This runs 10 checks against both `file://` and a local web server: console errors, level config, autopilot beatability, frame-rate independence, input, layout at 5 screen sizes, leaderboard rules, staff panel, audio, and test isolation. Screenshots go to `tests/screenshots/`.

Tests open the game with `?test=1`. That mode uses a **separate** leaderboard and shows a blue "TEST MODE" badge, so never run the event from a `?test=1` link.

## Known limits

- The leaderboard lives in this browser's storage. Clearing browser data or using a private window erases it, so export regularly.
- The staff PIN only stops casual tampering. Someone with developer tools could still edit scores, which is why staff should watch the event device.
- On iPhone, the silent switch can mute web audio.

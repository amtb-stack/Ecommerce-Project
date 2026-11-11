# Kejar Tempahan Raya

A 45-second pixel-art web game for The Baker's Raya 2027 campaign. Players run a kampung kitchen in the week before Raya and fill kuih raya orders before Malam Raya. It runs in any mobile or desktop browser. There is no install, no sign-up and no backend.

## How it plays

- Customers (Mak, Tok Wan, Makcik Jiran, Kawan Office, Adik, Abang Rider) come to the counter. Each has an empty balang and an order tag showing which kuih they want.
- Every few seconds the **The Baker E-1AG oven** dings and bakes a tray of cookies.
- The player drags a cookie into the matching balang. Tapping a cookie and then a customer also works. The jar fills up visibly, so nobody has to count.
- A wrong cookie bounces back. If a customer waits too long, they leave and the combo resets.
- Each finished order **lights a pelita** outside the window. 3, 6 and 10 pelita give 1, 2 and 3 stars.
- Finished orders fill the **The Baker B10-ES mixer**. When it is full, swiping its speed lever down (or tapping it) bakes a turbo batch of exactly the cookies customers need.
- The last 10 seconds are **Malam Raya**: night sky, fireworks and double points.
- The end screen shows the score, stars and a fun title, plus "Main lagi" and "Kongsi & cabar kawan". Below them is one small product card linking to Shopee.

New kuih unlock during the round: tart nenas and semperit at the start, then coklat cip (7s), almond london (15s), cornflakes madu (23s) and biskut makmur (30s).

## Run it locally

```bash
cd raya-game
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` straight from disk also works, except the share card, which needs a web server.

## Files

| File | What it is |
| --- | --- |
| `index.html` | Page shell, title / end / share screens |
| `style.css` | Screen styling, scaled to the game's pixel size |
| `game.js` | The whole game: drawing, rules, sound, share card, analytics |
| `assets/thebaker-logo.png` | Logo, used in the top bar, title screen, oven panel and share card |
| `assets/e1ag-oven.jpg`, `assets/b10es-mixer.jpg` | Product photos for the end-screen card |

Everything else is drawn in code: pixel art, characters and an original chiptune with a kompang rhythm. No third-party images or music are used.

## Before launch

1. **Shopee links.** In `game.js`, replace the two `url` values in `CONFIG.products` with the exact Shopee Mall product links. They are search links for now.
2. **Meta Pixel.** Paste the Pixel base code into `<head>` in `index.html`. The game sends these custom events through `fbq('trackCustom', …)` and also pushes them to `window.dataLayer`:

   | Event | When | Parameters |
   | --- | --- | --- |
   | `GameView` | Page loaded | |
   | `GameStart` | First round started | `round` |
   | `Replay` | Any later round | `round` |
   | `MixerTurbo` | Mixer lever used | `round` |
   | `RoundEnd` | Round finished | `round`, `score`, `stars`, `orders`, `turbos` |
   | `EngagedPlayer` | Third round finished | `rounds` |
   | `ShareOpen` | Share screen opened | `score` |
   | `ShareComplete` | Shared or link copied | `method` |
   | `ShopeeClick` | Product card tapped | `product`, `score` |

   Useful retargeting audiences: `GameStart` without `RoundEnd` (bounced), `EngagedPlayer` (fans), and `ShopeeClick` (product interest).
3. **Hosting.** Any static host works. A subdomain such as `game.baker.com.my` keeps the Pixel on your own domain.

## Settings

The top of `game.js` holds `CONFIG`: round length, Malam Raya length, number of pelita, star thresholds and the product cards. Difficulty (customer patience, oven speed, order sizes, when mixed orders start) is in `diff()`.

## Not in this version

- Weekly leaderboard and prize entry. These need a small backend plus a PDPA consent form, and contest or lucky-draw rules should be checked first.
- Daily challenge.
- Unlocking bigger The Baker models. This needs the product range.
- An English switch. The game is in Bahasa Melayu.

Challenge links work without a backend: the share screen copies a link ending in `#cabar-<score>`, and the friend who opens it sees that score on the title screen.

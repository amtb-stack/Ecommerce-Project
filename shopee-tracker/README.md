# Shopee Reply Tracker

Tracks which buyers still owe you a reply, counts down to the deadline, and nags you before it
passes. Installs on your phone like an app. Free, no signup, works with the internet off.

---

## Getting it on your phone

The app is one folder of static files. It needs a web address before a phone can install it —
`file://` won't do. Three routes, easiest first.

### 1. Netlify Drop — about 2 minutes, nothing to configure

1. Download the `shopee-tracker` folder to your computer.
2. Go to **https://app.netlify.com/drop**
3. Drag the whole folder onto the page.
4. You get an address like `https://random-name-123.netlify.app`. Open that on your phone.

Free, and this repo stays private. Make a free account when it offers, otherwise the address expires.

### 2. Cloudflare Pages — auto-updates, works with a private repo

Connect this repo at **https://pages.cloudflare.com**, set the build output directory to
`shopee-tracker` and leave the build command empty. Every push redeploys it. Free tier, and unlike
GitHub Pages it does not require the repo to be public.

### 3. GitHub Pages — free only if the repo is public

This repo is currently **private**, and GitHub Pages on private repos needs a paid plan. Either make
it public (the tracker holds no secrets — your tickets live in your browser, never in the repo), or
use one of the routes above.

### Then install it

- **Android / Chrome** — an "Install" bar appears at the top. Tap it.
- **iPhone / Safari** — tap **Share**, then **Add to Home Screen**.

You get an icon on your home screen, it opens full-screen with no browser bars, and it works with no
signal once installed.

### Or just double-click the file

`index.html` still works on its own with no hosting at all. You lose home-screen install and real
notifications, and phones are awkward at opening local files. Fine for a computer-only setup.

---

## Read this before you rely on it

**Your phone and your computer keep completely separate boards.** Tickets are stored in the browser
on each device. There is no sync, because there is no server and no account.

**Pick one device as the real board.** The phone is usually right — that's where Shopee chats
happen. Use Backup → Save file to move everything across if you switch.

---

## The daily routine

Three fixed times a day — 9am, 2pm, 9pm by default, editable in Settings. At each one:

1. Clear unread chats in Shopee first.
2. Clear anything red on the board.
3. Can't answer yet (waiting on stock, waiting on supplier)? Don't leave it in the chat. Tell the
   buyer "I'll confirm by tomorrow", then park it in **I owe an update** so it comes back to you.

## How it works

**Swipe right to close a card. Swipe left to log an update.** There's an Undo on every close. On a
computer, drag cards between columns instead.

**Tap the coloured L pill** to change urgency without opening anything. L1 = 72 hours, L2 = 48,
L3 = 24. All editable.

**Set L3 to 12 hours to match Shopee exactly.** Shopee only counts your reply toward your Chat
Response Rate if it lands within 12 hours of the buyer's message. Auto-replies are excluded from
that calculation — an auto-reply will not protect your rate. Quick Replies you pick yourself do
count.

**Logging an update restarts the countdown**, so a ticket you've replied to goes quiet until the
next window closes instead of glowing red forever.

**The ring** is the share of open tickets that are not overdue. 100% means nothing is late. **The
streak** counts days in a row you ended with nothing overdue.

## Reminders that reach a locked phone

**No web app can wake a locked phone on a schedule.** The browser API for it (Notification Triggers)
was trialled in Chrome and abandoned, and Web Push needs a server to send every message. So the
reminder has to live somewhere the phone already trusts — your calendar or your clock app.

Ranked by how reliably they'll actually reach you:

1. **Three repeating alarms in your phone's clock app, labelled "Check board."** Two minutes to set
   up, works forever, no app needed. Do this one regardless.
2. **⏰ Phone alerts → check-in reminders.** Downloads a calendar file with three daily repeating
   events and alarms. Import it once and your phone reminds you every day, app open or not.
3. **⏰ Phone alerts → open ticket deadlines.** A calendar alarm per open ticket, 30 minutes before
   the deadline and again when it hits. This is a snapshot — closed tickets leave stale events
   behind, so use it for the ones you can't afford to miss, not daily.
4. **In-app popup, sound and flashing tab title.** Only while the app is open. A backup for when
   you're already at the desk.

Getting the calendar file in: easiest is **calendar.google.com** on a computer → Settings → Import,
which syncs to the phone by itself. On iPhone, tapping the file opens Calendar directly. The Android
Google Calendar app can't import files — email it to yourself or use the computer route.

Sound needs the button tapped once per session — browsers block audio until you tap something.

## Patterns — the screen that actually saves you time

After a month of logging, open it. If TDO requests are a quarter of your tickets, the fix isn't
replying faster — it's putting that information where buyers see it before they ask. **A ticket you
never have to open beats one you close in five minutes.**

It also shows your average time to first reply and how many first replies landed after the deadline.

## Saved replies

One canned answer per case type. Tap Copy, paste into Shopee. Build 5–8 for your most repeated
questions and most of your backlog clears in seconds. Worth setting the same ones up as **Quick
Reply** in Shopee Seller Centre too, since those work inside the Shopee app itself.

## Backup and keeping two devices in step

Everything is in one browser on one device. Clearing browser data wipes it. Hit **Backup → Save
file (.json)** every week or so. The `.csv` opens in Excel, for records and disputes.

**Merge, don't replace.** Loading a file offers two modes. *Merge* keeps every ticket from both
devices — if the same ticket changed in two places the most recent edit wins, and history from both
sides is kept. *Replace* wipes this device first. Merge is the one you want for moving between
phone and desktop; merging the same file twice is harmless.

Deletes are remembered, so a ticket you deleted on the phone does not come back from the desktop's
older file.

**The workflow:** save the .json into Google Drive from the device you just used, then load it on
the other one before you start working there. Do it when you *switch* devices, not continuously,
and don't work on both at once with a stale file in between.

This is a hand-off, not live sync. Real live sync needs a server and an account — see below.

## If you want real live sync

The hand-off above covers most people. Live sync — both devices always current, nothing to
remember — needs a database behind the app. The realistic free option is **Supabase**, and the
trade-offs are real:

- Free projects **pause after 7 days with no requests**, so a quiet week means logging in to wake it
  before the board works again.
- Your buyer names and order refs would leave your devices and live in a hosted database. That needs
  proper login and row-level security, not just an API key in the page.
- Supabase is retiring the legacy `anon` / `service_role` keys in favour of `sb_publishable_` /
  `sb_secret_` keys, so anything built now should use the new ones.

Worth it if two devices genuinely both stay busy. Otherwise pick the phone as the real board and use
the merge hand-off.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole app — all logic, styling and storage |
| `sw.js` | Service worker; makes it work offline. Bump `CACHE` when `index.html` changes |
| `manifest.webmanifest` | Name, colours and icons for home-screen install |
| `icons/` | App icons |

## Not included, on purpose

No Shopee connection. Shopee's API needs a registered partner account, HMAC-signed requests, an
OAuth flow with token refresh, and a server you pay for — none of which can live in a static page,
because there's nowhere safe to keep a secret key. Direct API access is also limited to managed
sellers with an assigned account manager.

For a real connection that's a third-party platform's job — BigSeller has a permanent free tier
(1,500 orders/month, 3 stores) and is a Shopee Preferred Partner. Authorising one gives it ongoing
access to your shop data and buyer conversations. Normal trade-off, but a real decision.

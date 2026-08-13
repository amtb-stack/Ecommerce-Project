# Shopee Reply Tracker

A single file that tracks which buyers you still owe a reply to, and shouts at you before the
deadline passes. Works fully offline — no signup, no server, no monthly fee.

## How to open it

Download `index.html` and double-click it. That's the whole install.

Put it somewhere you won't lose it (Documents, or a folder in OneDrive/Google Drive so it syncs),
and right-click → **Pin to Start** or bookmark it so it's one click away every morning.

## The routine (this is the part that actually fixes the problem)

The board only works if it's wrapped in a habit. Three fixed times a day — 9am, 2pm, 9pm by default,
editable in Settings. At each one, in this order:

1. Clear unread chats in Shopee first.
2. Clear anything red or orange on the board.
3. Anything you can't answer yet (waiting on stock, waiting on supplier) doesn't get left in the
   chat. Tell the buyer "I'll confirm by tomorrow", then log it as **I owe an update** so it comes
   back to you instead of disappearing.

## How the board works

**Four columns.** Need reply → I owe an update → Waiting on buyer → Closed. Drag a card onto another
column, or use the dropdown on the card (the dropdown is the one that works on a phone).

**Urgency sets the clock.** L1 = 72 hours, L2 = 48, L3 = 24. Tap the coloured L pill on any card to
change it without opening the ticket. All three are editable in Settings.

**Set L3 to 12 hours if you want it to match Shopee exactly.** Shopee only counts your reply toward
your Chat Response Rate if it lands within 12 hours of the buyer's message. Auto-replies are excluded
from that calculation entirely — an auto-reply will not protect your rate. Quick Replies you select
yourself do count.

**Logging an update restarts the countdown.** Once you've replied, the clock starts again from your
reply, so the ticket goes quiet until the next window closes instead of glowing red forever.

## The reminders, ranked by how reliably they'll reach you

1. **Three alarms on your phone, labelled "Check board."** Costs nothing, works whether or not the
   computer is on. This is the one that actually works. Set it today.
2. **Windows Task Scheduler** opening this file at 9am / 2pm / 9pm — closest thing to a real popup.
   Task Scheduler → Create Basic Task → Daily → Start a program → browse to `index.html`.
3. **The in-app popup + sound.** Fires when a ticket goes past its deadline and at each check-in
   time, and flashes the browser tab title so you catch it from another tab.

Be clear about number 3's limit: **it only fires while this file is open in a tab.** Close the
browser and nothing reminds you. Treat it as a backup for when you're already at the desk, not as
the thing you rely on.

Sound needs the **"Turn on sound alerts"** button clicked once per session — browsers block audio
until you click something, which is why it's a button and not automatic.

Real Windows desktop notifications are not possible from a file opened by double-clicking. That
needs an `https://` address, and a local file is `file://`. If this ever gets hosted on a real web
address, the notification code is already there and will switch on by itself.

## Saved replies

Settings → your case types, then **Saved replies** → write one canned answer per type. Click Copy,
paste into Shopee. Build 5–8 of these for your most repeated questions (postage cost, restock, size,
tracking) and most of your backlog clears in seconds instead of minutes.

Worth setting the same ones up as **Quick Reply** inside Shopee Seller Centre too — those work
inside the Shopee app itself, and unlike auto-replies they still count toward your response rate.

## "What keeps coming up" — the highest-payoff screen

After a month of logging, open it. If "size, colour or specs" is a quarter of your tickets, the fix
isn't replying faster — it's putting the specs in the listing so those messages stop arriving.
**A ticket you never have to open beats one you close in five minutes.**

It also shows your average time to first reply and how many first replies landed after the deadline.
Those two numbers tell you whether the misses were a tooling problem or a routine problem.

## Backup — please read this one

Your tickets live inside one browser on one computer. **Clearing your browsing data wipes them.**
There's no cloud copy, because there's no server.

Hit **Backup → Save file (.json)** every week or so. That file also moves your whole board to a new
computer (Backup → Restore). The .csv export is for records and disputes — it opens in Excel.

If the red warning bar appears at the top, this browser is refusing to save anything. Open the file
in Chrome or Edge instead.

## If more than one person answers chats

Settings → "People who answer chats", one name per line. Every update you log gets a name attached,
so you don't get two people replying to the same buyer or everyone assuming the other one did it.

## Not included, on purpose

This does not connect to Shopee. Shopee's API needs a registered partner account, HMAC-signed
requests, an OAuth flow with token refresh, and a server you pay for — none of which can live inside
a file on your desktop, because there's nowhere safe to keep the secret key. Direct API access is
also limited to managed sellers with an assigned account manager.

If you want a real connection, that's a third-party platform's job — BigSeller has a permanent free
tier (1,500 orders/month, 3 stores) and is a Shopee Preferred Partner. Just know that authorising one
gives it ongoing access to your shop data and your buyer conversations. That's a normal trade-off,
but it's a real decision, not a formality.

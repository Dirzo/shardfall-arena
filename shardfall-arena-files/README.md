# Shardfall Arena

A 3v3 fantasy MOBA that runs in a browser: ten original champions, two lanes and
a jungle, twin altars, a 60-item armory with build paths, talent trees, and the
Voidmaw boss. Plays single-player against the computer, or online with up to six
people in a room.

- `offline/shardfall.html` — the whole single-player game in one file. Open it in
  a browser; nothing to install.
- everything else — the online version: a Node server that hosts matches and
  serves the same game to every player.

## Play online on your own machine

Needs Node 18 or newer. No dependencies, no install step.

```bash
node server.mjs
```

Open <http://localhost:8080>, click **Play online**, enter a name and press
**Create room**. You get a four-letter code; anyone who opens the same address
and types that code joins your lobby. On the same Wi-Fi, friends use your local
address instead (`http://192.168.x.x:8080`).

`npm start` does the same and rebuilds the page first.

## How a match works

The host shares the room code. Up to six players join, the sides balance as
people arrive, and **Switch team** moves you across. Everyone picks a champion on
the normal select screen and presses **Lock in** — no two players on a side can
take the same champion. The host presses **Start match**, and every empty slot
becomes a computer player. If someone drops out the computer takes their
champion, and they can rejoin with the same name and code to get it back. After
the match the host can start a rematch.

Controls: left click to move and attack, `Q W E R` abilities, `A` attack-move,
`H` hold, `S` stop, `1`–`6` items, `P` armory, `T` talents, `B` recall, `Tab`
scoreboard, `Esc` menu. Round-trip time to the server is shown top-right.

## Hosting

The **page** is a single static file, so any static host works. The **server**
needs an always-on Node process that accepts WebSocket connections.

| Where | Serves the page | Runs the server |
| --- | --- | --- |
| Your own machine | yes | yes |
| Render / Railway / Fly.io / any VPS or Docker host | yes | yes |
| Your machine behind a Cloudflare tunnel | yes | yes (your machine does the work) |
| GitHub Pages · Cloudflare Pages | yes | no — static hosting only |
| GitHub Actions | no | no — jobs finish, they don't stay up |
| Cloudflare Workers + Durable Objects | yes | only after a port; see below |

### A server on Render (free tier)

1. Point Render at this repository: New → Web Service.
2. Build `node build.mjs`, start `node server.mjs`. Render supplies the port and
   the server reads it. (`render.yaml` is here if you prefer their blueprint.)
3. Share the `https://your-app.onrender.com` link — that address serves both the
   page and the matches. Free instances sleep when idle, so the first visit after
   a quiet spell takes about half a minute to wake up.

Fly.io: `fly launch --now` (see `fly.toml`). Any Docker host:
`docker build -t shardfall . && docker run -p 8080:8080 shardfall`.
Pick a region near your group — everyone's delay is the distance to the server.

### The page on GitHub Pages

`.github/workflows/pages.yml` builds the page and publishes it on every push to
`main`. Two steps first:

1. Settings → Pages → Source: **GitHub Actions**.
2. Settings → Secrets and variables → Actions → Variables → new variable
   `SHARDFALL_SERVER`, set to your server's address, e.g.
   `wss://your-app.onrender.com`.

The workflow bakes that address into the page, so players just open the Pages
link. It also publishes the single-player file at `/single-player.html`.

Without the variable the page still loads, and players can paste a server
address into **Server address** in the Play online box, or you can send a link
with it attached: `?server=wss://your-app.onrender.com`.

### The page on Cloudflare (Workers static assets)

`wrangler.toml` is set up so a Cloudflare Worker serves the page and nothing
else — the matches run on the Node server above. In the Cloudflare dashboard,
open the `shardfall-arena` Worker and set:

- Build command: `node build.mjs`
- Deploy command: `npx wrangler deploy` (the default)
- Build variable: `SHARDFALL_SERVER` = `wss://your-app.onrender.com`

Every push to `main` then rebuilds the page with your server baked in, and
`https://shardfall-arena.<your-subdomain>.workers.dev` (or your own domain) is
the link you share. Cloudflare Pages works the same way: build command
`node build.mjs`, output directory `public`, same variable.

Without the variable the page still loads and players can paste a server
address into **Server address** in the Play online box, or you can add it to the
link: `?server=wss://your-app.onrender.com`.

### Cloudflare Workers + Durable Objects

One Durable Object per match would be a tidy fit, but this server is not a
drop-in for it: it uses Node's `http` and `vm` modules, which Workers doesn't
have. A port means bundling the game as a plain factory function (Workers will
not run code assembled at runtime), moving the room and lobby logic into a
Durable Object with the tick loop inside it, and serving the page from Pages or
the assets binding. Budget for the paid Workers plan too, since a match
simulates continuously and free Workers cap the processor time per request.

## What the server actually does

It runs the real game simulation — movement, abilities, damage, minions, jungle
monsters, gold, the computer teammates — about 30 times a second, and sends every
player a picture of the world 15 times a second. Clicks and key presses go up to
the server; nothing that matters is decided in a browser, so no player can fake
damage or gold and a laggy player can't stall the match. Traffic is roughly
20 KB/s per player early and 40–60 KB/s in a busy late game. One match costs a
small fraction of a processor core.

**It is not cheat-proof.** Snapshots carry every unit's position, so someone
digging through browser developer tools could see through the fog of war. Fine
among friends; not something to run as a public ladder.

Other limits: six players per room, 40 rooms at once, and an empty room closes
after two minutes (all near the top of `server.mjs`). No accounts, chat or
matchmaking — just room codes. `SPEED=4 node server.mjs` runs matches faster than
real time, for testing.

## Layout

| Path | What it is |
| --- | --- |
| `game/` | The game: champions and items (`p2.js`), world and combat (`p3.js`), abilities and AI (`p4.js`), simulation and rendering (`p5.js`), character art (`p7.js`), interface (`p6.js`), the four newest champions (`p8.js`), markup and styles (`p1.html`) |
| `server.mjs` | HTTP + WebSocket server: rooms, lobby, snapshots |
| `sim.mjs` | Loads the game's own code headlessly so the server can simulate it |
| `stubs.js` | Stand-ins for canvas, audio and storage during that headless load |
| `wsserver.mjs` | A small WebSocket implementation, so there are no dependencies |
| `net_client.js` | Browser side: lobby, sending orders, drawing server snapshots |
| `build.mjs` | Bundles `game/` + `net_client.js` into `public/index.html` |
| `offline/shardfall.html` | The single-player build, one self-contained file |
| `t_net.mjs`, `t_net3.mjs` | Tests: three players in a match; orders, abilities, talents, shop |

## Working on it

Edit files in `game/`, run `node build.mjs`, restart the server. Both builds come
from the same sources, so a balance change lands in single-player and online
alike. To rebuild the single-player file:

```bash
{ cat game/p1.html; echo '<script>'; cat game/p2.js game/p3.js game/p4.js \
  game/p5.js game/p7.js game/p6.js game/p8.js; echo; echo 'boot();'; \
  echo '</script>'; } > offline/shardfall.html
```

Tests need Playwright's Chromium and a server on port 8080:
`node server.mjs` in one terminal, `node t_net3.mjs` in another.

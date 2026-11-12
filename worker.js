// Cloudflare Worker entry point for Oberoi Rush.
//
// Static files are served by the ASSETS binding. `/ws` is deliberately kept on
// the same origin as the game so browsers never have to connect directly to
// the older Fleet Rush room server, whose origin allow-list rejects this site.

const ROOM_SERVER = `https://fleet-rush.sky-scrappers.workers.dev/ws`;
const GAME_ORIGIN = `https://oberoirush.aarushoberoi.workers.dev`;
const PRESENCE_WINDOW_MS = 20_000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === `/presence`) {
      if (request.method !== `POST`) {
        return new Response(`POST only`, {
          status: 405,
          headers: { Allow: `POST` },
        });
      }

      // A single Durable Object serializes the short-lived player heartbeats,
      // so the count is shared by every Cloudflare edge location.
      const id = env.PRESENCE.idFromName(`global`);
      return env.PRESENCE.get(id).fetch(request);
    }

    if (url.pathname !== `/ws`) return env.ASSETS.fetch(request);

    if (request.headers.get(`Upgrade`)?.toLowerCase() !== `websocket`) {
      return new Response(`WebSocket required.`, { status: 426 });
    }

    // Do not turn this into a general WebSocket proxy. The browser may only
    // reach the game endpoint from this Worker’s public origin.
    const origin = request.headers.get(`Origin`);
    if (origin && origin !== GAME_ORIGIN) {
      return new Response(`Origin not allowed.`, { status: 403 });
    }

    const upstreamHeaders = new Headers(request.headers);
    upstreamHeaders.set(`Origin`, `https://fleet-rush.sky-scrappers.workers.dev`);
    upstreamHeaders.set(`Host`, `fleet-rush.sky-scrappers.workers.dev`);

    // The upstream already implements rooms, matchmaking and match state.
    // Returning its upgraded response makes this Worker a narrow same-origin
    // bridge rather than a second, incompatible room server.
    return fetch(ROOM_SERVER, {
      method: `GET`,
      headers: upstreamHeaders,
    });
  },
};

export class PresenceCounter {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const playerId = url.searchParams.get(`id`) || ``;
    if (!/^[a-f0-9-]{36}$/i.test(playerId)) {
      return Response.json({ error: `bad id` }, { status: 400 });
    }

    const key = `player:${playerId}`;
    const leaving = url.searchParams.get(`leave`) === `1`;
    if (leaving) await this.ctx.storage.delete(key);
    else await this.ctx.storage.put(key, Date.now());

    const activePlayers = await this.ctx.storage.list({ prefix: `player:` });
    const staleKeys = [];
    let online = 0;
    const cutoff = Date.now() - PRESENCE_WINDOW_MS;

    for (const [storedKey, seenAt] of activePlayers) {
      if (typeof seenAt === `number` && seenAt >= cutoff) online += 1;
      else staleKeys.push(storedKey);
    }
    if (staleKeys.length) await this.ctx.storage.delete(staleKeys);

    return Response.json(
      { online: leaving ? online : Math.max(1, online) },
      { headers: { "Cache-Control": `no-store` } },
    );
  }
}

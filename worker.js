// Cloudflare Worker entry point for Oberoi Rush.
//
// Static files are served by the ASSETS binding. `/ws` is deliberately kept on
// the same origin as the game so browsers never have to connect directly to
// the older Fleet Rush room server, whose origin allow-list rejects this site.

const ROOM_SERVER = `https://fleet-rush.sky-scrappers.workers.dev/ws`;
const PRESENCE_SERVER = `https://fleet-rush.sky-scrappers.workers.dev/presence`;
const GAME_ORIGIN = `https://oberoirush.aarushoberoi.workers.dev`;

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

      // The central Fleet Rush counter only permits its own origin. This
      // same-origin Worker endpoint forwards a visitor's anonymous heartbeat
      // to it, so Oberoi Rush and Fleet Rush share one player count.
      const upstreamUrl = new URL(PRESENCE_SERVER);
      upstreamUrl.search = url.search;
      const upstream = await fetch(upstreamUrl, {
        method: `POST`,
        headers: {
          Origin: `https://fleet-rush.sky-scrappers.workers.dev`,
        },
      });
      return new Response(upstream.body, {
        status: upstream.status,
        headers: { "Cache-Control": `no-store` },
      });
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

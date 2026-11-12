// Counts everyone who currently has Oberoi Rush open (bot matches, online rooms, menus).
// The game POSTs /presence?id=<uuid> every 20 seconds; anyone seen in the last 50 seconds counts.
// Needs a Redis store (Upstash, free, added from the Vercel Marketplace).

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const KEY = `oberoi-rush:presence`;
const WINDOW_MS = 50000;

module.exports = async (req, res) => {
    res.setHeader(`Cache-Control`, `no-store`);
    if (req.method !== `POST`) {
        res.setHeader(`Allow`, `POST`);
        return res.status(405).json({ error: `POST only` });
    }
    const id = String((req.query && req.query.id) || ``);
    if (!/^[a-f0-9-]{36}$/.test(id))
        return res.status(400).json({ error: `bad id` });
    if (!URL_ || !TOKEN)
        return res.status(503).json({ error: `presence store not configured` });

    try {
        const now = Date.now();
        const r = await fetch(`${URL_}/pipeline`, {
            method: `POST`,
            headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": `application/json` },
            body: JSON.stringify([
                [`ZADD`, KEY, String(now), id],
                [`ZREMRANGEBYSCORE`, KEY, `0`, String(now - WINDOW_MS)],
                [`ZCARD`, KEY],
                [`PEXPIRE`, KEY, `120000`]
            ])
        });
        if (!r.ok) throw new Error(`store ${r.status}`);
        const out = await r.json();
        const online = Number(out[2] && out[2].result);
        if (!Number.isSafeInteger(online) || online < 0) throw new Error(`bad count`);
        return res.status(200).json({ online });
    } catch (e) {
        return res.status(502).json({ error: `presence unavailable` });
    }
};

(function() {
    let e = document.createElement(`link`).relList;
    if (e && e.supports && e.supports(`modulepreload`))
        return;
    for (let e of document.querySelectorAll(`link[rel="modulepreload"]`))
        n(e);
    new MutationObserver(e => {
        for (let t of e)
            if (t.type === `childList`)
                for (let e of t.addedNodes)
                    e.tagName === `LINK` && e.rel === `modulepreload` && n(e)
    }
    ).observe(document, {
        childList: !0,
        subtree: !0
    });
    function t(e) {
        let t = {};
        return e.integrity && (t.integrity = e.integrity),
        e.referrerPolicy && (t.referrerPolicy = e.referrerPolicy),
        t.credentials = e.crossOrigin === `use-credentials` ? `include` : e.crossOrigin === `anonymous` ? `omit` : `same-origin`,
        t
    }
    function n(e) {
        if (e.ep)
            return;
        e.ep = !0;
        let n = t(e);
        fetch(e.href, n)
    }
}
)();
var e = null
  , t = !1;
function n() {
    return e === null ? t ? `ONLINE COUNT UNAVAILABLE` : `CHECKING PLAYERS…` : `${e.toLocaleString()} ${e === 1 ? `PLAYER` : `PLAYERS`} ONLINE`
}
function r() {
    let r = crypto.randomUUID();
    try {
        let e = localStorage.getItem(`fleet-presence-id`);
        e && /^[a-f0-9-]{36}$/.test(e) && (r = e),
        localStorage.setItem(`fleet-presence-id`, r)
    } catch {}
    let i = !1;
    async function a() {
        if (!(i || document.hidden)) {
            i = !0;
            try {
                let t = await fetch(`/presence?id=${encodeURIComponent(r)}`, {
                    method: `POST`,
                    cache: `no-store`,
                    signal: AbortSignal.timeout(8e3)
                });
                if (!t.ok)
                    throw Error(`Presence unavailable`);
                let n = await t.json();
                if (!Number.isSafeInteger(n.online) || n.online < 0)
                    throw Error(`Invalid count`);
                e = n.online
            } catch {
                e = null
            } finally {
                t = !0,
                i = !1;
                let r = document.getElementById(`online-count`);
                r && (r.textContent = n(),
                r.classList.toggle(`unavailable`, e === null))
            }
        }
    }
    a(),
    setInterval( () => void a(), 2e4),
    document.addEventListener(`visibilitychange`, () => {
        document.hidden || a()
    }
    ),
    window.addEventListener(`online`, () => void a())
}
var i = class {
    adaptive;
    maxHz;
    maxWindow;
    pace;
    initialCredit;
    minHz;
    pending = [];
    lastSent = -1 / 0;
    lastAck = 0;
    previousAck = null;
    recoverAt = 0;
    minRtt = 1 / 0;
    credit = 2;
    rtts = [];
    hz;
    stats = {
        sent: 0,
        suppressed: 0,
        acks: 0,
        rtt: 0,
        inFlight: 0,
        peakInFlight: 0,
        bytes: 0
    };
    constructor(e=!0, t=20, n=32, r=!0, i=2, a=.5) {
        this.adaptive = e,
        this.maxHz = t,
        this.maxWindow = n,
        this.pace = r,
        this.initialCredit = i,
        this.minHz = a,
        this.hz = t,
        this.credit = Math.min(n, i)
    }
    get window() {
        return this.previousAck ? Math.max(2, Math.min(this.credit, this.maxWindow, Math.ceil((this.minRtt + 100) * this.hz / 1e3) + 3)) : Math.min(this.credit, this.maxWindow)
    }
    get stalled() {
        return this.pending.length > 0
    }
    stalledFor(e) {
        return this.pending.length ? e - Math.max(this.lastAck, this.pending[0].at) : 0
    }
    ready(e) {
        let t = !this.adaptive || this.pending.length < this.window && e - this.lastSent >= 1e3 / this.hz - 1;
        return t || this.stats.suppressed++,
        t
    }
    sent(e, t, n) {
        this.lastSent = n,
        this.adaptive && this.pending.push({
            tick: e,
            at: n,
            bytes: t
        }),
        this.stats.sent++,
        this.stats.bytes += t,
        this.stats.inFlight = this.pending.length,
        this.stats.peakInFlight = Math.max(this.stats.peakInFlight, this.pending.length)
    }
    acknowledge(e, t) {
        let n = this.pending.length - 1;
        for (; n >= 0 && this.pending[n].tick > e; )
            n--;
        if (n < 0 || !Number.isInteger(e) || e > this.pending[this.pending.length - 1].tick)
            return !1;
        let r = this.pending.splice(0, n + 1)
          , i = r[r.length - 1]
          , a = Math.max(1, t - i.at);
        if (this.minRtt = Math.min(this.minRtt, a),
        this.lastAck = t,
        this.stats.rtt = a,
        this.stats.acks++,
        this.stats.inFlight = this.pending.length,
        !this.pace)
            return this.credit = this.maxWindow,
            this.previousAck = {
                ...i,
                received: t
            },
            !0;
        let o = this.previousAck;
        this.rtts.push(a),
        this.rtts.length > 9 && this.rtts.shift();
        let s = this.rtts
          , c = s.slice(-4).filter( (e, t, n) => t > 0 && e > n[t - 1] + 15).length >= 2
          , l = s.slice(0, 3).reduce( (e, t) => e + t, 0) / Math.min(3, s.length)
          , u = s.slice(-3).reduce( (e, t) => e + t, 0) / Math.min(3, s.length)
          , d = o && t - o.received > 400 && a - (o.received - o.at) > 300 && i.at - o.at < (t - o.received) * .5
          , f = this.minRtt > 400 && s.length >= 3 && s.slice(-3).every( (e, t, n) => t === 0 || e > n[t - 1] + 30) && a - s[s.length - 3] > 150;
        if (o && (f || s.length >= 6 && c && u - l > 200 || d) && t >= this.recoverAt) {
            let e = t - o.received
              , n = r.length * 1e3 / Math.max(1, e);
            this.hz = Math.max(this.minHz, Math.min(this.hz * .7, n * .9)),
            this.credit = Math.min(this.maxWindow, this.initialCredit),
            this.recoverAt = t + 1500,
            this.rtts = []
        } else
            this.credit = Math.min(32, this.credit + 1),
            t >= this.recoverAt && (!c || u < l + 100) && (this.hz = Math.min(this.maxHz, this.hz + Math.max(.5, this.hz * .15)),
            this.recoverAt = t + 1e3);
        return this.previousAck = {
            ...i,
            received: t
        },
        !0
    }
}
  , a = class extends i {
    constructor() {
        super(!0, 30, 24, !0, 16, 8)
    }
}
  , o = class {
    lastAt = 0;
    lastTick = -1;
    jitter = 0;
    interval = 50;
    bestOffset = 1 / 0;
    delay = 65;
    lastProgress = 0;
    samples = 0;
    observe(e, t) {
        if (!(e <= this.lastTick)) {
            if (this.lastAt && this.lastTick >= 0) {
                let n = t - this.lastAt
                  , r = (e - this.lastTick) * 1e3 / 60;
                this.jitter += (Math.abs(n - r) - this.jitter) * .15,
                this.interval += (r - this.interval) * .2;
                let i = Math.min(350, Math.max(65, this.interval + this.jitter * 2));
                this.delay += (i - this.delay) * (i > this.delay ? .5 : .05)
            }
            this.lastAt = t,
            this.lastProgress = t,
            this.lastTick = e,
            this.samples++,
            this.bestOffset = Math.min(this.bestOffset, t - e * 1e3 / 60)
        }
    }
    reset() {
        this.lastAt = 0,
        this.lastTick = -1,
        this.jitter = 0,
        this.interval = 50,
        this.delay = 65,
        this.lastProgress = 0,
        this.samples = 0,
        this.bestOffset = 1 / 0
    }
    age(e) {
        return this.samples ? Math.max(0, e - this.lastProgress, e - this.lastTick * 1e3 / 60 - this.bestOffset) : 0
    }
    canPredict(e) {
        return this.age(e) < 600
    }
    get stats() {
        return {
            samples: this.samples,
            jitter: this.jitter,
            interval: this.interval,
            delay: this.delay
        }
    }
}
  , s = [`left`, `right`, `jet`, `down`, `fire`, `reload`, `swap`, `grenade`, `melee`, `pickup`, `crouch`, `grenadeCycle`];
function c(e) {
    return s.reduce( (t, n, r) => e[n] ? t | 1 << r : t, 0)
}
var l = {
    name: `Oberoi Rush`,
    creator: `Aarush Oberoi`,
    community: `Oberoi`,
    tagline: `A AARUSH OBEROI GAME`,
    colors: {
        ink: `#101014`,
        panel: `#211b2f`,
        purple: `#a565ff`,
        light: `#d4b5ff`,
        deep: `#6433ae`,
        orange: `#ffb454`,
        white: `#f5f3fa`,
        muted: `#aaa1ba`
    },
    teams: [`OBEROI`, `LILY`],
    teamColors: [`#ad78ff`, `#ffb454`]
}
  , u = {
    "classic-outpost": [`LILYVILLE OUTPOST`, `The Oberoi Army home base`],
    "classic-catacomb": [`OBEROI SMP CAVES`, `A clutch through the underground`],
    "classic-high-tower": [`STREAM TOWER`, `Take the high ground above the studio`],
    "classic-bottleneck": [`RAID GATE`, `Push through the Oberoi base gates`],
    "classic-subdivision": [`OBEROI BASE`, `Two builds, one battleground`],
    "classic-no-escape": [`LOCKED IN`, `No backing out of this challenge`],
    "classic-so-long": [`THE LONG STREAM`, `Go the distance with the Oberoi Army`],
    "classic-lunarcy": [`MOON OBEROI`, `One giant boost for the squad`],
    "classic-icebox": [`FROST SMP`, `Keep your cool on the ice`],
    "classic-snow-blind": [`SNOW RAID`, `A cold front hits the server`],
    "classic-pyramid": [`BLOCK TEMPLE`, `Climb the lost block kingdom`],
    "classic-overseer": [`WATCH PARTY`, `Every angle is a highlight`],
    "classic-suspension": [`SKY BRIDGE`, `A bridge between rival builds`],
    "classic-cliffhanger": [`CLUTCH CLIFFS`, `One boost away from a highlight`],
    "classic-crossfire": [`CROSS STREAM`, `Every corridor has company`],
    "classic-undermine": [`UNDER THE BASE`, `The secret tunnels below Lilyville`],
    "classic-crucible": [`OBEROI FORGE`, `Bring the heat to the squad`],
    "classic-stronghold": [`LILYVILLE KEEP`, `Hold the heart of the server`],
    "classic-entombed": [`LOST SMP`, `Find your way through the old builds`],
    "classic-deadlock": [`FINAL CLUTCH`, `The last push decides it`],
    drydock: [`OBEROI DOCK`, `Where the next adventure launches`],
    canopy: [`JUNGLE SMP`, `Take the fight above the treetops`],
    reactor: [`LIVE CORE`, `Keep the energy on full`]
};
function d(e) {
    let t = u[e];
    return t ? {
        name: t[0],
        subtitle: t[1]
    } : null
}
var f = {
    D: `dirt`,
    G: `grass`,
    C: `concrete`,
    W: `wood`,
    S: `sand`,
    B: `rock`,
    M: `rock`,
    N: `snow`,
    I: `ice`
}
  , p = {
    outpost: [`#c8dcdd`, `#918a7c`, `#565243`, `#6f9d70`],
    desert: [`#c8dcdd`, `#9b8f68`, `#73654a`, `#b8ab80`],
    snow: [`#c8dcdd`, `#b8ccdc`, `#8497ae`, `#82a5c7`],
    moon: [`#16182a`, `#878787`, `#4e4e4e`, `#b3b3b3`],
    facility: [`#c8dcdd`, `#808080`, `#4d4d4d`, `#b3b3b3`]
};
function m(e, t) {
    let n = [];
    for (let r of e.split(`|`)) {
        if (r === `^`) {
            n.push(n[n.length - 1]);
            continue
        }
        let e = ``;
        for (let[,t,n] of r.matchAll(/([^0-9])(\d*)/g))
            e += t.repeat(n ? Number(n) : 1);
        if (e.length !== t)
            throw Error(`classic grid row width ${e.length} != ${t}`);
        n.push(e)
    }
    return n
}
function h(e, t=14) {
    let n = e.length
      , r = e[0]?.length ?? 0
      , i = new Uint8Array(n * r)
      , a = [];
    for (let o = 0; o < n; o++)
        for (let s = 0; s < r; ) {
            let c = e[o][s];
            if (!`DGCWSBMNI`.includes(c) || i[o * r + s]) {
                s++;
                continue
            }
            let l = 1;
            for (; s + l < r && e[o][s + l] === c && !i[o * r + s + l]; )
                l++;
            let u = 1;
            grow: for (; o + u < n; ) {
                for (let t = 0; t < l; t++)
                    if (e[o + u][s + t] !== c || i[(o + u) * r + s + t])
                        break grow;
                u++
            }
            for (let e = o; e < o + u; e++)
                i.fill(1, e * r + s, e * r + s + l);
            a.push({
                x: s * t,
                y: o * t,
                w: l * t,
                h: u * t,
                kind: f[c]
            }),
            s += l
        }
    return a
}
function g(e) {
    let t = m(e.grid, e.cols);
    if (t.length !== e.rows)
        throw Error(`${e.id}: ${t.length} rows != ${e.rows}`);
    let n = ([e,t]) => ({
        x: e,
        y: t
    });
    return {
        id: e.id,
        name: e.name,
        subtitle: e.subtitle,
        width: e.cols * 14,
        height: e.rows * 14,
        platforms: h(t),
        spawns: e.spawns.map(n),
        pickups: e.pickups,
        palette: p[e.theme],
        classic: !0,
        theme: e.theme,
        era: e.era,
        traits: e.traits,
        bases: [n(e.bases[0]), n(e.bases[1])],
        bombSites: e.bombSites.map(n),
        terrain: {
            cell: 14,
            cols: e.cols,
            rows: e.rows,
            grid: t
        },
        reference: {
            source: `https://mini-militia-classic.fandom.com/wiki/Maps`,
            render: e.source,
            nativeSize: e.native
        }
    }
}
var _ = [g({
    id: `classic-outpost`,
    name: `OUTPOST`,
    subtitle: `Concrete bunker vs log bunker over grass caves`,
    theme: `outpost`,
    era: `classic`,
    traits: [],
    source: `Output_full.png`,
    native: [6656, 2304],
    cols: 208,
    rows: 72,
    spawns: [[245, 343], [2625, 595], [1393, 889], [1981, 175], [1113, 175], [721, 805], [2065, 679], [2457, 175], [1561, 343], [665, 399]],
    bases: [[245, 343], [2625, 595]],
    bombSites: [[1029, 679], [1925, 623]],
    pickups: [{
        x: 1617,
        y: 620,
        kind: `ak47`
    }, {
        x: 1309,
        y: 676,
        kind: `sniper`
    }, {
        x: 1141,
        y: 452,
        kind: `grenade`,
        grenade: `frag`
    }, {
        x: 1869,
        y: 592,
        kind: `rocket`
    }, {
        x: 1057,
        y: 676,
        kind: `health`
    }, {
        x: 945,
        y: 452,
        kind: `magnum`
    }, {
        x: 917,
        y: 788,
        kind: `shotgun`
    }, {
        x: 833,
        y: 228,
        kind: `uzi`
    }, {
        x: 2177,
        y: 396,
        kind: `fuel`
    }, {
        x: 609,
        y: 648,
        kind: `pistol`
    }, {
        x: 2317,
        y: 662,
        kind: `grenade`,
        grenade: `gas`
    }, {
        x: 469,
        y: 298,
        kind: `smg`
    }, {
        x: 413,
        y: 676,
        kind: `health`
    }, {
        x: 441,
        y: 88,
        kind: `grenade`,
        grenade: `mine`
    }, {
        x: 2625,
        y: 340,
        kind: `fuel`
    }, {
        x: 105,
        y: 676,
        kind: `rifle`
    }],
    grid: `.208|^|^|^|^|^|^|^|.31D2.175|.29D6.173|.22D16.170|.20D20.168|.20C20.98D.69|.20C20.96GD2G.68|.20C20.39G2.53G2D4G5.30G2.31|.20C20.38GD2G.52D11G.28GD2G.30|.20C4c12C4.38D4.52D12.28D4.30|.20C4c.2c2.2c2.2cC4.37GD4G.51D12.21d2.4GD4.30|.20C4c.2c2.2c2.2cC4.19G2.14G2D6G2.50D11.20d4.2GD5.30|.20C4c12C2.20GD2G.12GD10G.49D10d2.19d4G2D5d.30|.22c16.20D4.12D12.50D8d5.17d4D6d2.30|.22c16.20D4.12D12.51D6d8.14d4GD5d4.29|.22c13C3.5d2.14D2.14D10.30G6.22d11.11d2G2D5d5.29|.22c11C7.2d4.13D2.13dD10.29GD6G.22d11.9d2GD6d7.28|.20C20.2d4.28d2D8.30D8.22d13.7d2D6.d8.27|.19dC20.d6.12d2.13d3D5.31GD8.23d14.6GD5.3d9.25|.14G3D2GC20.d6.11d4.13d6.30G2D9.23d17.G2D5.7d9.G2.19|.14D6C21d7.10d4.14d4.30GD11.24d16GD6d.9d7GD2G.18|.14D27Gd6.10d4.14d4.22D.7D12.24d16D6d2.11d5D4.18|.14D28Gd6.9d5.14d4.19GD2G.5GD12.24d16D5d3.12d4D4.18|.15D28G2D2G3.9d4.8d3.3d5.16G2D4GD2G2D12.25d8G3d2.4D3.d2.18D2.19|.15D35.10d4.6d5.3d4.16D23.25d8D3G.5D2.22D2.19|.16D8.D25.10d4.6d6.2d4.16D22.26d4G4D4.18W6s.6sW6.12|.17D5d.2D25.11d4.5d5G.G2d3.16D21.27d3GD8.18W7.6W7.12|.19d4.3D23.12d5G9DGD2G3.16D20.24G7D8d.18W7d6W7.12|.20d2.5D22.13d4D16.16D19.25D15d.18W8d4W8.12|.20d2.7D19.14d4D16.16D18.26D14d2.18W4d12W4.12|.19d3.7D6.2D10.15d4D16.16D17.27D13d3.18W4d.2d2.2d2.2dW4.12|.18d3.9D4.7d6.16d2.2D14.18D15.29D11d4.18W4d.2d2.2d2.2dW4.12|.18d2.11D2.9d6.19D14.18D14d2.28D10.d4.20d16.14|.18d2.22d6.20D12.20D12d5.27D8.2d4.20d16.14|.18d3.21d5.16d2.4D9.23D9d9.24d2D5d.3d4.20d16.14|.18d4.20d5.15d4.4d5.27d17G.22d9.4d2.21W3d10W3.14|.18d4.20d4.16d4.4d6.25d17GDG2.20d8.26W7d6W7.12|.18d4.20d4.16d4.4d7.22d19D4.4D.6D2.7d8.26W20.12|.17d6.18d5.15Gd4G.2d10.18d20GD4G.GD2G.4GD2G.5d10.25W20.12|.17d6.18d5.14GDd4DG2d11G.14d20G2D6GD4G4D4G2.3d10.23G2W20G2.10|.16d8.16d6.12G2D2d4D3Gd8G2DG.12d20GD23.2Gd10G.22D3W18D3.10|.15d10D.11D2d3G8.8D4d4D4d8D4.8D.3d20D24G2DGd8GDG2.16G4D24.10|.13d5Gd6DG.9GD2GdGD8G.6GD4d4D4Gd6GD4G.5GD2G.2d19GD28Gd6GD4Gd2.8G2.2GD28.10|.6G12DG6D2G3d4G2D4GD10G2D2G2D4d6D4G6D6G5D4G6d8G7D30G6D6G10D2G2D29.10|.6D24d4D27d6D31d8D92.10|.6D24d4D26d8D30d8D92.10|.6D24d4D8d3D13d11D29d8D92.10|.6D24d5D4d46D12d9D91.11|.6D24d5D2d50D10d9D91.11|.6D24d58D8d10D90.12|.6D24d59D5d12D89.13|.7D22d9D12d4D12d4D12d24D88.14|.7D22d7D49d21D87.15|.8D8.D12d6D5.D7.D35.Dd20D78.D7.16|.9D5.3D14d2D6.2D6.2D14.2D5.3D9.4D3d17D17.2D17.3D13.3D5.3D13.3D6.17|.18D20.4D4.4D12.27D2d15D16.64D4.18|.19D18.6D2.6D10.30D2d13D15.66D2.19|.20D16.17D7.33Dd12D14.88|.21D13.19D6.35D7d5D13.89|.54D4.43D2d2D13.90|.55D2.46D2.2D10.91|.108D8.92|.109D5.94|.208|^`
}), g({
    id: `classic-catacomb`,
    name: `CATACOMBS`,
    subtitle: `Sandstone ring tunnel around a four-way cross`,
    theme: `desert`,
    era: `classic`,
    traits: [],
    source: `11catacombs_new.png`,
    native: [7040, 4480],
    cols: 220,
    rows: 140,
    spawns: [[413, 1043], [2681, 1043], [1533, 1841], [1589, 343], [1225, 1043], [749, 1771], [2317, 1785], [833, 371], [2317, 427], [1981, 1043], [1757, 1435], [1169, 1463]],
    bases: [[413, 1043], [2681, 1043]],
    bombSites: [[1001, 1043], [2093, 1043]],
    pickups: [{
        x: 1589,
        y: 984,
        kind: `saw`
    }, {
        x: 1589,
        y: 648,
        kind: `flamer`
    }, {
        x: 1309,
        y: 648,
        kind: `grenade`,
        grenade: `frag`
    }, {
        x: 1841,
        y: 648,
        kind: `shotgun`
    }, {
        x: 1449,
        y: 1432,
        kind: `health`
    }, {
        x: 2093,
        y: 704,
        kind: `magnum`
    }, {
        x: 973,
        y: 676,
        kind: `rocket`
    }, {
        x: 805,
        y: 1040,
        kind: `uzi`
    }, {
        x: 2317,
        y: 1040,
        kind: `fuel`
    }, {
        x: 2149,
        y: 1390,
        kind: `pistol`
    }, {
        x: 1197,
        y: 312,
        kind: `grenade`,
        grenade: `gas`
    }, {
        x: 1897,
        y: 312,
        kind: `smg`
    }, {
        x: 917,
        y: 1544,
        kind: `health`
    }, {
        x: 637,
        y: 1446,
        kind: `grenade`,
        grenade: `mine`
    }, {
        x: 497,
        y: 620,
        kind: `fuel`
    }, {
        x: 1757,
        y: 1852,
        kind: `rifle`
    }, {
        x: 1141,
        y: 1838,
        kind: `rifle`
    }, {
        x: 1981,
        y: 1838,
        kind: `health`
    }, {
        x: 2569,
        y: 1460,
        kind: `m14`
    }, {
        x: 525,
        y: 1656,
        kind: `grenade`,
        grenade: `frag`
    }],
    grid: `.220|^|^|^|^|^|^|^|^|^|^|^|.94S4.4S4.8S4.4S4.94|.65S.7S2.6S2.2S2.3S.2S6.2S6.6S6.2S6.2S.2S3.2S2.2S2.6S.3S2.7S.6S2.3S.45|.55S122.43|.54S124.42|.53S15sS10sS15s2S18sS7s2S53.42|.49S2.S15s4S6s4S12s6S4s2S8s4S4s6S24s2S26.41|.47S12s98S22.41|.46S11s102S21.40|.45S10s106S21.38|.44S9s110S20.37|.39S12s118S17.34|.38S11s33Ss55Ss3Ss28S16.33|.37S11s29S9s11S2s22W2s10S13s27S15.32|.36S11s26S2sS12sS3sS2s2S2s19SsW7s2Ss2S16sSs3S2s3Ss16S14.31|.31S15s16S45s6S50s14S12.31|.30S15s16S45s8S48s17S11.30|.30S13s15S46B4s4B4S46s18S10.30|.29S12s16S47B4s4B4S47s18S10.29|.29S10s16S49B4s4B4S47s18S10.29|.28S9s17S50B4s4B4S48s18S10.28|.28S8s18S50B4s4B4S50s16S10.28|.27S8s20S49B4s4B4S51s15S11.27|.27S7s23S47B4s4B4S57s10S10.27|.26S7s26S45B4s4B4S58s10S10.26|.26S6s14S3s12S43B4s4B4S58s10S10.26|.25S6s14S5s13S41B4s4B4S57s12S10.25|.25S6s12S8s14S14s2S23B4s4B4S55s14S10.25|.24S6s12S10s15S10s6S21B4s4B4S53s17S10.24|.24S6s12S12s14S8s8S4B20s4B20S15s2S10sS7s19S10.24|.23S7s11S14s14S6s10S3B20s4B20S13s6S6s4S4s21S11.23|.23S6s12S16s13S4s12S2B20s4B20s5S6s31S3s10S10.23|.22S6s12S18s13S2s14SB20s4B20s7S2s32S5s10S10.22|.22S6s10S20s112S8s10S10.22|.21S6s10S22s110S10s10S10.21|.21S6s8S24s96S7s4S13s11S9.21|.20S6s8S26s42Bs51S9s2S15s11S9.20|.20S6s8S28s24S2B20s4B20s22S26s12S8.20|.19S7s8S29s22S3B20s4B20s21S28s12S8.19|.19S6s9S36s9S9B20s4B20S6s15S28s12S8.19|.18S6s10S37s7S10B20s4B20S7s13S30s12S8.18|.18S6s10S34B4s4B4S24B4s4B4S24B4s4B4S30s12S8.18|.17S6s10S35B4s4B4S24B4s4B4S24B4s4B4S31s11S9.17|.17S6s10S35B4s4B4S24B4s4B4S24B4s4B4S31s11.S8.17|.16S6s10S36B4s4B4S24B4s4B4S24B4s4B4S32s10.2S8.16|.16S6s10S36B4s4B4S24B4s4B4S24B4s4B4S33s9.2S8.16|.15S7s9S37B4s4B4S24B4s4B4S24B4s4B4S34s8.3S8.15|.15S7s9S37B4s4B4S24B4s4B4S24B4s4B4S35s7.4S7.15|.14S8s8S38B4s4B4S24B4s4B4S24B4s4B4S36s6.4sS7.14|.14S8s8S38B4s4B4S16B12s4B12S16B4s4B4S36s6.4s2S6.14|.13S9s8S38B4s4B4S16B12s4B12S16B4s4B4S37s6.2s4S6.13|.13S8s9S38B4s4B4S16B12s4B12S16B4s4B4S37s6.2s4S6.13|.12S8s10S38B4s4B4S16B12s4B12S16B4s4B4S38s12S6.12|.12S8s10S38B4s4B4S16B4s20B4S16B4s4B4S38s12S6.12|.11S8s10S39B4s4B4S16B4s20B4S16B4s4B4S39s11S7.11|.11S8s10S39B4s4B4S16B4s20B4S16B4s4B4S39s12S6.11|.10S8s10S40B4s4B4S16B4s20B4S16B4s4B4S40s12S6.10|.10S8s10B12S12B20s4B24s20B24s4B20S8sS3B12s12S6.10|.10S8s10B12S12B20s4B24s20B24s4B20sS6s4SB12s11S7.10|.10S8s10B12S3s6S3B20s4B24s20B24s4B20s2S4s6B12s11S7.10|.10S8s10B12Ss10SB20s4B24s10Bs9B24s4B20s3S2s7B12s10S8.10|.10S8s88B8s88S8.10|^|^|.10S8s64Bs23B8s20Bs3Bs15Bs47S8.10|.10S8s10B12S2s8S2B20s4B24s20B24s4B20S2s10B12s10S8.10|.10S8s10B12S3s6S3B20s4B24s20B24s4B20S3s9B12Ss9S8.10|.10S8s10B12S12B20s4B24s20B24s4B20S6s4S2B12Ss9S8.10|.10S8s10B12S12B20s4B24s20B24s4B20S7s2S3B12S2s8S8.10|.10S8s10S40B4s4B4S16B4s20B4S16B4s4B4S42s8S8.10|.10S9s10S39B4s4B4S16B4s20B4S16B4s4B4S41s9S8.10|.11S8s10S39B4s4B4S16B4s20B4S16B4s4B4S39s11S8.10|.12S8s10S38B4s4B4S16B4s2Bs15BsB4S16B4s4B4S37s13S8.10|.12S8s10S38B4s4B4S16B12s4B12S16B4s4B4S15s2S19s14S8.10|.13S8s9S38B4s4B4S16B12s4B12S16B4s4B4S13s6S16s14S9.10|.13S8s10S37B4s4B4S16B12s4B12S16B4s4B4S11s10S13s15S9.10|.14S8s10S36B4s4B4S16B12s4B12S16B4s4B4S9s14S10s15S10.10|.14S8s10S36B4s4B4S24B4s4B4S24B4s4B4S10s4S4s4S10s14S12.10|.14S9s10S35B4s4B4S24B4s4B4S24B4s4B4S11s2S6s2S10s14S13.10|.15S8s11S34B4s4B4S24B4s4B4S24B4s4B4S31s12S14.11|.16S8s11S33B4s4B4S24B4s4B4S24B4s4B4S30s12S14.12|.16S8s12S32B4s4B4S24B4s4B4S24B4s4B4S30s12S14.12|.17S8s12S31B4s4B4S24B4s4B4S24B4s4B4S3s2S25s11S14.13|.17S8s12S31B4s4B4S24B4s4B4S24B4s4B4s5S24s12S13.14|.18S8s12S30B4s4B4S24B4s4B4S24B4s4B4s6S22s12S13.15|.18S8s12S30s10S10B20s4B20S12s14S5sS16s12S12.16|.18S9s12S8s2S18s12S9B20s4B20S3s2S6s16S2s4S6s2S6s12S12.17|.19S8s14S5s4S5s2S6s18S6sB20s4B20S2s4S4s24S4s21S12.17|.20S8s15S2s6S2s6S2s22S2s3B20s4B20Ss6S2s26S2s21S12.18|.20S8s162S12.18|.21S8s124S2s34S13.18|.21S8s122S6s32S12.19|.22S8s120S8s30S12.20|.22S8s20S4s32S2B20s4B20S2s15S10s2S2s23S14.20|.22S9s14S2sS8sS2s26S3B20s4B20S3s6S2s2S19s21S14.21|.23S8s12S20s20S5B20s4B20S35s16S15.22|.24S8s10S20s20S6B20s4B20S34s16S15.23|.24S8s10S20s20S22B4s4B4S50s16S14.24|.25S8s9S21s18S23B4s4B4S50s15S14.25|.25S8s10S20s18S23B4s4B4S49s16S13.26|.26S8s10S20s16S24B4s4B4S48s16S13.27|.26S8s10S22s12S26B4s4B4S47s17S12.28|.26S8s11S22s10S27B4s4B4S45s18S12.29|.27S7s15S55B4s4B4S43s20S11.30|.28S6s16.S53B4s4B4S41s21S11.31|.28S6s16.3S51B4s4B4S40s22S10.32|.29S6s16.4S48sB4s4B4S39s22S10.33|.29S6s16.6S42s5B4s4B4s5S33s9.2s12S9.34|.30S6s16.6S39s7B4s4B4s7S30s8.6s9S9.35|.30S8s14.6s2S8sS26s29S8sS10s2S6s10.6s9S8.36|.30S9s14.5s3S6s4S16s2S4s32S6s4S6s6S2s14.2s10S8.37|.31S11s12.4s4S4s7S6s47S4s45S8.37|.32S11s11.4s5S2s10S2s50S2s45S8.38|.32S14s8.4s116S8.38|.33S14s8.2s34.2s10.2s68S9.38|.33S17s5.2s34.2s10.2s68S9.38|.34S17s39.4s8.4s66S10.38|.34S20s36.4s8.4s41.s22S12.38|.35S20s35.4s9.2s41.3s16S2s2S12.39|.37S21s32.5s8.2s38.6s14S16.41|.39S20s31.6s45.9s12S15.43|.40S22s28.6sS2s22S2s17.10s11S15.44|.41S22s18S2s2S3sS2.5S4sSs4Ss2S2sS3s2S2s2S2s7Ss2S2s3SsS3.2S2.2Ss3S2s2S2sS15.45|.49S25s4S97.45|.51S24s2S97.46|.53S114.2S5.46|.55S110.6S2.47|.57S6.10S6.18S6.18S6.93|.59S2.14S2.22S2.22S2.95`
}), g({
    id: `classic-high-tower`,
    name: `HIGH TOWER`,
    subtitle: `Twin concrete bunkers flank a timber tower`,
    theme: `outpost`,
    era: `classic`,
    traits: [],
    source: `2highTower_new.png`,
    native: [4992, 3328],
    cols: 156,
    rows: 104,
    spawns: [[301, 651], [1869, 651], [1085, 1295], [1085, 203], [441, 1253], [1701, 1267], [1253, 791], [749, 987], [581, 399], [2065, 1183]],
    bases: [[301, 651], [1869, 651]],
    bombSites: [[721, 987], [1449, 987]],
    pickups: [{
        x: 945,
        y: 788,
        kind: `sniper`
    }, {
        x: 1141,
        y: 536,
        kind: `m14`
    }, {
        x: 945,
        y: 508,
        kind: `grenade`,
        grenade: `frag`
    }, {
        x: 1281,
        y: 410,
        kind: `rocket`
    }, {
        x: 553,
        y: 746,
        kind: `health`
    }, {
        x: 1533,
        y: 998,
        kind: `magnum`
    }, {
        x: 553,
        y: 1068,
        kind: `ak47`
    }, {
        x: 1645,
        y: 368,
        kind: `uzi`
    }, {
        x: 1393,
        y: 1292,
        kind: `fuel`
    }, {
        x: 749,
        y: 1292,
        kind: `pistol`
    }, {
        x: 1981,
        y: 872,
        kind: `grenade`,
        grenade: `gas`
    }, {
        x: 189,
        y: 872,
        kind: `smg`
    }, {
        x: 1897,
        y: 340,
        kind: `health`
    }, {
        x: 217,
        y: 340,
        kind: `grenade`,
        grenade: `mine`
    }, {
        x: 2093,
        y: 396,
        kind: `fuel`
    }, {
        x: 105,
        y: 1180,
        kind: `shotgun`
    }],
    grid: `.156|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|.72W12.72|^|^|^|.64W12d4W12.64|^|^|^|.64W4d20W4.64|.64W4d.2d6.2d6.2dW4.64|.15G7.42W4d.2d6.2d6.2dW4.42G7.15|.14GD7.44d24.44D7G.14|.14D8G4.12D.27d24.27D2.11G4D8.14|.13GD12G.9GD2G.26d24.26GD2G.9GD12G.13|.6G7D14G9D4G2.24W2d8W4d8W2.24G2D4G9D14G7.6|.6D36.22W4d8W4d8W4.22D36.6|.6D6C24D6.22W4d6W8d6W4.22D6C24D6.6|.6D6C24D6.22W4d5W10d5W4.22D6C24D6.6|.6D6C24D5.23W4d5W10d5W4.23D5C24D6.6|.6D6C24D5.25d6W12d6.25D5C24D6.6|.6D2C8c16C8.26d24.26C8c16C8D2.6|^|.6D2C8c16C8.26W3d18W3.26C8c16C8D2.6|.6D2C8c16C8.24W7d14W7.24C8c16C8D2.6|.6D2C4c24C4.24W12d4W12.24C4c24C4D2.6|.6D2C4c5.2c10.2c5C4.24W12d4W12.24C4c5.2c10.2c5C4D2.6|^|.6D2C4c24C2.26W12d4W12.26C2c24C4D2.6|.6D2C4c26.34W4d4W4.34c26C4D2.6|^|.6D2C4c20C6.34W4d4W4.34C6c20C4D2.6|.6D2C4c20C8.32s.d8.s.32C8c20C4D2.6|.6D2C4c6C8c6C8.34d8.34C8c6C8c6C4D2.6|^|.6D2C4c6C8c10C4.34W2d4W2.34C4c10C8c6C4D2.6|.6D2C4c6C8c10C4.32W4d4W4.32C4c10C8c6C4D2.6|.6D2C4c26.34W4d4W4.34c26C4D2.6|^|.6D2C4c19C7.34W4d4W4.34C7c19C4D2.6|.6D2C4c16C12.32W4d4W4.32C12c16C4D2.6|.6D2C4c4C24.32W4d4W4.32C24c4C4D2.6|^|.6D2C4c4C24.26W2d4W4d4W4d4W2.26C24c4C4D2.6|.6D2C4c4C24.24W4d4W4d4W4d4W4.24C24c4C4D2.6|.6D2C4c16C4D6.26W4d4W4d4W4d4W4.27D5C4c16C4D2.6|^|.6D2C4c16C4D6.26W4d4W4d4W4d4W4.26D6C4c16C4D2.6|.6D2C4c16C4D6.28d6W4d4W4d6.28D6C4c16C4D2.6|.6D2C16c4C4D6.28d6W4d4W4d6.28D6C4c4C16D2.6|.6D2C16c4C4D7.27d6W4d4W4d6.27D7C4c4C16D2.6|.6D2C16c4C4D7.27W2d4W4d4W4d4W2.27D7C4c4C16D2.6|.6D2C16c4C4D8.24W4d4W4d4W4d4W4.24D8C4c4C16D2.6|.6D14C4c4C4D8.22W6d4W4d4W4d4W6.23D7C4c4C4D14.6|.6D14C4c4C4D7.23W6d4W4d4W4d4W6.23D7C4c4C4D14.6|.7D13C4c4C4D6.24W6d4W4d4W4d4W6.24D6C4c4C4D14.6|.7D13C4c4C4D5.25W6d4W4d4W4d4W6.25D5C4c4C4D14.6|.7D13C4c4C4D4.14G4.8D2W4d4W4d4W4d4W4D2.8G4.15D3C4c4C4D14.6|.7D13C4c4C4D3.10G2.2GD4G.7D2W4d4W4d4W4d4W4D3.6GD4G.2G2.10D3C4c4C4D14.6|.6D14C4c4C4D2.9G2D2G2D6G3d4D2W4d4W4d4W4d4W4D2d4G3D6G2D2G.10D2C4c4C4D14.6|.6D14C4c6.CD.9GD15d4D2W4d4W4d4W4d4W4D2d4D14G2.9DC.c6C4D14.6|.6D2C16c6.12D16d4D2W4d4W4d4W4d4W4D2d4D16.12c6C16D2.6|.6D2C16c6.11GD16d4D2W4d4W4d4W4d4W4D2d4D16G.11c6C16D2.6|.6D2C16c6.8G3D17d5DW4d4W4d4W4d4W4Dd5D17G3.8c6C16D2.6|.6D2C16c6.8D20d5DW4d20W4Dd5D20.8c6C16D2.6|.6D10c12C24D6d5DW4d20W4d6D6C24c12D10.6|.7D7c14C24D6d5DW4d20W4Dd5D6C24c13D8.7|.10c18C24D6d4D2W4d20W4D2d4D6C24c18.10|^|.10c18D30d4D2W28D2d4D30c18.10|.10c20D8c3D16d5D2W28D2d5D15c4D8c20.10|.7D11c30d15DW28Dd15c30D11.7|.6D14c28d15DW28Dd15c28D14.6|.6D2C16Dc23d60c23DC16D2.6|.6D2C16D3c21d60c21D3C16D2.6|.6D2C16D6c6C4c4C6d56C6c4C4c6D6C16D2.6|.6D2C16D8c4C4c4C8d52C8c4C4c4D8C16D2.6|.6D14C32d19D2d10D2d19C32D14.6|.6D14C32d17D6d6D6d17C32D14.6|.7D13C32D10d4D24d4D10C32D13.7|.7D13C32D52C32D13.7|.8D140.8|.9D137.10|.156|^|^|^|^|^`
}), g({
    id: `classic-bottleneck`,
    name: `BOTTLENECK`,
    subtitle: `Rock-walled bowl around a central keep`,
    theme: `outpost`,
    era: `classic`,
    traits: [],
    source: `4bottleNeck_new.png`,
    native: [8448, 4224],
    cols: 264,
    rows: 132,
    spawns: [[441, 1295], [3213, 1295], [1869, 595], [861, 343], [2793, 343], [1337, 1351], [2429, 1183], [3325, 665], [1309, 637], [1897, 1239], [2429, 679], [721, 791]],
    bases: [[441, 1295], [3213, 1295]],
    bombSites: [[1281, 1183], [2345, 1127]],
    pickups: [{
        x: 1841,
        y: 984,
        kind: `shotgun`
    }, {
        x: 1981,
        y: 788,
        kind: `smg`
    }, {
        x: 2121,
        y: 984,
        kind: `grenade`,
        grenade: `frag`
    }, {
        x: 1561,
        y: 984,
        kind: `uzi`
    }, {
        x: 1617,
        y: 578,
        kind: `health`
    }, {
        x: 1561,
        y: 340,
        kind: `magnum`
    }, {
        x: 1057,
        y: 788,
        kind: `grenadeLauncher`
    }, {
        x: 2205,
        y: 340,
        kind: `uzi`
    }, {
        x: 1085,
        y: 1222,
        kind: `fuel`
    }, {
        x: 2681,
        y: 732,
        kind: `pistol`
    }, {
        x: 1197,
        y: 340,
        kind: `grenade`,
        grenade: `gas`
    }, {
        x: 2513,
        y: 340,
        kind: `smg`
    }, {
        x: 2849,
        y: 1096,
        kind: `health`
    }, {
        x: 2933,
        y: 676,
        kind: `grenade`,
        grenade: `mine`
    }, {
        x: 889,
        y: 1460,
        kind: `fuel`
    }, {
        x: 609,
        y: 508,
        kind: `rifle`
    }, {
        x: 3045,
        y: 382,
        kind: `rifle`
    }, {
        x: 3017,
        y: 1516,
        kind: `health`
    }, {
        x: 637,
        y: 1572,
        kind: `m14`
    }, {
        x: 385,
        y: 1516,
        kind: `grenade`,
        grenade: `frag`
    }],
    grid: `.264|^|^|^|.47D2.6D2.22D2.138D2.43|.45D6.2D6.18D6.134D6.41|.22D12.4D32.4D24.68D4.4D36.4D16.34|.20D80.64D68.32|.19D82.26D2.26D2.6D70.31|.17D86.22D6.22D6.2D74.29|.14D100.4D16.4D8.4D87.27|.12D226.26|.11D227.26|.11D187.4D37.25|.10D49d4.6D6.10D6d2D98.12d6D30.25|.10D47d7.7D2.13dD2d6D94.15d4.3D29.24|.10D46d9.21d10D92.16d4.5D28.23|.10D44.3d10.19d12D4d4D49d3D16.3dD8.17d4.6D30.21|.10D41.6d13.16d13.2d8D46d18.4d6.19d5.7D31.19|.10D39.9d13.15d11.6d8D43d18.6d4.20d4.9D31.18|.10D39.9d15N2.11d10.8d9D41d18.6d4.20d4.10D30.18|.10D41.7d14N4.9d10.10d8D41d17.7d5.18d5D.10D30.17|.10D43.6d12GD4G.8d10G2.8d9D39d18.7d5.3d4G3.8d3GD2G2.8D30.3D3.11|.10D44.6d10GD6G.6d10GD2G.8d9D38d17.8d6.d5D3G.6d2G2D5G.8D36.10|.10D44.6d10D8.6d10D4.8d9D38d17.8d12D4.6d2D8.8D36.10|.10D43.6d10GD8G.4d10GD4.8d7D42d15.7Gd12D4G.4d2GD8.8D36.10|.10D41.7G11D10G7d4G3D4.9D52d4D8.4G3DG8d5D4G6D9.9D34.11|.10D39.9D28d4D7.7D66.4D12d5D19.9D34.11|.10D38.10D28d4D7.8D65.4D12d5D19.9D33.12|.9D37.11D29d4D9.6D64.5D12d5D19.7D36.11|.9D30.18D29d5D10.5D57.12D11d4D20.5D39.10|.8D29.19D30d5D11.5D54.14D11d4D20.4D40.10|.9D27.19D31d5D11.6D52.17D9d4D20.4D40.10|.9D28.16D33d5D11.7D41.3D5.19D9d3D21.4D16d3D21.10|.10D28.13D34d5D11.20D18.39D8d4D20.5D4.2d16D17.10|.11D27.12D35d5D11.22D14.42D7d4D20.5D2.5d17D15.10|.11D27.12D34d6D10.24D12.45D5d4D20.12d19D13.10|.11D26d2.12D34d5D9.26D9.47D5d4D20.12d19D13.10|.10D25d6.D3.8D33d4D8.84D3d5D19.14d19D12.10|.10D23d7D6.9D31d4D7.86D2.2d3D19.15d19D11.10|.10D22d7D7.11D29d4D6.32C4.57dD18.16d19D11.10|.10D13d3D4d9D7.11D29d4D4.34C4.58D17.16d18D13.10|.11D11d16D8.12D25.29C.15C4.15C.43D15.16D7d10D15.10|.11D10d17D8.13D22.31C4.12C4.12C4.43D14.15D10d8D16.10|.11D9d18D8.15D19d.31C12.2C8.2C12.44D12.16D10d8D16.10|.11D10d16D9.15D18d4.29C12.2C8.2C12.46D8.19D9d8D16.10|.10D12d15D8.17D17d5C2.9C.16C12c2C8c2C12.20C.52D9d9D15.10|.10D12d14D9.18D15d6C4.4C4.16C12c2C8c2C12.20C4.50D8d9D15.10|.10D12d13D9.20D14d6C4d.3C4.16C8c8C4c8C8.20C4.10D.31D.7D8d9D15.10|.10D13d10D10.22D12d7C4d3.C4.16C8c8C4c8C8.20C4.8GD2G.28GD2G.5dD9d6D17.10|.10D13d3D17.34d6GD4G4D4G2.14C8c20C8.14G6D4G8D4.22G6D4G2d5D8d3D20.10|.10D32.36d4GD15.16C3c26C3.16D22G2.20D12d5D31.10|.10D32.36d4D16.16c32.16D24.20D12d5.2D29.10|.10D31.37d3GD16.16c7.2c14.2c7.16D24G.19D12d4.3D29.10|.11D28.39G3D16.17c7.2c14.2c7.17D24G2D2G2.14D10d2.7D28.10|.11D26.41D19.17c32.17D30G.13D10.10D27.10|.11D25.18G4.20D18.18c14C4c14.19D29.13D9.13D25.10|.11D24.18GD4G.18GD19.17c14C4c14.19D29.13D8.14D25.10|.10D25.15G3D6G3.12G3D21.16C6c8C4c8C6.20D27.13D8.16D23.11|.10D24d.15D12.12D24.14C8c8C4c8C8.19D26.13D7.18D22.11|.10D24d3.6d2.5D12.12D24.14C36.21D23.14D7.18D21.12|.10D24d5.2d6.3D13.11D24.14C36.21D22.15D9.16D22.11|.10D24d16D13.11D24.14C36.22D20.17D10.13D24.10|.10D25d15D14.10dD23.14C36.23D18.18D11.12D24.10|.10D24.3d13D14.10d3D21.14C4c28C4.25D15.20D10.12D24.10|.10D24.4d11D16.9d3D21.14C4c5.2c14.2c5C4.25D14.22D9d.10D25.10|.10D24.7d8D17.9d3D20.16c7.2c14.2c7.28D12.23D8d5.4d4D24.10|.10D24.9d5D18.10d3D19.16c32.29D10.25D7d6.2d5D24.10|.10D24.11d3D18.10d4D18.16c32.30D8.26D7d13D24.10|.10D24.12d3D17.11d5D17.15c32.31D5d.27D9d11D24.10|.10D24.15D16.12d8D14.15c32.31d6.27D11d2.6d2D23.10|.10D24.16D15.13d6.3D11d2.14c32.32d4.28D12.9D23.10|.10D24.16D14.14d6.4D10d2.7C13c4C12c4C13.25d4.28D12.10D22.10|.9D25.16D13.15d5.6D8d4.6C13c4C12c4C13.25d5.27D12.11D22.9|.9D24.17D12d4.13d4.12d7.5C13c4C12c4C13.25d5.28D10.12D22.9|.8D25.17D11d6.13d2.14d6.4C14c4C12c4C14.24d6.27D10.13D22.8|.8D24.18D10d8.12d2.14d6.4D6C4D4d8C4d9D3C4D6.24d6.29D7.14D22.8|.9D22.19D8d11.10d4.14d6.2GD6C4D3d9C4d9D3C4D6G.23d7.28D6.15D21.9|.9D22.20D4.6d9.8d5.14d6G2D7C4D2d24D2C4D7G6.17d8.28D4.17D20.9|.10D20.21D2.10d7.8d6.14d4GD9C4Dd26DC4D13G.16d8.29D2.18D19.10|.10D20.34d6.8d5D.14d4D10C4d28C4D14.16d8.16G4.29D19.10|.10D20.35d6.7d5D2.13d3GD10C4d28C4D14G.14d10.14GD4G.28D19.10|.10D20.35d6.8d3D4.13dGD11C4d11D6d11C4D15G6.8d10.13GD6G2.25D20.10|.10D20.36d6.8d2D4.12G2D12C4d10D8d10C4D21G.6d12.10G2D9G.24D20.10|.10D20.36d7.6d3D4.12D14C4d10D8d9DC4D22.6d12.D2.7D12.24D20.10|.10D20.35d10.2d4D5.11GD14C4Dd10D6d10DC4D22G.4d13GD2G.5GD12.24D20.10|.10D20.35d16D5.4D5G2D15C4D2d24D2C4D23G3d13GD4G5D12.25D20.10|.10D20.34d16D6d.2dD22C4D2d24D2C4D26d12GD22.25D20.10|.10D20.34d7D2d6D7d4D22C4D2d24D2C4D26d12D22.26D20.10|.10D19.36d4D6d2D9d5D21C4D3d22D3C4D27d10GD21.27D20.10|.10D17.38d2D18d8D19C4D3d3D4d8D4d3D3C4D27d7G3D21.29D19.10|.10D15.41D19d10D17C4D12d4D12C4D28d6D23.30D19.10|.10D14.42D19d12D15C36D28d6D22d.30dD18.10|.10D13.43D21d10D15C36D27d7D21d4.26d4D17.10|.11D12d3.4G2.35D22d9D14C36D26d9D20d8G2.15G2d7D17.10|.11D11d5.2dD2G2.33D23d9D13C36D25d10D19d8GD2G.12G2D2d8D16.10|.11D11d8D4.33D23d9D74d10D19d8D4.12D4d8D16.10|.11D11d8D4G.32D24d6D78d6D21d8D4G.10GD5d6D17.10|.10D11d10D4G6.18G3d4D25d3D108d9D4G2D2G2D2G2D6d7D15.11|.10D11d10D10G.16GD3d4D136d9D21d6D15.11|.10D10d11D11.16D4d4D136d11D19d6D14.12|.10D11d8D13G.14GD4d4D137d10D17d7D14.13|.10D12d5D16G.11G2D4d6D136d11D13d10D14.13|.10D12d4D18G2.8GD6d6D137d11D10d11D14.14|.10D12d4D20.8D6d7D138d11D8d11D15.14|.10D12d5D19G.6GD5d6D142d11D4d11D17.14|.10D12d19D6G6D5d5D146d21D20.14|.10D12d21D14d5D148d18D22.14|.10D12d22D12d6D148d17D23.14|.10D13d22D9d7D150d14D25.14|.11D12d3D4d4D4d23D62.14D74d3D35.15|.11D29d20D61.18D110.15|.13D28d18D61.20D108.16|.13D30d14D49.3D9.24D8.3D21.4D69.17|.14D32d4D49.82D65.18|.15D82.86D62.19|.16D80.88D60.20|.18D49.3D24.92D8.3D46.21|.21D45.15D6.122D33.22|.23D42.18D2.126D30.23|.24D40.149D27.24|.26D37.150D25.26|.29D33.152D21.29|.31D30.154D18.31|.32D28.156D16.32|.33D25.160D4.3D5.34|.264|^|^|^|^|^`
}), g({
    id: `classic-subdivision`,
    name: `SUBDIVISION`,
    subtitle: `Log fort and concrete plant split by a gap`,
    theme: `outpost`,
    era: `classic`,
    traits: [],
    source: `3subdivision_new.png`,
    native: [7168, 3584],
    cols: 224,
    rows: 112,
    spawns: [[469, 287], [2485, 483], [1393, 1239], [301, 1239], [1477, 287], [2849, 1239], [2121, 1099], [833, 847], [973, 91], [1897, 595], [1281, 707], [917, 1295]],
    bases: [[469, 287], [2485, 483]],
    bombSites: [[1085, 875], [2093, 875]],
    pickups: [{
        x: 1561,
        y: 578,
        kind: `ak47`
    }, {
        x: 1757,
        y: 928,
        kind: `shotgun`
    }, {
        x: 2009,
        y: 872,
        kind: `grenade`,
        grenade: `frag`
    }, {
        x: 1141,
        y: 1096,
        kind: `sniper`
    }, {
        x: 1141,
        y: 452,
        kind: `health`
    }, {
        x: 1813,
        y: 284,
        kind: `magnum`
    }, {
        x: 1785,
        y: 1292,
        kind: `rocket`
    }, {
        x: 2149,
        y: 480,
        kind: `uzi`
    }, {
        x: 2289,
        y: 858,
        kind: `fuel`
    }, {
        x: 1253,
        y: 186,
        kind: `pistol`
    }, {
        x: 833,
        y: 452,
        kind: `grenade`,
        grenade: `gas`
    }, {
        x: 2121,
        y: 200,
        kind: `smg`
    }, {
        x: 2401,
        y: 1236,
        kind: `health`
    }, {
        x: 2569,
        y: 984,
        kind: `grenade`,
        grenade: `mine`
    }, {
        x: 581,
        y: 1068,
        kind: `fuel`
    }, {
        x: 497,
        y: 620,
        kind: `rifle`
    }, {
        x: 693,
        y: 88,
        kind: `rifle`
    }, {
        x: 2821,
        y: 620,
        kind: `health`
    }, {
        x: 2821,
        y: 984,
        kind: `m14`
    }, {
        x: 2653,
        y: 88,
        kind: `grenade`,
        grenade: `frag`
    }],
    grid: `.224|^|^|^|^|^|^|^|.48W24.102C6.4C6.34|.48W24.103C5.4C5.35|^|^|.48W4d16W4.5D2.3G4.90C4.4C4.36|.48W4d16W4.4GD2G.GD4G.89C4.4C4.36|.48W4d16W4GD2GD4GD6G.88C4.4C4.36|.48W4d16W4D16G2.86C4.4C4.36|.48W4d16W4D18.60G12.14C4.4C4.36|.48W4d.2d6.2d2.2dW4D18G.58GD12G.13C4.4C4.36|.50d3.2dW4d.2d2.2dW4D19G.16C.10C.27G2D14G3.10C4.4C4.36|.50d6W4d8W4D20G2.14C4.4C4.26GD19.10C4.4C4.36|.50d6W4d8W4D22.14C4.4C4.26D20.8C6.4C6.34|.41G2.7d6W4d8W4D22G.13C4.4C4.25GD20.9C5.4C5.35|.26G15D2G2D3W4d4W4d8W4D23G2.5G3D3C4.4C4D3G22D20.10C5.4C5.35|.26D22W4d4W4d8W4D25G.4D6C4.4C4D45.10C5.4C5.35|.26D2C4D16W14d4W6D26.4D6C4.4C44D4.8C8.4C8.32|.25D3C4D16W14d4W6D26.4D6C4.4C44D3.9C8.4C8.32|.25D3C4D11d5W14d4W6dD14d2D9.4D6C4.4C44D3.9C8c4C8.32|.24D4C4D9d7W14d4W6d3D10d6D7.4D6C4.4C44D2.10C8c4C8.32|.23D5C4D8d36D8d9D5.4D6C4.4C4c36C4D2.10C4c12C4.32|.21D7C4D7d38D5d11D5.3D7C4.4C4c36C4D2.10C4c.2c2.2c2.2cC4.32|.19D9C4D6d56D4.3D7C4.4C4c36C4D2.12c3.2c2.2c2.2cC4.32|.18D10C4D5d58D2d2.D8C4.4C4c36C4D2.12c14C4.32|.18D10C4D4d31D2d32D7C4.4C10c30C4D2.12c14C4.32|.18D10C4D3d30D6d30D7C4.4C9c31C4D2.12c3.2c2.2c2.2cC4.32|.18D10C4D3d12D2d9D16d6W4.4W4d10D6C4.4C9c31C4D.10C5c.2c2.2c2.2cC4.32|.18D10C4D2d12D4d6D20d4W4.4W4d11D5C4.4C9c31C4D.8C7c12C4.32|.18D10C4D2d12D4d6D20d3.W4.4W4d13D3C4.4C4c30C28c10C4.32|.18D10C4D2d11D6d6D18d3.2W4.4W5d12D3C4.4C4c31C26c11C4.32|.19D9C4Dd12D6d14D10.18d13D2C4.4C4c31C26c11C4.32|.19D9C4Dd11D8d15D7.20d13DC2.8C2c31C26c11C4.32|.20D8C4d11D10d15D6.20d16.8c34C20c16C4.C2.29|.21D7C4d9D14d12.2D5.20d16.8c34C20c16C8.28|.21D7C4d7D8d2D8d10.2D5.21d8W5C2.8C7c27C20c14D10G.27|.22D6C4d6D7d6D7d8.4D4.22d5W7C4.4C12c24Cc6C2c6C2c15D13G.26|.22D6C4d6D6W18d4.4D4.16W18C4.4C21c43C20.24|.22D6C4d7D3d2W18d5.4D2.17W18C4.4C21c43C20.24|.22D6C4d2W2d8W18d5.23W18C4.4C21c18C2c6C2c6Cc8C20G2.22|.22D6C4W4d8W18d6.22W18C4.4C22c14C20c8C20D2.22|.22D6C4W4d8W4d22.64c14C28c20C4D2.22|.22D6C4W4d8W4d23.63c3.2c2.2c2.2cC28c13.2c5C4D2.22|.22D6C4W4d15D2d14D2d9.56c3.2c2.2c2.2cC28c13.2c5C4D2.22|.22D6C4W4d14D4d12D4d9.55c14C28c20C4D2.22|.22D6C4W4d14D4d12D4d10.10W18C4.4C22c10C28c20C4D2.22|.22D6C4W4Dd14D2d14D2d12.9W18C4.4C21c11C28c13.2c5C4D3.21|.22D6C4W4D2d5D2d14D2d21.8W18C4.4C21c11C28c8Cc4.2c4C5D3.21|.22D6C4W4D2d4D4d12D4d20.8W18C4.4C21c11C28c8C4c4C8D4.20|.22D6C4W4D2d4D4d12D4d20.20WdW4C4.4C8c36C4c20C16D4.20|.22D6C4W4D3d4D2d14D2d22.18d3W4C4.4C8c36C4c20C16D5.19|.23D5C4W4D3d33W4d7.15d6W4C4.4C8c36C4c20C16D6.18|.23D5C4W4D4d32W4d8.13d11C2.8C3c39Cc23C16D6.18|.24D4C4W4D5d30DW4d9W10d15.8c78C4D6.18|.25D3C4W4D7d26D3W4d10W8d16.8c78C4D6.18|.25D3C4W4D14d2W4d2D14W4d10W8d10W4C2.8C6c31C6c35C4D5.19|.26D2C4W4D16W4D16W4d10W8d10W4C4.4C8c28C12c32C4D5.19|.26D2C4W46d10W4d3Dd6W6C4.4C8c6C34c32C4D4.20|.26D2C4W46d10W4dD4d5W6C4.4C8c.2c4C33c32C4D2.22|.27DC4W46d5D5W4D6d4W6C4.4C8c.2c4C33c34.26|.27DC4W46d4D6W4D6d4W6C4.4C8c7C33c34.26|.52d8W4d18D6W4D6d9DC4.4C10c6C4c62.26|.53d7W4d19D5W4D5d10DC4.4C9c4.2cC4c33.2c14.2c11.26|.53d32D3W4d14D2C4.4C9c4.2cC4c33.2c14.2c11.26|.54d33DW4d14D2C4.4C9c7C4c62.26|.28C4.22d34W4d14D2C4.4C4c10C12c24C8c8C8c6C4G2.22|.28C4.22d34W4d13D3C4.4C4c5.2c4C10c26C6c10C6c7C4D2G.21|.18G10C4D2.20d51D3C4.4C4c5.2c4C10c26C6c10C6c7C4D3G3.18|.18D10C4D4.18d50D4C4.4C4c11C10c26C6c10C6c7C4D6.18|.18D10C4D5.14D2.d49D5C4.4C4c76C4D6.18|.18D10C4D7.10D6d46D7C4.4C4c9.2c65C4D5.19|.19D9C4D26d40D10C4.4C4c3C2c4.2c65C4D3.21|.19D9C4D28d36D12C4.4C12c68C4D.23|.21D7C42d10C32.4C48c10C26.24|^|.22D6C42d10C32.4C48.10C26.24|.23D5C42d10C32.4C48.10C26.24|.24D24d10.10d16.16D8C4.4C4D4.10d24.20d15C.30|.25D21d12.11d14.19D6C4.4C4D3.11d24.20d17.29|.29D6.3d19.12d14.22D3C4.4C4D2.13d22.22d19.10G2.14|.31D2.5d18.14d12.25DC4.4C4D.15d20.24d19.7G2D2.14|.17C2.19d18.14d12.9D2.15C4.4C4.16d20.24d7D2d13.4D4.14|.16C4.17d18D.14d12.7D6.13C2.8C2.16Dd18D.24Dd4D6d12.2GD4.14|.14G2D4G6.11d17D4.13d3D28.32D4d16D8.4D8.4D16d4D2G5D4.15|.14D12.10d16D8.12D32.28D8d12D57.15|.14D12.9D2d14D10.10D33.27D10d10D57.16|.14D13.6D6d10D14.6D36.24D14d6D58.17|.14D13.3D45.2D29.17D32.2D30.2D17.18|.14D59.6D27.16D31.6D26.6D14.19|.14D58.9D25.16D30.8D24.9D11.20|.15D31.3D5.4D12.11D17.4D3.18D11.4D12.12D4.4D12.11D9.22|.29D6.47D5.38D6.63D5.25|.31D2.50D2.42D2.66D2.27|.224|^|^|^|^|^|^|^|^|^|^|^`
}), g({
    id: `classic-no-escape`,
    name: `NO ESCAPE`,
    subtitle: `Sealed concrete compound over log trenches`,
    theme: `outpost`,
    era: `classic`,
    traits: [],
    source: `5noEscape_new.png`,
    native: [6528, 3712],
    cols: 204,
    rows: 116,
    spawns: [[301, 1351], [2569, 1365], [1449, 259], [1421, 1379], [2513, 259], [385, 301], [1981, 721], [1001, 847], [2009, 1351], [861, 1393], [889, 259], [497, 847]],
    bases: [[301, 1351], [2569, 1365]],
    bombSites: [[1001, 847], [1841, 875]],
    pickups: [{
        x: 1505,
        y: 872,
        kind: `shotgun`
    }, {
        x: 1253,
        y: 760,
        kind: `saw`
    }, {
        x: 1253,
        y: 1040,
        kind: `grenade`,
        grenade: `frag`
    }, {
        x: 1673,
        y: 536,
        kind: `rocket`
    }, {
        x: 1113,
        y: 522,
        kind: `health`
    }, {
        x: 1869,
        y: 1082,
        kind: `magnum`
    }, {
        x: 777,
        y: 1012,
        kind: `m14`
    }, {
        x: 1169,
        y: 256,
        kind: `uzi`
    }, {
        x: 1701,
        y: 256,
        kind: `fuel`
    }, {
        x: 1141,
        y: 1362,
        kind: `pistol`
    }, {
        x: 1757,
        y: 1404,
        kind: `grenade`,
        grenade: `gas`
    }, {
        x: 665,
        y: 536,
        kind: `smg`
    }, {
        x: 2289,
        y: 1040,
        kind: `health`
    }, {
        x: 1953,
        y: 228,
        kind: `grenade`,
        grenade: `mine`
    }, {
        x: 2261,
        y: 508,
        kind: `fuel`
    }, {
        x: 525,
        y: 1152,
        kind: `rifle`
    }, {
        x: 2205,
        y: 256,
        kind: `rifle`
    }, {
        x: 637,
        y: 256,
        kind: `health`
    }, {
        x: 2541,
        y: 704,
        kind: `shield`
    }, {
        x: 2289,
        y: 1362,
        kind: `grenade`,
        grenade: `frag`
    }],
    grid: `.204|^|^|^|^|^|^|^|.12C180.12|^|^|^|.12C4c172C4.12|^|^|^|^|^|.12C4c32Cc6Cc60C4c16C4c48C4.12|.12C4c32C8c60C4c16C4c48C4.12|.12C4c24C24c12C48c8C32c2C4c2C8c8C4.12|^|.12C4c8Cc15C24c12C48c8C32c2C4c2C8c8C4.12|.12C4c8C4c12C24c12C48c8C32c2C4c2C8c8C4.12|.12C4c8C4c48C4c40C4c8C4c40C4c6C6.12|.12C4c8C4c48C2c42C4c8C4c40C4c6C6.12|.12C4c8C4c80C4c8C4c8C4c16C4c20C4c6C6.12|.12C4c8C4c80C4c8Cc14Cc16C4c20C4c6C6.12|.12C4c88C8c2C4c34C4c32C4.12|.12C4c88C8c2C4c34C2c34C4.12|.12C4c8C4c51Cc24C8c2C4c70C4.12|.12C4c8C4c48C4c24C8c2C4c70C4.12|.12C4c8C4c48C4c24C4c44C4c32C4.12|.12C4c8C4c50C2c24C4c44C4c32C4.12|.12C4c88C4c44C4c32C4.12|.12C4c91Cc44C4c32C4.12|.12C4c8C4c12C4c16C4c88C4c20C4c8C4.12|^|.12C4c8C5c11C4c16C6c10Cc30Cc16Cc35C4c12C4c8C4.12|.12C4c8C6c10C4c16C8c8C4c24C4c16C4c32C4c12C4c8C4.12|.12C4c8C24c2C4c2C24c24C10c4C10c31C21c8C4.12|^|.12C4Dc6DC24c2C4c2C24c24C10c4C10c31C21c8C4.12|.12C4D2c4D2C24c2C4c2C24c24C10c4C10c30C22c8C4.12|.12C4D2d4D26d12D8dD9c110C4.12|.12C4D2d4D12d4D8d15D5d3D10c109C4.12|.12C4Dd6D8d39D9c5C4c88C4c8C4.12|.12C4Dd6D6d42D9c4C4c88C4c8C4.12|.12C4d7D5d44D4C4c4C4c20C16c52C4c8C4.12|.12C4d7D6d44D3C4c4C4c20C16c52C4c8C4.12|.12C4d6D8d9D11d23D3C4c4C4c20C16c30D4c30C4.12|.12C4d6D8d8D14d22D2C4c4Cc23C16c28D8c28C4.12|.12C4d6D8d8D14d22D2C4c63D2c6D10c15C6c6C4.12|.12C4d6D8d9D11d24D2C4c61D6c2D14c13C6c6C4.12|.12C4d7D7d11D6d27D2C4c4Cc54D26c10DC6c6C4.12|.12C4d7D7d13D2d29D2C4c4C4c50D28c8D2C6c6C4.12|.12C4d9D5d44D2C4c4C14c40D28d8D2C4c8C4.12|.12C4d9D5d44D2C4c4C13c40D29d7D3C4c8C4.12|.12C4d10D4d45DC4c4C13c40D29d7D3C4c8C4.12|.12C4d11D3d45DC4c4C13c39D30d6D4C4c8C4.12|.12C4d11D3d9D2d22Dd11DC4c55D31d6D4C4c8C4.12|.12C4d11D4d6D6d20D2d8D3C4c55D31d7D3C4c8C4.12|.12C4d10D5d4D11d16D4d4D6C6c14Cc17D8c12D32d7D3C4c8C4.12|.12C4d10D6d2D14d14D4d2D8C8c12C4c12D12c10D32d8D2C4c8C4.12|.12C4d10D6d2W16d12C62c7DC12D22d6C8c8C4.12|.12C4d11D3d4W17d12C61Dc6DC12D14d3D4d7C8c8C4.12|.12C5d17W17d12C61D2c4D2C12D3d25C8c8C4.12|.12C6d16W18d11C61D2c4D2C12Dd27C8c8C4.12|.12C6d18W8d22D4d4D10d2D6d9D7d9D3C4D2c4D2C4D8d30C6c8C4.12|.12C6d18W6d25D2d5D8d4D5d10D6d10D3C4D2c5DC4D6d33C5c8C4.12|.12C6d18W4d35D4d8D3d12D4d12D2C4D2c6C4D3d37C4c8C4.12|.12C6d57D2d10D2d14D2d14DC4D2c6C4Dd39C4c8C4.12|.12C4d79Dd24C4D2c6C4d40c12C4.12|.12C4d79D2d23C4D3c5C4d40c12C4.12|.12C4d14W8d16W10d30D4d13D2d7C4D3c5C4d18W2d11D2d7C4c7C5.12|.12C4d12W12d12W12d30D4d12D4d6C4D4c7Cd16W4d10D4d6C4c6C6.12|.12C4d10W16d8W14Dd13W4d4W4d4W4d4W4d4W4d6C4D4c8d14W22d4C4c6C6.12|.12C4d9W17d7W15D3d11W4d4W4d4W4d4W4d4W4d6C4D3c9d13W23d4C4c6C6.12|.12C4d9W17d7W15D5d9W4d4W4d4W4d4W4d4W4d6C4D3c8Cd13W23d4C4c6C6.12|.12C4d8W18d6W15D7d8W4d4W4d4W4d4W4d4W4d6C4D2c6C4d12W24d4C4c6C6.12|.12C4d34D20d50C4D2c6C4d32W4d4C4c8C4.12|.12C4d35D18d51C4D2c6C4d32W4d4C4c8C4.12|.12C4d37D6d61C4D2c6C4d4W4d24W4d4c12C4.12|.12C4d39D2d63C4D2c6C4d4W4d32c12C4.12|.12C4d10W12d82C4D2c5DC4d4W22d14C4c8C4.12|.12C4d10W12d82C4D2c5DC5d3W23d13C4c8C4.12|.12C4d10W12d49D3d16D4d10C4Dc5D2C6d2W23d12C5c8C4.12|.12C4d10W12d48D6d12D8d8C4Dc5D2C6d2W24d10C6c8C4.12|.12C4d16W4d48C10d8C10d8C4c6D2C48c8C4.12|.12C4d16W4d48C10d8C10d8C2c8D2C48c8C4.12|.12C4d16W4d48C10d8C10d8c11DC48c8C4.12|.12C4d68C10d8C10d8c11DC48c8C4.12|.11DC4d68C4d20C4d8c12D8c22D4c22C4.12|.11DC4d68C4d20C4d8c14D4c25D2c23C4.12|.10D2C4d68C4d20C4d8c68C4.12|.10D2C4d71Cd20Cd11c68C4.12|.10D2C4Dd14D2d87c55D2c11C4.12|.9D3C4D3d10D6d85c53D6c9C4D.11|.9D3C4D6d4D16d4D8d10Cd18C6d18C5d8c22D4c4D12c4D16c4C6D2.10|.8D4C4D40d8C4d12C12d12C8d8c20D44cC7D2.10|.8D49d6DC48Dd6D2c18DC52D2.10|.9D50d2D3C48D3d2D6c14D3C52D2.10|.9D55C48D28C52D.11|.10D54C48D28C52D.11|.10D134.17D7.16D8.12|.11D15.4D24.4D4.4D52.4D20.19D6.19D4.14|.13D6.66D6.71D4.38|.15D2.70D2.74D2.39|.204|^|^|^|^|^|^|^`
}), g({
    id: `classic-so-long`,
    name: `SO LONG`,
    subtitle: `Long cave run between end bunkers`,
    theme: `outpost`,
    era: `classic`,
    traits: [],
    source: `6solong_new.png`,
    native: [9600, 2176],
    cols: 300,
    rows: 68,
    spawns: [[245, 427], [3941, 427], [2093, 623], [1141, 735], [3045, 735], [1589, 511], [2597, 511], [637, 735], [3549, 735], [2961, 343], [1253, 343], [3325, 483]],
    bases: [[245, 427], [3941, 427]],
    bombSites: [[1449, 623], [2737, 623]],
    pickups: [{
        x: 2121,
        y: 340,
        kind: `sniper`
    }, {
        x: 2317,
        y: 508,
        kind: `m14`
    }, {
        x: 1869,
        y: 508,
        kind: `grenade`,
        grenade: `frag`
    }, {
        x: 1785,
        y: 732,
        kind: `ak47`
    }, {
        x: 2429,
        y: 732,
        kind: `health`
    }, {
        x: 2765,
        y: 732,
        kind: `magnum`
    }, {
        x: 1421,
        y: 732,
        kind: `rocket`
    }, {
        x: 3129,
        y: 466,
        kind: `uzi`
    }, {
        x: 917,
        y: 508,
        kind: `fuel`
    }, {
        x: 3297,
        y: 732,
        kind: `pistol`
    }, {
        x: 889,
        y: 732,
        kind: `grenade`,
        grenade: `gas`
    }, {
        x: 721,
        y: 508,
        kind: `smg`
    }, {
        x: 3577,
        y: 508,
        kind: `health`
    }, {
        x: 525,
        y: 480,
        kind: `grenade`,
        grenade: `mine`
    }, {
        x: 3717,
        y: 312,
        kind: `fuel`
    }, {
        x: 357,
        y: 732,
        kind: `shotgun`
    }, {
        x: 3857,
        y: 732,
        kind: `rifle`
    }, {
        x: 357,
        y: 130,
        kind: `health`
    }, {
        x: 4053,
        y: 676,
        kind: `shield`
    }, {
        x: 4025,
        y: 116,
        kind: `grenade`,
        grenade: `frag`
    }],
    grid: `.300|^|^|^|^|^|^|^|^|^|.12C4.11C.244C.11C4.12|.12C4.8C4.244C4.8C4.12|.12C16.244C16.12|^|^|^|.12C4c8C4.244C4c8C4.12|^|^|.12C4c8C2.248C2c8C4.12|.12C4c10.248c10C4.12|^|.12C4c7C3.248C3c7C4.12|.12C4c5C7.244C7c5C4.12|.12C4c4C16.228C16c4C4.12|^|.12C4c4C16.52C4.56C4.56C4.52C16c4C4.12|^|.12C4c16C4.44C20.44C12.44C20.44C4c16C4.12|^|.12C4c18.46C20.44C12.44C20.46c18C4.12|^|.12C13c5C6.46c16.48c8.48c16.46C6c5C13.12|.12C13c6C5.46c16.48c8.48c16.46C5c6C13.12|.12C13c6C5.43C2.c16.C2.42C2.c8.C2.42C2.c16.C2.43C5c6C13.12|.12C14c5C5.40C8c12C8.36C8c4C8.36C8c12C8.40C5c5C14.12|.12D14d6C4G2.24D.11G2C12c4C12G2.15C2.15G2C8c4C8G2.16D.15G2C12c4C12G2.11C2.23G2C4d6D14.12|.13D12d7C4D2G.21GD2G.9GD2C12c4C12D2G.13C4.13GD2C8c4C8D2G.13GD2G.13GD2C12c4C12D2G.9C4.21GD2C4d7D11d.13|.14d3D6d9C4D3G15.4G2D4G9D4C11c4C11D4G13D4G2.4G7D4C7c4C7D4G7.4G2D4G13D4C11c4C11D4G9D4G2.4G15D3C4d9D6d4.13|.14d5D2d11C4D18.4D22C8c4C8D26d.2dD14C4c4C4D14d.2dD26C8c4C8D22.4D18C4d11D2d7.12|.14d18D22.4D30d4D34d4D18d4D18d4D34d4D30.4D22d20.12|.13d20D20.6D28d7D12d3D5d4D7d6D15d7D16d6D7d3D5.3D13d8D12.4D4d3D4.6D19d22.12|.13d10D2d16D6d3.11d8D6.12d8.10d14.6d6.6d49.17d14D6.8d10.12D6.2d14D2d10.13|.12d10D4.d16D2d5.12d8.D2.15d8.11d10.10d2.10d47.18d14.D2.11d10.13D2.3d14D4d8.14|.12d10D4.2d22.12d8.18d8.12d8.24d46.18d14.14d10.18d14D4d8.14|.11d12D2.3d23.10Dd8.18Dd8.11Dd6D.24d46.18d14.14Dd9.17d16D2d9.14|.10d13.6d18D3d.8D11.8d4.4D3d9.5D18.20d6D6d6.2d18D18.8d6D3d3.14D11.8D3.5d28.14|.10d12.8d16D6.6D12.7d6.D6d8.4D20.20d4D8d4.4d16D20.8d4D6.14D12.6D6.4d28.14|.10d3C2d7.8d16D6d2.4D12.4d10D6d8.4D20.20d4D8d4.4d16D20.8d4D6.8d2.4D12.6D6.4d14.d12D2.13|.9d3C4d6.7d18D3d5.2d2D3d.2D4.4d12.D4d9.4D3.3D5d3D4d2.19d5D6d5.4d17D3d3D5.3D4.9d5D3d3.6d4.4D4d2D4.8D4d2.2d15.2d10GD2G.12|.9dG2D4G4d.8d5D4d25.8d15.4d5Cd3.10d17.8D8.d14.D8d24.14C2d12.4d7.5d5.10d6.2d5D4d5.6d2G5D4G2.10|.8d2D10G2.6d4D8d24.6d16.4d2C4d4.8d19.5D12d12D12d23.13C4d10.4d8.4d4.10d12D8d2.8GD11.10|.8d2D12.6d3D10d10D2d13.4d16.4d2C4d2Dd.6d16Dd6D.D14d10D14d9Dd15.7C2.C4d10.4d4Dd3.4d4.9D2d10D10d.8D12.10|.8D14G.4d2D14d6D6d12.2Dd17.2Gd2C5D2Gd.4d15GD2Gd5D18d6D18d5GD2Gd15.5C8d11.2Gd2GD2Gd2.4d4.7D6d6D14.6GD12.10|.9D14G2D46G2D10G6DG2D8G17D2GD4GD50GD4GD2G17D8G13DG2D4G5D6G2D34G2D13.10|.10D280.10|^|.11D39.4D16.3D13.4D12.4D32.4D8.3D13.4D16.3D13.4D12.4D32.4D16.3D12.11|.41D6.30D6.46D6.58D6.46D6.49|.43D2.34D2.50D2.62D2.50D2.51|.300|^|^|^|^|^|^|^`
}), g({
    id: `classic-lunarcy`,
    name: `LUNARCY`,
    subtitle: `Floating moon rocks and craters`,
    theme: `moon`,
    era: `classic`,
    traits: [`lowGravity`],
    source: `7lunarcy_new.png`,
    native: [7168, 3584],
    cols: 224,
    rows: 112,
    spawns: [[245, 483], [2961, 455], [1617, 1183], [1897, 119], [665, 1351], [2401, 1197], [1113, 119], [833, 679], [2289, 595], [1729, 679], [609, 119], [2625, 119]],
    bases: [[245, 483], [2961, 455]],
    bombSites: [[1169, 595], [1953, 679]],
    pickups: [{
        x: 1449,
        y: 732,
        kind: `laser`
    }, {
        x: 1505,
        y: 956,
        kind: `sniper`
    }, {
        x: 1169,
        y: 592,
        kind: `grenade`,
        grenade: `frag`
    }, {
        x: 2037,
        y: 844,
        kind: `rocket`
    }, {
        x: 1421,
        y: 396,
        kind: `health`
    }, {
        x: 1281,
        y: 1180,
        kind: `magnum`
    }, {
        x: 1561,
        y: 228,
        kind: `m14`
    }, {
        x: 2009,
        y: 1292,
        kind: `uzi`
    }, {
        x: 833,
        y: 1152,
        kind: `fuel`
    }, {
        x: 665,
        y: 928,
        kind: `pistol`
    }, {
        x: 693,
        y: 452,
        kind: `grenade`,
        grenade: `gas`
    }, {
        x: 2681,
        y: 802,
        kind: `smg`
    }, {
        x: 2597,
        y: 438,
        kind: `health`
    }, {
        x: 2625,
        y: 1096,
        kind: `grenade`,
        grenade: `mine`
    }, {
        x: 497,
        y: 340,
        kind: `fuel`
    }, {
        x: 385,
        y: 1096,
        kind: `shotgun`
    }, {
        x: 273,
        y: 788,
        kind: `rifle`
    }, {
        x: 2905,
        y: 858,
        kind: `health`
    }, {
        x: 217,
        y: 1264,
        kind: `shield`
    }, {
        x: 273,
        y: 144,
        kind: `grenade`,
        grenade: `frag`
    }],
    grid: `.224|^|^|^|^|^|^|^|^|.107c2.115|.42M12.24M8.20c4.20M12.44M8.30|.40M16.20M12.18c4.18M16.40M12.28|.19M2.18M18.18M13.18c4.17M17.39M14.27|.18M4.16M20.17M14.17c4.16M17.39M16.26|.17M6.14M22.15M16.17c2.16M17.39M18.25|.17M6.14M22.15M16.35M16c2.38M18.25|.15M9.11M17cM8.13M16.34M16c6.M2.30M21.24|.14M11.10M16c2M9.12M16.35M14c7M4.29M22.23|.13M13.8M16c4M9.12M14.22M2.12M13c7M6.27M24.22|.13M13.8M15c6M8.12M14.21M4.12M11c8M6.27M24.22|.11M15.8M14c8M8.13M11.22M4.12M11c8M8.14M.10M24.22|.10M16.9M11c11M8.12M9.25M2.14M11c7M9.13M2.9M24.22|.9M16.14c18M9.12M5.46M10c7M9.11M4.9M22.23|.9M16.15c18M8.13M2.50M9c7M8.11M4.9M22.23|.9M15.16c18M8.66M9c6M9.10M4.10M20.24|.9M14.16c19M8.67M9c4M9.11M4.12M16.26|.10M12.13M10c13M8.67M10c2M10.12M2.16M6.8c2.23|.11M10.13M12c12M8.68M10cM9.13M2.18M2.9c4.22|.12M8.14M12c12M8.12c4.52M20.44c4.22|.13M5.16M12c12M8.11c6.51M20.43c6.21|.35M10c13M8.9c10.13M16.21M19.43c6.21|.35M10c13M8.8c12.10M20.19M19.42c8.20|.37M8c13M8.8c12.9M22.20M17.33M2.8c6.21|.37M10c10M9.8c12.7M26.18M16.32M6.7c4.22|.38M16c3M8.10c10.6M30.17M13.20M22.14M6.11|.39M26.11c8.6M32.17M10.21M24.12M8.10|.16M8.17M23.13c6.7M14cM17.19M7.22M24.12M8.10|.16M8.17M22.15c4.8M13c2M17.19M6.22M26.10M9.10|.16M8.18M20.29M12c3M15.21M4.23M26.10M9.10|.16M8.19M18.30M11c5M14.22M2.23M28.8M10.10|.16M8.20M16.32M9c6M13.47M29.8M10.10|.17M5.24M12.35M9c4M13.47M31.8M9.10|.91c2M10c2M14c2.44M33.7M8.11|.90c4M10cM13c4.43M33.8M7.11|.83M2.5c4M24c4.41M35.8M6.12|.83M3.3c6M22c6.40M12c3M20.9M3.14|.43c10.29M5.2c8M18c8.24c2.13M13c10M13.26|.42c12.28M5.c11M14c11.22c4.12M12c13M11.26|.31M2.9c12.28M6c12M12c13M.M.18c4.12M12c14M10.26|.29M6.7c12.27M8c12M9c15M4.17c4.11M13c15M9.26|.27M10.6c10.6M3.19M9c33M7.9M2.6c2.12M12c16M8.27|.26M12.6c8.6M6.16M10c32M8.8M4.18M13c17M7.27|.26M12.7c6.7M6.15M11c32M8.8M4.19M12c17M6.28|.25M14.7c4.9M3.16M12c32M8.9M2.20M14c16M3.30|.25M14.38M13c13M6c13M8.32M16c13.33|.24M16.37M13c12M8c12M8.33M17c10.34|.23M17.37M13c12M8c12M8.35M16c9.34|.21M18.38M13c12M7c12M9.35M18c7.34|.19M20.39M12c13M4c14M8.37M24.34|.18M20.41M11c13M2c15M9.38M25.32|.18M20.42M10c29M9.41M23.32|.18M20.43M10c27M9.42M22.33|.19M19.43M10c26M10.16M7.20M20.12M4.18|.19M19.44M10c25M9.16M10.19M18.11M8.16|.20M18.13M2.29M11c22M11.16M11.6M2.11M16.13M7.16|.21M16.13M5.27M12c20M12.15M14.2M6.11M12.15M6.17|.21M14.14M9.25M12c18M12.16M24.37M4.18|.22M11.16M11.23M13c17M12.15M26.37M2.19|.22M10.15M14.23M13c14M13.15M27.58|.23M7.17M15.23M14c10M14.14M10c2M17.58|.46M17.22M38.12M12c2M16.59|.46M17.23M36.12M12c4M15.59|.39M.6M19.21M36.12M12c4M14.11M.48|.39M2.5M20.21M34.13M13c2M14.12M2.47|.38M4.5M20.22M30.15M13c2M14.11M4.14M8.24|.38M4.5M20.24M26.17M28.12M4.14M8.24|.38M4.6M12cM8.23M24.18M28.12M4.13M10.23|.38M4.8M8c3M9.23M21.21M27.13M2.13M13.21|.39M2.12c9M9.11c4.51M24.28M16.19|.39M2.13c9M8.10c6.52M22.28M17.18|.27M2.25c9M9.9c6.53M20.27M19.18|.26M4.24c8M11.9c4.55M18.28M19.18|.25M6.23c7M13.52c12.3M18.27M20.18|.25M6.23c7M13.51c14.3M16.28M20.18|.23M10.18M2.c5M15.51c14.3M16.28M20.18|.22M13.16M4c2M18.51c12.5M14.29M20.18|.21M16.13M25.16M2.13M16.7c6.14M6.12M3.16M19.19|.21M17.12M26.14M4.10M20.7c2.18M2.13M6.14M19.19|.19M19.12M27.13M4.9M21.42M7.13M18.20|.18M20.13M27.13M2.10M22.40M9.12M17.21|.17M20.16M14c2M10.23M24.39M10.12M15.22|.17M20.18M10c6M8.23M24.38M11.12M14.23|.15M21.21M8c6M9.22M24.37M13.12M12.24|.14M21.22M10c2M12.21M24.35M16.12M9.26|.13M22.23M24.21M22.18M2.14M19.46|.13M21.25M23.21M22.17M4.12M20.46|.12M22.27M21.23M19.18M4.12M20.46|.13M20.28M21.23M18.20M2.13M20.46|.13M18.16M2.13M20.24M16.37M19.46|.14M15.17M4.13M19.25M14.38M19.46|.14M14.18M4.14M18.26M12.40M18.46|.15M11.21M2.16M9.3M4.28M9.43M5.4M7.47|.224|^|^|^|^|^|^|^|^|^`
}), g({
    id: `classic-icebox`,
    name: `ICEBOX`,
    subtitle: `Ice-block cavern between snowy log huts`,
    theme: `snow`,
    era: `classic`,
    traits: [`ice`],
    source: `8icebox_new.png`,
    native: [6912, 3456],
    cols: 216,
    rows: 108,
    spawns: [[413, 343], [2625, 343], [1477, 749], [2037, 511], [917, 581], [1309, 371], [1701, 371], [1813, 805], [665, 203], [2373, 203], [1225, 637], [2821, 497]],
    bases: [[413, 343], [2625, 343]],
    bombSites: [[1029, 497], [2009, 497]],
    pickups: [{
        x: 1589,
        y: 760,
        kind: `ak47`
    }, {
        x: 1645,
        y: 648,
        kind: `shotgun`
    }, {
        x: 1365,
        y: 648,
        kind: `grenade`,
        grenade: `frag`
    }, {
        x: 1673,
        y: 872,
        kind: `sniper`
    }, {
        x: 1309,
        y: 872,
        kind: `health`
    }, {
        x: 1813,
        y: 634,
        kind: `magnum`
    }, {
        x: 1197,
        y: 438,
        kind: `grenadeLauncher`
    }, {
        x: 1029,
        y: 494,
        kind: `uzi`
    }, {
        x: 2177,
        y: 340,
        kind: `fuel`
    }, {
        x: 833,
        y: 340,
        kind: `pistol`
    }, {
        x: 2289,
        y: 396,
        kind: `grenade`,
        grenade: `gas`
    }, {
        x: 2401,
        y: 340,
        kind: `smg`
    }, {
        x: 581,
        y: 354,
        kind: `health`
    }, {
        x: 2513,
        y: 368,
        kind: `grenade`,
        grenade: `mine`
    }, {
        x: 497,
        y: 200,
        kind: `fuel`
    }, {
        x: 2541,
        y: 200,
        kind: `rifle`
    }, {
        x: 245,
        y: 508,
        kind: `rifle`
    }, {
        x: 189,
        y: 326,
        kind: `health`
    }, {
        x: 245,
        y: 200,
        kind: `m14`
    }, {
        x: 2793,
        y: 200,
        kind: `grenade`,
        grenade: `frag`
    }],
    grid: `.216|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|.16N32.120N32.16|.16W10NW7NW3NW9.120W6NW7NW3NW3NW9.16|.16W32.120W32.16|^|.16W4d24W4.120W4d24W4.16|.16W4d5.3d9.3d4W4.120W4d5.3d9.3d4W4.16|.16W4d5.2d10.2d5W4.120W4d5.2d10.2d5W4.16|.16W4d26.124d26W4.16|.15NW4d26.124d26W4N.15|.13N3W4d26.124d26W4N3.13|.13N3W4d8W5d10W3.13N2.94N2.13W3d10W5d8W4N3.13|.12N4W4d8W7d6W7.10N4.92N4.10W7d6W7d8W4N4.12|.11N5W4d6W22.N.42N4.24N4.41N.2W22d6W4N5.11|.11N4nW4d5W23.N2.41N4.6N.3N.3N.3N.5N4.41N2.W23d5W4nN4.11|.10N5n10W23N6.47N14.47N6W23n10N5.10|.10N4n10W24N6.6N2.39N13.42N2.4N6W24n10N4.10|.10N4n9N32.3N5.39N12.40N4.3N32n9N4.10|.10N4n7N43.2N.15N.2N2.5N.5N.3N12.4N.N.5N.3N.3N.15N.N43n7N4.10|.10N3n8N10n2.4n6.2N22.14N18.3Nn10N.3N18.14N22.2n6.6N10n8N3.10|.10N3n7N9n3.5n6.4N19.15N17n.2n14.2N17.15N20.4n6.8N9n7N3.10|.10N3n7N8n4.6n4.6N18.16N16n13.2n5N16.16N18.6n4.10N8n7N3.10|.9N6n7N4n5.7n4.8N15.8N2.3N.3N16n12.4n4N16.4N.3N2.7N15.8n4.11nN4n7N6.9|.9N9n13.7N4.15N6.7N9n2N16n10.10n2N16n2N9.7N6.15N4.11n9N9.9|.8N12n11.5I3N2I3.15N2.9N8n4N15n9.12N16n3N9.9N2.15I3N2I3.9n7N12.8|.8N13n9.6I8.26N8n4N14n7.17N14n4N8.26I8.10n5N13.8|.9N10nI4n6.9I2.13N.15N8n5N11n8.20N12n4N7.17N.12I2.13n2I4nN10.9|.9N10nI10.21I.N5.9I.2n5.2n8N6n4.30N6.2n6.9I.9N5.I.22I9nN10.9|.10N8n2I12.16I4.N5.6I4.2n5.2n8N.N2.Nn3.33N2.4n6.9I4.6N4.2I4.16I12n2N8.10|.10N8n2I12.15I5.2N5.5I4.n5.4n6.49n5.10I4.5N5.2I5.15I12n2N8.10|.10N8n2I9n2.13I8.2N6.2N.N5n5.4n5.50n5.9N5.2N.N6.2I8.15I9nN9.10|.10N8n13.8I13nN21.4n5.I.10I.24I.10I.n5.4N20.2I13.13n8N8.10|.10N8n14.4I16nN23.2n4I.I4.4I4.24I4.4I4n6.2N22.2I16.10n8N8.10|.10N8n16.2I16n2N22.n3I21.5N4.5I21n3.N22.2I16n2.7n9N8.10|.10N8n17.3I11n5N5.3N12.3n3I21.5NI2N.5I21n3.3N12n.3N3.5I12n5.6n9N8.10|.10N8n9I2n12I.3n10.10n6.6n2I22.5NI2N.5I22n2.6N6n4.11In2I.4In10N5n8N8.10|.10N8n6I8n11.n12.8n7.5n2I24.4nI2n.4I24n2.7N3n5.10n6.2n11I3N2I3n6N8.10|.10N8n6I8n16In9.4n8.5N2I7nI.4InI.12n6.14In6I8n2.7Nn5.7n2In19I8n6N8.10|.10N9n8I2n19I4n7.2n9.4N2I8n3.2n5.11n6.14n7I8n3.6n6.6n3I4n19I2n8N9.10|.10N9n20I14n17.4N2I8n10.11n2I2n2.14n7I9n5.3n6.3n5I14n10.2n8N9.10|.10N10n16I20n14.2I12n10.10I8.12n8I12n3.n8.n3I20n6.4n6N10.10|.10N11n15I20n2I6n2I5.I4n18.8I12.8n18I4n2I4n2I6n2I20n4.8n3N11.10|.9N10nI4n15I17n3I5n3I2n2.I4n18.6I16.5n19I4n3I2n3I5n3I17n6.9I4nN10.9|.9N10nI9n18.6n6I5n3I2n2.2n10I2n6In.6I19n6In6I2n14I2n3I5n26.4I9nN10.9|.8N10n2I12n14.8n5I5n3I2n11I12.4I24n4I12n11I2n3I5n26.I12n2N10.8|.8N10n2I12n12.3I.8n24I12.4I8n8I8n4I12n15.2n15In14.I12n2N10.8|.9N10nI9n14.I4.9n26I6n2.7I3n14I2n10I6n17.4n14I4n11.4I9nN10.9|.9N10n4.2n14I9.9n34.8n48.10n11I9n6.10n4N10.9|.10N10n3.2n11I12.9n33I.9n46.12n10I12n4.8n4N10.10|.10N10n2.4n10I12.10n3Nn21I18n14I18n12.8N.5n9I12n6.4n6N10.10|.10N9n3.4n13I6.9N.2N2n2N3nN2n13I24n8I24n10.2N.4N2.2N2n3Nn8I6n10.2n8N9.10|.10N9n3.4I3n14.10N17n9I26n6I26n9N17n24I2n8N9.10|.10N8n4.2I8n12.9N17n6I64n6N16n22I8n6N8.10|.10N8n5.I8n14.8N17n5I12n2I.9I16n4.8I12n5N17n22I8n6N8.10|.10N8n5.2n2I2n18.6n2N17n7I6n6.10n2I10n6.10n2I6n7N17n26I2n9N8.10|.10N7n6.2n24I3n5N17n17.10n18.10n13N17n5In34N7.10|.10N7n31I4n7N15n18.8n19.10n13N15n7I4n31N7.10|.10N7n3In13I8n6I4n8N15n16I3.4n21.4I2.4n12N15n8I4n6I8n13In3N7.10|.10N9nI4n11I6n10In10N14n2Nn9I8.n22.I8.n9NnN14n10In10I6n11I4nN9.10|.10N9nI4n11I6n28N10n8I10n7I8n6I12n7N10n28I6n11I4nN9.10|.10N10I4N2n9I6n30N7n6I16n4I8n4I16n5N8n30I6n11I4N10.10|.10N10I4N2n3Nn15Nn7N2n17N6n2I20n4I8n4I20n2N6n17N2n6Nn15Nn4N2I4N10.10|.10N18nN3n13N3n2NnN4n17N4n3I20n7I2n7I20n3N4n17N4n5N3n13N21.10|.11N23n8N15n23I21n14I21n22N16n8N23.11|.11N23n8N16n22I9n6I9n8I9n6I9n22N16n8N23.11|.12N23n6N18n37I8n8I8n37N18n6N23.12|.13N23nN2nN22n37I2n14I2n37N23n3N23.13|.13N50n44I2n44N50.13|.15N51n38I8n40N49.15|.16N51n37I8n37N51.16|.18N52n27N2n8I2n8N2n27N53.17|.21N50n16In6N8n12N8n6In16N50.21|.23N49n2NnN2n6I4n6N8n12N8n6I4n10NnN49.23|.24N55n5I4n5N10n10N10n5I4n6N54.24|.26N54n2NnN4nN2nN13n7N13n3I4n3N55.26|.33N95I4N51.33|.35N94I2N50.35|.36N144.36|.37N142.37|.49N118.49|.51N114.51|.52N112.52|.54N13.2N14.3N5.2N30.2N5.3N14.2N13.54|.105N6.105|.107N2.107|.216|^|^|^|^|^|^|^`
}), g({
    id: `classic-snow-blind`,
    name: `SNOW BLIND`,
    subtitle: `Wide snow ridge between log cabins`,
    theme: `snow`,
    era: `classic`,
    traits: [`ice`],
    source: `9snowblind_new.png`,
    native: [10496, 1792],
    cols: 328,
    rows: 56,
    spawns: [[357, 539], [4221, 539], [2261, 161], [3269, 287], [1309, 287], [2765, 203], [3717, 511], [833, 511], [1785, 287], [2513, 399], [3969, 371], [581, 371]],
    bases: [[357, 539], [4221, 539]],
    bombSites: [[1729, 343], [3045, 161]],
    pickups: [{
        x: 2233,
        y: 312,
        kind: `sniper`
    }, {
        x: 2373,
        y: 312,
        kind: `m14`
    }, {
        x: 2037,
        y: 396,
        kind: `grenade`,
        grenade: `frag`
    }, {
        x: 2653,
        y: 312,
        kind: `rocket`
    }, {
        x: 1925,
        y: 312,
        kind: `health`
    }, {
        x: 1645,
        y: 172,
        kind: `magnum`
    }, {
        x: 2961,
        y: 172,
        kind: `ak47`
    }, {
        x: 1505,
        y: 88,
        kind: `uzi`
    }, {
        x: 3101,
        y: 88,
        kind: `fuel`
    }, {
        x: 1057,
        y: 452,
        kind: `pistol`
    }, {
        x: 3549,
        y: 452,
        kind: `grenade`,
        grenade: `gas`
    }, {
        x: 721,
        y: 368,
        kind: `smg`
    }, {
        x: 609,
        y: 536,
        kind: `health`
    }, {
        x: 4025,
        y: 536,
        kind: `grenade`,
        grenade: `mine`
    }, {
        x: 4137,
        y: 340,
        kind: `fuel`
    }, {
        x: 441,
        y: 340,
        kind: `shotgun`
    }, {
        x: 301,
        y: 368,
        kind: `rifle`
    }, {
        x: 4305,
        y: 368,
        kind: `health`
    }, {
        x: 4389,
        y: 480,
        kind: `shield`
    }, {
        x: 189,
        y: 480,
        kind: `grenade`,
        grenade: `frag`
    }],
    grid: `.328|^|^|^|^|^|^|^|.104N4.112N4.104|^|.328|^|^|.105N2.2N2.3N.46N2.2N2.46N2.2N2.3N.105|.102N16.40N12.40N16.102|^|.101N18.9N4.24I16.24N4.9N18.101|.98N.N20.2N.5N4.24I16.24N4.6N.N20.2N.97|.97N26.33I16.33N26.97|.97N25.34I16.33N25.98|.98N24.40I3.I3.37N24.98|.99N3n3N16.8N2.3N.24nc.2Ic.2In.25N.3N2.7N16n3N3.99|.92I4.6n11N7.6N9.24n2.2In.2In.24N9.6N7n11.6I4.92|.92I4.6n13N2n3.6N8.25n3.n3.n.25N9.6n3N2n13.6I4N2.90|.90N3I3.N2.2Nn19.5N8.2N4.16I.N12.I.16N4.2N8.5n19.3N2.I3N3.90|.88N5I2N5.N2n18I.4N8.2N4.16I3N10I3.16N4.3N7.4In18N2.N3I5N4.88|.31N6.49N6I4N10n14I4.3N4n3.21NI4N8I4N.24N4.3I4n14N10I4N6.49N6.31|.30N8.48N6I4N10n14I4.3N2n5.20N2I4N8I4N2.25N2.3I4n14N10I4N6.48N8.30|.20N32.33N7I4N11n13I4.3N2n5N3.3I4.9N3I16N3.9I4.3N2.6N2.3I4n13N11I4N7.33N32.20|.20W10NW7NW3NW9.26N.3N.N8I4N12nN2n3Nn3NnI4.N6n2N6.I4.4N.3N4I16N5.5N.I4.N6.2N6.NI3n2Nn3Nn5N12I4N8.2N.3N.25W6NW7NW3NW3NW9.20|.20W32.25N15I4N19n2N3I3N17I4N12I16N12I4N17I3N3n2N19I4N15.25W32.20|.20W32.25N16I2N19n3N4I2N18I3N13I14N13I3N18I2N3n3N20I2N15.26W32.20|.20W4d24W4.12N4.10N36n4N22I4N40I4N22n4N36.10N4.12W4d24W4.20|.20W4d5.3d9.3d4W4.12N4.11N3.3nN28n3N23I4N40I4N22n3N29n.3N3.11N4.12W4d5.3d9.3d4W4.20|.22d7.2d10.2d5W4.20I4.9n4N6n10N9n4N22I4N40I4N22n4N9n10N6n4.9I4.20W4d5.2d10.2d7.22|.22d28.22I4.8n7N2n14N7n4N23I2N42I2N23n4N7n14N2n7.8I4.22d28.22|.13N2.7d28.21N2I10N2n14N2n7N6n4N92n4N6n7N2n14N2I11N.21d28.7N2.13|.10N.N4.N2.3d28.14N.4N3I12N3n10N6n7N3n6N7n4N9n2N10n2N9n4N9n2N10n2N9n4N7n6N3n7N6n10N3I12N3.4N.14d28.3N2.N4.2N.9|.9N11W4d8W5d10W3.6I4.2N10I12N22n116N22I12N10.2I4.6W3d10W5d8W4N11.9|.9N11W4d8W7d6W7.4I4.2N11I4NI5N25n112N25I4NI5N11.2I4.4W7d6W7d8W4N10.10|.10N10W32.4I4.N48n6N2n10N2n34N2n34N2n10N2n6N48.I4.4W32N10.10|.10N10W32.2N.N55n2N6n6N6n30N6n30N6n6N6n2N55.N2.W32N10.10|.11N9W32N224W32N9.11|.11N10W30N226W30N10.11|.12N304.12|.13N302.13|.21N6.6N6.6N6.6N6.26N6.26N6.6N6.2N6.2N6.2N6.2N6.2N6.2N6.2N6.6N6.26N6.26N6.6N6.6N6.6N6.21|.23N2.10N2.10N2.10N2.30N2.30N2.10N2.6N2.6N2.6N2.6N2.6N2.6N2.6N2.10N2.30N2.30N2.10N2.10N2.10N2.23|.328|^|^|^|^|^|^|^`
}), g({
    id: `classic-pyramid`,
    name: `PYRAMID`,
    subtitle: `Stepped sandstone pyramid with inner halls`,
    theme: `desert`,
    era: `classic`,
    traits: [],
    source: `10pyramid_new.png`,
    native: [8448, 4224],
    cols: 264,
    rows: 132,
    spawns: [[189, 1225], [3465, 1211], [1813, 147], [1813, 1603], [2709, 539], [1141, 903], [2653, 1491], [1953, 875], [805, 1575], [1309, 1435], [637, 931], [2989, 959]],
    bases: [[189, 1225], [3465, 1211]],
    bombSites: [[1225, 1239], [2457, 1239]],
    pickups: [{
        x: 1645,
        y: 816,
        kind: `uzi`
    }, {
        x: 1589,
        y: 1096,
        kind: `shotgun`
    }, {
        x: 1925,
        y: 1236,
        kind: `grenade`,
        grenade: `frag`
    }, {
        x: 1785,
        y: 480,
        kind: `smg`
    }, {
        x: 2429,
        y: 914,
        kind: `health`
    }, {
        x: 1533,
        y: 536,
        kind: `magnum`
    }, {
        x: 2065,
        y: 480,
        kind: `flamer`
    }, {
        x: 2205,
        y: 1320,
        kind: `uzi`
    }, {
        x: 1281,
        y: 1152,
        kind: `fuel`
    }, {
        x: 2457,
        y: 1236,
        kind: `pistol`
    }, {
        x: 2429,
        y: 564,
        kind: `grenade`,
        grenade: `gas`
    }, {
        x: 1561,
        y: 1488,
        kind: `smg`
    }, {
        x: 1225,
        y: 508,
        kind: `health`
    }, {
        x: 2709,
        y: 1124,
        kind: `grenade`,
        grenade: `mine`
    }, {
        x: 861,
        y: 1208,
        kind: `fuel`
    }, {
        x: 917,
        y: 508,
        kind: `rifle`
    }, {
        x: 2961,
        y: 1292,
        kind: `rifle`
    }, {
        x: 3101,
        y: 1516,
        kind: `health`
    }, {
        x: 413,
        y: 1516,
        kind: `m14`
    }, {
        x: 3437,
        y: 1572,
        kind: `grenade`,
        grenade: `frag`
    }],
    grid: `.264|^|^|^|^|^|^|^|^|^|^|^|.127B6.131|^|^|.126B8.130|.124B12.128|^|^|^|.120B20.124|^|^|^|.118B8p8B8.122|.118B7p10B7.122|^|^|.118p24.122|.118p7.2p6.2p7.122|^|.118p24.122|.116B5p18B5.120|^|^|.116B6p16B6.120|.112B16p4B16.37S2.77|.85S.26B16p4B16.37S2.77|.64B4.14S9.21B16p4B17.33S7.75|.64B4.13S9.22B16p4B18.30S10.74|.64B4.10S12.18B20p4B20.26S13.2S2.69|.64B4.2S.6S12.19B20p4B20.24S20.68|.61S26.21B20p4B20.21S26.65|.62S23.23B20p4B20.22S24.66|.62S22.20B14p24B14.18S24.66|.62S21.21B13p26B13.19S23.66|.63S12s8.19B15p26B14.18s6S16.67|.64S9s9.18B17p26B15.16s9S13.68|.64S8s10.15S3B12p14B8p14B12.14s10S11.69|.65S6s11.14S4B12p9.2p4B6p4.2p9B12.13s12S8.71|.66S4s11.14S5B12p9.2p4B6p4.2p9B12.13s13S5.73|.67S2.s10.14S6B12p15B6p15B12.12s13.2S2.75|.70s10.14S2B18p32B18.7s13.80|.70s9.16SB17p34B17.5s14.81|.71s8.17B17p34B17.2s17.81|.72s6.18B17p34B17.s17.82|.72s6.14B12p24B4p24B12s14.82|.73s5.14B12p24B4p24B12s14.82|.73s5.14B12p20B12p20B12s14.82|.74s4.14B12p20B12p20B12s14.82|.74s4.10B12p14B4p4B16p4B4p14B12s10.82|.74s5.9B12p9.2p4B2p6B14p6B2p4.2p9B12.s10.81|.75s4.9B12p9.2p4B2p6B14p6B2p4.2p9B12.s10.81|.76s4.8B12p15B2p6B14p6B2p15B12.2s10.80|.76s4.10p30B20p30.4s10.80|.75s6.9p30B20p30.3s12.79|.74s6B2.8p13Bp16B20p16Bp13.3s6Bs6.30B4.44|.74s6B4.6Bp9B4p16B20p16B4p9B.2B2s2B4s6.30B4.44|.45S2.27s6B24p16B4p4B4p4B4p16B24s6.30B4.44|.44S5.2S.22s6B24p16B4p4B4p4B4p16B24s6.30B4S3.41|.43S10.21s6B24p16B4p4B4p4B4p16B25s5.23S16.39|.42S12.20s6B24p16Bp7B4p7Bp16B26s4.24S16.38|.41S13.20s2B12p20B6p14B4p14B6p20B12s2.24S16.38|.40S14.19s3B12p20B5p15B4p15B5p20B12s3.24S14.39|.37S16.20s2B13p20B5p15B4p15B5p20B12s3.26s4S6.41|.38S14.20s2B14p20B5p15B4p15B5p20B12s4.26s5S2.43|.38S5sS8.20B12p32B4p8B4p8B4p32B12.26s6.26S2.16|.39S2s4S6.20sB12p32B4p8B4p8B4p32B12s.25s5.28S.16|.13S3.25s5S4.20s2B12p32B4p20B4p32B12s2.25s4.45|.14S2.26s5S2.21BsB12p32B4p20B4p32B14.26s2.46|.42s6.20B12p28B44p28B12.24s2.46|.42s5.21B12p28B44p28B12.23s3.46|.42s5.20B13p28B44p28B14.20s4.46|.42s4.20B14p28B44p28B16.18s4.46|.42s4.18B12p14B4p14B4p8B4p12B4p8B4p14B4p14B12S3.15s4.46|.42s4.18B12p15B2p15B4p8B4p12B4p8B4p15B2p15B12S4.14s4.46|.23S4.15s4.18B12p15B2p15B4p36B4p15B2p15B12S5.13s4.46|.22S4.16s4.18B12p15B2p15B4p36B4p15B2p15B12S6.12s4.46|.17S2.2S5.16s4.14B12p116B12S3.11s4.23S2.2S6.13|.12S3.2S2.S6.16s4.14B12p116B12S4.10s5.19S.S12.12|.11S14.17s4.9S3s2B12p12B4p32B4p12B4p32B4p12B12S5.9s5.14S20.11|.10S14.18s4.8S4s2B12p12B4p32B4p12B4p32B4p12B12S6.8s6.14S20.10|.10S14.18s4.8S2B12p16B4p16B4p12B4p12B4p12B4p16B4p16B12S2.8s6.14S20.10|.10S14.17s6.7S2B12p16B4p16B4p12B4p12B4p12B4p16B4p16B12Ss2.6s8.12sS20.10|.11S12s3.4S3.8s6.8SB12p16B4p16B4p12B4p12B4p12B4p16B4p16B12s6S3s9.5S4s4S19.10|.12S10s5.2S5.6s8.8B12p16B4p16B4p12B4p12B4p12B4p16B4p16B12s6S4s8.4S4s6S18.10|.12S10s8S5.4s9.10p22B48p4B48p20s10S5s7.3S5s6S18.10|.11S11s8S10s9.9p22B48p4B48p20s10S7s2S2s2S8s6S17.10|.11S10s10S12s6BS4.4p22B48p4B48p20s11S20s7S15.11|.10S10s12S10s6B2S4s.3p22B48p4B48p19Bs2Bs9S20s7S13.12|.10S10s10S12s4B14p40B4p8S4B6p16B9p9B4p26B26S19s9S12.12|.10S11s8S13s4B14p40B4p9S3B5p18B6p11B4p26B26sS16s12S12.11|.10S11s6S14s5B14p56B4p20B4p42B26s5S6s19S11.11|.10S12s4S14s6B14p56B4p20B4p42B26s7S2s22S11.10|.10S12s4S13s9p44B4p68B4p40s36S10.10|.10S12s5S10s11p44B4p68B4p40s24S3s2Ss7S9.10|.10S11s27p22S8p14B5p7B4p15B2p11Bp14B5p8B6p9S3p26s22S9s6S9.10|.10S10s28Bp20S10p13B6p6B4p12B6p10B4p10B6p8B7p7S5p25s6Bs13S10s8S8.10|.10S10s20B16p4B20p4B44p4B66p8B14s5S13s8S8.10|.11S8s21B16p4B20p4B44p4B66p8B14s4S13s9S7.11|.13S5s8S4s4S3s3B16s4B20s4B44s4B66s8B14sS14s12S4.13|.15S2.2s6S6s2S5s2B16s4B20s4B44s4B66s8B14s2S11s13.2S.15|.20s2S16s24S4s8S5s13S22s4S5s14S54s23S6s2S12s12.18|.21S18s22S6s6S7s2Ss10S22s2S7s12S53s24S6s3S13s12.17|.18S21s11S8s3S24s12S28s10S52s11S7s8S6s3S27.15|.17S23s9S10sS26s13S27s8S51s12S9s6S6s4S28.14|.16S26s4S41s13S27s2S2s2S51s10S12s5S7s4S28.14|.17S26s2S43s13S27sS2sS51s10S14s3S8s4S28.14|.17S78s6S82s8S16s2S9s4S28.14|.18S76s8S80s8S28s4S28.14|^|.18S77s4S86s4S30sSsS21.2S4.15|.19S76s2S2.4S78.4S2s2S31.S14.29|.20S77.7S76.7S33.3S10.31|.20S76.8S76.8S32.4S8.32|.21S30.2S26.2S14.10S10.2S34.2S26.10S14.2S14.6S6.33|.264|^|^|^|^|^`
}), g({
    id: `classic-overseer`,
    name: `OVERSEER`,
    subtitle: `Open arena ringed by sandstone ruins and a lone tower`,
    theme: `desert`,
    era: `classic`,
    traits: [],
    source: `12overseer_new.png`,
    native: [8448, 5760],
    cols: 264,
    rows: 180,
    spawns: [[217, 427], [3465, 427], [1757, 2275], [3465, 2247], [1841, 119], [189, 2107], [2093, 1155], [3045, 1295], [637, 1323], [2597, 2289], [2681, 119], [1085, 483]],
    bases: [[217, 427], [3465, 427]],
    bombSites: [[1701, 1099], [2093, 1155]],
    pickups: [{
        x: 1701,
        y: 1096,
        kind: `sniper`
    }, {
        x: 1813,
        y: 1600,
        kind: `rocket`
    }, {
        x: 2177,
        y: 2104,
        kind: `grenade`,
        grenade: `frag`
    }, {
        x: 1337,
        y: 2076,
        kind: `m14`
    }, {
        x: 2597,
        y: 508,
        kind: `health`
    }, {
        x: 777,
        y: 1768,
        kind: `magnum`
    }, {
        x: 693,
        y: 788,
        kind: `laser`
    }, {
        x: 2261,
        y: 270,
        kind: `uzi`
    }, {
        x: 3017,
        y: 704,
        kind: `fuel`
    }, {
        x: 3101,
        y: 1824,
        kind: `pistol`
    }, {
        x: 3325,
        y: 1488,
        kind: `grenade`,
        grenade: `gas`
    }, {
        x: 357,
        y: 1656,
        kind: `smg`
    }, {
        x: 1365,
        y: 88,
        kind: `health`
    }, {
        x: 945,
        y: 2300,
        kind: `grenade`,
        grenade: `mine`
    }, {
        x: 189,
        y: 1096,
        kind: `fuel`
    }, {
        x: 581,
        y: 2104,
        kind: `shotgun`
    }, {
        x: 3521,
        y: 1040,
        kind: `rifle`
    }, {
        x: 3045,
        y: 2286,
        kind: `health`
    }, {
        x: 693,
        y: 116,
        kind: `shield`
    }, {
        x: 3157,
        y: 102,
        kind: `grenade`,
        grenade: `frag`
    }],
    grid: `.264|^|^|^|^|^|^|^|.66S4.4S4.8S4.4S4.96S4.66|.37S.7S2.6S2.2S2.3S.2S6.2S6.6S6.2S6.2S.3S.8S.3S.18S.7S2.6S2.2S2.3S.30S6.2S.7S2.2S2.7S.2S2.2S2.3S.29|.27S96.3s3S36.26S52.21|.26S97.2s5S36.24S52.22|.25S26sS15s2S11B4S3.S7s2S25s5.2sS2B4S4sS25.24S5.S16B4S20B4S2.6B4.12|.21S2.S25s4S12.Ss2S.S4.2S3B4S2.3S4.Ss2S.S23s4.4S2B4S3s2S.S6.s3S12.26S2.4s2S13B4S20B4Ss2.5B4.12|.17S18.8s12.25B4s2.19s4S6.17B4.14s4.22B.20s6.4s4.B4.s6.2S11B4s3.5B4.12|.18S15s.10s10.26B4s2.20s5S2s.18B4.14s4.22B4.18s4.6s.3B4.2s4.5S9B4s4.4B4.12|.12B24.8s10.26B4s2.20s8.18B4.14s4.22B4.18s4.10B4.2s4.6S8B16.12|.12B24.9s9.26B4s2.20s8.18B4.14s4.22B4.18s4.10B4.2s4.7S7B16.12|.12B24s.8s9.28s4.18B4s6.36s4.2B4.16B4.8B4.6s4.17s3.11S3B16.12|.12B24s2.8s8.28s4.18B4s6.36s4.2B4.16B4.8B4.6s4.18s2.12sSB16.12|.12s12B4s2B10.6s8.28s4.3S2.13B4s6S4.32s4.2B4.16B4.8B4.6s4.18s2.12s2B10s6.12|.13s11B4s2.B9.6s8.27Ss3S2.2S2.2S2.6S2.B4sS2s2S6.30S2sS3.B4.S2.13B4.2S.5B4.5s5.17s3.12s2B10s5.13|.13s11B4s.3B8.6s8.19S48.26S9B4S11s2S22.2s5.16s4.12s2B10s5.13|.14s10B4.4B8.6s8.20S48.24S10B4S10s4S20.2s6.16s4.12s2B10s4.14|.14s14.5S5.8s8.20S14.S10sS7.2S6.2S5.24S9.2S13s4S20.s7.16s4.12s2B4s10.14|.14s13.8S2.9s8.21S12.4S6s4S4.6S2.6S2.26S7.5S11s5S18s10.15s4.12s2B4s10.14|.14s13.19s8.23S6.14s6.48s2.20s4S14s12.15s4.13s15.14|.14s12.20s8.25S2.18s2.74s4S10s15.14s4.14s14.14|.14s10B4.18s8.123s3S8s16.14s4.14B4s10.14|.14s10B4.18s9.123s3S6s18.13s5.13B4s10.14|.14s9B5s.17s9.126s25.12s5.13B4s9.15|.14s6B8s2.16s10.127s23.12s6.12B4s8.16|.12B22.10B12.129s11B4s6.12s7.3B24.12|.12B22.10B12s.129s10B4s7.10s10.B24.12|.12B22.10B12s2.22B4.105s7B4s7.10s11B24.12|.12B22.10B12s2.22B4.107s5B4s8.8s12B24.12|.44s4B6s4.15S2.B12.105S3B4S2s7.6s16.9s8.16|.45s3B6s5.14S2.B12.101S2.S4B4S4s2Ss4.2s17.11s6.17|.45s3B6s5.12S5B12.97S11B4S9s18.14s6.17|.46s2B6s6.10S6B12.98S10B4S10s15.17s4.18|.46s4B6s4.9S10s8.99S10B4S4B8s12.18s4.18|.46s4B6s5.7S9s9.101S9B4S4B8s11.19s4.18|.47s3B6s6.S12.2s6.110S11B8s11.19s4.18|.48s2B6s6S11.6s2.114S9B8s10.20s4.18|.48s4B8sS11.125S15s10.20s4.18|.49s3B8S11.128S14s9.20s4.18|.49s3B8S10.131S12s8.21s3.19|.50s2B8S9.133sS11s6.22s2.20|.46B18S3.135s2S10s6.22s2.20|.46B18S2.136s3S9s5.23s3.19|.46B18s.138s2S8s6.23s4.18|.46B18.140s2S6s6.24s4.18|.48s16.140s2S2B12.22s4.18|.49s14.142sS2B12.22s4.18|.49s14.142s2SB12.23s3.18|.50s12.144s2B12.24s2.18|.50s12.144s14.24s2.18|.50s12.144s13.24s3.18|.48B4s9.146s12.23s4.18|.48B4s8.148s10.24s4.18|^|.48B4s7.150s9.24s4.18|^|.48B4s6.152s8.24s4.18|.40B16s2.150B4s6.24s4.18|.40B16s2.150B4s7.23s4.18|.40B16s2.149SB5s6.23s3.19|.40B16s2.148S2B6s6.22s2.20|.42S8s8.73B6.69S2B12.22s2.20|.42S8s8.73B6.70SB12s.21s3.19|.42S7s8.74B6.71B12s2.20s4.18|.42S6s8.74B8.70B12s2.20s4.18|.42S6s8.74p8.72S8s4.20s4.18|.41S6s8.75p3.2p3.72S9s4.18s6.17|.41S6s8.75p3.2p3.73S8s4.18s6.17|.40S6s8.76p8.74S8s2B2.16s8.16|.36B16s2.76p8.74S4B12.12B12.12|.36B16s2.76p8.75S3B12.12B12.12|.36B16s.75B.p8.B.73S3B12.8B16.12|.36B16.76B4p4B4.74S2B12.8B16.12|.12B12.13S11s4.68B12p4B12.66S10s2.10B4s4.2s4.14|.12B12.15S8s4.69B12p4B12.67S8s4.9B4s3.3s4.14|.12B16.13S5s5.69B12p4B12.69s10.9B4s3.3s4.14|.12B16.12s3S2s5.70B12p4B12.70s10.8B2s4.4s4.14|.14s10B4.11s11.68B6p20B6.68s10.10s4.4s4.14|.14s10B4.9s13.68B6p20B6.67s10.11s4.4s4.14|.14s10B4s22.68B6p20B6.67s10.9B.s4.4s4.14|.14s13Bs22.68B6p20B6.66s10.10B4s2.4s4.14|.14s36.70B4p20B4.68s10.10B4s2.4s4.14|.14s37.69B4p5.2p2.2p2.2p5B4.67s12.9B4s3.2s6.13|.14s13Bs12B4s7.69B4p5.2p2.2p2.2p5B4.66s6B4s3.9B4s3.2s6.13|.14s10B4s12B4s8.70B2p20B2.68s6B4s4.8B4s12.12|.14s10B4s12B4s8.70p24.68s6B4s4.8B16.12|.13s11B4s12B4s7.71p24.68s6B4s5.7B16.12|.13s11B4.9s3B4s7.71p24.69s2S10s3.8s2B12.12|.12s12B4.11sB4s6.72p24.70s2S8s4.8s2B12.12|.12B16.8B10s4.72p8B8p8.70s2S4B6s2.8s6.20|.12B16.8B10s4.72p9B6p9.69s3S4B6s3.7s5.21|.12B12.9S3B10s4.72B2p7B6p7B2.68s4S4B6s3.7s5.21|.12B12.10S2B10s4.70B4p7B6p7B4.66s4S4B6s4.6s4.22|.34S8s8.68B6p20B6.64B6S6s6.6s4.22|.34S9s8.67B6p20B6.64B6S6s7.5s4.22|.35S8s8.67B6p20B6.64B6S6s8.5s2.23|.36S8s8.66B6p20B6.64B6S6s8.30|.36S6B8s2.68B12p4B12.68S6B12.5s.24|.37S5B8s3.67B12p4B12.69S5B12s.2s4.23|.37S5B8s4.66B12p4B12.69S5B12s8.22|.38S4B8s4.66B12p4B12.70S4B12s8.22|.38S8s8.74B4p4B4.78S10B10s4.22|.38S8s8.74B.p8.B.77s2S9B10s4.22|.39S7s8.76p8.79s8S3B10s3.23|.40S6s8.76p8.78s11SB10s2.24|.32B14s.s6.76p8.78s12S7s5.24|.32B14.3s6.75p8.77s14S5s7.23|.32B14.3s6.75p2B4p2.76s28.22|.32B14.4s6.74p2B4p2.76s28.22|.34s2B6.8s6.72B12.74s21.s6.22|.33s3B6s.6s8.71B12.73s21.3s5.22|.33s2B7s.6s9.70B12.73s18.6s5.22|.32s2B8s2.4s10.70B12.72s17.9s4.22|.24B20.4s10.72p8.74s16.10s4.22|.24B20.3s11.72p8.73s16.11s4.22|.24B20.2s12.72p8.72s2B4s11.11s4.22|.24B20.2s12.72p8.72s2B4s10.12s4.22|.29S11.6s12.72p8.72S2B8s6.12s4.22|.31S8.6s13.72p8.71S3B8s6.12s4.22|.45s13.72p8.69S5B8s5.13s3.23|.44s14.72p8.68S6B8s4.14s2.24|.44s8B4s2.72p8.68S6B4s8.14s2.24|.43s9B4s3.71p8.67S7B4s7.15s3.23|.42s10B4s3.71p8.67S7B4s7.15s4.22|.42s10B4s4.70p8.66S8B4s6.16s4.22|.42s10B4s4.70p8.60B8S6B10.16s4.22|.41s11B4s5.69p8.60B8S6B10.16s5.21|.41s10SB4S3s3.68p8.60B8S6B10.16s5.21|.40s9.S2B4S2s4.68p8.60B8S6B10.16Bs3B2.20|.40s8.2S8s4.68p8.64S16.12B4.4B8.18|.39s8.3S9s4.67p8.63sS15s2.11B4s.2sB8.18|.38s9.3S9s4.5B4.2s3.53p8.63s2S12s4.11B4s4B8.18|.38s8.4S10s4.4B4.s5.52p8.62s4S9s7.10B4s4B8.18|.38s8.4S12s2.4B4s6.52p8.61s5S8s9.5B6s8B6.18|.37s9.4S13s2.3B4s6.52p8.59s8S6s12.3B6s8B6.18|.37s9.4S5s2S9.2B4s6.52p8.57s11S4.3s12.B6s8B6.18|.36s10.4sS2s6S8.B4s6.52p8.56s12.S2.6s11B6s8B6.18|.36s10.4s10B4S4B4s6.52p8.56s12.10s10B4s6B14.14|.35s12.2s11B4S4B4s7.51p8.55s13.11s9B4s6B14.14|.34s13.2s10B5S4B4s7.3s8.40p8.22B4.24B4.s13.11s9B4s6B14.14|.34s24B6S4B4s8.s10.39p8.22B4.24B4s14.12s8B4s6B14.14|.24B8.2s18B12S8s21.15B4.18p8.22B4.24B4s14.12s6B8s10B10.12|.24B8.s19B12S7s24.13B4.18p8.22B4.24B4s15.11s6B8s10B10.12|.24B8.s19B12S7s21B4s2.10B4.18p8.22B4.8B4.10S2B4S5s10.12s5B8s10B10.12|.24B10s18B12S6s22B4s3.9B4.18p8.22B4.8B4.9S3B4S6s10.12s4B8s10B10.12|.12B6.4B12s4B6s8.4s8S6s22B4s5.7B4.5S2.11p8.11S2.2S3B20.7sS10B10s4.12s4B4s16B4.16|.12B6.4B12s4B6s7.6s8S4s23B4s7.5B4.5S2.11p8.10S8B20.5s4S9B10s3.14s3B4s16B4.16|.12B6s4B12s4B6s7.6s30S5B4s2S4s2.2S2B4S11.7p8.7S11B20S3s6S9B10s3.14s3B4s16B4.16|.12B6s4B12s4B6s6.8s27.S6B4sS6s.S3B4S10.8p8.8S10B20S2s8S8B10s2.16s2B4s16B4.16|.12B4s8B8s11.s6.8s26.2S36.8p8.8S32s8S5.2S5s8.16s2B4s16B4.16|.12B4s8B8s10.3s5.8s25.4S34.9p8.9S30s10S3.5S2s10.15s2B4s11.2s3B4.16|.15s9B8s7.B4.s4.10s12.2s10.14S6s2S6.2S6.11p8.11S6.7s3S6s18.8s10.15s17.2s6.17|.16s8B8s5.3B4.2s2.12s9.6s7.16sS2s6S2.6S2.13p8.13S2.8s6S2s19.8s12.14s16.4s6.16|.12B4s12B4s5.3B4.2s2.12s8.8s6.16s11.21p2B4p2.21s30.6s14.6s.6s16.4s6.16|.12B4s12B4s7.B4.s4.10s8.8s7.15s14.19p2B4p2.19s18.2s14.2s18.2s4.5s17.2s8.15|.12B4s24B4.s5.8s9.7s2B4s2.15s17.16B8.16s21.2s11B4s26.4s2B4s11.2s3B4s2.14|.12B4s24B4S2s4.8s8.8s2B4s2.14s19.13B12.13s21.4s10B4s26.4s2B4s16B4s2.14|.12B4s8B4s12B4S3s3.8s3W2s3.8s2B4s2.3S2.8s22.3B28.3s10S2s6S2s3.4s10B4s9S2s15.4s2B4s16B4s2.14|.12B4s8B4s12B4S5s2S.5Ss2W5S.4S.2S2sB4sS3.S2.5S4sS2s3SsS3s2S2s2Ss2S3B30S3sS2sS3s2S2s2S2sS4s3.2s8S2sB4s8S4sSs4Ss2S2sS3.2S2sB4s6Ss2S2s3SsB4sS.14|.12B4S8B4S4B4s4B4S32B4S40B28S30s4S6B4S59.13|.12B4S8B4S4B4Ss3B4S32B4S40B28S31s2S7B4S58.14|.13S11B4S4B4.Ss2B4S31.2S114.2S57.14|.15S9B4S4B4.2S2B4S29.6S110.6S54.15|.17S6.17B4.S6.10S6.18S6.26S6.18S6.14S6.10S6.18S6.18S6.33|.19S2.19B4.3S2.14S2.22S2.30S2.22S2.18S2.14S2.22S2.22S2.35|.264|^|^|^|^|^|^|^`
}), g({
    id: `classic-suspension`,
    name: `SUSPENSION`,
    subtitle: `Long bridge through four concrete towers`,
    theme: `outpost`,
    era: `classic`,
    traits: [],
    source: `13suspension_new.png`,
    native: [9856, 3840],
    cols: 308,
    rows: 120,
    spawns: [[301, 791], [3997, 679], [2149, 903], [1253, 133], [3045, 147], [3409, 1295], [1225, 931], [2849, 875], [1897, 315], [2429, 1463], [2457, 287], [3941, 1225]],
    bases: [[301, 791], [3997, 679]],
    bombSites: [[1477, 903], [2849, 875]],
    pickups: [{
        x: 1925,
        y: 900,
        kind: `sniper`
    }, {
        x: 1981,
        y: 634,
        kind: `ak47`
    }, {
        x: 2485,
        y: 760,
        kind: `grenade`,
        grenade: `frag`
    }, {
        x: 2541,
        y: 1026,
        kind: `shotgun`
    }, {
        x: 1701,
        y: 928,
        kind: `health`
    }, {
        x: 2317,
        y: 480,
        kind: `magnum`
    }, {
        x: 1477,
        y: 900,
        kind: `rocket`
    }, {
        x: 1645,
        y: 480,
        kind: `uzi`
    }, {
        x: 2681,
        y: 480,
        kind: `fuel`
    }, {
        x: 1701,
        y: 256,
        kind: `pistol`
    }, {
        x: 3157,
        y: 424,
        kind: `grenade`,
        grenade: `gas`
    }, {
        x: 1001,
        y: 760,
        kind: `smg`
    }, {
        x: 3353,
        y: 760,
        kind: `health`
    }, {
        x: 973,
        y: 312,
        kind: `grenade`,
        grenade: `mine`
    }, {
        x: 3353,
        y: 312,
        kind: `fuel`
    }, {
        x: 749,
        y: 872,
        kind: `rifle`
    }, {
        x: 3689,
        y: 914,
        kind: `rifle`
    }, {
        x: 497,
        y: 914,
        kind: `health`
    }, {
        x: 3689,
        y: 1418,
        kind: `m14`
    }, {
        x: 413,
        y: 1180,
        kind: `grenade`,
        grenade: `frag`
    }],
    grid: `.308|^|^|^|^|^|^|^|^|^|.72C.18C.216|.72C4.12C4.216|.72C20.124C4.12C4.72|^|.72C20.124C8.4C8.72|^|.72C4c12C4.124C8.4C8.72|.72C4c.2c6.2cC4.124C8.4C8.72|.72C4c.2c6.2cC4.124C4c12C4.72|.72C.c16.C.124C.c16.C.72|.74c16.30C4.56C4.34c16.74|.74c16.30C4.56C4.34c3.2c2.2c2.2c3.74|.72C.c6C4c6.C.28C8.44C4.4C4.32C.c3.2c2.2c2.2c3.C.72|.72C4c4C4c4C4.28C8.44C4.4C4.32C4c12C4.72|.68C8c4C4c4C8.24C12.2C6.28C8.2C10.24C8c12C8.68|.68C8c4C4c4C8.24C12.2C6.28C8.3C9.24C8c12C8.68|.68C8c12C8.24C12c2C6.28C4c7C9.24C12c4C12.68|^|.68C4c20C4.24C4c12C4.28C4c12C4.24C4c4C4c4C4c4C4.68|.68C4c5.2c6.2c5C4.24C4c5.2c5C4.28C2c7.2c5C4.24C4c4C4c4C4c4C4.68|.68C4c5.2c6.2c5C4.24C4c5.2c5C4.30c2Cc4.2c5C4.24C4c20C4.68|.68C4c20C4.24C4c14.C.30c2C4c8C4.24C4c20C4.68|.68C8c2C8c6C4.24C4c14.32c2C4c8C4.24C4c2C16c2C4.68|^|.68C8c2C8c6C4.24C4c14.C.28C.c10C8.24C4c2C16c2C4.68|.68C8c2C8c8.C.24C4c12C4.28C4c8C8.24C.c4C16c2C4.68|.68C4c22.22C8c2C18.20C8c8C12.22c22C4.68|.68C4c5.2c6.2c7.22C8c2C18.20C8c10C10.22c7.2c2.2c2.2c5C4.68|.68C4c5.2c6.2c7.C.20C8c2C18.20C12c8C8.20C.c7.2c2.2c2.2c5C4.68|.68C4c20C4.20C8c2C18.20C12c8C8.20C4c20C4.68|.68C4c12C12.20C4c12C4c4C4.20C4c4C4c14.22C12c8C8.68|^|.68C4c12C12.20C4c20C4.20C4c22.C.20C12c8C8.68|.68C4c12C12.20C.c24.C.20C4c20C4.20C12c8C8.68|.68C4c20C4.22c24.22C6c2C20.20C4c12C12.68|^|.68C4c20C4.20C.c14C4c6.C.20C6c2C20.20C4c12C4c4C4.40C4.24|.68C4c20C4.20C4c12C4c4C4.20C6c2C20.20C4c12C4c4C4.40C4.24|.68C20c2C6.20C20c4C4.20C4c20C4.20C4c8C8c4C4.30D.9C4.24|.68C20c2C6.20C20c4C4.20C4c5.2c6.2c5C4.20C4c8C8c4C4.28GD2G.8C4.24|.68C20c2C6.20C20c4C4.20C4c5.2c6.2c5C4.20C4c8C4c8C4.26G2D4GD3G4D4G6.18|.68C20c2C6.20C20c4C4.20C.c22C4.20C4c8C4c8C4.26D24.18|.70c22C4.20C4c20C4.22c22C4.20C4c4C8c10.28D24.18|.70c7.2c6.2c5C4.20C4c5.2c6.2c5C4.22c22C4.20C4c4C8c10.28D24.18|.70c7.2c6.2c5C4.20C4c5.2c6.2c5C4.20C.c22C4.20C4c4C4c14.29D22.19|.70c22C4.20C4c20C4.20C4c20C4.20C4c4C4c14.29D22.19|.25C2.41C8c12C8.20C4c4C20.20C20c4C4.20C4c4C4c4C12.28D20.20|.24C4.40C8c12C8.20C4c4C20.20C20c4C4.20C4c4C4c4C12.29D17.22|.18G6D4G2.38C8c12C8.20C4c4C20.20C20c4C4.20C4c12C12.29D14.25|.18D12.38C8c12C8.20C4c4C20.20C20c4C4.20C.c14C12.30D11.27|.18D12.38C4c20C4.20C4c20C4.20C4c12C4c4C4.22c22C4.30D11.27|.18D12.38C4c5.2c6.2c5C4.20C4c5.2c6.2c5C4.20C4c5.2c5C4c6C2.22c7.2c2.2c2.2c5C2.32D13.25|.18D11.39C4c5.2c6.2c5C4.20C4c5.2c6.2c5C4.20C4c5.2c5C4c6.22C.c7.2c2.2c2.2c7.33D18.19|.18D11.39C.c24.C.20C.c24.C.20C.c14C4c6.22C4c22.33D19.18|.18D11.23C4.14c10C4c10.24c24.24c24.D2.7C4.8C5c18DC4.12C4D.14D19.18|.18D13.21C4.14c10C4c10.24c24.24c24D4.6C4.8C4D2c15D3C4.12C4D3.11D20.18|.19D15.18C8.8C.c10C4c10.C.8C4.8C.c17C5c2.10C4.10c2C5c16D6.5C4.8C4D3c7D10C5.10C5D6.7D20.19|.19D17.16C8.8C4c8C4c8C4.8C4.8C4c12C8c2.10C4.10c2C8c13D6.5C4.8C4D4c4D12C6.8C6D8.5D20.19|.20C20.2C42c2C36c2C52c4C40c2C66.20|^|^|^|.20D17.31C4c20C4.20C4c20C4.20C4c20C8.13D3C4c12D8C4D12d12D20.24|.21D18.29C4c20C4.20C4c20C4.20C4c20C6.15D3C4c13D7C4D10d15D17.26|.21D22G3.22C4c20C4.20C4c20C4.20C4c4Cc10Cc4C4.18D2C4c13D7C4D7d26D6d2.27|.22D24.22C4c20C4.20C.c22C4.20C4c4C4c4C4c4C4.19DC4c14D6C4D5d30D2d3.28|.22D24G4.18C4c20C4.22cC17c4C4.20C4c4C4c4C4c4C4.20C4c14D6C4D4d36.28|.22D28G.17C4c20C4.22C18c4C4.20C4c4C4c4C4c4C4.20C4c15D5C4D3d38.27|.22D29G6D5.6C4c20C4.10G8.4C18c4C4.20C4c4C4c4C4c4C4.20C4D2c15D3C4D3d11D5G2D5d16.26|.22D42.6C2c20C4.10D8.4C18c4C4.20C4c4C4c4C4c6.C.20C4D4c15DC4D2d10D16d14.26|.22D14C24D5.5c22C4.10D8.4c22C4.20C4c4C4c4C4c6.22C4D4c16C4D2d10D16d14.5D.20|.23D13C24D7.3c22C4.11D8.3c22C4.20C4c4C4c4C4c6.22C4D2c18C4D2d11D13d17.4D2.19|.26d3D7C24D8C.c22C4.13D6.C4c20C4.20C4c4C4c4C4c6.C.20C4c20C4Dd42.3D4.18|.26d5D5C24D8C4c22.C.14dD5C4c22.C.20C4c4C4c4C4c4C4.20C.c22C4Dd43.2D4.18|.26d6D4C4d5C.8CdC4D8C4c8C4c10.16d2D4C4c4C17c.22C4c4C4c4C4c4C4.22c21DC4d45D5.18|.25Dd7D3C4d7.6d3C4D8C4c8C4c10.16d3D3C4c4C18.22C4c4C4c4C4c4C4.22c20D2C4d45D6.17|.23D7d35D3C4c8C4c10.C.15d3D2C4c4C18.22C4c4C4c4C4c4C4G6.14C.c19D3C4d32C4d9D6.17|.22D10d35DC4c8C4c8C4.16d2.DC4c4C18.22C.c6C4c4C4c4C4D6.14C4c17D3C4d32C4d8D8.16|.22D11d35C28.16d2.2C4c22.24c6C4c4C4c4C4D6.13DC14c2C12d32C4d7D9.16|.23D12d33C28.15d3.2C4c22.24c6C4c4C4c4C4D6.13DC14c2C12d32C4d5D10.17|.25D11C6d17Cd8C28G6.8d4.4c24.C.20C.c6C4c4C4c4C4D5.13D2C14.2C12d10D2G5D4d6DG4C4D15.17|.27D9C8d12C4d8C28D6.8d4.4c22C4.20C4c4C4c4C4c4C4D5.13D2C14.2C12d8D14d4D6C4D14.18|.29D7C28d10D28.8d4.2C20c4C4G2.16G2C12c4C4c4C4D4.14D10dC.12Cd12D15d4D6C4D14.18|.29D7C28d10D28.8d4G.C20c4C4D2G.14GD2C12c4C4c4C4D3.16D7d5.10d12D17d3D7C4D14.18|.30D6C28D2d9D26.6DG6DGC20c4C4D3G7.4G3D3C12c4C4c4C4D2.18Dd13.4d12D20d4D24.18|.31D5C28D4d7D26.5D10C20c4C4D10d.2dD6C12c4C4c6.CD.19d15.2d11D22d4D24.18|.33D36d7D24.6D10C4c20C4D10d4D6C4c12C4c6.22d15D2d10D23d4D24.18|.33D38d6D22.6D11C4c20C4D10d5D5C4c12C4c6.21d14D6d6D25d4D23.19|.34D39d4D22d7D10C4c20C4D9d8D3C4c12C4c6.C.6d4.5D7d8D40d4D21.21|.35D39d4D20d8D10C4c20C4D9d10DC4c12C4c4C4.5d6.3D10d4D42d4D19.23|.36D38d4D20d8D10C4c2C22D8d12C4c8C16.3d10D11d5D41d4D18.24|.37D37d4D19d2D6dD10C28D7d13C4c8C16.d12D9d7D41d4D17.25|.37D10.2D25d4D17d2D2.6D11C4.2C22D6d4D3d7C4.8C16d13D6d11D17.6D17d4D16.26|.38D7.6D23d4D15d2D2.10D9C4.2C22D5d3D6d6C4.8C16d12D5d6D2d6D14.10D34.27|.38D6.8D22d4D14d2D.13D10.4D26d5D5d8.12d25D5d6D.2Dd7D11.13D13.4D14.28|.39D3.12D20dD19.15D9.5D24d4D8d8.10d24D6d4D3.4D16.15D12.6D12.29|.61D14.4D4.30D4.8D22d2D2.2D6d3D12.3dD2G5D5d8D9d2D2.14D6.19D5.18D5.30|.63D11.5D2.34D2.10D18.2D2.6D38d3D10dD2.18D2.22D2.22D2.31|.64D10.55D15.12D36.Dd2D11.101|.66D7.56D14.14D33.4D12.102|.130D5.2D5.27D6.2D6.125|.131D2.6D2.30D2.6D2.127|.308|^|^|^|^|^|^|^`
}), g({
    id: `classic-cliffhanger`,
    name: `CLIFFHANGER`,
    subtitle: `Hanging rock columns under three cabins`,
    theme: `outpost`,
    era: `classic`,
    traits: [],
    source: `14cliffhanger_new.png`,
    native: [5248, 8448],
    cols: 164,
    rows: 264,
    spawns: [[441, 469], [1841, 455], [1225, 3437], [861, 1911], [497, 2807], [1701, 1519], [1785, 2821], [1141, 735], [1617, 2079], [1169, 2373], [1057, 231], [1617, 903]],
    bases: [[441, 469], [1841, 455]],
    bombSites: [[889, 1001], [1617, 903]],
    pickups: [{
        x: 1085,
        y: 1712,
        kind: `sniper`
    }, {
        x: 1057,
        y: 1992,
        kind: `rocket`
    }, {
        x: 1393,
        y: 1796,
        kind: `grenade`,
        grenade: `frag`
    }, {
        x: 777,
        y: 1740,
        kind: `m14`
    }, {
        x: 973,
        y: 2300,
        kind: `health`
    }, {
        x: 553,
        y: 1516,
        kind: `magnum`
    }, {
        x: 497,
        y: 2132,
        kind: `grenadeLauncher`
    }, {
        x: 777,
        y: 2496,
        kind: `uzi`
    }, {
        x: 889,
        y: 998,
        kind: `fuel`
    }, {
        x: 525,
        y: 844,
        kind: `pistol`
    }, {
        x: 1393,
        y: 676,
        kind: `grenade`,
        grenade: `gas`
    }, {
        x: 1449,
        y: 3140,
        kind: `smg`
    }, {
        x: 833,
        y: 3140,
        kind: `health`
    }, {
        x: 805,
        y: 508,
        kind: `grenade`,
        grenade: `mine`
    }, {
        x: 1421,
        y: 480,
        kind: `fuel`
    }, {
        x: 1141,
        y: 438,
        kind: `shotgun`
    }, {
        x: 1645,
        y: 480,
        kind: `rifle`
    }, {
        x: 665,
        y: 312,
        kind: `health`
    }, {
        x: 1617,
        y: 256,
        kind: `shield`
    }, {
        x: 441,
        y: 256,
        kind: `grenade`,
        grenade: `frag`
    }],
    grid: `.164|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|.75DG5D4.79|.74D12.78|.31D2.10D.28W16.27D2.10D.36|.31D3.8D3.27W16.27D3.8D3.35|.30D5.6D5.26W16.26D5.6D5.34|.30D6.5D5.26W16.26D6.5D5.34|.28W20.24W4d8W4.24W20.32|.28W20.24W4d.2d2.2dW4.24W20.32|^|.28W20.24s.d12.s.24W20.32|.28W4d12W4.26d12.26W4d12W4.32|.28W4d.2d2.2d2.2dW4.26d12.26W4d.2d2.2d2.2dW4.32|.28W4d.2d2.2d2.2dW4.24W2d12W2.24W4d.2d2.2d2.2dW4.32|.28s.d16.s.24W4d8W4.24s.d16.s.32|.30d16.26W4Dd6DW4.26d16.34|.30d16.26W4D3d2D3W4.26d16.34|.28W2d16W2.22G2W3D10W3G2.22W2d16W2.32|.28W4d12W4.22D20.22W4d12W4.32|.28W6d8W6D.21D20.8G4.10W6d8W6.32|.28W7d6W7D2.11G2.7D20.7GD4G.9W7d6W7.32|.28W7d6W7D3.3D2G5D2G3.5d2D14d2.5G3D6G9W7d6W7.32|.28W8d5W6D4.D14.6d3D10d3.6D19W7d5W7.32|.28D8d7D23.6d5D7d4.6D23d7D8.32|.29D6d6D26.5d5D6d5.5D26d6D6.33|.29D6d4D28.6d5D4d5.6D28d4D6.33|.30D4d4D30.6d5D2d5.6D30d4D4.34|.30D4d4D30.6d12.5D31d4D4.34|.30D4d4D16d4D11.5d12.4D12d3D10d2D5d4D4.34|.30D4d4D13d10D9.5d10.4D10d10D5d3D5d4D4.34|.30D4d4D11d14D7.6d8.5D8d14D2d5D4d4D4.34|.30D4d4D10d16D6.6d8.4D8d22D4d4D4.34|.30D4d4D9d18D6.5d8.5D6d22D5d4D4.34|.30D4d5D7d12G4d3D6.6d6.6D6d3G4d15D4d5D4.34|.30D4d5D6d13D4d4D6.6d4.8D4d4D4d14D5d5D4.34|.30D4d7D4d13D4d4D6.6d4.8D4d4D4d13D5d6D4.34|.30D4d7D6d11D4d4D5.6d5.8D4d4D4d11D6d6D5.34|.30D4d8D7d9D3d6D3.7dG4.9D2d5D3d10D7d7D4.35|.30D4d9D7d8D3d5.D2.7d2D4.9D2.d4D3d9D7d7D5.35|.30D4d11D5d8D2d6.10d2D4.12d4D2d10D6d7D5.36|.31D3d11D5d8D3d6.9D7d2.8d5D3d9D5d8D4.37|.37d9D3d9D4d5.10D6d3.7d5D4d9D3d8D5.37|.39d8D2d9D4d6.8D8d2.6d6D4d7.2D2.2d7D4.38|.40d18D4d8.5D10d.6d6D4d6.8d6D4.38|.40Gd17D4d9.3D13.4d7D4d6.8d6.D2.39|.34G6DGd17D2d12D14.3d8D3d6.10d4.43|.34D8d17D2d12D15.2d8D3d5.12d2.44|.34D8d31D15.2d8D2d6.12d2.3D.40|.34D9d30D14.2d9D3d6.10Dd3D4.39|.34D9d8.2d6D2d13D12d.2d10D3d5.7G3D9.38|.34D10d5.6d3D4d13D10d14D3d6.6D12.38|.34D10d4.8d2D4d14D8d15D3d8.4D12.38|.33D12d4.6d3D4d15D6d15D4d9.2dD13.37|.33D13d4.4d4D4d5.2d8D6d14D5d13D12.37|.32D14d4.4d4D4d3.6d7D4d15D5d13D13.36|.33D13d4.4d4D4d2.8d6D4d14D6d14D12.36|.33D13d5.2d4D7.8d6D4d15D5d15D10.37|.34D11d6.2d4D5d.10d6D3d15D5d15D9d.37|.35D10d11D6.12d5D3d16D4d16D7d.38|.37D7d12D6.12d5D3d16D4d16D6d2.38|.37D6d14D6.11d5D3d16D4d16D5d3.38|.38D5d14D5d3.10d3D4d17D2d17D4d3.39|.39D3d16D4d4.10d2D4d17D2d17D3d3.40|.39D3d16D4d4.10d2D4d36D2d4.40|.39D3d16D4d4.9d3D4d36D3d3.40|.38D4d17D2d5.8d4D3d17G4d5.2d9D4d.41|.38D4d17D2d5.8d4D3d17D4d3.6d7D4.42|.38D4d24.8d4D3d17D4d2.8d6D4.42|.38D4d25.7d4D4d16D4d2.8d6D4.42|.38D4d16G3d6.7d4D5d15D5.10d5D4.42|.38D4d16D3Gd6.6d4D6d14D4.12d4D4.42|.38D4d16D4d6.6d4D6d14D4.12d4D4.42|.37D6d14D5d6.6d4D5d15D5.11d3D5.42|.37D6d14D5d5.8d3D5d12.2D6.12d2D5.42|.36D8d12D6d4.10d2D4d11.5D6.12D6.42|.37D7d12D6d4.10d2D4d10.6D6.12D6.42|.37D6d14D5d4.10D6d10.6D5.14D6.41|.38D5d4.2d8D5d4.11D4d10.7D4d.14dD5.41|.39D3d3.6d7D4d4.12D3d9.8dD2d.16dD5.40|.39D3d.9d6D4d4.12D2d10.8d4.16dD5.40|.38D5.9d6D4d5.10dD3d9.8d4.16dD4.41|.37D6.10d5D4d5.10d2D3d7.9dD3.16D4d.41|.37D7.10d4D4d6.8d3D3d6.10D4.16D3d.42|.36D8.10d4D4d8.4d5D3d6.10D4.16D2d2.42|.37D6.11d4D4d9.2d5D4d6.9D6.15D3d.42|.37D6.12d4D3d15D5d5.10D6.15D4.42|.38D4.14d3D3d15D5d4.10d2D6.14D4.42|^|.39D2.15d3D3d15D5d5.9d2D5.15D4.42|.57dD4d16D3d6.10D5d.16d2.43|.58D4d17D2d7.10D3d.62|.58D4d26.10D2d2.62|.57D5d27.9D3d2.61|.38G4.15D5d16G4d8.8D4d.15G4.42|.38D4.14D6d16D4d8.8D4d2.13dD4.42|.38D4.14D6d16D4d8.8D4d2.10d4D4.42|.38D5.14D5d16D4d9.6D5d2.9d5D4.42|.38D5.11d3D4d17D3d10.6D6.7d8D4.42|.38D4d2.9d5D3d17D3d11.4D6.7d9D4.42|.38D4d4.4d8D2d18D2d14.2D6.4d12D4.42|.37D5d5.2d9D3d17D3d14.2D5.3d13D4.42|.37D4d17D4d16D4d15D5d16D4.42|.36d2D3d17D4d16D4d16D4d16D4.42|.36d2D2d18D4d16D4d16D4d16D4.42|.36d2D3d18D2d17.D2.d16D4d16D4.42|.37D5d35.6d15D4d17D3.42|.38D4d34.8d14D4d17D3.42|.38D4d32W8p.d14D4d17D3.42|.37D5d32W9.d15D2d18D3.42|.37D5d13DG5D4d9W9.2d33D4.42|.36d2D4d12D12d7W11.2d32D4.42|.36d2D4d12D12d6.4D6.4d32D4.42|.36D6d6Dd5D12d6.5D5G.2Gd32D4.42|.37D5d5.2D2d4D10d6.6D6G2Dd12G4d16D4.42|.38D4d3.6Dd3D10d5.8D8d12D4d16D4.42|.38D4d2.8d4D8d6.8D8d12D4d16D4.42|.38D4d2.8Dd5D4d9.7D7d13D4d16D4.42|.38D5.10Dd17.7D5d15D4d16D3.43|.38D4.12d18.6D3d17D4d16D3.43|.38D4.12d18.6D2d18D4d16D3.43|.38D4.12d19.5D3d17D4d9Dd6D4.42|.38dD3.13d3G4d12.5D3d16D4d7D2.2d5D5.41|.38dD3.14d2D4d12.5D3d16D4d6D.6d3D5.41|.38dD3.14d2D4d12.5D3d16D4d6.8d2D6.40|.38D4.14d2D5d12.3D4d16D4d5D.8d2D5.41|.37D5.15D6d12.2D5d17D3d4D.10d2D3d.41|.37D5.16D6d12.D5d17D3d4.12dD2d3.40|.37D5.16D6d11D7d17D3d4.12d6.40|.37D5.16D5d12D7d17D4d3.11d7.40|.38D4.16D5d11D8d16D5d2.12d6.41|.38dD2d.16D4d12D8d16D6.12d6.42|.38d4.16D4d12D8d16D6.12d6.42|.37d6.14D5d13D7d16D5.12d8.41|.37d6.14D5d15D5d16D4d.11D11.39|.36d8.12D6d17D3d16D3d.12D12.38|.36d7D.12D6d17D3d16D2.14D12.38|.35d6D4.12D5d17D3d16D3.13D12.38|.34D12.11D5d16D4d16D4.12D11.39|.34D12.12D4d16D4d16D4.12dD10.39|.34D12.12D4d16D4d16D4.12d2D8.40|.34D12.11D5d16D4d6Dd9D4.12d4D4d.41|.35d2D6d2.12D4d17D3d6.2D2d8D3.13d8.41|.36d3D2d3.12d2D3d17D3d4.6Dd7D3.14d6.42|.36d8.12d2D2d18D2d4.8d7D3.14d3Dd2.42|.37d6.13d2D3d17D3d3.8Dd5D4.14d3D2d.42|.37dG5.14d2D3d16D4d.10Dd3D5.15dD4.42|.38D4.16dD3d16D4.12d3D5.16D4.42|.38D4.16dD3d16D4.12d2D6.16D4.42|.37dD4.16D4d9Dd6D4.12d3D5.16D5.41|.37d2D3.15D5d7D2.2d6D3.13d2D5.16D5.41|.36d3D3.15D5d6D.6d4D2d.14d2D4.16D6.40|.36d3D3.14D6d6.8d6.14d2D4.16D6.40|.36d2D4.15D5d5D.8d7.13d2D4.16D5.41|.37D5.14D6d4D.10dD4d.14D5.16D4.42|.37D5.14d2D4d4.10D8.14D4.16D3.43|.36D6.14d2D4d4.10D8.14D4.16D2.44|.37D6.13d2D4d4.11D6.15D4d.15D3.43|.37D6.14d2D2d5.10D7.15dD2d2.15D4.42|.38D4d2.14dD2d5.10d2D4.16dD2d3.14D4.42|.38D4d2.14d8.10d2D4.16d6.14D4.42|.38D6.14d8.10D7.15d6.14D4.42|.38D4d.15D3d4.12D6.15D3d2.15D4.42|.38D4.16D4d2.14D4d2.14D4.16D4.42|.38D4.12W8d2.14D4d2.14D4.16D4.42|.37dD4.12W8d3.13D4d2.13D5d.15D4.42|.37d2D3.12W8d4.12D3d2.14D4d2.15dD3.42|.36d3D3.12W8d4.12dD2d.14D5d3.14dD3.42|.36d3D3.14d2D2d6.12d4.15D4d3.14dD3.42|.36d3D3.14d2D3d5.12d4.15D5d2.14dD3.42|.37dD4.15D5d3.13G4.16D5.15D4.42|.38D4.16D4d2.14D4.17D4.15D4.42|.38D4.16D4d2.14D4.17D5.14D4.42|.38D5.15D4d2.14D4.17D4.15D5.41|.38D5.15dD4.15D3.17D6.14D5.41|.38D6.14dD3.16D3.17D4d2.14D4d2.40|.38D6.14dD3.16D2.18D4d2.14D4d2.40|.38D5.15dD3.16D3.17D4d2.14D4d2.40|.38D4d.15D4.16D4.16D3d2.15dD2d2.41|.38dD2d.16D4.16D4.16D3d.16dD2d.42|.38d4.16D4.16D4.16W4s.15d4.42|.38d4.16D4.16D4.16W5.15d4.42|.38d4.16D4.16dD3.16W5.15d4.42|.38d4.16D4.16dD3.16W6.14d4.42|.38d4.16D4.16dD3.16D6.14d4.42|.37Dd4D.14dD4.16dD3.16D5.14Gd4D.41|.34D5G2D5.11d2D3.16D4.16dD4.11D2GDG3D5.38|.32D16.8d3D3.16D3d.16dD3.10D16.36|^|.33D13.10d2D4.16D4.16dD3.11D13.38|.37D6.14D5.16D5.15D4.15D6.41|.39D2.16D5.16D5.15D4.17D2.43|.56D6.16D6.14D4.62|.57D5.16D5.15D4.62|.57D5.17D4.15D3.63|.58D4.17D3.16D3.63|.58D4.17D3.16D2.64|.58D4.17D3.16D3.63|.58D3d.16D4.16D4.62|^|.58D2d2.16D4.16D4.62|.58D3d.16D4.16D4.62|.58D4.16dD3.16D4.62|^|^|.58D4.16D4.16D4.62|.58d4.15D4d.16d4.62|^|.58d4.14D4d2.16d4.62|.57Gd4D.14D4d.15Dd5.61|.55DGDG3D4.12D5.13D10.59|.54D12.12D4.12D12.58|^|.55D10.13D4.13D10.59|.57D6.15D3.16D6.61|.59D2.17D3.18D2.63|.78D2.84|.78D3.83|.78D4.82|^|^|^|^|.78dD2d.82|.78d4.82|.77d6.81|^|.76d8.80|^|.75d10.79|.74D12.78|.72D16.76|^|.73D13.78|.77D6.81|.79D2.83|.164|^|^|^|^|^|^|^|^|^|^|^`
}), g({
    id: `classic-crossfire`,
    name: `CROSSFIRE`,
    subtitle: `Symmetric concrete X of crossing halls`,
    theme: `facility`,
    era: `classic`,
    traits: [],
    source: `15crossfire_new.png`,
    native: [7680, 5120],
    cols: 240,
    rows: 160,
    spawns: [[609, 1043], [2681, 875], [1701, 1603], [1617, 315], [1309, 917], [2289, 315], [2065, 1071], [1113, 1477], [1029, 371], [2513, 1435], [1925, 651], [1645, 1141]],
    bases: [[609, 1043], [2681, 875]],
    bombSites: [[1113, 1155], [2121, 1085]],
    pickups: [{
        x: 1869,
        y: 914,
        kind: `ak47`
    }, {
        x: 1785,
        y: 1362,
        kind: `laser`
    }, {
        x: 1421,
        y: 1362,
        kind: `grenade`,
        grenade: `frag`
    }, {
        x: 1617,
        y: 760,
        kind: `shotgun`
    }, {
        x: 1225,
        y: 1208,
        kind: `health`
    }, {
        x: 2093,
        y: 1460,
        kind: `magnum`
    }, {
        x: 1001,
        y: 1096,
        kind: `rocket`
    }, {
        x: 2373,
        y: 1152,
        kind: `uzi`
    }, {
        x: 1365,
        y: 536,
        kind: `fuel`
    }, {
        x: 1085,
        y: 648,
        kind: `pistol`
    }, {
        x: 2317,
        y: 648,
        kind: `grenade`,
        grenade: `gas`
    }, {
        x: 833,
        y: 872,
        kind: `smg`
    }, {
        x: 2625,
        y: 1096,
        kind: `health`
    }, {
        x: 777,
        y: 1432,
        kind: `grenade`,
        grenade: `mine`
    }, {
        x: 2037,
        y: 368,
        kind: `fuel`
    }, {
        x: 553,
        y: 1320,
        kind: `rifle`
    }, {
        x: 2849,
        y: 1040,
        kind: `rifle`
    }, {
        x: 665,
        y: 648,
        kind: `health`
    }, {
        x: 2681,
        y: 592,
        kind: `m14`
    }, {
        x: 2877,
        y: 1320,
        kind: `grenade`,
        grenade: `frag`
    }],
    grid: `.240|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|.119C6.115|^|^|.118C8.114|.80C4.30C16.30C4.76|.80C4.31C14.31C4.76|.79C6.30C14.30C6.75|.76C12.27C14.27C12.72|.72C28.44C28.68|^|^|^|.72C4c20C18.16C18c20C4.68|.72C4c5.2c6.2c5C17.18C17c5.2c6.2c5C4.68|^|.72C4c20C17.18C17c20C4.68|.72C4c34.24c34C4.68|^|.72C4c4C5c25.24c25C5c4C4.68|.72C4c4C8c22.24c22C8c4C4.68|.72C4c4C8c8C17.18C17c8C8c4C4.68|.72C4c4C6c10C17.18C17c10C6c4C4.68|.72C4c20C17.18C17c20C4.68|.72C4c20C18.16C18c20C4.68|.51C2.19C4c20C8.36C8c20C4.19C2.47|.51C2.19C4c22C6.36C6c22C4.19C2.47|.51C2.19C4c24C4.36C4c24C4.19C2.47|.50C4.18C4c24C4.36C4c24C4.18C4.46|.46C12.12C10c4C8c8C8.10C8.10C8c8C8c4C10.12C12.42|.47C10.13C10c4C8c10C6.11C6.11C6c10C8c4C10.13C10.43|.47C10.13C10c4C9c11C4.11C6.11C4c11C9c4C10.13C10.43|.47C10.13C10c4C12c8C4.11C6.11C4c8C12c4C10.13C10.43|.76C4c4C4c4C4c8C8.20C8c8C4c4C4c4C4.72|.76C4c4C4c4C4c10C6.20C6c10C4c4C4c4C4.72|.76C4c4C4c4C5c11C4.20C4c11C5c4C4c4C4.72|.76C4c4C4c4C8c8C4.20C4c8C8c4C4c4C4.72|.76C4c4C4c8C4c8C8.12C8c8C4c8C4c4C4.72|.76C4c4C4c8C4c10C6.12C6c10C4c8C4c4C4.72|.76C4c4C4c8C5c11C4.12C4c11C5c8C4c4C4.72|.76C4c4C4c8C8c8C4.12C4c8C8c8C4c4C4.72|.68C12c4C4c12C4c8C20c8C4c12C4c4C12.64|.68C10c8C2c12C4c10C16c10C4c12C2c8C10.64|.68C8c24C5c11C12c11C5c24C8.64|.68C8c24C8c8C12c8C8c24C8.64|.40C21.6C5c28C8c8C12c8C8c28C5.6C21.36|.40C21.6C5c28C8c10C8c10C8c28C5.6C21.36|.40C21.6C5c23C14c26C14c23C5.6C21.36|.40C22.4C6c20C20c20C20c20C6.4C22.36|.40C4c14C12c22C20c20C20c22C12c14C4.36|.40C4c.2c6.2c4C10c25C18c20C18c25C10c4.2c6.2cC4.36|.40C4c.2c6.2c4C10c106C10c4.2c6.2cC4.36|.42C2c15C10c106C10c15C2.38|.42c160.38|.42c31.2c6.2c6.2c22.2c6.2c6.2c22.2c6.2c6.2c31.38|^|.42c160.38|.40C4c15C10c35C4c28C4c35C10c15C4.36|^|.40C5c14C10c26C17c20C17c26C10c14C5.36|.40C8c10C12c22C20c20C20c22C12c10C8.36|.40C22.4C6c20C20c20C20c20C6.4C22.36|.40C21.6C5c22C16c24C16c22C5.6C21.36|.40C21.6C5c28C8c11C6c11C8c28C5.6C21.36|.40C21.6C5c28C8c8C12c8C8c28C5.6C21.36|.68C12c20C8c8C12c8C8c20C12.64|.68C12c20C6c10C12c10C6c20C12.64|.68C12c20C4c11C14c11C4c20C12.64|.68C12c20C4c8C20c8C4c20C12.64|.76C4c4C4c8C8c8C4.12C4c8C8c8C4c4C4.72|.76C4c4C4c8C6c10C4.12C4c10C6c8C4c4C4.72|.76C4c4C4c8C4c11C5.12C5c11C4c8C4c4C4.72|.76C4c4C4c8C4c8C8.12C8c8C4c8C4c4C4.72|.43C2.31C4c4C4c4C8c8C4.20C4c8C8c4C4c4C4.31C2.39|.43C2.31C4c4C4c4C6c10C4.20C4c10C6c4C4c4C4.31C2.39|.43C2.31C4c4C12c11C5.20C5c11C12c4C4.31C2.39|.42C4.30C4c4C12c8C8.20C8c8C12c4C4.30C4.38|.38C12.12C18c4C12c8C4.28C4c8C12c4C18.12C12.34|.39C10.14C15c8C8c10C4.28C4c10C8c8C15.14C10.35|.39C10.14C13c12C4c11C5.11C6.11C5c11C4c12C13.14C10.35|.39C10.14C13c12C4c8C8.8C12.8C8c8C4c12C13.14C10.35|.74c26C4.12C12.12C4c26.70|.74c26C4.14C8.14C4c26.70|.74c25C5.36C5c25.70|.74c22C8.36C8c22.70|.55C21c20C17.18C17c20C21.51|^|.55C22c10C26.18C26c10C22.51|.54C26c4C30.16C30c4C26.50|.76C4c4C12.52C12c4C4.72|.76C20.52C20.72|.240|^|^|^|^|^|.114C16.110|.115C14.111|.108C.6C14.6C.104|.108C4.3C14.3C4.104|.108C4.20C4.104|^|^|^|^|.108C2.24C2.104|.240|^|.110C24.106|^|^|^|.240|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^`
}), g({
    id: `classic-undermine`,
    name: `UNDERMINE`,
    subtitle: `Concrete fortress above a hollow cave`,
    theme: `outpost`,
    era: `classic`,
    traits: [],
    source: `16undermine_new.png`,
    native: [7680, 4864],
    cols: 240,
    rows: 152,
    spawns: [[413, 791], [2961, 791], [1701, 1841], [1673, 175], [777, 1715], [2625, 1715], [2093, 931], [1309, 1099], [1197, 483], [2233, 203], [553, 1267], [3101, 1267]],
    bases: [[413, 791], [2961, 791]],
    bombSites: [[973, 987], [2093, 931]],
    pickups: [{
        x: 1757,
        y: 1124,
        kind: `saw`
    }, {
        x: 1673,
        y: 760,
        kind: `ak47`
    }, {
        x: 1365,
        y: 760,
        kind: `grenade`,
        grenade: `frag`
    }, {
        x: 1561,
        y: 1488,
        kind: `rocket`
    }, {
        x: 1085,
        y: 788,
        kind: `health`
    }, {
        x: 2345,
        y: 1292,
        kind: `magnum`
    }, {
        x: 2065,
        y: 1544,
        kind: `shotgun`
    }, {
        x: 2205,
        y: 634,
        kind: `uzi`
    }, {
        x: 1533,
        y: 480,
        kind: `fuel`
    }, {
        x: 1085,
        y: 1488,
        kind: `pistol`
    }, {
        x: 1925,
        y: 452,
        kind: `grenade`,
        grenade: `gas`
    }, {
        x: 833,
        y: 984,
        kind: `smg`
    }, {
        x: 2569,
        y: 984,
        kind: `health`
    }, {
        x: 1225,
        y: 1824,
        kind: `grenade`,
        grenade: `mine`
    }, {
        x: 2205,
        y: 1824,
        kind: `fuel`
    }, {
        x: 2737,
        y: 1376,
        kind: `rifle`
    }, {
        x: 721,
        y: 508,
        kind: `rifle`
    }, {
        x: 1337,
        y: 172,
        kind: `health`
    }, {
        x: 2681,
        y: 508,
        kind: `m14`
    }, {
        x: 2933,
        y: 1628,
        kind: `grenade`,
        grenade: `frag`
    }],
    grid: `.240|^|^|^|^|^|^|^|^|^|^|^|^|^|.92C4.4C4.12C4.4C4.12C4.4C4.88|^|.84C76.80|^|^|^|.88C4.2c8.2C4.10c8.10C4.2c8.2C4.84|.88C4.2c3.2c3.2C4.10c3.2c3.10C4.2c3.2c3.2C4.84|.94c3.2c3.16c3.2c3.16c3.2c3.90|.94c8.16c8.16c8.90|^|.94c3.2c3.16c3.2c3.16c3.2c3.90|^|.94c8.16c8.16c8.90|.94c8.12C16.12c8.90|.94c3.2c3.13C14.13c3.2c3.90|^|.94c8.13C14.13c8.90|.94c8.16c8.16c8.90|.94c3.2c3.16c3.2c3.16c3.2c3.90|.88C4.2c3.2c3.2C4.10c3.2c3.10C4.2c3.2c3.2C4.84|.88C4.2c8.2C4.10c8.10C4.2c8.2C4.84|.84C28.6c8.6C28.80|.84C28.6c3.2c3.6C28.80|.34G3D.12D2G.31C28.6c3.2c3.6C28.30G3D.12D2G.31|.34D6.8D5G.30C28.6c8.6C28.30D6.8D5G.30|.34D7.6D7.30C4c20C5.5C8.5C5c20C4.30D7.6D7.30|.34dD8.2D9.30C4c5.2c6.2c5C5.5C8.5C5c5.2c6.2c5C4.30dD8.2D9.30|.34d3D6G2D6d2.31C4c5.2c6.2c5C6c4C8c4C6c5.2c6.2c5C4.30d3D6G2D6d2.31|.34d4.D10.35C.c22C6c4C8c4C6c22.C.30d4.D10.35|.34d4.2D8.38c72.32d4.2D8.36|.34d4.3dD4d.39c31.2c6.2c31.32d4.3dD4d.37|.35d2.4d6.37C.c10C5c16.2c6.2c16C5c10.C.31d2.4d6.37|.42d4.38C4c8C8c36C8c8C4.38d4.38|.42d4.38C8c4C8c4C6c16C6c4C8c4C8.38d4.38|.42d4.38C8c4C6c6C5c18C5c6C6c4C8.38d4.38|.43d3.14C.10C.12C8c16C5c18C5c16C8.12C.10C.15d3.38|.44d2.14C4.4C4.12C8c16C5c18C5c16C8.12C4.4C4.16d2.38|.44d2.13dC4.4C4.12C4c20C4c20C4c20C4.11dC4.4C4.16d2.38|.35d2.6d3.11d3C4.4C4.12C4c20C4c20C4c20C4.9d3C4.4C4d.6d2.6d3.38|.34d4.4d4.8d6C4d4C4d2.9C5c20C4c20C4c20C4G.5d6C4.4C4d2.4d4.4d4.8d3.27|.34d4.4d4.7d7C4d4C4d3.7GDC4c20C4c20C4c20C4DG.3d7C4.4C4d2.4d4.4d4.7d5.26|.25D2.7d4G13d9C4d4C4d5.5D2C8c4C16c6G8c6C16c4C8D2.d9C4.4C4d2.4d4G13d7.4D.21|.24GD2G.5Gd3GD13d9C4d4C4d7.2GD2C8c4C16c5GD8Gc5C16c4C8D2Gd9C4.4C4d2G.2Gd3GD13d7G.GD2G.20|.18G6D4G5DG3D14G9C4d4C4G9D3C8c4C16G5D10G2D2GC16c4C8D3G9C4d4C4G2DG2DG3D14G7DGD4G6.14|.18D42C4d4C4D12C8c4C16D20C16c4C8D12C4d4C4D42.14|.18D6C20D20d5D23d5D43dD7d5D23d5D19C20D6.14|.18D6C20D19d6D22d6D6d2D34d2D6d6D22d6D19C20D6.14|.19D5C20D7d6D5d8D20d8D4d3D34d3D4d8D20d8D5d6D7C20D5.15|.19D5C20D5d10D2d10D18d10D2d5D32d5D2d10D18d10D2d10D5C20D5.15|.20D4C4d12C4D4d24D16d18D14C4D4dD9d18D16d25D3C4d12C4D4.16|.21D3C5d11C4D3d26D13d21D8d2D3C4D3d2D8d20D14d26D3C4d11C5D3.17|.21D3C4.d11C4D2d27D10.2d24D5d3D3C4D3d3D5d26D10d27D2C4d11.C4D3.17|.22D2C4.2d10C4Dd29D7.6d24D2d5D2C4D2d5D2d30D8d28DC4d10.2C4D2.18|.22D6.2d33Dd10D6.8d6C10d14C8d14C10d14D6.2d7Dd34.2D6.18|.23D3.4d33D2d10D3.11d5C10d14C8d14C10d13.3D3.4d6D2d33.3D4.19|.30d32D4d9.14d5C10d14C8d14C10d13.10d5D4d32.26|.30d32D4d8.16d4C10d14C8d14C10d12.12d4D4d32.26|.30d13Dd14W12d4.16d10C4d36C4d18.12W12d13D2d13.26|.29d12D4d13W12d5.14d11C4d36C4d19.10W13d13D4d12.25|.22G3D5d8D8d12W12d5.14d11C4Dd34DC4d19.10dW12d12D8d8D5G3.18|.22D10d4D10d12W12d6.12d12C4D2d32D2C4d20.8d2W12d12D10d4D10.18|.22D2C20D2d13D10d8.10d13C4D2d32D2C4d21.6d4D10d13D2C20D2.18|.22D2C20Dd12D14d8.6d15C4D2d32D2C4d23.2d4D14d12DC20D2.18|.23DC20d10D19d27C4Dd22.2d10DC4d27D19d10C20D.19|.23DC20d8D22d26C4Dd20.6d8DC4d26D22d8C20D.19|.24D18d9D23d18C12d20.8d8C12d18D23d9D18.20|.25D16d9D25d17C12d19G.9d7C12d17D25d9D16.21|.25D14d10D14.2D10d17C12d8G5D7GD2G6d7C12d17D10d2D14d10D14.21|.26D11d12D12d.5D9d16C12d6G2D21Gd6C12d16D9d6D13d9D.D11.22|.26D10d11D13d2.6D8d34D24d34D8d8D12d8.4D10.22|.26D9d12D11d5.6D6d34GD24Gd34D6d11D11d6.6D9.22|.26D9d11D9d8.6D6d32G2D26Gd33D6d14D9d5.6D9.22|.26D8d12D7d11.6D4d32GD29G2d32D4d17D7d4.8D8.22|.26D8d12D6d13.5D4d32D32d32D4d19D5d4.8D8.22|.26D8d12D5d16.2d2D2d32GD32Gd32D2d20D5d5.7D8.22|.26D8d13D3d52G3D34G3d52D3d6.7D8.22|.26D8d13D2d53D40d53D2d7.6D8.22|.21sW18d31D2d8Dd20D40d20Dd8D2d31W18s.17|.21W19d30D5d6DGd20D38d19GD2Gd5D5d30W19.17|.21W19d19Cd9D10G2D2G2D5d15D34d15D5GD4GD10d9Cd19W19.17|.20SW19d16C4d9D23d15D30d15D24d8C4d16W19S.16|.28D8W4d16C4d9D23d17D19dD7d15D25d8C4d16W4D8.24|.29D7W4d18C2d9D24d16D6d2D10d2D6d16D24d9C2d18W4D7.25|.29D8W3d6D3d21D24d.2d13D4d3D10d3D4d16D24d30W3D8.25|.30D8d6D6d21D23.5d12D2d5D8d5D2d17D23d33D8.26|.30D6C22d14D22.6d18D8d24D22d14C22D6.26|.30D6C21d17D4d4D12.7d18D6d25D12d4D4d17C21D6.26|.30D6C21d32D4.8d50D4d32C21D6.26|.30D6C21d33.D2.9d49D2d34C21D6.26|.30D6C4d50.12d102C4D6.26|.30D6C4d51.10d103C4D6.26|.30D6C9d46.10d82.2d14C9D6.26|.30D6C12d44.8d81.6d9C12D6.26|.30D6C12d26G8d11.6d12D2d18D2d29G8d10.8d8C12D6.26|.31D5C10d27GD8Gd12.2d13D4d16D4d27GD8Gd8.10d9C10D5.27|.33D3C4d19Cd6G3D2G2D10G3d23D6d4D6d4D6d4.2d17G3D10G8.5C.4d15C4D3.29|.35DC4d16C4d6D20d23D7d2D8d3D7d.6d15D20.6C4.2d14C4D.31|.36d20C4d6D20d9D2d11W28.8d3D2d9D20.6C4.2d18.32|.37d19C4d6D20d8D4d10W28.9dD4d8D20d.5C4.d18.33|.37d7C4d8C4d7D18d8D6d7W32.7D6d8D18d2.5C4.d7C4d7.33|.38d6C4d8C4d7D18d8D7d4W36.5D7d7D18d3.4C4d8C4d6.34|.36C16d4C4d9D15d8D5W15d20W15D5d9D15d5.3C4d4C16.32|.36C16d4C4d9D14d10D3W16d20W16D3d10D14d8.C4d4C16.32|.34G2C16d4C4d3.2d5D12d11D3W16d20W16D3d11D12d10C4d4C16G2.30|.34D2C16d4C4d.6d4D10d13D2W16d20W16D2d13D10d11C4d4C16D2.30|.34D15d11.8d5D8d13D2W4d8W4d6W8d6W4d8W4D2d13D9d23D15.30|.34D17d8.10d4D9d13DW4d8W4d5W10d5W4d8W4Dd13D9d22D17.30|.35D18d6.10d5D9d13W4d17W10d17W4d13D9d21D18.31|.35D19d4.12d5D9d32W12d33D8d21D19.31|.37D14W17.2d5D9d36W4d35D10d7W18D14.32|.37D13W18.d5D11d35W4d35D11d6W18D13.33|.38D12W18.d4D13d72D13d5W17D13.34|.39D11W18d5D13d72D14d4W17D12.35|.41D19.D3W4d4D14d72D14d4W4D4.D19.36|.41D18.2D3W4d5D12d74D11d6W4D3.2D18.37|.42D16.4D2W3D2d27W5d7W2d8W2d4W2d8W2d7W5d27CW3D3.4D16.38|.43D14.6D7d26W7d5W4d4W4d4W4d4W4d5W7d26C2D5.6D14.39|.44D13.7D4C20Dd7W24d4W24d7DC20D4.7D13.40|.46D12.7D3C20D3d5W24D4W24d5D3C20D3.7D12.42|.49D10.6D3C20D8W24.4W24D8C20D3.6D10.45|.51D8.7D2C20D9W23.4W23D9C20D2.7D8.47|.52D8.6D52.8D52.6D8.48|.53D5.9D11.4D24.4D7.10D7.4D24.4D11.9D4.50|.240|^|^|^|^|^|^|^|^|^|^|^|^|^`
}), g({
    id: `classic-crucible`,
    name: `CRUCIBLE`,
    subtitle: `Cabins on rock spires over a wide cave`,
    theme: `outpost`,
    era: `mmc`,
    traits: [],
    source: `17crucible_new.png`,
    native: [7680, 4864],
    cols: 240,
    rows: 152,
    spawns: [[637, 1435], [2765, 1379], [1701, 735], [1813, 1953], [1365, 1407], [2177, 1183], [2373, 1799], [1029, 959], [1029, 1827], [329, 1799], [3017, 1743], [2541, 959]],
    bases: [[637, 1435], [2765, 1379]],
    bombSites: [[1113, 1407], [2261, 1407]],
    pickups: [{
        x: 1813,
        y: 1068,
        kind: `ak47`
    }, {
        x: 1589,
        y: 1236,
        kind: `sniper`
    }, {
        x: 1253,
        y: 1138,
        kind: `grenade`,
        grenade: `frag`
    }, {
        x: 1337,
        y: 844,
        kind: `shotgun`
    }, {
        x: 2121,
        y: 844,
        kind: `health`
    }, {
        x: 1785,
        y: 1460,
        kind: `magnum`
    }, {
        x: 2093,
        y: 1488,
        kind: `rocket`
    }, {
        x: 1561,
        y: 1628,
        kind: `uzi`
    }, {
        x: 1001,
        y: 1460,
        kind: `fuel`
    }, {
        x: 1225,
        y: 1656,
        kind: `pistol`
    }, {
        x: 2429,
        y: 1460,
        kind: `grenade`,
        grenade: `gas`
    }, {
        x: 721,
        y: 1068,
        kind: `smg`
    }, {
        x: 2681,
        y: 1152,
        kind: `health`
    }, {
        x: 1421,
        y: 1852,
        kind: `grenade`,
        grenade: `mine`
    }, {
        x: 2121,
        y: 1838,
        kind: `fuel`
    }, {
        x: 693,
        y: 1656,
        kind: `rifle`
    }, {
        x: 2681,
        y: 1768,
        kind: `rifle`
    }, {
        x: 357,
        y: 1432,
        kind: `health`
    }, {
        x: 3101,
        y: 1404,
        kind: `m14`
    }, {
        x: 665,
        y: 1908,
        kind: `grenade`,
        grenade: `frag`
    }],
    grid: `.240|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|.117G2.121|.114G3D2G3.118|.114D8.118|^|.114D7d.118|.115d7.118|.116d6.118|^|^|.95G2.20d4.21G3.6G3.86|.94GD2G.20d2.22D3G.4GD3.86|.94D4.20d2.22D4.4D4.86|.94D4.19d4.21D4.4D4.86|.95D2.20d5.20D4d4D4.86|.94dD2d.18d6.20D4d4D4.86|.70D.23d4.18d6.20D4d4D4.20D.65|.68GD2G.22d4.17d7.20D3d6D2d.18GD2G.64|.62G6D4G10.12d4.16d7.21d5.2d5.16G2D4G6.58|.62D20.12d4.16d6.22d4.4d4.16D12.58|^|.62D20.11d5.15d8.20d5.4d5.15D12.58|.63D16d2.12d4.14D3d8D3.16d4.6d4.16D11.12G4.42|.63D14d3.12d4.14D6d4D6.14d4.8d4.15D10d.12D4.42|.64D12d4.12d4.12W20.12d4.8d4.16D8d2.12D4.42|.65dD8.2d5.10d5.12W20.11d5.8d5.16dD4d4.11d2D2d2.41|.50G4.11d6.6d5.8d5.11W24.8d5.10d5.15d9.11d6.41|.50D4.12d6.6d4.8d4.12W24.8d4.12d4.16d8.10d8.40|.50D4.12d6.6d4.8d4.12W6d12W6.8d3D2.11d4.16d8.10d8.40|.49d2D2d2.11d7.5d4.8d4.12W6d.2d2.2d2.2dW6.8d2GD2G.9d5.15d9.9d10.39|.49d6.12d7.4d4.5G.2d4.12W6d.2d2.2d2.2dW6.8G2D4G2.7d5.15d8.9d5.2d5.38|.48d8.12d6.4d4.4GDG2d4.12W6d12W6.8D8.6d6.14d8.10d4.4d4.38|.48d8.12d6.4d4.4D4d4.16d16.12D8G4.2d6.14d7.11dD2d.4d4.D.36|.47d10.11d7.3d5.2GD4Gd3.16d16.13D11G.Gd5.13d7.12dD3.4d4D3.35|.46d5.2d5.11d6.4d4G2D6G3.16d16.15D10GD3G3.12G3d2.15D5.4d2D5.34|.46d4.4d4.12d6.4d2GD11.16d16.16dD15.12D3G.16D5.5dD5.34|.43D2.d4.4dDd2.12d6.4d2D12.11sW4d16W4s.11d3D13.12D4.14W20.32|.43D3d4.4D3d.12d7.4GD12.11W6d14W6.11d3D13.11dD4d.13W20.32|.42D5d2.4D5.12d5G6D6.3d4.11W6D8G2D4W6.12d3D11.12d2D2d4.11W20.32|.42D6.5D5.12d4GD10d.4d4.10sW6D14W6s.12d3D10.11d3D2d5.10W20.32|.40W20.10d4D10d2.4d4.12D24.14d5D7.12d10.10W4d12W4.32|.40W20.10d3GD9d3.4d5.11D24.14d5D6.12d12.9W4d.2d2.2d2.2dW4.32|.40W20.10G3D9d3.6d4.12d2D18d3.15d5D4d.11d5.2d6.9W4d.2d2.2d2.2dW4.32|.40W20.10D11d3.8d4.12d2.D14d5.16d5D2d.12d4.4d6.10d16.s.32|.40W4d12W4.10D10d4.8d4.12d2.2D12d6.16d8.12d4.4d8.8d16.34|.40W4d.2d2.2d2.2dW4.11D7d6.8d5.10d4.2dD8d.d7.14d9.12d4.4d9.7d16.34|.40W4d.2d2.2d2.2dW4.13d10.10d5.8d5.2d10.2d6.4G.9d9.12d3.6d10.3W2d16W2.32|.40s.d16.17d7.12d4.8d16.4d6.2GDG2.6d10.12d2.8d10.2W4d12W4.32|.42d16.18d6.12d4.8d16.4d6.2D4.4d12.3D2.7d2.8d10.2W10d4W6d.9D.21|.42d16.19d5G.11d4.7d18.2d8GD4G.2Gd12G.GD2G.5d4.8d4G2d3G.W10d4W6d3.5GD2G.20|.40W2d16W2.17dG4DG.11dG2.7d18.2d6G2D6G2Dd12DGD4G2.3d5.7dG3D2G3DGW10d4W6G2d4G2D4G2.18|.40W4d12W4.18D6G2.8G2D2.6d26GD11d12D8.2Gd5.8D11W9d4W5D3d4D8.18|.25D2.13W6d4W10G6.12D8.8D4.4d4Dd23D12d12D8G2DGd4.8D14d10D8d4D8.18|.24GD2G.12W6d4W10D6G.11D8G.6GD4G.2Gd2GD2Gd21GD11d14D11Gd3D.7D12d13D6d5D9.17|.22G2D4G2d4G6W6d4W10D7G7.5D8G6D6G2DG2D4Gd15G5D6.6d14.2D10G2D2G3.5D4.2d30D8.17|.22D8d4D7W5d4W9D15.5D30Gd12G2D9.10d10.6D15.5D2.5d29D9.16|.22D8d4D10d6D24.6D30d12D10d2.11dW8.7D13.12d30D8.16|.21D9d3D10d7D13d2D9.7D14d2D13Gd10GD9d4.11W8.7D13.11d33D4.18|.21D8d5D9d8D11d3D9.4d3D14d2D14G3d4G3D9d8.8W8.4d4D11.12d33D.21|.20D9d5D8d9D10d5D7d2.2d5D13d2D17d4D11d10.7W8.3d6D10.11d33.23|.20D8d6D8d10D8d6D6d10D12.4D16d4D10d14.6W4.2d11D7d2.8d23D2d9.24|.22D4d7D9d12D4d9D3d13D10.6D14d6D7d17.5W4.d12D6d4.6d23GD2Gd8.24|.23d10D8d44D6.10D6d16.2d9G4d8D2W4d2D3d9D4d28G6D4G2d5.25|.24d8D9.2d44D2.14D2d17.4d8D4d6D4W4D6d9D2d28.D12d4.26|.24d8D8.4d14W8d24.5D.6d20.4d8D4d7D3W4D6d37.3D12d4.26|.24d9D6.5d14W8d25.4D2.4d21.4d7D6d6D3W4D5d37.4D11d6.25|.25d8D6.6d13W9.6d21D4d13D2d8.6d6D6d7D2W4D3d12.2d6D3d4D3d6.8D8d8.25|.26d8D4.8d12W8.9d19D4d12D4d6.8d4D8d7DW4Dd12.6d3D12d3.10D6d11.24|.26d8D4.8W4d10W4.13dW4d4W4d4W4d4W4d4W4d6.8d3D10d7W4d12.8d2D12d4.9D5d12.24|.26d8D4d.7W4d10W4d.13W4d4W4d4W4d4W4d4W4d6.8D15d5W4d12.8d3D10d6.6D6d13.24|.27d8D2d2.7W4d8D2W4d2D3.9W4d4W4d4W4d4W4d4W4d5.8D8d2D8d18.10d4D6d11D9d12.25|.28d7D2d3.6W4d6D4W4D6.8W5d3W4d4W4d4W4d4W4d4.8D7d6D7d16.12d5D2d11D10d12.26|.28d14.6d9D3W4D6.12Wd35.8D6d8D6d16.12d18D10d12.26|.27d16.5d9D3W4D5.12d38.6d2D3d11D4d17.12d20D7d13.26|.26d19.4d9D2W4D3.11d29.2d10.3d40.12d38W4.24|.26d20.4d9DW4Dd.11d28.6d9.d41.12d38W4.24|.26d20.4d10W4d2.8d32.4d52.4D.7d5D2d10D2d18DW4.24|.25d22.2d11W4d3.6d34.2d53G.GD2G.5Dd3D6d6D6d14D4W3D.23|.23D3d4D2W4d11.2d18.3d10G2d5D3d24D3d10D2d10D3d16G4DGD4GD29d4D16.22|.22D10W4d32.d9G2D2d4D6d20D6d8D4d8D6d14D60.22|.22D10W4d19D2d13G4d4D4d4D7d18D7d8D4d8D7d13D60.22|.22D10W4d18D4d11GD4Gd2GD4dD2dD9d14D10d8D2d8D10d4D5dD60.23|.23D9W4d17D6d3D2G5D6G2D6.2D11G9D14d18D12dD.6D58.25|.23D9W4d17D28.6D33d16D14.6D57.27|.24D8W4Dd14D5.D7.D15.8D33d14D15.6D28.D27.28|.26D7W3D3d10D6.2D6.2D14.10D9.3D21d12D5.2D8.8D17.4D4.3D6.2D17.30|.29D13d4D8.4D4.4D12.35D10d10D5.48D4.50|.31D22.6D2.6D10.38D9d9D4.50D2.51|.32D20.17D7.40D9d6D5.104|.34D16.19D6.43D9d2D6.105|.70D4.47D13.106|.71D2.50D10.107|.124D8.108|.125D5.110|.240|^|^|^|^|^`
}), g({
    id: `classic-stronghold`,
    name: `STRONGHOLD`,
    subtitle: `Log keep and concrete keep around a cave heart`,
    theme: `outpost`,
    era: `mmc`,
    traits: [],
    source: `18stronghold_new.png`,
    native: [7040, 6400],
    cols: 220,
    rows: 200,
    spawns: [[1057, 1715], [2205, 1547], [1505, 735], [1785, 2247], [2597, 2247], [2457, 917], [777, 2247], [973, 987], [1897, 1099], [1561, 1701], [1309, 2135], [1309, 1267]],
    bases: [[1057, 1715], [2205, 1547]],
    bombSites: [[973, 1547], [2093, 1519]],
    pickups: [{
        x: 1813,
        y: 1432,
        kind: `shotgun`
    }, {
        x: 1225,
        y: 1516,
        kind: `ak47`
    }, {
        x: 1533,
        y: 1096,
        kind: `grenade`,
        grenade: `frag`
    }, {
        x: 1981,
        y: 1586,
        kind: `saw`
    }, {
        x: 1001,
        y: 1306,
        kind: `health`
    }, {
        x: 1813,
        y: 1782,
        kind: `magnum`
    }, {
        x: 917,
        y: 1516,
        kind: `rocket`
    }, {
        x: 1281,
        y: 900,
        kind: `uzi`
    }, {
        x: 2205,
        y: 1138,
        kind: `fuel`
    }, {
        x: 1589,
        y: 2020,
        kind: `pistol`
    }, {
        x: 1085,
        y: 1936,
        kind: `grenade`,
        grenade: `gas`
    }, {
        x: 2121,
        y: 914,
        kind: `smg`
    }, {
        x: 1869,
        y: 732,
        kind: `health`
    }, {
        x: 2485,
        y: 1264,
        kind: `grenade`,
        grenade: `mine`
    }, {
        x: 1953,
        y: 2076,
        kind: `fuel`
    }, {
        x: 2485,
        y: 1600,
        kind: `rifle`
    }, {
        x: 1533,
        y: 2244,
        kind: `rifle`
    }, {
        x: 1029,
        y: 2160,
        kind: `health`
    }, {
        x: 2485,
        y: 1880,
        kind: `m14`
    }, {
        x: 2177,
        y: 2132,
        kind: `grenade`,
        grenade: `frag`
    }],
    grid: `.220|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|.110G4.12G4.90|.109GD4G.10GD4G.89|.106G3D6G10D6G3.86|.106D28.86|^|.105d2D26d2.85|.102d7D6d2D6d2D6d7.82|.101d10D2d6D2d6D2d10.81|.99d12.d16.d12.79|.97d13.3d14.3d13.77|.94d13.6d14.6d13.74|.93d12.9d12.9d12.73|.91d12.11d12.11d12.71|.89d13.12d12.12d13.69|.66W2.18d4W2d7.16d10.16d7Cd5.18C.47|.64W4.17d3W4d5.19d8.19d5C4d3.17C4.44|.64W4.15d5W4d3.21d8.21d3C4d5.15C4.44|.64W4.13d7W4d2.23d6.23d2C4d7.13C4.44|.64W4.10d5W9.25dG5.25C9d4.11C4.44|.64W4.9d4W11.26D4.26C11d3.10C4.44|.64W10sd3W16.24D4.24C16.4C10.44|.64W11d3W17.22d2D2d2.22dC16.5C9.44|.64W11d3W16d8.15d6.19d5C15c5C9.44|.64W12d2W16d9.13d8.17d6C15c5C9.44|.62W6d16W8d13.11d8.16d8C12c10C8.42|.62W6d16W9d14.8d10.14d8C5c2C4c13C7.42|.62W6d16W8.d11W4d.5d12.12d9.C4c19C7.42|.62W6d22.4d10W4d2.4d12.12d8.4C2c19C7.42|.64W4d22.4d8W8s.3d12.9DC5d5.4c22C4.44|.64W4d22.5d6W10.2d14.7D2C5d6.3c22C4.44|.64W4d4W2d6W2d8W2.5d4W10.2d6.2d6.3d3D3C5d6.C.c9Cc4Cc7C4.44|.64W4d4W4d4W4d4W4.7dW12d6.4d6.d4D3C6d6C4c4C4c4C4c4C4.44|.64W4d4W12d4W4.8D12d6.4d10D4C4d8C4c4C12c4C4.44|.64W4d4W12d4W4.9D9.3d5.4d11D3C4d8C4c6C10c4C4.44|.64W4d4W12d4W4.6d7.8d4.6d4.2d7C4d3.2d3C4c8C8c4C4.44|.64W4d8W8d4W4.5d7.10d2.8d2.4d6C4d2.4d2C4c8C4c3Cc4C4.44|.64W4d8W4d8W4.3d9.10d2.8d2.4dC9d2.4d2C5c7C4c8C4.44|.64W4d8W4d8W4.d10.10d4.6d4.2d2C9d3.2d3C5c7C2c10C4.44|.64W4d20W4d11.10d5.4d5.2d2C9Dd2.2d3C5c19C4.44|.64W4d20W4d10.10d6.4d8C10D2d6C6c18C4.44|.62W6d20W6d8.10d6.4d8.3d3C4D2d4C8c18C6.42|.62W6d20W6d9.10d5G.2Gd9.3d4C2Dd5C7c19C6.42|.62W8d16W9.2d6.10d5DG2Dd9.6d10C6c10C2c6C7.42|.62W10d12W10.5d5.10d4D4d10.7d8C6c7C18.42|.64W14d4W10dW.5d6.9d4D4d10.8d8C5c5C18.44|.64W14d4W10d3.2d10.7d5D2d10.8d9C5c6C17.44|.64W14d4W10d17.5d5.2d10.7d10C5c6C17.44|.64W14d4W10d18.4d4.4d8.8d10C6c5C17.44|.64W8d12W8.d6.d3Dd6.4d4.4d8.8d10C4c8C16.44|.64W8d12W8.2d4.3d2D2d6.2d5.4d9.6d10C5c8C2c4C4c2C4.44|.64W8d12W8.9dD4d5.2d4.6d8.6d10.C4c20C4.44|.64W4d22.12D4d10.8d8.4d10.4C2c20C4.44|.64W4d22.11sW4d10.8d4C4.3d11.4c22C4.44|.64W4d22.11W6d8.10d3C4.d12.5c22C4.44|.66d8W4d12.4W2.5W6d8.10d2DC4d11.C.5c13C2c9.46|.66d6W8d10.2W4.4W8d6.12D2C4d9.3C4.2c10C8c6.46|.66d6W8d10.2W4.3d5.4d6.12D2C6d7.3C4.2c10C8c6.46|.66d6W8d10.2W4.d6.6d6.10dD2C5d10.C4.2c12C4c8.46|.64W4d4W8d7W9d7.6d6.10d2DC5d11C9c19C4.44|.64W4d17W11d6.8d6.8d3DC5.2d9C11c17C4.44|.64W6d12W14d6.8d6.8d4C4.5d7C17c6C9.44|.64W7d10W15d5.9d7.6d5C4.6d6C17c6C9.44|.64W7d10W18d.11d7.4d7.12d2C18c6C9.44|.64W8d8W20.12d6.4d6.12C22c4C10.44|.62W6d24W8d.6d.4d6.4d6.12C8c4C8c11C7.42|.62W6d24W8d3.2d4.4d5G.2Gd5.8d2.3C8c6C4c13C7.42|.62W6d24W10d8.3d5DG2Dd5.7C14c23C7.42|.62W6d24W12d6.4d4D4d4.6C16c22C8.42|.64W4d22W14d6.4d4D4d4.6C18c20C6.44|.64W4d21W15d7.4d4D2d4.7C17c22C5.44|.64W4d21W21d.6d6.7C19c22C5.44|.64W4d20W24.7d2.7C21c22C5.44|.64W4d6W10d8W20.16C20c6C12c5C5.44|.64W4d5W11d8W20d.6d2.6dC20c7C10c6C5.44|.64W4d5W11d30.4d4.4d18c11C10c6C5.44|.64W4d4W12d30.4d4.4d18c11C10c5C6.44|.64W4d12W4d7D2d6D2d6D2d5.4d4.4d5D2d6D2d3c3Dc8C8c6C6.44|.64W4d12W4d7D4d2D6d2D6d3.3d6.3d3D6d2D6dcD4c7C8c7C5.44|.64W4d22D23d.3d6.3dD23c6C8c7C5.44|.64W4d22D24.2d8.2D24c9C2c10C5.44|.64W6d20D2W22.2d9C25c21C5.44|.64W7d19D2W22.3d9C24c21C5.44|.64W7d9W2d9DW22.3d9C24c21C5.44|.64W8d8W4d7DW22.4d8C24c20C6.44|.62W6d12W4d8W4d8D8d2.4d10D8d8C6c20C8.42|.62W6d12W4d8W4d9D5d5.2d13D4d10C5c22C7.42|.62W6d12W4d8W4D2d17.2d10.2d13D2C5c3C4c8C4c3C7.42|.62W6d12W4d8W4D4d25.6d9D4C5c3C4c8C4c3C7.42|.64W4d6W12d6W4D4d24.8d8D4C4c3C18c3C4.44|.64W4d5W14d5W4D2d25.10d8D3C4c3C18c3C4.44|.64W4d5W14d5W4d7.6d9G5.10d11C4c3C18c3C4.44|.64W4d4W16d13.10d7D4.12d10C4c2C20c2C4.44|.64W4d8W4d21.8D2d7D4.8D.3d10C4c4C16c4C4.44|.64W4d8W4d23.5GD2Gd7D2d2.5GD2G.2d10C2c8C12c6C4.44|.64W4d8W4d27GD4G2d9.3G2D4Gd11c12C8c8C4.44|.64W4d38GD7d10.2D7Gd10c15C2c11C4.44|.64W4d38D8d11GD8d10c30.46|.64W4d37GD7d14D7Gd9c30.46|.66d24W2d7D4G2D6d4.2d2D2d8D6G2D4d3c4Cc25.46|.66d22W4d6D11d4.5D4d9D11d2c4C4c22.46|.66d22W4d6D10d4.6D4d10D10d2c4C4c20C4.44|.66d22W4d7D7d7.6D2d13D7d3c4C4c20C4.44|.64W5d14W9D2d17D3.7d6D2d15c2C11c10C9.44|.64W7d10W11D4d14D4.8d4D4d14C15c6C11.44|.62W33D2d13D4.8d4D4d13DC34.42|.62W33D3d13D3.7d6D2d13D2C34.42|.62W33D4d14.6D2d20D3C34.42|.61dW33D5d12.6D4d19D3C34.42|.59d15D.9D17d12.5D4d17D21.5Dd11C.42|.57Gd13D3.11D18d12.2d2D2d16D21.8D3d10.41|.54G3Dd11D2.18D25d12D29.14D2d11G4.34|.54D4d9D2.21dD25d8D29d.17D2d9D4.34|.54D4d8D.23d2D25d6D29d2.19Dd8D4.34|.55D2d6D3.24Dd2D26d2D30d2D.20D3d6D2.35|.57Dd4D.28D2.4Dd3D42d3D.4D2.24Dd4D.37|.59d2.37d4.D38.d4.33d2.39|.98d4.2D36.2d4.74|.98Dd2D.3D33.4Dd2D.74|.99D2.12D14.16D2.75|.114dD10d.94|.114d2D8d2.94|.114Dd3D4d3D.94|.115Dd8D.95|.116d8.96|.116Dd6D.96|.117d6.97|.117Dd4D.97|.118d4.98|^|.118Dd2D.98|.119D2.99|.220|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^`
}), g({
    id: `classic-entombed`,
    name: `ENTOMBED`,
    subtitle: `Sandstone tomb galleries under rubble`,
    theme: `desert`,
    era: `mmc`,
    traits: [],
    source: `19losttomb_new.png`,
    native: [5632, 3840],
    cols: 176,
    rows: 120,
    spawns: [[273, 791], [2037, 623], [1225, 1309], [1141, 231], [2233, 1365], [833, 875], [1505, 819], [469, 1309], [609, 371], [1757, 1309], [2261, 959], [1477, 441]],
    bases: [[273, 791], [2037, 623]],
    bombSites: [[833, 1043], [1645, 1029]],
    pickups: [{
        x: 1169,
        y: 872,
        kind: `uzi`
    }, {
        x: 1365,
        y: 648,
        kind: `flamer`
    }, {
        x: 1141,
        y: 550,
        kind: `grenade`,
        grenade: `frag`
    }, {
        x: 1057,
        y: 1124,
        kind: `shotgun`
    }, {
        x: 1477,
        y: 1152,
        kind: `health`
    }, {
        x: 1645,
        y: 1026,
        kind: `magnum`
    }, {
        x: 1729,
        y: 620,
        kind: `saw`
    }, {
        x: 1813,
        y: 858,
        kind: `uzi`
    }, {
        x: 721,
        y: 1152,
        kind: `fuel`
    }, {
        x: 553,
        y: 746,
        kind: `pistol`
    }, {
        x: 861,
        y: 1306,
        kind: `grenade`,
        grenade: `gas`
    }, {
        x: 861,
        y: 368,
        kind: `smg`
    }, {
        x: 1785,
        y: 396,
        kind: `health`
    }, {
        x: 1477,
        y: 1460,
        kind: `grenade`,
        grenade: `mine`
    }, {
        x: 1981,
        y: 1152,
        kind: `fuel`
    }, {
        x: 441,
        y: 536,
        kind: `rifle`
    }, {
        x: 217,
        y: 1054,
        kind: `rifle`
    }, {
        x: 161,
        y: 620,
        kind: `health`
    }, {
        x: 245,
        y: 424,
        kind: `m14`
    }, {
        x: 161,
        y: 1292,
        kind: `grenade`,
        grenade: `frag`
    }],
    grid: `.176|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|^|.81S3.92|.82S2.92|.176|.83s2.91|.82s4.5s2.83|.82s4.4s4.82|.71s2.9s3W2.3s4.82|.11s2.46s2.8s6.5S2sW5.Ss5.81|.10s4.44s4.5s10S14s4.81|.10s4.44s4.4s12S12s6.80|.10s4.9B2.14B6.2s2.9s3S2.3s12S12s7.36S2.41|.9s6.8B2.14B6s6.6Ss3S2.2s13.S11s9.30S.2S5.2S.36|.9s6.8B2.14B6s9.3S8s10.6s4S4s13.24S17.33|.8s8.6B4.12B8s9.s2S8s7.9s4S2.3s12.22S17.34|.8s8.S3B6.5B17s10S9s5.10s4.7s8W2s.20S18.34|.9s6S5B5.6B17s10S10s3.4s2.5s4.8s2S3sW5S.19S16s2.33|.9s6S5B5p5B18s10S11s2.3s4.5s2.10S12.19S5s2S6s6.31|.10s4S6B5p5B18s10S12.4s4.16S12.20sS2s5.S2.s8.30|.10s3S7B5p11B12S2s8S13.3s4.15S13.20s8.4s8.30|.10SsS8B5p4.2p8B9S4s6S14.S2s4.13S14.19s10.2s10.29|.9S11B5p4.2p9B8S7s4S18s2.12S14.20s10.2s10.29|.10S10B6p17B5S6s3.3S18s2.10S14.20s24.28|.10S10B6p4B6p9S9s.5S19s.9S14.21s25.27|.10S9.B5p6B5p11S7.7S21.6S14.21s12.2s14.25|.10s4.6B5p6B5p12sS4.12S18.2S14s3.20s13.Bs14S2.23|.10s4.6B5p6B5p12s2S2.14sS15.3sS11.s4.20s12.2B4s10S3B.22|.10s4.10p8B8p6S4.16s2S14.s3S10.2s4.20s3S2s7.2B4s9S3B4.20|.9s6.9p8B8p5S6.8s2.5s3S14s3S9.2s6.18s4S2s8.B4s8S4B4.20|.9sS8.5B2p7B8p3S10.5s4.5s2.S13s3S8.3s6.5B.6B.5s2S7s5.B5s4S7B4.20|.8S11.B8p7B5p2S12.4s4.9S13s2S7.3s8.4B8.4s2S10s4B8S8B4.20|.8S12B10p6B4p2S2B8S2.4s4.9sS12s2S6.4sS2s5.4B8.4B8S7sB8S8B4.20|.9S11B9p10Bp.S2B8S2.3s6.6s4S10s3S5.4SsS2s6.3B8.4B8S8B8S8B4.20|.9s4S7B9p12.2SB8s2.3sS4s.3s8S5s11.4S9s3.2B8.4B8S24B4.20|.8s7S5B9p14SB8s2.2S8.s9.S2s13.4S8s4.4sB2s.6B8S24B4.20|.8s8S4B8p16B6s4.S10s9.4s12.3S9s4.4s4.10B32.20|.9s8S3B5p19B5s5S12s8.3s6.2s4S2.S11s3.3s6.9B32.20|.9s10.5p8Bp3Bp7B5s4S14s6.4s6.2sS17s2.4s6.9B32.20|.10s8.6p8B8p4B5.s2S5B6S5s4.4s6.3S19.4s8.8p3B29.20|.10s8.6p8B8p4B4.2s2S4B8S4s3.5s6.2S7sS12.4s2B4s2.8p16B4p8B4.20|.9s8S.6p11B5p4B4.2s3S3B8S3s3.5s7.3S4s4S10.6s2B2s2.9p9.2p5B4p10.B.20|.9s8S3B4p12B4p8.3s2.S2B8S2s.7s7.8s5S9.6s2B2s2.9p9.2p19.22|.8s8.2S2B5p14Bp8.7SB.6BS.9s6.10s4.S7.8sB2s.10p30.22|.8s8.2S2B8p20.26s3S2s.10s4.2S6.5B2.s4.B2.7p30.22|.9s6.2S3B8p20.24S3s2S3.3s2.5s5.2S5.5B2s6B2.7p30.22|.9s6.2S3B13p14B.21S12.s4S4.s4.3S3.6B2s6B2.7p3Bp3Bp8B4p8B2.22|.10s4.2S4B16p8B4.21S12Bs3S7s4.3S.6B4s4B4.6B8p8B4p8B4.20|.10s4.2S7p5B8p3B10.10B2.5B30.10B12p6B10p6B4p8B4.20|.10s4.3S4p7B8p3B10.10B2.5B30.11B10p7B9p7B4p.2p7.B.20|.11s2.4s3p19B11p8B4p4B30p11B10p7B9p12.2p7.22|.16s4p18B12p8B4p4B30p11B10p7B9p21.22|.12S2.2s4B8p40B4p36B8p38.22|.12S.2s5B8p.2p37B4p29.2p8B2p41.22|.14s6B8p.2p12B9p49.2p27S4p4B3p13.6S3.13|.14s6B8p12B12p77S6p2B7p10.6S2.14|.14s6B8p12B12p26B4p9B2p7B4p24B24p2.22|.13s7B8p12B9p29B4p9B2p7B4p24B24p2.22|.13s6SB8p12B8p20B4p6B4p9B2p7B4p4Bp10Bp8B24p2.22|.12s6S2B8p15B5p20B4p6B4p8B4p6B4p4B4p4B4p8B24p2.22|.12s5S3B8p4B5p5B10p4B8p2B8p14B8p4B4p4B4p4B4p20B8p6.22|.10S3s2S5B8p4B5p6B9p4B8p2B8p14B8p4B4p4B4p4B4p13.2p8B2p9.3S.3S.14|.9S11B8p4B5p6B9p4B8p2B8p14B8p4B4p4B4p4B4p13.2p19.BS9.11|.10S10B5p7B6p5B9p4B8p2B8p14B8p4B4p4B4p4B4p32B4S10.10|.10S10B4p21S6p37B4p24B4p32B4S10.10|.9sS10B4p23S2p4.2p33B4p24B4p32B4S10.10|.9s2S9B4p14S4p11.2p20B6p34B5p14S4p13S15.10|.8s4S8B4p13S6p11B2p17B10p30B7p13S6p11S16.10|.8s4B12p3B37p2B34p4B20p4B14p5B9S10.10|.9s2SB12p3B37p2B34p4B20p4B13p6B9S10.10|^|.10S2B12p2B38p2B34p4B20p4B13p5B10S9s.10|.10S2B4p10B4p2B24p28B16p4B8p4B8p4B12p14.3S7s2.10|.11SB4p.2p8B2p6B18p4.2p14.2p12B10p10B2p4.2p4B2p10B6p12.2p3.5S4s4.9|.12p5.2p8B2p7B16p5.2p14.2p13B8p17.2p17B4p13.2p3.7s6.9|.12p15B2p10B2p6B2p42B2p39B4p14B2pB.8s6.8|.12p60B4p36B4p32B8.6s6.8|.12p60B4p36B4p32B8S.4s6.9|.11SB4p7Bp11B2p6B2p18B2p6B6p6B2p26B6p10B2p10B2p6B9S.4s6.9|.10S2B4p4B4p8B16p12B28p21B10p5B8p4B20S2.2s6.10|.10S2B88p4B52S2.s6S.10|.9sS2B88p4B52S2s5S2.11|.9s2SB88p4B52Ss4S2.13|.8s4B88p4B52s3S2.15|.8Ss3S88.3sS52s2S.17|.9s4S78.2S7.s4S53.18|.9Ss4S.2S22.6S6.2S37s3S6s7S45s2S2.21|.10s4.5S18.9sS2s.5S34s5S4s9S42s2S2.23|.10s4.6S16.10s4.6S32s6S4s10S40s2S.25|.10Ss2S.7S14.11Ss2S.7S32s5S4sS2s6S16s2S25.26|.11S2.9S5.2S5.13S2.9S5.2S6.2S6.10S2s2S6.2S2s2S2.2S6.2S6s2S6.2S6.2S2s2S2.29|.23S2.6S2.26S2.6S2.6S2.14S2.3S.6S2.6S2.6S2.2S2.2S2.6S2.6S2.31|.176|^|^|^|^|^|^|^|^|^|^|^`
}), g({
    id: `classic-deadlock`,
    name: `DEADLOCK`,
    subtitle: `Timber and concrete towers among rock spires`,
    theme: `outpost`,
    era: `mmc`,
    traits: [],
    source: `20deadlock_new.png`,
    native: [6656, 2560],
    cols: 208,
    rows: 80,
    spawns: [[273, 175], [2625, 343], [1421, 763], [1953, 119], [2121, 791], [945, 287], [385, 749], [1393, 315], [917, 735], [1785, 525]],
    bases: [[273, 175], [2625, 343]],
    bombSites: [[945, 511], [1897, 539]],
    pickups: [{
        x: 1561,
        y: 508,
        kind: `sniper`
    }, {
        x: 1169,
        y: 452,
        kind: `ak47`
    }, {
        x: 1673,
        y: 746,
        kind: `grenade`,
        grenade: `frag`
    }, {
        x: 1197,
        y: 732,
        kind: `rocket`
    }, {
        x: 1897,
        y: 732,
        kind: `health`
    }, {
        x: 1701,
        y: 200,
        kind: `magnum`
    }, {
        x: 2093,
        y: 452,
        kind: `shotgun`
    }, {
        x: 665,
        y: 620,
        kind: `uzi`
    }, {
        x: 693,
        y: 144,
        kind: `fuel`
    }, {
        x: 553,
        y: 368,
        kind: `pistol`
    }, {
        x: 2289,
        y: 228,
        kind: `grenade`,
        grenade: `gas`
    }, {
        x: 2401,
        y: 676,
        kind: `smg`
    }, {
        x: 2429,
        y: 452,
        kind: `health`
    }, {
        x: 217,
        y: 508,
        kind: `grenade`,
        grenade: `mine`
    }, {
        x: 161,
        y: 732,
        kind: `fuel`
    }, {
        x: 2765,
        y: 676,
        kind: `rifle`
    }],
    grid: `.208|^|^|^|^|.91d2.46d2.46d2.19|.90d4.44d4.44d4.18|^|.90d4.44d4G2C4.4C4G6.24d4.18|.19d2.68Wd5.42d4GD2C4.4C4D6G.4d2.16d6.17|.18d4.66W2d4W2.41dG3D3C4c4C4D7G2.d4.15d6.17|.18d4.66W8.40d2D6C4c4C4D9Gd4.14d8.16|.18d4G4.23D2.34sW12p.37d2D6C4c4C4D10d4.14d8.16|.17d4GD4G.20dGD2G.15d2.16W14.20d2.15D8C4c.2cC4D9d5G.13d8.16|.10G4.3dG3D8.14G5D4G2.12d4.15W14.19d4.15D7C4c.2cC4D3c3.3d5DG3.11d6.17|.10D4.2GcD12.12GD11d.11d4.14W15s.18d4.14D8C.c9CDc5.4d4D4.12d4.18|.10D4G2DGD12.12D12d4.8d4.16d2W8d2.20d3D2.13D8.2c16.4d4D4.12d4.18|.10D21.4d2.4GD11d6.6d6.14d3W8d3.18d3GD2G.13D6.3c11.2c2D.3d4D6.10d6.17|.11D20.3d4.G2D11.d9.3d6.14d3W8d3.18dG2D4GD2G7.3dD4d.3c11.2D7d3D6.10d6.17|.11D21.2d4GD10d3.3d8.d8.12d16.16d2D16.4dD2d.4c12D18.8d8.16|.12D20.2d4D10d4.5d15.12d16.16d2D16.4d4.4c12D18.8d8.16|.13D17d.3d4.D7d7.5d15.10d2.2d10.2d2.14d3D17.2d6.3c12D17d2.6d10.15|.13d4D6d8.4d2.8d9.7d2DG8D2.8d3.2d10.2d3.12d5D16.2d6.3c13D15d4.4d12.14|.12d6.D2.d8.14d10.8D12.8d20.12d5D17d8.2c13D14.d4.4d12.14|.12d6.4d8.14d5D2d3.8D12.7sW6d8W6s.11d6D16d8.2c14D12.2d4G4d12.14|.11d7.3d8.6d2.6d5GD2Gd3.8D11.7W7d8W7.10d7.D6.2D6d9.2c3.2c6.2c2D9d.2d4GD4Gd12.13|.10d7.4d6.7d4.4d4G2D4Gd2.10D6d3.7W7d8W7.10d6.2dD4d.7d9.3C2c.2cCc4.2c3.3d6.2dG3D6G2D2G2d6.13|.10d6.4d5.9d4.4d4D7Gd2.11D2.d4.6W8d8W8.8d6.4dD2d3.6d8.2C4c4C4c6.4d4.2d2D15Gd6.12|.10d6.4d4.10d4.D2.d4D8d2.14d4.6d4W4d2W4d2W4d4.8d6.4d6.6d8.2C4c4C4c6.4d4.2d2D16d6.12|.9d7.3d5.9d4D5d3D9Gd2.12d6.5d4W4d.W4.dW4d4.7d7.4d7.4d10.C4c4C4c6.4d4.2d3D15Gd6.11|.9d6.3d5.4G2.4d2D8d2D10G3.11d6.6d3W4d.W4.dW4d3.7d7.6d7.3d10.C4c4C4c6D3.2d2.4d4D14G3d4.10|.8d6.4d4.4GD2G.2d2D24.10d8.6d8W4d8.8d6.8d6.2d12.2C2c4Cc7D6.8d4.D15d4.10|.8d6.4d3D2.3D4.2d2D24.10d8.6d20.8d6.7C10d11.2c12C6D2.8d4.3D13d4.10|.8d7.3d2GD2G.GD4.d2D26.9d8.6d20.8d7.6C10d11.2c13C5D2d.7d4.3D12d5.10|.9d6.3G2D4GD4.d3D26.10d6.7G3d14G3.9d7.4C11d10.3C7c6C5Dd5D4.d2.5D5d2.4d5.10|.10d6.2D11.d2D28.10d4.8D3Gd12GD3.10d6.4C12.d7.2C12c3C5Dd5D6.7D2.9d4.10|.10d6.2D10.2d2D20dD7.10d4.7sW6d8W6s.9d6.8c8.2d6.2C12c4C4d6D7.17d4.10|.10d7GD9.3d3D17d3D6.10Gd5.6W7d8W7.8d8.7c3.2c3.2d7.3C8c8C2d5D10.8d2.5d4.10|.11d3G3D9.5d6D6d4.2d5D4.8G3Dd5.6W7d8W7.7G3d6.5C.c3.2c3.3d6.3c16.3d4D13.4D4.5d2.11|.12d2D11d.6d7D2.d4.2d7D2.9D4d6.4W8d8W7D.6D3Gd6.4C4c6.4d6.2c16.5dD22.18|.12d2D10d2.6d8.2d4.2d10.4d3GD4G4d2.5D3W4d8W4D4.6D4d6.4C13.d6.2c16.7D21.18|.12D13d2.5d8.2d4.2d11.2d4D9Gd2.4D3W4d.2d2.2dW4D3.6D8d4.3C14d6.2c3.2c6.2c3.7D21.5d2.11|.13D13d.6d6.4d2.4d17D9G3.4D2W4d.2d2.2dW4D2.7D6.2d5.2C13d6.3c3.2C6.2c3.8D5d2D6.2D5.4d4.10|.14D12d2.6d4.12d16D12.4dDd16Dd.6D8.2d4.2C14d4.4c2C12c2.9D2d6D2.5dD2d.4d4.10|.14D12d2.6d4.12dD2d13D12.4d20.6D8.2d4.2C4c6.2d6.4c2C12c2.10d8.6d4.4d4.10|.13d2D10d3.5d6.4d2.4D6d11D11.4d8.2d2.2d8.6D6.3d4.4C2c6.2d7.3c4C4c4C2c2.10d7D.5d6.3d4.10|.13d4D6d4.6dD7.d4.D10d10D5.9d3W2d3.2d2.2d3W2d3.6D6.4d2.5c8.3d6.3c16.11d5D4.3d6.4d2.11|.12d7D2d5.6D10d4D12d8.D2d3.8d4W4d8W4d4.6D4.12c8.4d6.2c16.12d2D8d7G.16|.12d14.5D11d4D12d8.2d4.8d4W4d8W4d4.6D4.12c8.4d6.2c16.12G2D8d6GDG2.14|.11d15.5D12d2D14d7.2d5.6d5W4d8W4d5.5D4.5d2.5c3.2c3.4d6.2c16.11GD9d6GD4Gd2.11|.10d15.5D13d2D14.2d4.4d5.4d6W4d8W4d6.5D2.5d4.4c3.2c3.5d4.3c5C2c6Cc2.8G3D9d4G3D6G3.10|.10d14.6D30.2d2.6d4.4d28.5D2.5d4.4c8.6d2.4c2C12c2.8D11.d4D12.10|.10d5D2d7.6D30G2.8d4.4d28.12d4.3C2c7.4D3d.4c2C12c2.8D10.2d4D12.10|.9d4D6d4D.3d2D33G.6d6.2d4.2d18.2d4.4d2.5d4.2C4c6.3D6.3c3.C8.c3.8D8.3d4D13.10|.9d2D15d3D18d2D14G3.3d6.2d4.2dW2d12W2d.2d4.3d4.5d2.G2D4G2c4.D8.3c3.2c6.2c3.8D5.6d4D13.10|.8d2D35d6D15.2Gd15W4d8W4d8.2d4.5G2.D8c4D10.2c16.8dD2d.6d4D14.10|.8d2D34d8D14G2DG5d8W20d6.2d4.4GD2GD8c4D10.2c16.8d4.6d3D15.10|.8d3D32.Dd6D.D6.2D13G.Gd4W22d4G.Gd4G.2GD13cCD10.3c16.7d6.5D17.11|.9d4D29.3Dd4D.2D6.2D14GDGd3W22d3GDGDd4DG2D14.3D9.3C7c7C2.5C.dD25.13|.10d5D26.5d4.4D4.4D16d2DW22Dd2D4d4D18.2D7d.2C12c4C8D25.15|.10d7D23.6d4.4D4.4D16G2D24G2D4d4D18.2D6d2.2C12c4C8D24.16|.10Dd6D14.2D6.7Dd2D.4D4.4D49d2D18.3D5d2D.2C24.D21.18|.11Dd6D5.D6d.2D6.8D2.6D2.5D49d2D18.4D3.D2.3C4.4C4.4C8.5D6.2D6.21|.12d7D2.3d3D2d3.2D4.17D2.5dD67.5D2.7C.10C.7C2.10D2.6D2.23|.12d8.4d8.2D4.24d2D66.78|.12Dd6D.4Dd6D.2D4.24Dd2D13.3D5d4D40.78|.13Dd4D.6Dd4D.4D2.26D2.4D6.10D2d2D2.2D22d2D6d2D5.78|.14d4.8d4.5D2.33dD2d.13D2.6D18d6D2d6D2d2.77|.14d4.8d4.40d4.22D16d18D.77|.14Dd2D.8Dd2D.40Dd2D.23D16d6D2d6D3.78|.15D2.10D2.42D2.28D6.6D2d2D2.2D2d2D2.81|.103D2.10D2.6D2.83|.208|^|^|^|^|^|^|^`
})];
_.map(e => e.id);
var v = [`#ac78ef`, `#edaa58`, `#8ac9b2`, `#82b8df`, `#dd8ebc`, `#cfc4e0`, `#b2be7b`, `#e9e2d6`]
  , ee = {
    map: `classic-outpost`,
    mode: `ffa`,
    duration: 180,
    killLimit: 15,
    bots: 4,
    difficulty: `recruit`,
    friendlyFire: !1
}
  , y = l.teams
  , b = {
    minigun: {
        id: `minigun`,
        maxZoom: 2,
        name: `Minigun`,
        short: `MINI`,
        damage: 9,
        fireInterval: .05,
        speed: 1080,
        spread: .095,
        recoil: .004,
        pellets: 1,
        magazine: 120,
        reserve: 360,
        reload: 3.6,
        range: 850,
        color: `#6fffd0`,
        description: `Heavy six-barrel bullet storm. 120 rounds, rapid fire and a chunky drum. Wide spread; reload behind cover.`
    },
    m249: {
        id: `m249`,
        maxZoom: 3,
        name: `M249`,
        short: `M249`,
        damage: 13,
        fireInterval: .085,
        speed: 1130,
        spread: .075,
        recoil: .006,
        pellets: 1,
        magazine: 80,
        reserve: 240,
        reload: 3.2,
        range: 1050,
        color: `#c5d18d`,
        description: `Belt-fed light machine gun. 80-round magazine, sustained fire and a longer reload.`
    },
    pistol: {
        id: `pistol`,
        maxZoom: 2,
        name: `Desert Eagle`,
        short: `DE`,
        legacyName: `Sidekick`,
        damage: 20,
        fireInterval: .28,
        speed: 950,
        spread: .035,
        pellets: 1,
        magazine: 15,
        reserve: 50,
        reload: 1.05,
        range: 800,
        color: `#dfebf2`,
        dual: !0,
        description: `Heavy sidearm. Quick reload; pick up a second for dual wield.`
    },
    smg: {
        id: `smg`,
        maxZoom: 3,
        name: `MP5`,
        short: `MP5`,
        legacyName: `Hornet SMG`,
        damage: 10,
        fireInterval: .075,
        speed: 1020,
        spread: .11,
        pellets: 1,
        magazine: 32,
        reload: 1.5,
        range: 650,
        color: `#ffda65`,
        description: `Fast bursts for close aerial duels.`
    },
    rifle: {
        id: `rifle`,
        maxZoom: 4,
        name: `M4`,
        short: `M4`,
        legacyName: `Ranger AR`,
        damage: 17,
        fireInterval: .145,
        speed: 1150,
        spread: .045,
        pellets: 1,
        magazine: 24,
        reload: 1.65,
        range: 1080,
        color: `#d8fa4c`,
        description: `Balanced assault rifle for controlled bursts.`
    },
    shotgun: {
        id: `shotgun`,
        maxZoom: 3,
        name: `Shotgun`,
        short: `SG`,
        legacyName: `Scatter-8`,
        damage: 13,
        fireInterval: .8,
        speed: 900,
        spread: .23,
        pellets: 8,
        magazine: 5,
        reload: 1.9,
        range: 420,
        color: `#ffb16e`,
        description: `Eight pellets. Devastating up close.`
    },
    sniper: {
        id: `sniper`,
        maxZoom: 6,
        name: `M93BA`,
        short: `M93`,
        legacyName: `Longwatch`,
        damage: 78,
        fireInterval: 1.2,
        speed: 1850,
        spread: .006,
        pellets: 1,
        magazine: 4,
        reload: 2.25,
        range: 1800,
        color: `#89d8ff`,
        description: `Bolt sniper. Pinpoint hits across the arena.`
    },
    rocket: {
        id: `rocket`,
        maxZoom: 4,
        name: `SMAW`,
        short: `SMAW`,
        legacyName: `Comet Launcher`,
        damage: 88,
        fireInterval: 1.1,
        speed: 520,
        spread: .018,
        pellets: 1,
        magazine: 3,
        reserve: 6,
        reload: 2.4,
        range: 1100,
        color: `#ff7757`,
        explosive: !0,
        blastRadius: 115,
        description: `Rocket launcher with a dangerous blast radius.`
    },
    laser: {
        id: `laser`,
        maxZoom: 4,
        name: `PHASR`,
        short: `PHASR`,
        legacyName: `Prism Carbine`,
        damage: 25,
        fireInterval: .24,
        speed: 2100,
        spread: .009,
        pellets: 1,
        magazine: 16,
        reload: 1.8,
        range: 1300,
        color: `#ba9aff`,
        description: `Bright, accurate energy bolts.`
    },
    flamer: {
        id: `flamer`,
        maxZoom: 2,
        name: `Flamethrower`,
        short: `FLM`,
        legacyName: `Wildfire`,
        damage: 7,
        fireInterval: .065,
        speed: 440,
        spread: .22,
        pellets: 2,
        magazine: 50,
        reload: 2,
        range: 220,
        color: `#ff9954`,
        description: `A short-range cone of searing flame.`
    },
    magnum: {
        id: `magnum`,
        maxZoom: 3,
        name: `Magnum`,
        short: `MAG`,
        legacyName: `Iron Six`,
        damage: 43,
        fireInterval: .5,
        speed: 1300,
        spread: .022,
        pellets: 1,
        magazine: 6,
        reserve: 36,
        reload: 1.6,
        range: 1e3,
        color: `#f6c56e`,
        dual: !0,
        description: `Six heavy rounds. Dual-wield eligible.`
    },
    uzi: {
        id: `uzi`,
        maxZoom: 3,
        name: `Uzi`,
        short: `UZI`,
        damage: 8,
        fireInterval: .055,
        speed: 980,
        spread: .15,
        pellets: 1,
        magazine: 40,
        reserve: 250,
        reload: 1.25,
        range: 560,
        color: `#f2e39a`,
        dual: !0,
        description: `Tiny bullet hose. Wildly inaccurate; dual-wield eligible.`
    },
    ak47: {
        id: `ak47`,
        maxZoom: 3,
        name: `AK-47`,
        short: `AK47`,
        damage: 22,
        fireInterval: .12,
        speed: 1120,
        spread: .03,
        recoil: .018,
        pellets: 1,
        magazine: 30,
        reload: 1.9,
        range: 1050,
        color: `#e6b25c`,
        description: `Hard-hitting automatic. Spread climbs during sustained fire.`
    },
    m14: {
        id: `m14`,
        maxZoom: 6,
        name: `M14`,
        short: `M14`,
        damage: 36,
        fireInterval: .34,
        speed: 1500,
        spread: .012,
        pellets: 1,
        magazine: 15,
        reload: 1.85,
        range: 1450,
        color: `#cfe1a4`,
        description: `Semi-auto battle rifle. Accurate, long reach.`
    },
    saw: {
        id: `saw`,
        maxZoom: 4,
        name: `SAW`,
        short: `SAW`,
        damage: 110,
        fireInterval: 1.1,
        speed: 660,
        spread: .012,
        pellets: 1,
        magazine: 1,
        reserve: 6,
        reload: 2.6,
        range: 3300,
        color: `#d8dee4`,
        explosive: !0,
        blastRadius: 100,
        ricochet: 99,
        description: `Single-shot blade launcher. Ricochets until impact or its five-second fuse. Rebounds can kill the shooter.`
    },
    grenadeLauncher: {
        id: `grenadeLauncher`,
        maxZoom: 4,
        name: `Grenade Launcher`,
        short: `GL`,
        damage: 80,
        fireInterval: .9,
        speed: 640,
        spread: .02,
        pellets: 1,
        magazine: 4,
        reload: 2.3,
        range: 1300,
        color: `#a7c46a`,
        explosive: !0,
        gravity: 620,
        blastRadius: 105,
        description: `Lobs impact grenades in an arc.`
    },
    machete: {
        id: `machete`,
        maxZoom: 2,
        name: `Machete`,
        short: `MCH`,
        damage: 58,
        fireInterval: .45,
        speed: 0,
        spread: 0,
        pellets: 1,
        magazine: 1,
        reload: 0,
        range: 74,
        color: `#d9dee2`,
        melee: !0,
        dual: !0,
        description: `Silent blade. Fire to slash anything in front of you.`
    },
    shield: {
        id: `shield`,
        maxZoom: 2,
        name: `Riot Shield`,
        short: `SHLD`,
        damage: 18,
        fireInterval: .6,
        speed: 0,
        spread: 0,
        pellets: 1,
        magazine: 1,
        reload: 0,
        range: 62,
        color: `#8fb6d8`,
        melee: !0,
        dual: !0,
        blocksFront: !0,
        description: `Blocks bullets and flame from the front while held. Fire to bash.`
    },
    emp: {
        id: `emp`,
        maxZoom: 4,
        name: `EMP Gun`,
        short: `EMP`,
        damage: 0,
        fireInterval: 1.2,
        speed: 220,
        spread: 0,
        pellets: 1,
        magazine: 1,
        reserve: 8,
        reload: 2.4,
        range: 1100,
        color: `#7ee9ff`,
        description: `Hold fire to charge a pulse. Passes through cover, disables rocket boots for 30 seconds and clears mines.`
    }
};
Object.keys(b).filter(e => b[e].dual === !0);
var x = [`frag`, `gas`, `mine`]
  , te = {
    frag: {
        id: `frag`,
        name: `Frag Grenade`,
        short: `FRAG`,
        max: 5,
        spawn: 3,
        description: `Bounces, then explodes after a short fuse.`
    },
    gas: {
        id: `gas`,
        name: `Gas Grenade`,
        short: `GAS`,
        max: 3,
        spawn: 0,
        description: `Releases a lingering toxic cloud that damages over time.`
    },
    mine: {
        id: `mine`,
        name: `Proximity Mine`,
        short: `MINE`,
        max: 3,
        spawn: 0,
        description: `Sticks where it lands, arms, then blasts the first enemy nearby.`
    }
}
  , S = [{
    id: `ffa`,
    name: `Deathmatch`,
    short: `DM`,
    description: `Every player for themselves. First to the kill limit wins.`,
    teams: !1,
    objective: !1,
    legacy: !0
}, {
    id: `teams`,
    name: `Team Deathmatch`,
    short: `TDM`,
    description: `Two squads pool their kills.`,
    teams: !0,
    objective: !1,
    legacy: !0
}, {
    id: `ctf`,
    name: `Capture the Flag`,
    short: `CTF`,
    description: `Steal the enemy flag and return it home three times.`,
    teams: !0,
    objective: !0,
    legacy: !0
}, {
    id: `survival`,
    name: `Survival`,
    short: `SURV`,
    description: `Hold out against escalating bot waves.`,
    teams: !1,
    objective: !0,
    legacy: !0
}, {
    id: `vip`,
    name: `VIP`,
    short: `VIP`,
    description: `Each squad guards one VIP. Eliminate the enemy VIP to score.`,
    teams: !0,
    objective: !0,
    legacy: !1
}, {
    id: `bomb`,
    name: `Plant the Bomb`,
    short: `BOMB`,
    description: `Attackers carry the bomb to a site; defenders stop or defuse it. Sides swap each round.`,
    teams: !0,
    objective: !0,
    legacy: !1
}]
  , ne = S.map(e => e.id);
S.filter(e => e.teams).map(e => e.id);
var re = [{
    id: `drydock`,
    legacy: !0,
    name: `DRYDOCK`,
    subtitle: `Abandoned freight terminal`,
    width: 1920,
    height: 1080,
    palette: [`#111e29`, `#192e3a`, `#26454b`, `#d8fa4c`],
    platforms: [{
        x: 0,
        y: 1e3,
        w: 1920,
        h: 80,
        kind: `rock`
    }, {
        x: 0,
        y: 790,
        w: 350,
        h: 36,
        kind: `metal`
    }, {
        x: 1570,
        y: 790,
        w: 350,
        h: 36,
        kind: `metal`
    }, {
        x: 490,
        y: 835,
        w: 330,
        h: 32,
        kind: `metal`
    }, {
        x: 1100,
        y: 835,
        w: 330,
        h: 32,
        kind: `metal`
    }, {
        x: 760,
        y: 650,
        w: 400,
        h: 28,
        kind: `bridge`
    }, {
        x: 210,
        y: 580,
        w: 290,
        h: 34,
        kind: `metal`
    }, {
        x: 1420,
        y: 580,
        w: 290,
        h: 34,
        kind: `metal`
    }, {
        x: 580,
        y: 425,
        w: 250,
        h: 28,
        kind: `bridge`
    }, {
        x: 1090,
        y: 425,
        w: 250,
        h: 28,
        kind: `bridge`
    }, {
        x: 835,
        y: 250,
        w: 250,
        h: 32,
        kind: `metal`
    }, {
        x: 80,
        y: 948,
        w: 95,
        h: 52,
        kind: `metal`
    }, {
        x: 1745,
        y: 948,
        w: 95,
        h: 52,
        kind: `metal`
    }],
    spawns: [{
        x: 160,
        y: 760
    }, {
        x: 1760,
        y: 760
    }, {
        x: 620,
        y: 805
    }, {
        x: 1300,
        y: 805
    }, {
        x: 350,
        y: 550
    }, {
        x: 1570,
        y: 550
    }, {
        x: 960,
        y: 620
    }, {
        x: 960,
        y: 220
    }],
    pickups: [{
        x: 730,
        y: 970,
        kind: `pistol`
    }, {
        x: 1190,
        y: 970,
        kind: `pistol`
    }, {
        x: 1600,
        y: 760,
        kind: `smg`
    }, {
        x: 320,
        y: 760,
        kind: `magnum`
    }, {
        x: 960,
        y: 220,
        kind: `sniper`
    }, {
        x: 960,
        y: 620,
        kind: `rocket`
    }, {
        x: 350,
        y: 550,
        kind: `shotgun`
    }, {
        x: 1570,
        y: 550,
        kind: `smg`
    }, {
        x: 710,
        y: 395,
        kind: `laser`
    }, {
        x: 1215,
        y: 395,
        kind: `magnum`
    }, {
        x: 640,
        y: 805,
        kind: `health`
    }, {
        x: 1280,
        y: 805,
        kind: `health`
    }, {
        x: 960,
        y: 970,
        kind: `flamer`
    }, {
        x: 180,
        y: 760,
        kind: `fuel`
    }, {
        x: 1740,
        y: 760,
        kind: `fuel`
    }, {
        x: 480,
        y: 970,
        kind: `grenade`
    }, {
        x: 1440,
        y: 970,
        kind: `grenade`,
        grenade: `gas`
    }, {
        x: 300,
        y: 970,
        kind: `uzi`
    }, {
        x: 1620,
        y: 970,
        kind: `ak47`
    }, {
        x: 250,
        y: 550,
        kind: `m14`
    }, {
        x: 1670,
        y: 550,
        kind: `saw`
    }, {
        x: 1380,
        y: 805,
        kind: `grenadeLauncher`
    }, {
        x: 540,
        y: 805,
        kind: `machete`
    }, {
        x: 1050,
        y: 620,
        kind: `shield`
    }, {
        x: 870,
        y: 220,
        kind: `grenade`,
        grenade: `mine`
    }]
}, {
    id: `canopy`,
    legacy: !0,
    name: `CANOPY`,
    subtitle: `Vertical jungle outpost`,
    width: 1680,
    height: 1260,
    palette: [`#101e22`, `#1b3531`, `#315346`, `#9be6a7`],
    platforms: [{
        x: 0,
        y: 1180,
        w: 1680,
        h: 80,
        kind: `rock`
    }, {
        x: 0,
        y: 980,
        w: 300,
        h: 48,
        kind: `rock`
    }, {
        x: 1380,
        y: 980,
        w: 300,
        h: 48,
        kind: `rock`
    }, {
        x: 490,
        y: 1e3,
        w: 240,
        h: 30,
        kind: `bridge`
    }, {
        x: 950,
        y: 1e3,
        w: 240,
        h: 30,
        kind: `bridge`
    }, {
        x: 720,
        y: 790,
        w: 240,
        h: 38,
        kind: `rock`
    }, {
        x: 180,
        y: 760,
        w: 300,
        h: 35,
        kind: `bridge`
    }, {
        x: 1200,
        y: 760,
        w: 300,
        h: 35,
        kind: `bridge`
    }, {
        x: 420,
        y: 560,
        w: 270,
        h: 40,
        kind: `rock`
    }, {
        x: 990,
        y: 560,
        w: 270,
        h: 40,
        kind: `rock`
    }, {
        x: 700,
        y: 360,
        w: 280,
        h: 28,
        kind: `bridge`
    }, {
        x: 90,
        y: 360,
        w: 230,
        h: 38,
        kind: `rock`
    }, {
        x: 1360,
        y: 360,
        w: 230,
        h: 38,
        kind: `rock`
    }, {
        x: 350,
        y: 170,
        w: 210,
        h: 28,
        kind: `bridge`
    }, {
        x: 1120,
        y: 170,
        w: 210,
        h: 28,
        kind: `bridge`
    }],
    spawns: [{
        x: 150,
        y: 950
    }, {
        x: 1530,
        y: 950
    }, {
        x: 600,
        y: 970
    }, {
        x: 1080,
        y: 970
    }, {
        x: 330,
        y: 730
    }, {
        x: 1350,
        y: 730
    }, {
        x: 840,
        y: 760
    }, {
        x: 840,
        y: 330
    }],
    pickups: [{
        x: 660,
        y: 1150,
        kind: `pistol`
    }, {
        x: 1020,
        y: 1150,
        kind: `pistol`
    }, {
        x: 1140,
        y: 970,
        kind: `smg`
    }, {
        x: 260,
        y: 330,
        kind: `magnum`
    }, {
        x: 1420,
        y: 330,
        kind: `magnum`
    }, {
        x: 840,
        y: 330,
        kind: `laser`
    }, {
        x: 450,
        y: 140,
        kind: `sniper`
    }, {
        x: 1230,
        y: 140,
        kind: `rocket`
    }, {
        x: 550,
        y: 530,
        kind: `smg`
    }, {
        x: 1130,
        y: 530,
        kind: `shotgun`
    }, {
        x: 840,
        y: 1150,
        kind: `flamer`
    }, {
        x: 840,
        y: 760,
        kind: `health`
    }, {
        x: 150,
        y: 950,
        kind: `health`
    }, {
        x: 1530,
        y: 950,
        kind: `health`
    }, {
        x: 200,
        y: 330,
        kind: `fuel`
    }, {
        x: 1480,
        y: 330,
        kind: `fuel`
    }, {
        x: 600,
        y: 970,
        kind: `grenade`
    }, {
        x: 1080,
        y: 970,
        kind: `grenade`,
        grenade: `gas`
    }, {
        x: 300,
        y: 1150,
        kind: `uzi`
    }, {
        x: 1380,
        y: 1150,
        kind: `ak47`
    }, {
        x: 130,
        y: 330,
        kind: `m14`
    }, {
        x: 1550,
        y: 330,
        kind: `saw`
    }, {
        x: 500,
        y: 1150,
        kind: `grenadeLauncher`
    }, {
        x: 1240,
        y: 730,
        kind: `machete`
    }, {
        x: 430,
        y: 730,
        kind: `shield`
    }, {
        x: 760,
        y: 330,
        kind: `grenade`,
        grenade: `mine`
    }]
}, {
    id: `reactor`,
    legacy: !0,
    name: `REACTOR`,
    subtitle: `Decommissioned orbital refinery`,
    width: 2040,
    height: 1080,
    palette: [`#181825`, `#2b263e`, `#45405d`, `#bca4ff`],
    platforms: [{
        x: 0,
        y: 1e3,
        w: 2040,
        h: 80,
        kind: `metal`
    }, {
        x: 0,
        y: 800,
        w: 420,
        h: 38,
        kind: `metal`
    }, {
        x: 1620,
        y: 800,
        w: 420,
        h: 38,
        kind: `metal`
    }, {
        x: 560,
        y: 835,
        w: 300,
        h: 28,
        kind: `bridge`
    }, {
        x: 1180,
        y: 835,
        w: 300,
        h: 28,
        kind: `bridge`
    }, {
        x: 890,
        y: 670,
        w: 260,
        h: 44,
        kind: `metal`
    }, {
        x: 140,
        y: 570,
        w: 300,
        h: 32,
        kind: `metal`
    }, {
        x: 1600,
        y: 570,
        w: 300,
        h: 32,
        kind: `metal`
    }, {
        x: 560,
        y: 455,
        w: 320,
        h: 30,
        kind: `bridge`
    }, {
        x: 1160,
        y: 455,
        w: 320,
        h: 30,
        kind: `bridge`
    }, {
        x: 875,
        y: 260,
        w: 290,
        h: 40,
        kind: `metal`
    }, {
        x: 350,
        y: 940,
        w: 80,
        h: 60,
        kind: `metal`
    }, {
        x: 1610,
        y: 940,
        w: 80,
        h: 60,
        kind: `metal`
    }],
    spawns: [{
        x: 200,
        y: 770
    }, {
        x: 1840,
        y: 770
    }, {
        x: 710,
        y: 805
    }, {
        x: 1330,
        y: 805
    }, {
        x: 280,
        y: 540
    }, {
        x: 1760,
        y: 540
    }, {
        x: 1020,
        y: 640
    }, {
        x: 1020,
        y: 230
    }],
    pickups: [{
        x: 800,
        y: 970,
        kind: `pistol`
    }, {
        x: 1240,
        y: 970,
        kind: `pistol`
    }, {
        x: 1780,
        y: 770,
        kind: `smg`
    }, {
        x: 260,
        y: 770,
        kind: `magnum`
    }, {
        x: 1020,
        y: 230,
        kind: `rocket`
    }, {
        x: 1020,
        y: 640,
        kind: `laser`
    }, {
        x: 280,
        y: 540,
        kind: `sniper`
    }, {
        x: 1760,
        y: 540,
        kind: `magnum`
    }, {
        x: 710,
        y: 425,
        kind: `shotgun`
    }, {
        x: 1330,
        y: 425,
        kind: `flamer`
    }, {
        x: 710,
        y: 805,
        kind: `health`
    }, {
        x: 1330,
        y: 805,
        kind: `health`
    }, {
        x: 200,
        y: 770,
        kind: `fuel`
    }, {
        x: 1840,
        y: 770,
        kind: `fuel`
    }, {
        x: 1020,
        y: 970,
        kind: `smg`
    }, {
        x: 200,
        y: 970,
        kind: `grenade`
    }, {
        x: 1840,
        y: 970,
        kind: `grenade`,
        grenade: `gas`
    }, {
        x: 450,
        y: 970,
        kind: `uzi`
    }, {
        x: 1580,
        y: 970,
        kind: `ak47`
    }, {
        x: 180,
        y: 540,
        kind: `m14`
    }, {
        x: 1860,
        y: 540,
        kind: `saw`
    }, {
        x: 620,
        y: 805,
        kind: `grenadeLauncher`
    }, {
        x: 1420,
        y: 805,
        kind: `machete`
    }, {
        x: 960,
        y: 640,
        kind: `shield`
    }, {
        x: 930,
        y: 230,
        kind: `grenade`,
        grenade: `mine`
    }]
}]
  , ie = [..._, ...re.filter(e => !_.some(t => t.id === e.id))].map(e => {
    let t = {
        ...e,
        ...d(e.id)
    };
    if (e.classic) {
        let n = !1;
        t.pickups = e.pickups.map(e => !n && e.kind === `pistol` ? (n = !0,
        {
            ...e,
            kind: `m249`
        }) : e),
        t.pickups.push(...t.spawns.map( (e, t) => ({
            ...e,
            kind: t === 1 ? `grenade` : `health`,
            ...t === 1 ? {
                grenade: `frag`
            } : {}
        })));
        let r = t.pickups.findIndex(e => e.kind === `grenade` && e.grenade === `mine`);
        r >= 0 && (t.pickups[r] = {
            x: t.pickups[r].x,
            y: t.pickups[r].y,
            kind: `health`,
            golden: !0
        })
    }
    let n = t.pickups.find(e => e.kind === `shotgun`) ?? t.pickups[0];
    if (n && (t.pickups = [...t.pickups, {
        x: n.x,
        y: Math.max(30, n.y - 48),
        kind: `minigun`
    }]),
    !t.pickups.some(e => e.kind === `flamer`)) {
        let e = t.pickups.find(e => e.kind === `fuel`) ?? t.pickups[0];
        e && (t.pickups = [...t.pickups, {
            x: e.x,
            y: Math.max(30, e.y - 48),
            kind: `flamer`
        }])
    }
    if (t.id !== `classic-catacomb` && t.id !== `reactor`)
        return t;
    let r = t.pickups.find(e => e.kind === `fuel`);
    return r ? {
        ...t,
        pickups: [...t.pickups, {
            x: r.x,
            y: r.y,
            kind: `emp`
        }]
    } : t
}
);
function ae(e) {
    let t = e.width * e.height;
    return t < 4e6 ? `small` : t < 7e6 ? `medium` : `large`
}
var oe = {
    small: [2, 6],
    medium: [5, 8],
    large: [8, 12]
};
function se(e) {
    let t = ae(e)
      , [n,r] = oe[t];
    return {
        size: t,
        min: n,
        max: r
    }
}
var ce = () => ({
    left: !1,
    right: !1,
    jet: !1,
    down: !1,
    aim: 0,
    fire: !1,
    reload: !1,
    swap: !1,
    grenade: !1,
    melee: !1,
    pickup: !1
})
  , le = `PixelPanda.ChaiTime.ClutchRaja.NightOwl.MangoByte.RocketRavi.LilyRunner.NinjaNandu.ChillChintu.TurboTara.NeonNinja.ChocoChip.SkySurfer.LuckyLad.BlockBuddy.CloudKid.SneakySam.CosmicCat.PandaRush.CaptainChai.FlashFox.ByteBhai.MoonWalker.DesiDash.JellyBean.SodaPop.Frosty.Zippy.Comet.Pebble.SunnySide.Blaze`.split(`.`);
function ue(e) {
    let t = new Set(e.map(e => e.name.toLowerCase()))
      , n = le.filter(e => !t.has(e.toLowerCase()));
    if (n.length)
        return n[crypto.getRandomValues(new Uint32Array(1))[0] % n.length];
    let r = 1;
    for (; t.has(`player${r}`); )
        r++;
    return `Player${r}`
}
var de = {
    balanced: {
        label: `Balanced`,
        range: 1,
        minRange: 0,
        prefers: [],
        lootReach: 110,
        healAt: 55,
        fuelAt: 35,
        retreatHp: 0,
        skirmish: 320,
        grenade: 1,
        jet: !1
    },
    rusher: {
        label: `Rusher`,
        range: .55,
        minRange: 0,
        prefers: [`shotgun`, `smg`, `uzi`, `flamer`, `ak47`],
        lootReach: 260,
        healAt: 40,
        fuelAt: 25,
        retreatHp: 0,
        skirmish: 520,
        grenade: 1.2,
        jet: !0
    },
    sniper: {
        label: `Sniper`,
        range: 1.5,
        minRange: 430,
        prefers: [`sniper`, `m14`, `laser`, `rifle`, `rocket`],
        lootReach: 260,
        healAt: 75,
        fuelAt: 50,
        retreatHp: 45,
        skirmish: 700,
        grenade: .7,
        jet: !1
    },
    objective: {
        label: `Objective`,
        range: 1,
        minRange: 0,
        prefers: [],
        lootReach: 110,
        healAt: 55,
        fuelAt: 35,
        retreatHp: 0,
        skirmish: 0,
        grenade: 1,
        jet: !1
    }
}
  , fe = {
    recruit: .5,
    regular: .7,
    veteran: 1
}
  , pe = e => e === `ctf` || e === `vip` || e === `bomb`;
function me(e) {
    return pe(e) ? [`objective`, `rusher`, `sniper`, `balanced`] : [`balanced`, `rusher`, `sniper`]
}
function he(e, t) {
    return e ? e === `objective` && !pe(t) ? `balanced` : e : `balanced`
}
function ge(e, t, n) {
    let r = me(e)
      , i = e !== `ffa` && e !== `survival`
      , a = 0;
    for (let e = 0; e < t.id.length; e++)
        a = Math.imul(a ^ t.id.charCodeAt(e), 16777619) >>> 0;
    let o = (r, i) => n.filter(n => n.bot && n.personality && he(n.personality, e) === r && (!i || n.team === t.team)).length
      , s = r.map( (e, t) => ({
        style: e,
        team: i ? o(e, !0) : 0,
        lobby: o(e, !1),
        order: (t - a % r.length + r.length) % r.length
    }));
    return s.sort( (e, t) => e.team - t.team || e.lobby - t.lobby || e.order - t.order),
    s[0].style
}
var _e = {
    recruit: {
        decision: .28,
        reaction: .6,
        aimError: .34,
        lead: .35,
        burst: .45,
        pause: .8,
        fireChance: .55,
        grenadeChance: .015
    },
    regular: {
        decision: .24,
        reaction: .2,
        aimError: .14,
        lead: .8,
        burst: .8,
        pause: .25,
        fireChance: .9,
        grenadeChance: .05
    },
    veteran: {
        decision: .12,
        reaction: 0,
        aimError: .035,
        lead: 1,
        burst: 1,
        pause: 0,
        fireChance: .93,
        grenadeChance: .09
    }
}
  , ve = 14
  , ye = 20
  , be = 5
  , xe = 7
  , Se = 8
  , Ce = 12
  , we = 13
  , Te = 3
  , Ee = 6
  , De = 4
  , Oe = 2
  , ke = 15
  , Ae = 6
  , je = 40
  , Me = [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]]
  , Ne = new WeakMap;
function Pe(e) {
    let t = Ne.get(e);
    if (t)
        return t;
    let n = Math.ceil(e.width / 14)
      , r = Math.ceil(e.height / 14)
      , i = new Uint8Array(n * r);
    for (let t of e.platforms) {
        if (t.kind === `bridge`)
            continue;
        let e = Math.max(0, Math.floor(t.x / 14))
          , a = Math.min(n, Math.ceil((t.x + t.w) / 14))
          , o = Math.max(0, Math.floor(t.y / 14))
          , s = Math.min(r, Math.ceil((t.y + t.h) / 14));
        for (let t = o; t < s; t++)
            i.fill(1, t * n + e, t * n + a)
    }
    let a = n
      , o = r + 1
      , s = a * o
      , c = new Uint8Array(s)
      , l = new Uint8Array(s)
      , u = new Uint8Array(s)
      , d = new Uint8Array(s)
      , f = {
        cell: 14,
        cols: n,
        rows: r,
        solid: i,
        nodeCols: a,
        nodeRows: o,
        clear: c,
        stand: l,
        tight: u,
        penalty: d,
        edges: new Uint8Array(s * 8),
        fields: new Map,
        computed: 0
    }
      , p = (e, t, n) => {
        for (let r = e - n; r <= e + n; r++)
            if (Fe(f, r, t))
                return !0;
        return !1
    }
      , m = new Int32Array(n * (r + 1)).fill(-1);
    for (let e = 0; e < n; e++)
        for (let t = r - 1; t >= 0; t--)
            m[t * n + e] = i[t * n + e] ? t : t + 1 < r ? m[(t + 1) * n + e] : -1;
    let h = (e, t) => t >= r || [e - 1, e, e + 1].every(e => e < 0 || e >= n || m[t * n + e] < 0);
    for (let t = 3; t < o; t++)
        for (let n = 1; n < a - 1; n++) {
            let i = n * 14 + 7;
            if (i < ve || i > e.width - ve || p(n, t - 3, 1) || p(n, t - 2, 1) || p(n, t - 1, 1))
                continue;
            let o = t * a + n;
            c[o] = 1,
            l[o] = t < r && p(n, t, 1) ? 1 : 0,
            u[o] = +!!p(n, t - 4, 1);
            let s = 0;
            !l[o] && (p(n, t - 4, 2) || p(n, t - 3, 2) || p(n, t - 1, 2) || t < r && p(n, t, 2)) && (s += Oe),
            !l[o] && h(n, t) && (s += t >= r - 2 ? ke : Ae),
            d[o] = s
        }
    for (let e = 0; e < s; e++)
        if (c[e])
            for (let t = 0; t < 8; t++)
                f.edges[e * 8 + t] = Ie(f, e, Me[t][0], Me[t][1]);
    return Ne.set(e, f),
    f
}
function Fe(e, t, n) {
    return t < 0 || t >= e.cols || n < 0 ? !0 : n >= e.rows ? !1 : e.solid[n * e.cols + t] === 1
}
function Ie(e, t, n, r) {
    let {nodeCols: i, clear: a, stand: o, tight: s, penalty: c} = e
      , l = t % i
      , u = (t - l) / i
      , d = l + n
      , f = u + r;
    if (d < 0 || d >= i || f < 0 || f >= e.nodeRows)
        return 0;
    let p = f * i + d;
    if (!a[t] || !a[p])
        return 0;
    let m;
    if (r === 0)
        m = o[t] && o[p] ? be : xe;
    else if (r < 0) {
        if (n === 0)
            m = Ce;
        else {
            if (!a[t - i])
                return 0;
            m = o[t] && o[p] ? Se : we
        }
    } else if (n === 0)
        m = Te;
    else {
        if (!a[t + n])
            return 0;
        m = Ee
    }
    return n !== 0 && s[p] && !o[t] && (m += De),
    m + c[p]
}
var Le = new class {
    keys = new Float64Array(1024);
    size = 0;
    push(e, t) {
        if (this.size === this.keys.length) {
            let e = new Float64Array(this.keys.length * 2);
            e.set(this.keys),
            this.keys = e
        }
        let n = this.size++
          , r = e * 2147483648 + t;
        for (; n > 0; ) {
            let e = n - 1 >> 1;
            if (this.keys[e] <= r)
                break;
            this.keys[n] = this.keys[e],
            n = e
        }
        this.keys[n] = r
    }
    pop() {
        let e = this.keys[0]
          , t = this.keys[--this.size]
          , n = 0;
        for (; ; ) {
            let e = 2 * n + 1;
            if (e >= this.size || (e + 1 < this.size && this.keys[e + 1] < this.keys[e] && e++,
            this.keys[e] >= t))
                break;
            this.keys[n] = this.keys[e],
            n = e
        }
        return this.keys[n] = t,
        e
    }
}
;
function Re(e, t) {
    let n = e.fields.get(t);
    if (n)
        return e.fields.delete(t),
        e.fields.set(t, n),
        n;
    let r = new Int32Array(e.nodeCols * e.nodeRows).fill(-1);
    if (t >= 0 && e.clear[t]) {
        let {nodeCols: n, edges: i} = e;
        for (r[t] = 0,
        Le.size = 0,
        Le.push(0, t); Le.size; ) {
            let t = Le.pop()
              , a = t % 2147483648
              , o = (t - a) / 2147483648;
            if (o > r[a])
                continue;
            let s = a % n
              , c = (a - s) / n;
            for (let t = 0; t < 8; t++) {
                let a = s - Me[t][0]
                  , l = c - Me[t][1];
                if (a < 0 || a >= n || l < 0 || l >= e.nodeRows)
                    continue;
                let u = l * n + a
                  , d = i[u * 8 + t];
                if (!d)
                    continue;
                let f = o + d;
                (r[u] < 0 || f < r[u]) && (r[u] = f,
                Le.push(f, u))
            }
        }
    }
    return e.computed++,
    e.fields.set(t, r),
    e.fields.size > je && e.fields.delete(e.fields.keys().next().value),
    r
}
var ze = (e, t) => t % e.nodeCols * e.cell + e.cell / 2
  , Be = (e, t) => Math.floor(t / e.nodeCols) * e.cell - ye
  , Ve = (e, t) => e.stand[t] === 1
  , He = (e, t) => e.tight[t] === 1;
function Ue(e, t, n, r=3, i) {
    let a = Math.round((t - e.cell / 2) / e.cell)
      , o = Math.round((n + ye) / e.cell)
      , s = -1
      , c = 1 / 0;
    for (let l = -r; l <= r; l++)
        for (let u = -r; u <= r; u++) {
            let r = a + u
              , d = o + l;
            if (r < 0 || d < 0 || r >= e.nodeCols || d >= e.nodeRows)
                continue;
            let f = d * e.nodeCols + r;
            if (!e.clear[f] || i && i[f] < 0)
                continue;
            let p = Math.hypot(ze(e, f) - t, Be(e, f) - n) - (e.stand[f] ? 4 : 0);
            p < c && (c = p,
            s = f)
        }
    return s
}
function We(e, t, n, r=0) {
    let i = Math.floor((t - ve - r) / e.cell + 1e-6)
      , a = Math.ceil((t + ve + r) / e.cell - 1e-6) - 1
      , o = Math.floor((n - ye - r) / e.cell + 1e-6)
      , s = Math.ceil((n + ye) / e.cell - 1e-6) - 1;
    for (let t = o; t <= s; t++)
        for (let n = i; n <= a; n++)
            if (Fe(e, n, t))
                return !1;
    return !0
}
function Ge(e, t, n, r, i, a=1.5) {
    let o = Math.hypot(r - t, i - n)
      , s = Math.max(1, Math.ceil(o / 5));
    for (let c = 1; c <= s; c++) {
        let l = c / s
          , u = o * l;
        if (!We(e, t + (r - t) * l, n + (i - n) * l, Math.min(a, u / 6)))
            return !1
    }
    return !0
}
function Ke(e, t, n, r, i) {
    let a = n
      , o = 0;
    for (; o < r && t[a] > 0; ) {
        let n = -1
          , r = t[a];
        for (let i = 0; i < 8; i++) {
            let o = e.edges[a * 8 + i];
            if (!o)
                continue;
            let s = a + Me[i][1] * e.nodeCols + Me[i][0];
            t[s] >= 0 && t[s] + o <= r && (n < 0 || t[s] < t[n]) && (n = s,
            r = t[s] + o)
        }
        if (n < 0)
            break;
        i[o++] = n,
        a = n
    }
    return o
}
function qe(e, t, n, r, i) {
    let a = Ke(e, t, n, r, i)
      , o = 0
      , s = !1
      , c = n;
    for (let t = 0; t < a; t++) {
        let n = i[t]
          , r = Math.floor(n / e.nodeCols) - Math.floor(c / e.nodeCols);
        if (c = n,
        e.stand[n]) {
            if (s)
                break
        } else
            s = !0,
            o += r < 0 ? 1 : r > 0 ? .15 : .4
    }
    return o
}
var Je = 112
  , Ye = new WeakMap;
function Xe(e) {
    let t = Ye.get(e.platforms);
    if (t)
        return t;
    let n = Math.max(1, Math.ceil(e.width / Je) + 2)
      , r = Math.max(1, Math.ceil(e.height / Je) + 4)
      , i = Array.from({
        length: n * r
    }, () => []);
    return e.platforms.forEach( (e, t) => {
        let a = Ze(e.x, n)
          , o = Ze(e.x + e.w, n)
          , s = Qe(e.y, r)
          , c = Qe(e.y + e.h, r);
        for (let e = s; e <= c; e++)
            for (let r = a; r <= o; r++)
                i[e * n + r].push(t)
    }
    ),
    t = {
        cols: n,
        rows: r,
        buckets: i.map(e => Int32Array.from(e)),
        stamp: new Uint32Array(e.platforms.length),
        mark: 0,
        out: [],
        scratch: []
    },
    Ye.set(e.platforms, t),
    t
}
var Ze = (e, t) => Math.max(0, Math.min(t - 1, Math.floor(e / Je) + 1))
  , Qe = (e, t) => Math.max(0, Math.min(t - 1, Math.floor(e / Je) + 2));
function $e(e, t, n, r, i) {
    if (e.platforms.length < 48)
        return e.platforms;
    let a = Xe(e)
      , {cols: o, rows: s, buckets: c, stamp: l, scratch: u, out: d} = a;
    ++a.mark === 4294967295 && (l.fill(0),
    a.mark = 1);
    let f = a.mark;
    u.length = 0;
    let p = Ze(Math.min(t, r), o)
      , m = Ze(Math.max(t, r), o)
      , h = Qe(Math.min(n, i), s)
      , g = Qe(Math.max(n, i), s);
    for (let e = h; e <= g; e++)
        for (let t = p; t <= m; t++) {
            let n = c[e * o + t];
            for (let e = 0; e < n.length; e++) {
                let t = n[e];
                l[t] !== f && (l[t] = f,
                u.push(t))
            }
        }
    u.sort( (e, t) => e - t),
    d.length = u.length;
    for (let t = 0; t < u.length; t++)
        d[t] = e.platforms[u[t]];
    return d
}
var C = 20
  , et = 920
  , tt = 30
  , nt = 3
  , rt = 24
  , it = 12
  , at = .25
  , ot = 4
  , st = 58
  , ct = .5
  , lt = .32
  , ut = .9
  , dt = 1.5
  , ft = [`magnum`, `pistol`]
  , pt = new WeakMap
  , mt = (e, t, n) => Math.max(t, Math.min(n, e))
  , ht = (e, t) => Number.isFinite(e) ? e : t
  , gt = e => ie.find(t => t.id === e.map) ?? ie[0]
  , _t = (e, t) => Array.isArray(e.traits) && e.traits.includes(t)
  , vt = e => _t(e, `lowGravity`) ? ct : 1
  , yt = e => typeof e.terrain == `object` && e.terrain !== null
  , bt = e => ({
    id: e,
    ammo: b[e].magazine,
    reserve: b[e].melee ? 0 : b[e].reserve ?? b[e].magazine * 4
})
  , xt = e => b[e]?.dual === !0
  , St = e => e.config.mode !== `ffa` && e.config.mode !== `survival`
  , Ct = e => e.config.mode === `ctf` || e.config.mode === `vip` || e.config.mode === `bomb`
  , wt = (e, t, n) => !t.bot || e.config.mode !== `survival` || e.wave >= 3 || n === `pistol` || e.wave === 2 && n === `smg`;
function Tt(e) {
    let t = pt.get(e);
    return t || (t = {
        pilots: new Map,
        waveDelay: -1,
        hadHuman: e.players.some(e => !e.bot),
        gasPulse: at,
        navBudget: rn,
        couriers: [null, null],
        clock: 0,
        respawns: [],
        hotspot: null
    },
    pt.set(e, t)),
    t
}
function Et(e, t) {
    let n = Tt(e)
      , r = n.pilots.get(t.id);
    return r || (r = {
        previous: ce(),
        lastX: t.x,
        stuck: 0,
        recharge: !1,
        strafe: Math.random() < .5 ? -1 : 1,
        aimError: 0,
        heat: 0
    },
    n.pilots.set(t.id, r)),
    r
}
function w(e, t) {
    e.events.push({
        ...t,
        id: e.nextId++
    }),
    e.events.length > 80 && e.events.splice(0, e.events.length - 80)
}
function Dt(e, t, n) {
    return t.id !== n.id && (e.config.mode === `ffa` || t.team !== n.team)
}
function Ot(e, t, n, r, i=!1) {
    return r.hp <= 0 || r.invulnerable > 0 || (r.goldenTime ?? 0) > 0 ? !1 : r.id === t ? i : e.config.mode === `ffa` || n !== r.team || e.config.friendlyFire
}
var kt = e => e.y - C + (e.crouching ? 14 : 0);
function At(e) {
    if (e.bases && e.bases.length >= 2)
        return [{
            ...e.bases[0]
        }, {
            ...e.bases[1]
        }];
    let t = e.spawns[0]
      , n = e.spawns[0];
    for (let r of e.spawns)
        r.x < t.x && (t = r),
        r.x > n.x && (n = r);
    return [{
        ...t
    }, {
        ...n
    }]
}
function jt(e) {
    let t = [`A`, `B`, `C`, `D`];
    if (e.bombSites && e.bombSites.length >= 1)
        return e.bombSites.slice(0, 4).map( (e, n) => ({
            x: e.x,
            y: e.y,
            label: t[n]
        }));
    let n = At(e)
      , r = e.spawns.filter(e => !n.some(t => t.x === e.x && t.y === e.y))
      , i = r.length >= 2 ? r : e.spawns
      , a = (e, t) => i.filter(e => e !== t).sort( (t, n) => Math.abs(t.x - e) - Math.abs(n.x - e) || n.y - t.y)[0]
      , o = a(e.width / 3)
      , s = a(e.width * 2 / 3, o) ?? o;
    return [{
        x: o.x,
        y: o.y,
        label: `A`
    }, {
        x: s.x,
        y: s.y,
        label: `B`
    }]
}
function Mt(e, t, n) {
    let r = null;
    for (let i of e.platforms)
        t >= i.x && t <= i.x + i.w && i.y >= n - C && (r === null || i.y < r) && (r = i.y);
    return r === null ? null : r - tt
}
function Nt(e) {
    return e.grenadeInventory ||= {
        frag: Math.max(0, Math.round(ht(e.grenades, 0))),
        gas: 0,
        mine: 0
    },
    e.grenadeKind && x.includes(e.grenadeKind) || (e.grenadeKind = `frag`),
    e.grenadeInventory
}
function Pt(e) {
    let t = Nt(e)
      , n = Math.max(0, Math.round(ht(e.grenades, 0)));
    t[e.grenadeKind] !== n && (t[e.grenadeKind] = n)
}
function Ft(e) {
    e.grenades = e.grenadeInventory?.[e.grenadeKind ?? `frag`] ?? e.grenades
}
function It(e, t) {
    let n = Nt(e)
      , r = x.indexOf(e.grenadeKind);
    for (let i = 1; i <= x.length; i++) {
        let a = x[(r + i) % x.length];
        if (a === e.grenadeKind)
            break;
        if (!t || n[a] > 0)
            return e.grenadeKind = a,
            Ft(e),
            !0
    }
    return !1
}
function Lt(e, t, n) {
    let r = Nt(e);
    r[t] = Math.min(te[t].max, r[t] + n),
    Ft(e)
}
function Rt(e) {
    if (!e || typeof e != `object`)
        return;
    let t = e
      , n = e => Math.round(mt(ht(Number(t[e]), 0), 0, 63));
    return {
        hat: n(`hat`),
        hair: n(`hair`),
        face: n(`face`),
        skin: n(`skin`),
        shirt: n(`shirt`),
        pants: n(`pants`),
        boots: n(`boots`)
    }
}
var zt = 1100
  , Bt = 2
  , Vt = 90
  , Ht = 1700
  , Ut = 150;
function Wt(e, t, n, r, i, a) {
    let o = 1 / 0
      , s = 0;
    for (let e of i) {
        let n = Math.hypot(e.x - r.x, e.y - r.y);
        o = Math.min(o, n),
        n < zt && Zt(t, e.x, e.y - 5, r.x, r.y - 5) && (s -= 400 + 500 * (1 - n / zt))
    }
    s += o === 1 / 0 ? 900 : 900 * (1 - Math.exp(-o / 600)),
    o !== 1 / 0 && o > Ht && (s -= Math.min(300, .25 * (o - Ht)));
    let c = (e, t, n) => {
        let i = Math.hypot(e - r.x, t - r.y);
        i < n && (s -= 250 + 900 * (1 - i / n))
    }
    ;
    for (let t of e.projectiles)
        (t.explosive || t.weapon === `grenade`) && c(t.x, t.y, xn(t) + 50);
    for (let t of e.mines ?? [])
        c(t.x, t.y, xn({
            weapon: `grenade`,
            grenadeKind: `mine`
        }) + 50);
    for (let t of e.areas ?? [])
        c(t.x, t.y, t.radius + 50);
    for (let t of a.respawns) {
        if (t.id === n.id || Math.hypot(t.x - r.x, t.y - r.y) >= Vt)
            continue;
        let i = e.players.find(e => e.id === t.id);
        i && i.hp > 0 && Math.hypot(i.x - t.x, i.y - t.y) < 180 && (s -= 800 * (1 - (a.clock - t.at) / Bt))
    }
    return s
}
function Gt(e, t) {
    t.goldenTime = 0,
    t.regenDelay = 5;
    let n = gt(e)
      , r = n.spawns;
    if (Ct(e)) {
        let e = n.spawns.filter(e => t.team === 0 ? e.x < n.width * .45 : e.x > n.width * .55);
        e.length && (r = e)
    }
    let i = Tt(e)
      , a = e.players.filter(n => n.hp > 0 && Dt(e, t, n));
    i.respawns = i.respawns.filter(e => i.clock - e.at < Bt);
    let o = r.map(r => ({
        pos: r,
        safety: Wt(e, n, t, r, a, i) + Math.random() * Ut
    }));
    o.sort( (e, t) => t.safety - e.safety);
    let s = o[0].pos;
    if (i.respawns.push({
        id: t.id,
        x: s.x,
        y: s.y,
        at: i.clock
    }),
    Object.assign(t, {
        x: s.x,
        y: s.y,
        vx: 0,
        vy: 0,
        hp: 100,
        fuel: 100,
        boostTime: 0,
        empTime: 0,
        empCharge: 0,
        guns: ft.map(bt),
        activeGun: 0,
        grenades: te.frag.spawn,
        grounded: !1,
        jetting: !1,
        firing: !1,
        reloadTimer: 0,
        fireTimer: .25,
        respawnTimer: 0,
        invulnerable: 1.7,
        meleeTimer: 0,
        grenadeTimer: 0,
        lastAttacker: null,
        crouching: !1,
        shielding: !1,
        carryingBomb: !1,
        grenadeKind: `frag`,
        grenadeInventory: {
            frag: te.frag.spawn,
            gas: te.gas.spawn,
            mine: te.mine.spawn
        }
    }),
    t.bot) {
        let n = Et(e, t);
        if (n.combat = void 0,
        n.climb = void 0,
        n.climbX = void 0,
        n.stuck = 0,
        n.recharge = !1,
        n.lastX = t.x,
        n.heat = 0,
        t.botTimer = 0,
        e.config.mode === `survival`) {
            let n = e.wave === 1 ? [`pistol`] : e.wave === 2 ? [`pistol`, `smg`] : [`rifle`, `smg`, `shotgun`, `magnum`, `ak47`, `uzi`, `m14`];
            t.guns[0] = bt(n[(e.players.indexOf(t) + Math.max(0, e.wave - 1)) % n.length] ?? `rifle`),
            t.hp = Math.min(160, 75 + e.wave * 9)
        }
    }
    w(e, {
        type: `respawn`,
        x: t.x,
        y: t.y,
        actor: t.id
    })
}
function Kt(e) {
    let t = ie.some(e => e.id === ee.map) ? ee.map : ie[0].id
      , n = {
        map: ie.some(t => t.id === e.map) ? e.map : t,
        mode: ne.includes(e.mode) ? e.mode : `ffa`,
        duration: mt(ht(e.duration, 180), 30, 1800),
        killLimit: Math.round(mt(ht(e.killLimit, 15), 1, 100)),
        bots: Math.round(mt(ht(e.bots, 4), 0, 11)),
        difficulty: [`recruit`, `regular`, `veteran`].includes(e.difficulty) ? e.difficulty : `regular`,
        friendlyFire: e.friendlyFire === !0
    }
      , r = {
        map: n.map,
        config: n,
        players: [],
        projectiles: [],
        pickups: [],
        events: [],
        tick: 0,
        time: n.duration,
        phase: `playing`,
        winner: null,
        nextId: 1,
        wave: 1,
        mines: [],
        areas: []
    };
    Tt(r);
    let i = gt(r)
      , a = i.pickups.some(e => e.kind === `grenade` && e.grenade)
      , o = 0;
    r.pickups = i.pickups.map(e => {
        let t = {
            ...e,
            id: r.nextId++,
            timer: 0
        };
        return t.kind === `grenade` && !a && (t.grenade = x[o++ % x.length]),
        t
    }
    );
    let s = At(i);
    n.mode === `ctf` ? (r.flags = s.map( (e, t) => ({
        team: t,
        x: e.x,
        y: e.y,
        homeX: e.x,
        homeY: e.y,
        carrier: null,
        returnTimer: 0
    })),
    r.teamScores = [0, 0]) : n.mode === `vip` ? (r.objective = {
        kind: `vip`,
        vips: [null, null],
        target: Math.round(mt(n.killLimit / 3, 1, 30)),
        rotation: [0, 0]
    },
    r.teamScores = [0, 0]) : n.mode === `bomb` && (r.objective = {
        kind: `bomb`,
        attackers: 0,
        round: 1,
        target: Math.round(mt(n.killLimit / 5, 1, 15)),
        roundTime: 60,
        roundTimer: 60,
        sites: jt(i),
        homeX: s[0].x,
        homeY: s[0].y,
        x: s[0].x,
        y: s[0].y,
        carrier: null,
        planted: !1,
        site: null,
        plantProgress: 0,
        defuseProgress: 0,
        fuse: 0,
        plantTime: 2.5,
        defuseTime: 4,
        fuseTime: 20,
        lastResult: null
    },
    r.teamScores = [0, 0]);
    let c = n.mode === `survival` ? Math.min(2, n.bots) : n.bots;
    for (let e = 0; e < c; e++)
        qt(r, `bot-${e + 1}`, ue(r.players), {
            bot: !0,
            color: e + 1,
            team: n.mode === `survival` ? 1 : (e + 1) % 2
        });
    return r
}
function qt(e, t, n, r={}) {
    let i = e.players.find(e => e.id === t);
    if (i)
        return i;
    let a = {
        id: t,
        name: n.trim().slice(0, 18) || `PILOT`,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        aim: 0,
        hp: 100,
        fuel: 100,
        team: e.config.mode === `survival` ? +!!r.bot : Math.round(mt(ht(r.team ?? 0, 0), 0, 1)),
        color: Math.round(mt(ht(r.color ?? 0, 0), 0, v.length - 1)),
        bot: r.bot === !0,
        kills: 0,
        deaths: 0,
        score: 0,
        guns: [],
        activeGun: 0,
        grenades: te.frag.spawn,
        grounded: !1,
        jetting: !1,
        firing: !1,
        reloadTimer: 0,
        fireTimer: 0,
        respawnTimer: 0,
        invulnerable: 0,
        meleeTimer: 0,
        grenadeTimer: 0,
        lastAttacker: null,
        botTimer: 0,
        botTarget: null,
        input: ce()
    }
      , o = Rt(r.avatar);
    return o && (a.avatar = o),
    a.bot && (a.personality = ge(e.config.mode, a, e.players)),
    e.players.push(a),
    a.bot || (Tt(e).hadHuman = !0),
    Gt(e, a),
    a
}
function Jt(e, t, n) {
    let r = e.players.find(e => e.id === t);
    r && n && typeof n == `object` && (r.input = Yt(n, r.aim))
}
function Yt(e, t) {
    return {
        left: e.left === !0,
        right: e.right === !0,
        jet: e.jet === !0,
        down: e.down === !0,
        fire: e.fire === !0,
        reload: e.reload === !0,
        swap: e.swap === !0,
        grenade: e.grenade === !0,
        melee: e.melee === !0,
        pickup: e.pickup === !0,
        aim: ht(e.aim, t) % (Math.PI * 2),
        crouch: e.crouch === !0,
        grenadeCycle: e.grenadeCycle === !0
    }
}
function Xt(e, t, n, r, i, a, o, s) {
    let c = 0
      , l = 1;
    for (let[u,d,f,p] of [[e, n, i, i + o], [t, r, a, a + s]])
        if (Math.abs(d) < 1e-6) {
            if (u < f || u > p)
                return null
        } else {
            let e = (f - u) / d
              , t = (p - u) / d;
            if (c = Math.max(c, Math.min(e, t)),
            l = Math.min(l, Math.max(e, t)),
            c > l)
                return null
        }
    return c
}
function Zt(e, t, n, r, i) {
    return !$e(e, t - 1, n - 1, r + 1, i + 1).some(e => Xt(t, n, r - t, i - n, e.x, e.y, e.w, e.h) !== null)
}
function Qt(e, t, n, r, i) {
    return Zt(gt(e), t, n, r, i)
}
function $t(e, t) {
    let n = e.objective
      , r = e.players.indexOf(t);
    if (!n)
        return null;
    if (n.kind === `vip`) {
        if (t.vip) {
            let n = At(gt(e))[t.team];
            return {
                x: n.x,
                y: n.y
            }
        }
        let i = e.players.find(e => e.id === n.vips[1 - t.team] && e.hp > 0)
          , a = e.players.find(e => e.id === n.vips[t.team] && e.hp > 0);
        return (r % 3 == 2 || t.personality === `objective`) && a ? {
            x: a.x,
            y: a.y
        } : i ? {
            x: i.x,
            y: i.y
        } : null
    }
    let i = n.sites[r % n.sites.length];
    if (t.team === n.attackers) {
        if (n.planted)
            return {
                x: n.x,
                y: n.y
            };
        if (n.carrier === t.id)
            return i;
        if (!n.carrier)
            return {
                x: n.x,
                y: n.y
            };
        let r = e.players.find(e => e.id === n.carrier);
        return r ? {
            x: r.x,
            y: r.y
        } : i
    }
    if (n.planted)
        return {
            x: n.x,
            y: n.y
        };
    let a = r % 2 == 1 ? e.players.find(e => e.id === n.carrier) : void 0;
    return a ? {
        x: a.x,
        y: a.y
    } : i
}
function en(e, t, n) {
    let r = gt(e)
      , i = Et(e, t);
    t.botTimer -= n,
    t.botTimer <= 0 && tn(e, t, r, i),
    i.nav && yt(r) && fn(e, t, r, i, i.nav, n);
    let a = _e[e.config.difficulty];
    if (a.pause > 0 && i.combat) {
        i.combat.elapsed += n;
        let e = i.combat.elapsed - a.reaction
          , r = e >= 0 && e % (a.burst + a.pause) < a.burst;
        t.input.fire = i.combat.fire && r,
        t.input.grenade = i.combat.grenade && r,
        t.input.melee = i.combat.melee && e >= 0
    }
}
function tn(e, t, n, r) {
    let i = _e[e.config.difficulty]
      , a = i.decision;
    t.botTimer = a;
    let o = he(t.personality, e.config.mode)
      , s = de[o]
      , c = fe[e.config.difficulty]
      , l = e.players.filter(n => n.hp > 0 && Dt(e, t, n));
    l.sort( (e, n) => (Number(n.vip === !0) - Number(e.vip === !0)) * 400 + Math.hypot(e.x - t.x, e.y - t.y) - Math.hypot(n.x - t.x, n.y - t.y));
    let u = l[0];
    t.botTarget = u?.id ?? null;
    let d = t.guns[t.activeGun]
      , f = b[d.id]
      , p = Tt(e).hotspot
      , m = p && Tt(e).clock - p.at < 20 ? p : {
        x: n.width / 2,
        y: n.height / 2
    }
      , h = u?.x ?? m.x
      , g = u?.y ?? m.y
      , _ = !1;
    if (e.config.mode === `ctf` && e.flags) {
        let n = e.flags.find(e => e.team === t.team)
          , r = e.flags.find(e => e.team !== t.team)
          , i = e.players.filter(e => e.bot && e.hp > 0 && e.team === t.team)
          , a = Tt(e).couriers
          , s = i.find(e => e.id === a[t.team]) ?? i.sort( (e, t) => Number(t.personality === `objective`) - Number(e.personality === `objective`) || Math.hypot(e.x - r.x, e.y - r.y) - Math.hypot(t.x - r.x, t.y - r.y))[0];
        a[t.team] = s?.id ?? null,
        r.carrier === t.id ? (h = n.homeX,
        g = n.homeY,
        _ = !0) : n.carrier || !zn(n) ? (h = n.x,
        g = n.y,
        _ = !0) : !r.carrier && s?.id === t.id || r.carrier ? (h = r.x,
        g = r.y,
        _ = !0) : o === `objective` && l.some(e => Math.hypot(e.x - n.homeX, e.y - n.homeY) < 1e3) && (h = n.homeX,
        g = n.homeY,
        _ = !0)
    }
    let v = $t(e, t);
    v && (h = v.x,
    g = v.y,
    _ = !0);
    let ee = yt(n)
      , y = e.flags?.some(e => e.carrier === t.id) === !0
      , x = e.pickups.filter(n => !n.golden && n.timer <= 0 && n.lockedFor !== t.id && (!ee || !y && Math.hypot(n.x - t.x, n.y - t.y) < (n.id === r.supplyId ? 640 : 420)) && (n.kind === `health` && t.hp < s.healAt || n.kind === `fuel` && t.fuel < s.fuelAt || n.kind !== `health` && n.kind !== `fuel` && n.kind !== `grenade` && wt(e, t, n.kind) && !b[n.kind].melee && (!n.dropped || Mn(t)) && Math.hypot(n.x - t.x, n.y - t.y) < (s.prefers.includes(n.kind) ? s.lootReach : 110)));
    x.sort( (e, n) => Math.hypot(e.x - t.x, e.y - t.y) - Math.hypot(n.x - t.x, n.y - t.y)),
    r.supplyId = x[0]?.id,
    x[0] && !(_ && t.carryingBomb) && (h = x[0].x,
    g = x[0].y);
    let te = u ? u.x - t.x : 1
      , S = u ? u.y - t.y : 0
      , ne = Math.hypot(te, S)
      , re = u ? Zt(n, t.x, t.y - 5, u.x, u.y) : !1
      , ie = y || t.vip === !0 || t.carryingBomb === !0 || e.config.mode === `ctf` && Tt(e).couriers[t.team] === t.id || e.objective?.kind === `bomb` && e.objective.planted;
    _ && u && re && !x[0] && !ie && ne < s.skirmish && (h = u.x,
    g = u.y,
    _ = !1),
    r.aimError = (Math.random() - .5) * i.aimError * 2;
    let ae = u && f.speed > 0 ? Math.min(.45, ne / f.speed) * i.lead : 0;
    t.aim = Math.atan2(S + (u?.vy ?? 0) * ae * .6 - (f.gravity ? ne * .12 : 0), te + (u?.vx ?? 0) * ae * .7) + r.aimError,
    Math.random() < .09 && (r.strafe *= -1);
    let oe = Math.sign(h - t.x);
    if (re && !x[0] && (!_ || Math.hypot(h - t.x, g - t.y) < 75) && Math.abs(S) < 100) {
        let e = f.melee ? 30 : f.id === `shotgun` || f.id === `flamer` || f.id === `uzi` ? 150 : f.id === `sniper` || f.id === `m14` ? 560 : 330
          , n = f.melee ? e : Math.max(s.minRange * c, e * (1 + (s.range - 1) * c));
        f.melee ? oe = Math.sign(te) : t.hp < s.retreatHp || ne < n * .65 ? oe = -Math.sign(te) : ne < n * 1.2 && (oe = r.strafe)
    }
    let se = {
        aim: t.aim,
        fire: re && ne < f.range * .95 && t.invulnerable < 1.15 && Math.random() > 1 - i.fireChance,
        reload: !f.melee && (d.ammo < 1 || !re && d.ammo < f.magazine * .4),
        pickup: !0,
        grenade: re && ne > 140 && ne < 500 && Math.random() < i.grenadeChance * s.grenade,
        melee: re && ne < 62
    };
    re && u ? (r.combat?.target !== u.id && (r.combat = {
        target: u.id,
        elapsed: 0,
        fire: !1,
        grenade: !1,
        melee: !1
    }),
    Object.assign(r.combat, {
        fire: se.fire,
        grenade: se.grenade,
        melee: se.melee
    })) : r.combat = void 0;
    let le = t.guns[(t.activeGun + 1) % t.guns.length]
      , ue = le !== d && le.ammo + le.reserve > 0 && !s.prefers.includes(d.id) && s.prefers.includes(le.id)
      , pe = f.melee && ne > 220 && le !== d && le.ammo + le.reserve > 0 || d.ammo === 0 && d.reserve === 0 || ue
      , me = s.jet && re && S < -30 && t.fuel > 30;
    if (yt(n)) {
        let i = re && !x[0] && (!_ || Math.hypot(h - t.x, g - t.y) < 75) && Math.abs(S) < 100
          , a = _ && v !== null && Math.abs(h - t.x) < 14 && Math.abs(g - t.y) < 45
          , o = r.nav ??= {
            goalX: h,
            goalY: g,
            goal: -1,
            field: null,
            age: 0,
            best: 1 / 0,
            stall: 0,
            unstick: 0,
            unstickDir: 1,
            from: -1,
            fromStand: !1,
            targetX: t.x,
            targetY: t.y,
            targetStand: !1,
            targetTight: !1,
            final: !1,
            walk: !1,
            carryX: !1,
            carryY: !1,
            retarget: 0,
            engage: !1,
            engageDir: 0,
            hold: !1,
            topUp: 0
        };
        o.engage = i,
        o.engageDir = oe,
        o.hold = a,
        o.rushJet = me,
        un(e, n, o, h, g, _ || x[0] !== void 0),
        t.input = {
            ...t.input,
            ...se,
            swap: pe,
            crouch: a && re && !f.melee
        };
        return
    }
    let ge = n.platforms.filter(e => e.kind !== `bridge` && e.y + e.h < t.y + C && e.y > g - C && t.x > e.x - 14 && t.x < e.x + e.w + 14).sort( (e, t) => t.y - e.y)[0];
    r.climb && (t.y + C < r.climb.y - 3 || g > t.y + 80) && (r.climb = void 0,
    r.climbX = void 0),
    !r.climb && ge && g < t.y - 55 && (r.climb = ge,
    r.climbX = t.x < ge.x + ge.w / 2 ? ge.x - 42 : ge.x + ge.w + 42,
    r.climbX < 14 && (r.climbX = ge.x + ge.w + 42),
    r.climbX > n.width - 14 && (r.climbX = ge.x - 42)),
    r.climb && r.climbX !== void 0 && (oe = Math.abs(r.climbX - t.x) > 9 ? Math.sign(r.climbX - t.x) : 0);
    let ve = _ && v !== null && !r.climb && Math.abs(h - t.x) < 14 && Math.abs(g - t.y) < 45;
    ve && (oe = 0),
    r.stuck = Math.abs(t.x - r.lastX) < 5 && oe !== 0 ? r.stuck + a : 0,
    r.lastX = t.x,
    r.stuck > .8 && (oe = r.strafe),
    r.stuck > 2 && (r.strafe *= -1,
    r.stuck = 0),
    t.fuel < 9 && (r.recharge = !0),
    t.fuel > 65 && (r.recharge = !1);
    let ye = n.platforms.some(e => e.kind !== `bridge` && t.y + C > e.y + 5 && t.y - C < e.y + e.h && t.x + oe * 42 > e.x && t.x + oe * 42 < e.x + e.w)
      , be = !ve && !r.recharge && (r.climb !== void 0 || g < t.y - 35 || me || ye || r.stuck > .6 || !t.grounded && t.vy > 200 && g < t.y + 80);
    t.input = {
        ...ce(),
        ...se,
        left: oe < 0,
        right: oe > 0,
        jet: be,
        down: g > t.y + 140,
        swap: pe,
        crouch: ve && re && !f.melee
    }
}
var nn = 6
  , rn = 8
  , an = 24
  , on = 1 / 30
  , sn = 240
  , cn = []
  , ln = [];
function un(e, t, n, r, i, a) {
    let o = Pe(t)
      , s = Ue(o, r, i, 3);
    if (s < 0 && (s = Ue(o, r, i, 8)),
    s < 0)
        return;
    let c = n.goal < 0 ? 1 / 0 : Math.max(Math.abs(s % o.nodeCols - n.goal % o.nodeCols), Math.abs(Math.floor(s / o.nodeCols) - Math.floor(n.goal / o.nodeCols)));
    if (c <= 4 && (n.goalX = r,
    n.goalY = i),
    s === n.goal || n.field && !a && c <= 4 && n.age < .8)
        return;
    let l = Tt(e);
    if (!o.fields.has(s)) {
        if (n.field && l.navBudget < 1)
            return;
        --l.navBudget
    }
    n.goalX = r,
    n.goalY = i,
    n.field = Re(o, s),
    n.goal = s,
    n.from = -1,
    n.age = 0,
    n.best = 1 / 0,
    n.stall = 0,
    n.retarget = 0
}
function dn(e, t, n) {
    let r = Pe(e)
      , i = n.field
      , a = r.nodeCols;
    if (n.final = !0,
    n.walk = !1,
    n.carryX = !1,
    n.carryY = !1,
    n.fromStand = !1,
    n.targetX = n.goalX,
    n.targetY = n.goalY,
    n.targetStand = !1,
    n.targetTight = !1,
    !i)
        return;
    let o = n.from >= 0 && i[n.from] >= 0 && Math.abs(ze(r, n.from) - t.x) <= 9 && Math.abs(Be(r, n.from) - t.y) <= 9 ? n.from : Ue(r, t.x, t.y, 2, i);
    if (n.from = o,
    o < 0)
        return;
    if (n.fromStand = Ve(r, o),
    t.grounded && n.fromStand && t.fuel < 97) {
        let e = qe(r, i, o, sn, cn) * 1.2 + 8;
        n.topUp = e > t.fuel ? Math.min(98, e + 10) : n.topUp > t.fuel ? n.topUp : 0
    } else
        t.grounded || (n.topUp = 0);
    i[o] < n.best && (n.best = i[o],
    n.stall = 0);
    let s = e => {
        n.targetX = ze(r, e),
        n.targetY = Be(r, e),
        n.targetStand = Ve(r, e),
        n.targetTight = He(r, e)
    }
    ;
    if (i[o] === 0) {
        Ge(r, t.x, t.y, n.goalX, n.goalY) || s(o);
        return
    }
    let c = Ke(r, i, o, an, ln)
      , l = -1
      , u = -1;
    for (let e = 0; e < c; e++) {
        let n = ln[e];
        if (!Ge(r, t.x, t.y, ze(r, n), Be(r, n)))
            break;
        l = e
    }
    if (t.grounded && Ve(r, o)) {
        let e = 0
          , t = o;
        for (let n = 0; n < c; n++) {
            let i = ln[n]
              , o = i % a - t % a;
            if (!Ve(r, i) || o === 0 || e && Math.sign(o) !== e)
                break;
            e = Math.sign(o),
            u = n,
            t = i
        }
    }
    let d = c > 0 ? ln[c - 1] : o
      , f = Math.max(l, u);
    if (f < 0) {
        n.final = !1;
        let e = c > 0 ? ln[0] : o
          , i = Math.floor(e / a) - Math.floor(o / a);
        if (!t.grounded && Ve(r, o) && Ve(r, e)) {
            s(o);
            return
        }
        s(e),
        e % a !== o % a && (i < 0 ? n.targetX = ze(r, o) : i > 0 && (n.targetY = Be(r, o)));
        return
    }
    let p = ln[f];
    n.final = p === d && i[d] === 0,
    n.walk = u >= l;
    let m = ln[Math.min(c - 1, f + 3)];
    if (f < c - 1) {
        let e = m % a - p % a
          , i = Math.floor(m / a) - Math.floor(p / a);
        n.carryX = e !== 0 && Math.sign(e) === Math.sign(ze(r, p) - t.x),
        n.carryY = i < 0 && Be(r, p) < t.y
    }
    n.final && Ge(r, t.x, t.y, n.goalX, n.goalY) || s(p)
}
function fn(e, t, n, r, i, a) {
    let o = t.input
      , s = Pe(n);
    if (i.age += a,
    t.fuel < 6 && (r.recharge = !0),
    t.fuel > 55 && (r.recharge = !1),
    i.engage) {
        let e = i.engageDir;
        e && !We(s, t.x + e * 12, t.y - 2) && (e = -e,
        i.engageDir = e),
        o.left = e < 0,
        o.right = e > 0,
        o.down = !1,
        o.jet = !r.recharge && t.fuel > 20 && (!t.grounded && t.vy > 40 || i.rushJet === !0 || t.grounded && e !== 0 && !We(s, t.x + e * 12, t.y - 14 - 1));
        return
    }
    if (i.retarget -= a,
    i.retarget <= 0 && (i.retarget = on,
    dn(n, t, i),
    i.stall += on),
    i.stall > 1.6 && i.unstick <= 0 && (i.unstick = .45,
    i.unstickDir = Math.random() < .5 ? -1 : 1,
    i.stall = 0,
    i.best = 1 / 0),
    i.unstick > 0) {
        i.unstick -= a,
        o.left = i.unstickDir < 0,
        o.right = i.unstickDir > 0,
        o.down = !1,
        o.jet = t.fuel > 8;
        return
    }
    let c = i.targetX - t.x
      , l = i.targetY - (i.targetTight && !t.grounded ? 1 : 0) - t.y
      , u = i.carryX ? Math.sign(c) * 280 : mt(c * 6, -280, 280);
    i.final && (i.hold || Math.abs(c) < 4) && (u = 0);
    let d = t.grounded ? 12 : 6
      , f = t.vx > u + d
      , p = t.vx < u - d
      , m = t.grounded && (i.walk && Math.abs(c) > 4 || l > -17 && (Math.abs(c) > 4 || l > -3))
      , h = i.fromStand && i.targetStand && l > -3
      , g = !m && t.vy > (i.carryY ? -385 : h ? Math.max(70, l * 5) : mt(l * 5, -385, 520));
    t.grounded && i.topUp > t.fuel && (f = !1,
    p = !1,
    g = !1),
    r.recharge && (g = !1,
    t.grounded && l < -17 && (f = !1,
    p = !1)),
    o.left = f,
    o.right = p,
    o.jet = g,
    o.down = !1
}
function pn(e, t, n, r) {
    let i = gt(e)
      , a = r ?? Et(e, t)
      , o = Number(t.input.right) - Number(t.input.left)
      , s = t.grounded
      , c = s && a.icy === !0;
    t.crouching = t.input.crouch === !0 && t.grounded && !t.input.jet;
    let l = t.crouching ? 110 : 280;
    t.vx += o * (t.grounded ? 1750 * (c ? lt : 1) : 1e3) * n,
    t.vx *= Math.exp(-(o ? c ? lt * 2 : 2 : t.grounded ? c ? ut : 13 : 2.6) * n),
    t.vx = mt(t.vx, -l, l),
    t.jetting = t.input.jet && t.fuel > .15 && (t.empTime ?? 0) <= 0;
    let u = vt(i);
    t.vy += et * u * n;
    let d = (t.boostTime ?? 0) > 0;
    d && (t.fuel = 100),
    t.jetting ? (t.vy -= 1750 * n,
    d || (t.fuel = Math.max(0, t.fuel - 27 * n))) : t.fuel = Math.min(100, t.fuel + (t.grounded ? 35 : 15) * n),
    t.input.down && !t.grounded && (t.vy += 380 * n),
    t.vy = mt(t.vy, -385, u < 1 ? 420 : 650);
    let f = t.x
      , p = t.y;
    t.x = mt(t.x + t.vx * n, 14, i.width - 14);
    let m = p
      , h = $e(i, Math.min(f, t.x) - 14 - 2, p - C - 14 - 2, Math.max(f, t.x) + 14 + 2, p + C + 2);
    if (s && t.x !== f) {
        let e = _n(h, t.x, p);
        e > 0 && (t.y = m = p - e,
        t.vy = Math.min(t.vy, 0))
    }
    for (let e of h)
        e.kind === `bridge` || m + C <= e.y + .5 || m - C >= e.y + e.h - .5 || t.x + 14 > e.x && t.x - 14 < e.x + e.w && (f + 14 <= e.x + 1 ? t.x = e.x - 14 : f - 14 >= e.x + e.w - 1 && (t.x = e.x + e.w + 14),
        t.vx = 0);
    t.y += t.vy * n,
    t.grounded = !1;
    let g = null;
    for (let e of $e(i, t.x - 14 - 1, Math.min(m, t.y) - C - 2, t.x + 14 + 1, Math.max(m, t.y) + C + 2))
        t.x + 14 <= e.x || t.x - 14 >= e.x + e.w || (t.vy >= 0 && m + C <= e.y + 1 && t.y + C >= e.y && !(e.kind === `bridge` && t.input.down) ? (t.y = e.y - C,
        t.vy = 0,
        t.grounded = !0,
        (!g || t.x >= e.x && t.x <= e.x + e.w) && (g = e)) : e.kind !== `bridge` && t.vy < 0 && m - C >= e.y + e.h - 1 && t.y - C < e.y + e.h && (t.y = e.y + e.h + C,
        t.vy = 0));
    t.grounded && (a.icy = g?.kind === `ice`),
    t.y < C && (t.y = C,
    t.vy = Math.max(0, t.vy)),
    t.grounded || (t.crouching = !1),
    !r && t.y > i.height + 80 && bn(e, t, 1e3, t.lastAttacker, `FALL`)
}
var mn = new WeakMap;
function hn(e, t) {
    let n = t.y + C
      , r = null;
    for (let i of $e(e, t.x - 14 - 1, n - 2, t.x + 14 + 1, n + 2))
        t.x + 14 <= i.x || t.x - 14 >= i.x + i.w || Math.abs(i.y - n) > 1 || (!r || t.x >= i.x && t.x <= i.x + i.w) && (r = i);
    return r?.kind
}
function gn(e, t, n, r) {
    if (!n || typeof n != `object` || (t.input = Yt(n, t.aim),
    !Number.isFinite(r) || r <= 0 || t.hp <= 0))
        return;
    let i = mn.get(t);
    i || (i = {
        icy: t.grounded && hn(gt(e), t) === `ice`
    },
    mn.set(t, i));
    let a = Math.min(r, 1)
      , o = Math.ceil(a / (1 / 120))
      , s = a / o;
    for (let n = 0; n < o; n++) {
        let n = t;
        n.boostTime &&= Math.max(0, n.boostTime - s),
        t.empTime &&= Math.max(0, t.empTime - s),
        pn(e, t, s, i)
    }
}
function _n(e, t, n) {
    let r = n + C
      , i = 0;
    for (let a of e) {
        if (a.kind === `bridge` || r <= a.y + .5 || n - C >= a.y + a.h - .5 || t + 14 <= a.x || t - 14 >= a.x + a.w)
            continue;
        let e = r - a.y;
        if (e > 14.01)
            return 0;
        i = Math.max(i, e)
    }
    if (i <= 0)
        return 0;
    let a = n - i - C
      , o = r - i;
    for (let n of e)
        if (!(n.kind === `bridge` || t + 14 <= n.x || t - 14 >= n.x + n.w) && a < n.y + n.h && o > n.y + .01)
            return 0;
    return i
}
function vn(e) {
    let t = e.pickups.filter(e => e.dropped);
    if (t.length <= 16)
        return;
    let n = new Set(t.sort( (e, t) => e.id - t.id).slice(0, t.length - 16));
    e.pickups = e.pickups.filter(e => !n.has(e))
}
function yn(e, t, n, r) {
    if (!n || !b[n.id] || !b[n.id].melee && n.ammo + n.reserve <= 0)
        return null;
    let i = Mt(gt(e), t.x, t.y);
    if (i === null)
        return null;
    let a = {
        id: e.nextId++,
        x: t.x,
        y: i,
        kind: n.id,
        timer: 0,
        dropped: !0,
        gun: {
            ...n
        },
        expires: 20
    };
    return r && (a.lockedFor = t.id),
    e.pickups.push(a),
    vn(e),
    w(e, {
        type: `drop`,
        x: a.x,
        y: a.y,
        actor: t.id,
        text: n.id,
        weapon: n.id
    }),
    a
}
function bn(e, t, n, r, i) {
    if (t.hp <= 0 || t.invulnerable > 0 || (t.goldenTime ?? 0) > 0)
        return;
    if (t.regenDelay = 5,
    t.vip && (n *= .7),
    t.hp = Math.max(0, t.hp - n),
    r && r !== t.id) {
        t.lastAttacker = r;
        let n = Tt(e);
        n.hotspot = {
            x: t.x,
            y: t.y,
            at: n.clock
        }
    }
    if (w(e, {
        type: `hit`,
        x: t.x,
        y: t.y,
        actor: r ?? void 0,
        target: t.id,
        text: String(Math.ceil(n))
    }),
    t.hp > 0)
        return;
    t.deaths++,
    t.respawnTimer = 2.4,
    t.jetting = !1,
    t.firing = !1,
    t.crouching = !1,
    t.shielding = !1;
    let a = e.players.find(e => e.id === r);
    a && a.id !== t.id ? Dt(e, a, t) ? (a.kills++,
    a.score++) : a.score-- : t.score--,
    w(e, {
        type: `kill`,
        x: t.x,
        y: t.y,
        actor: a?.id,
        target: t.id,
        text: i
    }),
    yn(e, t, t.guns[t.activeGun], !1);
    let o = e.objective;
    if (o?.kind === `vip` && t.vip && e.teamScores) {
        let n = 1 - t.team;
        e.teamScores[n]++,
        a && a.team === n && (a.score += 2),
        o.vips[t.team] = null,
        o.rotation[t.team]++,
        t.vip = !1,
        w(e, {
            type: `objective`,
            x: t.x,
            y: t.y,
            actor: a?.id,
            target: t.id,
            text: `VIP DOWN · ${y[n]} ${e.teamScores[n]}/${o.target}`
        })
    }
}
function xn(e) {
    return e.weapon === `grenade` ? e.grenadeKind === `mine` ? 120 : 145 : b[e.weapon].blastRadius ?? 115
}
function Sn(e, t) {
    let n = xn(t);
    w(e, {
        type: `explosion`,
        x: t.x,
        y: t.y,
        actor: t.owner,
        weapon: t.weapon,
        grenadeKind: t.grenadeKind
    });
    let r = t.weapon === `grenade` ? t.grenadeKind === `mine` ? `MINE` : `GRENADE` : b[t.weapon].name;
    for (let i of e.players) {
        let a = Math.hypot(i.x - t.x, i.y - t.y);
        a > n || !Ot(e, t.owner, t.team, i, !0) || (bn(e, i, t.damage * (1 - .78 * a / n) * (i.id === t.owner ? .65 : 1), t.owner, r),
        i.vx += (i.x - t.x) / Math.max(20, a) * 180,
        i.vy -= (1 - a / n) * 240)
    }
    if (e.mines?.length) {
        let r = e.mines.filter(e => Math.hypot(e.x - t.x, e.y - t.y) < n * .8);
        if (r.length) {
            e.mines = e.mines.filter(e => !r.includes(e));
            for (let t of r)
                Cn(e, t)
        }
    }
}
function Cn(e, t) {
    w(e, {
        type: `mine`,
        x: t.x,
        y: t.y,
        actor: t.owner,
        text: `blast`,
        grenadeKind: `mine`
    }),
    Sn(e, {
        owner: t.owner,
        team: t.team,
        x: t.x,
        y: t.y,
        damage: 105,
        weapon: `grenade`,
        grenadeKind: `mine`
    })
}
function wn(e, t) {
    let n = e.mines ??= []
      , r = n.filter(e => e.owner === t.owner)
      , i = new Set(r.slice(0, Math.max(0, r.length - nt + 1)));
    e.mines = n.filter(e => !i.has(e)),
    e.mines.push({
        id: e.nextId++,
        owner: t.owner,
        team: t.team,
        x: t.x,
        y: t.y,
        arm: 1,
        life: 40
    }),
    e.mines.length > rt && e.mines.splice(0, e.mines.length - rt),
    w(e, {
        type: `mine`,
        x: t.x,
        y: t.y,
        actor: t.owner,
        text: `placed`,
        grenadeKind: `mine`
    })
}
function Tn(e, t) {
    let n = e.areas ??= [];
    n.push({
        id: e.nextId++,
        owner: t.owner,
        team: t.team,
        x: t.x,
        y: t.y,
        radius: 125,
        life: 7,
        kind: `gas`
    }),
    n.length > it && n.splice(0, n.length - it),
    w(e, {
        type: `gas`,
        x: t.x,
        y: t.y,
        actor: t.owner,
        weapon: `grenade`,
        grenadeKind: `gas`
    })
}
function En(e, t) {
    let n = Tt(e);
    if (e.areas?.length) {
        n.gasPulse -= t;
        let r = n.gasPulse <= 0;
        r && (n.gasPulse += at);
        for (let n of e.areas)
            if (n.life -= t,
            r)
                for (let t of e.players)
                    Math.hypot(t.x - n.x, t.y - n.y) > n.radius || !Ot(e, n.owner, n.team, t, !0) || bn(e, t, ot * (t.id === n.owner ? .5 : 1), n.owner, `GAS`);
        e.areas = e.areas.filter(e => e.life > 0)
    } else
        n.gasPulse = at;
    if (e.mines?.length) {
        let n = [];
        for (let r of e.mines) {
            let i = r.arm > 0;
            r.arm = Math.max(0, r.arm - t),
            r.life -= t,
            i && r.arm === 0 && w(e, {
                type: `mine`,
                x: r.x,
                y: r.y,
                actor: r.owner,
                text: `armed`,
                grenadeKind: `mine`
            }),
            r.arm === 0 && r.life > 0 && e.players.some(t => t.id !== r.owner && Ot(e, r.owner, r.team, t) && Math.hypot(t.x - r.x, t.y - r.y) < st) && n.push(r)
        }
        e.mines = e.mines.filter(e => e.life > 0 && !n.includes(e));
        for (let t of n)
            Cn(e, t)
    }
}
function Dn(e, t) {
    let n = t.guns[t.activeGun]
      , r = b[n.id];
    r.melee || t.reloadTimer > 0 || n.ammo >= r.magazine || n.reserve <= 0 || (t.reloadTimer = r.reload * (n.dual ? 1.25 : 1),
    w(e, {
        type: `reload`,
        x: t.x,
        y: t.y,
        actor: t.id,
        weapon: n.id
    }))
}
function On(e, t, n, r, i, a, o) {
    let s = 0;
    w(e, {
        type: `melee`,
        x: t.x,
        y: t.y,
        actor: t.id,
        weapon: o
    });
    for (let o of e.players) {
        let c = o.x - t.x
          , l = o.y - t.y;
        Ot(e, t.id, t.team, o) && Math.hypot(c, l) < r && c * Math.cos(t.aim) + l * Math.sin(t.aim) > -8 && Zt(gt(e), t.x, t.y, o.x, o.y) && (bn(e, o, n, t.id, a),
        o.vx += Math.sign(c || 1) * i,
        o.vy -= i * .43,
        s++)
    }
    return s
}
function kn(e, t, n=0) {
    let r = t.guns[t.activeGun]
      , i = b[r.id];
    if (i.melee) {
        if (t.fireTimer > 0)
            return;
        t.fireTimer = i.fireInterval,
        t.firing = !0,
        t.invulnerable = 0,
        On(e, t, i.damage * (r.dual && xt(r.id) ? dt : 1), i.range, i.blocksFront ? 380 : 160, i.name.toUpperCase(), i.id);
        return
    }
    if (r.ammo <= 0) {
        Dn(e, t);
        return
    }
    if (t.fireTimer > 0 || t.reloadTimer > 0)
        return;
    let a = Et(e, t)
      , o = r.dual && xt(r.id) ? Math.min(2, r.ammo) : 1;
    r.ammo -= o,
    t.fireTimer = Math.max(0, i.fireInterval + n),
    t.firing = !0,
    t.invulnerable = 0;
    let s = (i.spread + (r.dual ? .025 : 0) + a.heat) * (t.crouching ? .55 : 1);
    i.recoil && (a.heat = Math.min(.12, a.heat + i.recoil));
    for (let n = 0; n < i.pellets * o; n++) {
        let n = t.aim + (Math.random() * 2 - 1) * s
          , r = {
            id: e.nextId++,
            owner: t.id,
            team: t.team,
            x: t.x + Math.cos(t.aim) * 10,
            y: t.y - 5 + Math.sin(t.aim) * 10,
            vx: Math.cos(n) * i.speed,
            vy: Math.sin(n) * i.speed,
            damage: i.damage,
            life: i.range / i.speed,
            weapon: i.id,
            radius: i.explosive ? 6 : i.id === `flamer` ? 7 : 3,
            explosive: i.explosive ?? !1,
            bounces: 0
        };
        i.ricochet && (r.ricochet = i.ricochet),
        i.id === `saw` && (r.radius = 9),
        i.id === `emp` && (r.radius = 28),
        i.gravity && (r.gravity = i.gravity,
        r.radius = 5),
        e.projectiles.push(r)
    }
    w(e, {
        type: `shot`,
        x: t.x,
        y: t.y - 5,
        actor: t.id,
        weapon: i.id
    })
}
function An(e, t) {
    let n = Nt(t)
      , r = t.grenadeKind;
    if (n[r] <= 0 || t.grenadeTimer > 0)
        return;
    n[r]--,
    Ft(t),
    t.grenadeTimer = .65,
    t.invulnerable = 0;
    let i = r === `mine` ? 470 : 540;
    e.projectiles.push({
        id: e.nextId++,
        owner: t.id,
        team: t.team,
        x: t.x,
        y: t.y - 10,
        vx: Math.cos(t.aim) * i + t.vx * .3,
        vy: Math.sin(t.aim) * i - 100,
        damage: r === `frag` ? 110 : 0,
        life: r === `frag` ? 1.65 : r === `gas` ? 1.3 : 4,
        weapon: `grenade`,
        radius: 6,
        explosive: r === `frag`,
        bounces: 0,
        grenadeKind: r
    }),
    w(e, {
        type: `shot`,
        x: t.x,
        y: t.y,
        actor: t.id,
        weapon: `grenade`,
        grenadeKind: r
    }),
    n[r] === 0 && It(t, !0),
    Ft(t)
}
function jn(e, t, n) {
    let r = Et(e, t)
      , i = t.input
      , a = i.fire && r.previous.fire && t.fireTimer > 0 && t.reloadTimer <= 0 && t.guns[t.activeGun]?.ammo > 0 && !i.swap
      , o = t.fireTimer - n
      , s = a ? Math.max(-n, Math.min(0, o)) : 0;
    if (t.aim = ht(i.aim, 0),
    t.firing = !1,
    t.fireTimer = o <= 1e-9 ? 0 : o,
    t.grenadeTimer = Math.max(0, t.grenadeTimer - n),
    t.meleeTimer = Math.max(0, t.meleeTimer - n),
    t.invulnerable = Math.max(0, t.invulnerable - n),
    t.goldenTime = Math.max(0, (t.goldenTime ?? 0) - n),
    t.regenDelay = Math.max(0, (t.regenDelay ?? 0) - n),
    !t.bot && t.regenDelay === 0 && t.hp < 100 && (t.hp = Math.min(100, t.hp + 2 * n)),
    r.heat = Math.max(0, r.heat - (i.fire ? .03 : .16) * n),
    Pt(t),
    i.swap && !r.previous.swap && (t.activeGun = (t.activeGun + 1) % t.guns.length,
    t.reloadTimer = 0,
    t.fireTimer = Math.max(t.fireTimer, .16)),
    i.grenadeCycle && !r.previous.grenadeCycle && It(t, !0),
    t.reloadTimer > 0 && (t.reloadTimer = Math.max(0, t.reloadTimer - n),
    t.reloadTimer === 0)) {
        let e = t.guns[t.activeGun]
          , n = Math.min(e.reserve, b[e.id].magazine - e.ammo);
        e.ammo += n,
        e.reserve -= n
    }
    t.shielding = b[t.guns[t.activeGun]?.id]?.blocksFront === !0,
    i.reload && Dn(e, t);
    let c = t.guns[t.activeGun];
    c.id === `emp` && i.fire && c.ammo > 0 && t.reloadTimer <= 0 && t.fireTimer <= 0 ? (t.empCharge = Math.min(.7, (t.empCharge ?? 0) + n),
    t.empCharge >= .7 && (kn(e, t),
    t.empCharge = 0)) : (t.empCharge = 0,
    i.fire && kn(e, t, c.id === `emp` || b[c.id].melee ? 0 : s)),
    i.grenade && !r.previous.grenade && An(e, t),
    i.melee && t.meleeTimer === 0 && (t.meleeTimer = .65,
    t.invulnerable = 0,
    On(e, t, 45, 64, 230, `MELEE`)),
    Ft(t),
    r.previous = {
        ...i
    }
}
function Mn(e) {
    let t = e.guns[e.activeGun]
      , n = t && b[t.id];
    return !n || n.melee === !0 || t.ammo + t.reserve <= n.magazine
}
function Nn(e, t) {
    let n = null;
    Pt(t);
    for (let r of e.pickups)
        if (!(r.timer > 0 || Math.hypot(r.x - t.x, r.y - t.y) > 42)) {
            if (r.golden) {
                if (t.bot || (t.goldenTime ?? 0) > 0)
                    continue;
                t.goldenTime = 10
            } else if (r.kind === `health`) {
                if (t.hp >= 100)
                    continue;
                t.hp = 100
            } else if (r.kind === `fuel`) {
                let e = t;
                if ((e.boostTime ?? 0) > 0)
                    continue;
                t.fuel = 100,
                e.boostTime = 25
            } else if (r.kind === `grenade`) {
                let e = r.grenade ?? `frag`;
                if (Nt(t)[e] >= te[e].max)
                    continue;
                Lt(t, e, e === `frag` ? 2 : 1)
            } else {
                if (!t.input.pickup || !wt(e, t, r.kind) || r.lockedFor === t.id || t.bot && r.dropped && !Mn(t))
                    continue;
                let n = b[r.kind]
                  , i = r.gun ? {
                    ...r.gun
                } : bt(r.kind)
                  , a = t.guns.find(e => e.id === r.kind);
                if (a) {
                    if (n.melee) {
                        if (!xt(r.kind) || a.dual)
                            continue;
                        a.dual = !0
                    } else
                        xt(r.kind) && (a.dual = !0);
                    n.melee || (r.dropped ? a.reserve = Math.min(n.magazine * 8, a.reserve + i.ammo + i.reserve) : (a.reserve = Math.min(n.magazine * 8, a.reserve + n.magazine * 3),
                    a.ammo = n.magazine)),
                    a === t.guns[t.activeGun] && (t.reloadTimer = 0)
                } else {
                    let n = t.guns[t.activeGun];
                    xt(i.id) || delete i.dual,
                    t.guns[t.activeGun] = i,
                    t.reloadTimer = 0,
                    yn(e, t, n, !0)
                }
            }
            r.dropped ? (n ??= []).push(r) : r.timer = r.golden ? 30 : r.kind === `health` ? 10 : r.kind === `fuel` ? 12 : r.kind === `grenade` ? 15 : 18,
            w(e, {
                type: `pickup`,
                x: r.x,
                y: r.y,
                actor: t.id,
                text: r.kind,
                weapon: r.kind === `health` || r.kind === `fuel` || r.kind === `grenade` ? void 0 : r.kind,
                grenadeKind: r.kind === `grenade` ? r.grenade ?? `frag` : void 0
            })
        }
    n && (e.pickups = e.pickups.filter(e => !n.includes(e)))
}
function Pn(e, t) {
    let n = !1;
    for (let r of e.pickups)
        if (r.timer = Math.max(0, r.timer - t),
        r.dropped && (r.expires = (r.expires ?? 20) - t,
        r.expires <= 0 && (n = !0),
        r.lockedFor)) {
            let t = e.players.find(e => e.id === r.lockedFor);
            (!t || t.hp <= 0 || Math.hypot(t.x - r.x, t.y - r.y) > 80) && delete r.lockedFor
        }
    n && (e.pickups = e.pickups.filter(e => !e.dropped || (e.expires ?? 0) > 0))
}
function Fn(e, t, n) {
    e.vy += et * .78 * vt(t) * n;
    let r = e.x
      , i = e.y;
    e.x += e.vx * n;
    let a = e.radius + 2;
    for (let n of $e(t, Math.min(r, e.x) - a, i - a, Math.max(r, e.x) + a, i + a))
        i + e.radius <= n.y || i - e.radius >= n.y + n.h || e.x + e.radius > n.x && e.x - e.radius < n.x + n.w && (e.x = r < n.x ? n.x - e.radius : n.x + n.w + e.radius,
        e.vx *= -.58,
        e.bounces++);
    e.y += e.vy * n;
    for (let n of $e(t, e.x - a, Math.min(i, e.y) - a, e.x + a, Math.max(i, e.y) + a))
        e.x + e.radius <= n.x || e.x - e.radius >= n.x + n.w || (e.vy >= 0 && i + e.radius <= n.y + 1 && e.y + e.radius >= n.y ? (e.y = n.y - e.radius,
        e.vy *= -.48,
        e.vx *= .77,
        e.bounces++) : e.vy < 0 && i - e.radius >= n.y + n.h && e.y - e.radius <= n.y + n.h && (e.y = n.y + n.h + e.radius,
        e.vy *= -.5,
        e.bounces++));
    (e.x < 6 || e.x > t.width - 6) && (e.x = mt(e.x, 6, t.width - 6),
    e.vx *= -.6,
    e.bounces++),
    e.y < 6 && (e.y = 6,
    e.vy = Math.abs(e.vy))
}
function In(e, t) {
    if (!e.shielding)
        return !1;
    let n = Math.cos(e.aim)
      , r = Math.sin(e.aim)
      , i = Math.hypot(t.vx, t.vy) || 1;
    if ((t.vx * n + t.vy * r) / i < -.35 && (t.x - e.x) * n + (t.y - e.y) * r > -14)
        return !0;
    let a = e.guns[e.activeGun];
    return a?.dual === !0 && xt(a.id) && (t.vx * n + t.vy * r) / i > .35 && (t.x - e.x) * n + (t.y - e.y) * r < 14
}
function Ln(e, t) {
    let n = gt(e)
      , r = [];
    for (let i of e.projectiles) {
        if (i.life -= t,
        i.weapon === `grenade`) {
            if (Fn(i, n, t),
            i.grenadeKind === `mine`) {
                i.bounces > 0 || i.life <= 0 ? wn(e, i) : r.push(i);
                continue
            }
            i.life <= 0 ? i.grenadeKind === `gas` ? Tn(e, i) : Sn(e, i) : r.push(i);
            continue
        }
        if (i.weapon === `emp`) {
            let a = i.vx * t
              , o = i.vy * t;
            for (let t of e.players) {
                if (!Ot(e, i.owner, i.team, t, !0) || t.id === i.owner && i.life > 4.65)
                    continue;
                let n = i.radius + 14;
                Xt(i.x, i.y, a, o, t.x - n, t.y - n, n * 2, n * 2) !== null && ((t.empTime ?? 0) < 28 && w(e, {
                    type: `block`,
                    x: t.x,
                    y: t.y,
                    actor: i.owner,
                    target: t.id,
                    text: `EMP`,
                    weapon: `emp`
                }),
                t.empTime = 30)
            }
            e.mines?.length && (e.mines = e.mines.filter(t => {
                let n = i.radius + 8;
                return Xt(i.x, i.y, a, o, t.x - n, t.y - n, n * 2, n * 2) === null || (w(e, {
                    type: `mine`,
                    x: t.x,
                    y: t.y,
                    actor: i.owner,
                    text: `disabled`,
                    grenadeKind: `mine`
                }),
                !1)
            }
            )),
            i.x += a,
            i.y += o,
            i.life > 0 && i.x >= -i.radius && i.x <= n.width + i.radius && i.y >= -i.radius && i.y <= n.height + i.radius && r.push(i);
            continue
        }
        i.gravity && (i.vy += i.gravity * vt(n) * t);
        let a = i.vx * t, o = i.vy * t, s = 1.1, c, l;
        for (let e of $e(n, i.x - 1, i.y - 1, i.x + a + 1, i.y + o + 1)) {
            let t = Xt(i.x, i.y, a, o, e.x, e.y, e.w, e.h);
            t !== null && t < s && (s = t,
            c = void 0,
            l = e)
        }
        for (let t of e.players) {
            if (!Ot(e, i.owner, i.team, t, i.weapon === `saw` && i.bounces > 0))
                continue;
            let n = kt(t)
              , r = Xt(i.x, i.y, a, o, t.x - 14 - i.radius, n - i.radius, 28 + i.radius * 2, t.y + C - n + i.radius * 2);
            r !== null && r < s && (s = r,
            c = t,
            l = void 0)
        }
        let u = Math.min(1, s)
          , d = i.x + a * u
          , f = i.y + o * u;
        if (c && In(c, i)) {
            w(e, {
                type: `block`,
                x: d,
                y: f,
                actor: i.owner,
                target: c.id,
                weapon: i.weapon
            }),
            i.x = d,
            i.y = f,
            i.explosive && Sn(e, i);
            continue
        }
        if (l && s > 0 && s <= 1 && (i.ricochet ?? 0) > 0 && (!i.explosive || i.weapon === `saw`) && i.life > 0) {
            let e = a === 0 ? -1 / 0 : ((a > 0 ? l.x : l.x + l.w) - i.x) / a
              , t = o === 0 ? -1 / 0 : ((o > 0 ? l.y : l.y + l.h) - i.y) / o;
            i.x = d - a * .02,
            i.y = f - o * .02,
            e >= t && (i.vx = -i.vx),
            t >= e && (i.vy = -i.vy),
            i.ricochet = (i.ricochet ?? 1) - 1,
            i.weapon !== `saw` && (i.damage *= .8),
            i.bounces++,
            r.push(i);
            continue
        }
        i.x = d,
        i.y = f;
        let p = i.life <= 0 || i.x < 0 || i.x > n.width || i.y < 0 || i.y > n.height;
        s <= 1 || p ? i.explosive ? Sn(e, i) : c && bn(e, c, i.damage, i.owner, b[i.weapon].name) : r.push(i)
    }
    e.projectiles = r
}
function Rn(e) {
    return [...e.players].sort( (e, t) => t.score - e.score || t.kills - e.kills || e.deaths - t.deaths || e.name.localeCompare(t.name))
}
var zn = e => e.carrier === null && Math.hypot(e.x - e.homeX, e.y - e.homeY) < 1;
function Bn(e) {
    e.x = e.homeX,
    e.y = e.homeY,
    e.carrier = null,
    e.returnTimer = 0
}
function Vn(e, t) {
    if (e.config.mode === `ctf` && e.flags && e.teamScores) {
        for (let n of e.flags) {
            if (n.carrier) {
                let t = e.players.find(e => e.id === n.carrier);
                !t || t.hp <= 0 ? (t && (n.x = t.x,
                n.y = t.y),
                n.carrier = null,
                n.returnTimer = 15) : (n.x = t.x,
                n.y = t.y - 30)
            } else
                zn(n) || (n.returnTimer -= t,
                n.returnTimer <= 0 && (Bn(n),
                w(e, {
                    type: `pickup`,
                    x: n.x,
                    y: n.y,
                    text: `FLAG RETURNED`
                })));
            if (!n.carrier) {
                for (let t of e.players)
                    if (!(t.hp <= 0 || Math.hypot(t.x - n.x, t.y - n.y) > 44)) {
                        if (t.team === n.team)
                            zn(n) || (Bn(n),
                            w(e, {
                                type: `pickup`,
                                x: n.x,
                                y: n.y,
                                actor: t.id,
                                text: `FLAG RETURNED`
                            }));
                        else {
                            n.carrier = t.id,
                            n.returnTimer = 0,
                            w(e, {
                                type: `pickup`,
                                x: n.x,
                                y: n.y,
                                actor: t.id,
                                text: `FLAG TAKEN`
                            });
                            break
                        }
                    }
            }
        }
        for (let t of e.flags) {
            if (!t.carrier)
                continue;
            let n = e.players.find(e => e.id === t.carrier)
              , r = e.flags.find(e => e.team === n?.team);
            !n || !r || !zn(r) || Math.hypot(n.x - r.homeX, n.y - r.homeY) > 46 || (e.teamScores[n.team]++,
            n.score += 3,
            w(e, {
                type: `pickup`,
                x: r.homeX,
                y: r.homeY,
                actor: n.id,
                text: `FLAG CAPTURE ${e.teamScores[n.team]}/3`
            }),
            Bn(t))
        }
    }
}
function Hn(e) {
    let t = e.objective;
    if (t?.kind === `vip`) {
        for (let n of [0, 1]) {
            let r = e.players.find(e => e.id === t.vips[n]);
            if (r && r.team === n && r.hp > 0)
                continue;
            r && (r.vip = !1),
            t.vips[n] = null;
            let i = e.players.filter(e => e.team === n).sort( (e, t) => e.id.localeCompare(t.id));
            if (i.length)
                for (let r = 0; r < i.length; r++) {
                    let a = i[(t.rotation[n] + r) % i.length];
                    if (!(a.hp <= 0)) {
                        t.vips[n] = a.id,
                        t.rotation[n] += r,
                        a.vip = !0,
                        w(e, {
                            type: `objective`,
                            x: a.x,
                            y: a.y,
                            actor: a.id,
                            text: `${a.name} IS THE ${y[n]} VIP`
                        });
                        break
                    }
                }
        }
        for (let n of e.players)
            n.vip = t.vips[n.team] === n.id
    }
}
function Un(e, t, n, r, i) {
    let a = e.objective;
    if (a?.kind !== `bomb` || !e.teamScores)
        return;
    if (e.teamScores[t]++,
    a.lastResult = `${n} · ${y[t]} TAKES ROUND ${a.round}`,
    w(e, {
        type: `objective`,
        x: r,
        y: i,
        text: a.lastResult
    }),
    e.teamScores[t] >= a.target) {
        Gn(e);
        return
    }
    let o = At(gt(e));
    a.round++,
    a.attackers = 1 - a.attackers,
    Object.assign(a, {
        homeX: o[a.attackers].x,
        homeY: o[a.attackers].y,
        x: o[a.attackers].x,
        y: o[a.attackers].y,
        carrier: null,
        planted: !1,
        site: null,
        plantProgress: 0,
        defuseProgress: 0,
        fuse: 0,
        roundTimer: a.roundTime
    }),
    e.projectiles = [],
    e.mines = [],
    e.areas = [];
    for (let t of e.players)
        Gt(e, t)
}
function Wn(e, t) {
    let n = e.objective;
    if (n?.kind !== `bomb`)
        return;
    let r = (e, t, n, r=50) => e.hp > 0 && Math.hypot(e.x - t, e.y - n) < r;
    if (n.carrier) {
        let t = e.players.find(e => e.id === n.carrier);
        if (!t || t.hp <= 0 || t.team !== n.attackers) {
            let r = t?.x ?? n.x
              , i = Mt(gt(e), r, t?.y ?? n.y);
            i === null ? (n.x = n.homeX,
            n.y = n.homeY) : (n.x = r,
            n.y = i),
            n.carrier = null,
            n.plantProgress = 0,
            w(e, {
                type: `objective`,
                x: n.x,
                y: n.y,
                text: `BOMB DROPPED`
            })
        } else
            n.x = t.x,
            n.y = t.y
    }
    if (!n.carrier && !n.planted) {
        let t = e.players.find(e => e.team === n.attackers && r(e, n.x, n.y, 44));
        t && (n.carrier = t.id,
        w(e, {
            type: `objective`,
            x: t.x,
            y: t.y,
            actor: t.id,
            text: `${t.name} HAS THE BOMB`
        }))
    }
    if (n.carrier && !n.planted) {
        let i = e.players.find(e => e.id === n.carrier)
          , a = n.sites.findIndex(e => r(i, e.x, e.y));
        if (a >= 0) {
            if (n.plantProgress += t,
            n.plantProgress >= n.plantTime) {
                let t = n.sites[a];
                Object.assign(n, {
                    planted: !0,
                    site: a,
                    x: t.x,
                    y: t.y,
                    carrier: null,
                    plantProgress: n.plantTime,
                    fuse: n.fuseTime,
                    defuseProgress: 0
                }),
                i.score += 2,
                w(e, {
                    type: `objective`,
                    x: t.x,
                    y: t.y,
                    actor: i.id,
                    text: `BOMB PLANTED AT ${t.label}`
                })
            }
        } else
            n.plantProgress = 0
    }
    if (n.planted) {
        n.fuse = Math.max(0, n.fuse - t);
        let i = e.players.find(e => e.team !== n.attackers && r(e, n.x, n.y));
        if (n.defuseProgress = i ? n.defuseProgress + t : 0,
        i && n.defuseProgress >= n.defuseTime) {
            i.score += 2,
            Un(e, 1 - n.attackers, `BOMB DEFUSED`, n.x, n.y);
            return
        }
        if (n.fuse <= 0) {
            w(e, {
                type: `explosion`,
                x: n.x,
                y: n.y,
                text: `BOMB`
            }),
            Un(e, n.attackers, `BOMB DETONATED`, n.x, n.y);
            return
        }
    } else if (n.roundTimer = Math.max(0, n.roundTimer - t),
    n.roundTimer <= 0) {
        Un(e, 1 - n.attackers, `TIME UP`, n.x, n.y);
        return
    }
    for (let t of e.players)
        t.carryingBomb = n.carrier === t.id
}
function Gn(e) {
    if (e.phase = `finished`,
    e.config.mode === `survival`)
        e.winner = e.players.some(e => !e.bot && e.hp > 0) ? `survivors` : `swarm`;
    else if (St(e)) {
        let t = e.config.mode === `teams` ? [0, 0] : [...e.teamScores ?? [0, 0]];
        if (e.config.mode === `teams`)
            for (let n of e.players)
                t[n.team] += n.score;
        e.winner = t[0] === t[1] ? null : t[0] > t[1] ? `team-0` : `team-1`
    } else {
        let t = Rn(e);
        e.winner = t[0] && (!t[1] || t[0].score !== t[1].score) ? t[0].id : null
    }
    for (let t of e.players)
        t.jetting = !1,
        t.firing = !1
}
function Kn(e, t) {
    let n = Tt(e);
    if (e.config.mode === `survival`) {
        if (n.hadHuman && !e.players.some(e => !e.bot && e.hp > 0)) {
            Gn(e);
            return
        }
        let r = Math.max(0, 12 - e.players.filter(e => !e.bot).length);
        if (r > 0 && e.config.bots > 0 && !e.players.some(e => e.bot && e.hp > 0) && (n.waveDelay < 0 && (n.waveDelay = 3),
        n.waveDelay -= t,
        n.waveDelay <= 0)) {
            e.wave++,
            n.waveDelay = -1;
            let t = Math.min(11, r, e.config.bots, e.wave + 1);
            for (let t of e.players.filter(e => e.bot))
                Gt(e, t);
            for (; e.players.filter(e => e.bot).length < t; ) {
                let t = e.players.filter(e => e.bot).length;
                qt(e, `bot-${t + 1}`, ue(e.players), {
                    bot: !0,
                    color: t + 1,
                    team: 1
                })
            }
            for (let t of e.players.filter(e => !e.bot))
                if (t.hp <= 0)
                    Gt(e, t);
                else {
                    t.hp = Math.min(100, t.hp + 35),
                    Pt(t),
                    Lt(t, `frag`, 1);
                    for (let e of t.guns)
                        b[e.id].melee || (e.reserve = Math.min(b[e.id].magazine * 8, e.reserve + b[e.id].magazine * 2))
                }
        }
    } else {
        let t = e.config.mode
          , n = e.objective;
        if (t === `ctf` ? e.teamScores?.some(e => e >= 3) : t === `vip` || t === `bomb` ? e.teamScores?.some(e => e >= (n?.target ?? 1 / 0)) : t === `teams` ? [0, 1].some(t => e.players.filter(e => e.team === t).reduce( (e, t) => e + t.score, 0) >= e.config.killLimit) : e.players.some(t => t.score >= e.config.killLimit)) {
            Gn(e);
            return
        }
    }
    e.time <= 0 && Gn(e)
}
function qn(e, t) {
    if (e.phase !== `playing` || !Number.isFinite(t) || t <= 0)
        return;
    let n = Math.min(t, .1)
      , r = Math.ceil(n / (1 / 120))
      , i = n / r;
    e.tick++;
    let a = Tt(e);
    for (let t = 0; t < r && e.phase === `playing`; t++) {
        e.time = Math.max(0, e.time - i),
        a.clock += i,
        a.navBudget = Math.min(rn, a.navBudget + nn * i),
        Pn(e, i),
        Hn(e);
        for (let t of e.players) {
            let n = t;
            n.boostTime &&= Math.max(0, n.boostTime - i),
            t.empTime &&= Math.max(0, t.empTime - i),
            t.hp <= 0 ? e.config.mode !== `survival` && (t.respawnTimer -= i,
            t.respawnTimer <= 0 && Gt(e, t)) : (t.bot && en(e, t, i),
            jn(e, t, i),
            t.hp > 0 && (pn(e, t, i),
            Nn(e, t)))
        }
        Ln(e, i),
        En(e, i),
        Vn(e, i),
        Wn(e, i),
        e.phase === `playing` && Kn(e, i)
    }
}
var Jn = e => `${Math.max(0, Math.ceil(e))}s`;
function Yn(e, t) {
    let n = e.players.find(e => e.id === t)
      , r = e.teamScores ?? [0, 0]
      , i = n?.team ?? 0
      , a = y[i] ?? `OBEROI`
      , o = `${y[0]} ${r[0] ?? 0} - ${r[1] ?? 0} ${y[1]}`;
    switch (e.config.mode) {
    case `teams`:
        {
            let t = [0, 1].map(t => e.players.filter(e => e.team === t).reduce( (e, t) => e + t.score, 0));
            return {
                label: `TEAM DEATHMATCH`,
                value: `${y[0]} ${t[0]} - ${t[1]} ${y[1]}`,
                detail: `First squad to ${e.config.killLimit} · You fight for ${a}`
            }
        }
    case `ctf`:
        {
            let n = e.flags?.find(e => e.team === i)
              , r = e.flags?.find(e => e.team !== i);
            return {
                label: `CAPTURE THE FLAG`,
                value: o,
                detail: r?.carrier === t ? `You have the flag — bring it home` : n?.carrier ? `Your flag is taken — chase the carrier` : n && !zn(n) ? `Your flag is down — touch it to return it` : r?.carrier ? `A teammate has their flag — escort them` : `Steal the enemy flag · first to 3 captures`
            }
        }
    case `survival`:
        {
            let t = e.players.filter(e => e.bot && e.hp > 0).length;
            return {
                label: `SURVIVAL`,
                value: `WAVE ${e.wave}`,
                detail: t > 0 ? `${t} ${t === 1 ? `enemy` : `enemies`} left` : e.config.bots > 0 ? `Next wave incoming` : `Practice round`
            }
        }
    case `vip`:
        {
            let t = e.objective?.kind === `vip` ? e.objective : null
              , r = e.players.find(e => e.id === t?.vips[i])
              , a = e.players.find(e => e.id === t?.vips[1 - i]);
            return {
                label: `VIP`,
                value: o,
                detail: `${n?.vip ? `You are the VIP — stay alive` : `Protect ${r?.name ?? `—`} · Hunt ${a?.name ?? `—`}`} · first to ${t?.target ?? 0}`
            }
        }
    case `bomb`:
        {
            let n = e.objective?.kind === `bomb` ? e.objective : null;
            if (!n)
                return {
                    label: `PLANT THE BOMB`,
                    value: o,
                    detail: ``
                };
            let r = i === n.attackers, a = r ? `ATTACK` : `DEFEND`, s = n.sites.map(e => e.label).join(`/`), c;
            if (n.planted) {
                let e = n.sites[n.site ?? 0]?.label ?? `?`;
                c = n.defuseProgress > 0 ? `Defusing ${Math.floor(n.defuseProgress / n.defuseTime * 100)}% · ${Jn(n.fuse)}` : `Bomb planted at ${e} · ${Jn(n.fuse)} · ${r ? `guard it` : `defuse it`}`
            } else
                c = n.carrier === t ? n.plantProgress > 0 ? `Planting ${Math.floor(n.plantProgress / n.plantTime * 100)}%` : `You carry the bomb — plant at ${s} · ${Jn(n.roundTimer)}` : n.carrier ? `${e.players.find(e => e.id === n.carrier)?.name ?? `Attacker`} has the bomb · ${Jn(n.roundTimer)}` : `${r ? `Grab the bomb and plant it` : `Guard sites ${s}`} · ${Jn(n.roundTimer)}`;
            return {
                label: `BOMB · ROUND ${n.round} · ${a}`,
                value: o,
                detail: `${c} · first to ${n.target}`
            }
        }
    default:
        {
            let r = Rn(e)[0]
              , i = r ? r.id === t ? `You lead the match` : `Leader ${r.name} · ${r.score}` : `Waiting for the OBEROI`;
            return {
                label: `DEATHMATCH`,
                value: `${n?.score ?? r?.score ?? 0}/${e.config.killLimit}`,
                detail: i
            }
        }
    }
}
var Xn = {
    maxPlayers: 12,
    maxRooms: 32,
    simulationHz: 60,
    snapshotHz: 20,
    inputTimeoutMs: 300,
    resumeGraceMs: 3e4,
    maxReservations: 256,
    chatMaxChars: 120,
    chatHistory: 30,
    chatBurst: 5,
    chatWindowMs: 5e3,
    roomListMax: 50,
    quickMatchBots: 5,
    quickRestartMs: 1e4,
    quickVoteMs: 8e3,
    quickVoteEarlyMs: 1500,
    quickVoteChoices: 3,
    passwordMaxChars: 32,
    passwordAttempts: 5,
    passwordWindowMs: 6e4
}
  , Zn = [`hat`, `hair`, `face`, `skin`, `shirt`, `pants`, `boots`]
  , Qn = `jetpack-resume`
  , $n = {
    stickSize: `medium`,
    placement: `floating`,
    aim: `normal`,
    assist: !0,
    moveSensitivity: .8,
    aimSensitivity: .8,
    haptics: !0
};
function er(e) {
    let t = typeof e == `object` && e ? e : {}
      , n = (e, t, n) => t.includes(e) ? e : n;
    return {
        stickSize: n(t.stickSize, [`small`, `medium`, `large`], $n.stickSize),
        placement: n(t.placement, [`fixed`, `floating`], $n.placement),
        aim: n(t.aim, [`steady`, `normal`, `quick`], $n.aim),
        assist: typeof t.assist == `boolean` ? t.assist : $n.assist,
        moveSensitivity: tr(t.moveSensitivity),
        aimSensitivity: tr(t.aimSensitivity),
        haptics: typeof t.haptics == `boolean` ? t.haptics : $n.haptics
    }
}
function tr(e) {
    return typeof e == `number` && Number.isFinite(e) ? Math.round(Math.max(.5, Math.min(1.5, e)) * 100) / 100 : .8
}
var nr = `jetpack-profile`
  , rr = 40
  , ir = 1500
  , ar = 300
  , T = {
    kind: `free`
}
  , or = e => ({
    kind: `rank`,
    rank: e
})
  , sr = e => ({
    kind: `coins`,
    price: e
})
  , cr = {
    kind: `challenge`
}
  , lr = {
    hat: [{
        label: `Oberoi headset`,
        color: `#20202a`,
        accent: `#b884ff`,
        unlock: T
    }, {
        label: `Bare head`,
        color: `#00000000`,
        unlock: T
    }, {
        label: `Oberoi bandana`,
        color: `#9f61e7`,
        accent: `#6631ad`,
        unlock: T
    }, {
        label: `Amber bandana`,
        color: `#ffb454`,
        accent: `#b96d24`,
        unlock: T
    }, {
        label: `Oberoi cap`,
        color: `#8651ce`,
        accent: `#eee7ff`,
        unlock: or(2)
    }, {
        label: `Studio cap`,
        color: `#34313d`,
        accent: `#c0b4d7`,
        unlock: sr(40)
    }, {
        label: `Builder bucket`,
        color: `#5e4978`,
        accent: `#c4a3ed`,
        unlock: sr(60)
    }, {
        label: `Stream headset`,
        color: `#e6e0ee`,
        accent: `#ffb454`,
        unlock: or(4)
    }, {
        label: `Night beanie`,
        color: `#292238`,
        accent: `#b584ff`,
        unlock: sr(80)
    }, {
        label: `Pixel visor`,
        color: `#252332`,
        accent: `#8be0c3`,
        unlock: or(7)
    }, {
        label: `Golden cap`,
        color: `#dca950`,
        accent: `#fff2bd`,
        unlock: or(12)
    }, {
        label: `Champion cap`,
        color: `#2c1f45`,
        accent: `#ffc463`,
        unlock: cr
    }, {
        label: `Clutch headset`,
        color: `#ffb454`,
        accent: `#6433ae`,
        unlock: cr
    }, {
        label: `Lily beanie`,
        color: `#c7a3f2`,
        accent: `#7442ab`,
        unlock: cr
    }, {
        label: `Neon headset`,
        color: `#182c32`,
        accent: `#57ffd9`,
        unlock: T
    }, {
        label: `Frost beanie`,
        color: `#e6f2ff`,
        accent: `#69bdff`,
        unlock: T
    }, {
        label: `Ember cap`,
        color: `#e45343`,
        accent: `#ffe2a6`,
        unlock: T
    }],
    hair: [{
        label: `Oberoi quiff`,
        color: `#211a20`,
        unlock: T
    }, {
        label: `Oberoi crop`,
        color: `#30232a`,
        unlock: T
    }, {
        label: `Bald`,
        color: `#00000000`,
        unlock: T
    }, {
        label: `Curly`,
        color: `#231b26`,
        unlock: T
    }, {
        label: `Spiky`,
        color: `#32232b`,
        unlock: sr(30)
    }, {
        label: `Mohawk`,
        color: `#251c32`,
        unlock: sr(50)
    }, {
        label: `Long`,
        color: `#332335`,
        unlock: sr(50)
    }, {
        label: `Silver`,
        color: `#c9c3d0`,
        unlock: or(8)
    }],
    face: [{
        label: `Oberoi frames`,
        color: `#242132`,
        accent: `#b795f4`,
        unlock: T
    }, {
        label: `Clean shaven`,
        color: `#231d25`,
        unlock: T
    }, {
        label: `Oberoi grin`,
        color: `#241c25`,
        unlock: T
    }, {
        label: `Moustache`,
        color: `#35232a`,
        unlock: T
    }, {
        label: `Focused`,
        color: `#282030`,
        unlock: or(2)
    }, {
        label: `Clutch scar`,
        color: `#9c5751`,
        unlock: or(3)
    }, {
        label: `Dark shades`,
        color: `#17151e`,
        accent: `#a28cbf`,
        unlock: sr(70)
    }, {
        label: `Pixel visor`,
        color: `#373048`,
        accent: `#8de2c6`,
        unlock: or(5)
    }, {
        label: `Stream mask`,
        color: `#373141`,
        accent: `#c1b5d0`,
        unlock: or(9)
    }, {
        label: `Victory shades`,
        color: `#1b1424`,
        accent: `#ffb454`,
        unlock: cr
    }],
    skin: [{
        label: `Tan`,
        color: `#d9a679`,
        unlock: T
    }, {
        label: `Light`,
        color: `#f1c9a5`,
        unlock: T
    }, {
        label: `Wheat`,
        color: `#c68f5e`,
        unlock: T
    }, {
        label: `Brown`,
        color: `#a06a42`,
        unlock: T
    }, {
        label: `Deep brown`,
        color: `#7a4a2a`,
        unlock: T
    }, {
        label: `Dark`,
        color: `#55331d`,
        unlock: T
    }],
    shirt: [{
        label: `Oberoi hoodie`,
        color: `#24212d`,
        accent: `#a96cf3`,
        unlock: T
    }, {
        label: `Lilyville hoodie`,
        color: `#7442ab`,
        accent: `#b88ae9`,
        unlock: T
    }, {
        label: `Amber hoodie`,
        color: `#df9c46`,
        accent: `#95652c`,
        unlock: T
    }, {
        label: `Builder jersey`,
        color: `#357b70`,
        accent: `#86ceaf`,
        unlock: or(2)
    }, {
        label: `Studio tee`,
        color: `#77717f`,
        accent: `#47414f`,
        unlock: sr(40)
    }, {
        label: `Night stream`,
        color: `#343052`,
        accent: `#8972bf`,
        unlock: sr(40)
    }, {
        label: `Cloud hoodie`,
        color: `#e8e3ee`,
        accent: `#aa94bd`,
        unlock: or(6)
    }, {
        label: `Raid jersey`,
        color: `#9b3f7e`,
        accent: `#3d2640`,
        unlock: sr(100)
    }, {
        label: `Oberoi elite`,
        color: `#211f29`,
        accent: `#dcb263`,
        unlock: or(10)
    }, {
        label: `Lilyville jersey`,
        color: `#8a4fd0`,
        accent: `#ffc463`,
        unlock: cr
    }, {
        label: `AO champion hoodie`,
        color: `#3b1f66`,
        accent: `#ffcf6b`,
        unlock: cr
    }, {
        label: `Neon Oberoi jacket`,
        color: `#20343e`,
        accent: `#57ffd9`,
        unlock: T
    }, {
        label: `Frost Oberoi hoodie`,
        color: `#e6f2ff`,
        accent: `#69bdff`,
        unlock: T
    }, {
        label: `Ember Oberoi jersey`,
        color: `#e45343`,
        accent: `#ffe2a6`,
        unlock: T
    }],
    pants: [{
        label: `Graphite joggers`,
        color: `#36313e`,
        unlock: T
    }, {
        label: `Street joggers`,
        color: `#504257`,
        accent: `#92809f`,
        unlock: T
    }, {
        label: `Cargo joggers`,
        color: `#76685c`,
        unlock: T
    }, {
        label: `Builder joggers`,
        color: `#427669`,
        accent: `#9cc5ad`,
        unlock: or(2)
    }, {
        label: `Studio joggers`,
        color: `#77717e`,
        accent: `#47414e`,
        unlock: sr(40)
    }, {
        label: `Midnight joggers`,
        color: `#292632`,
        unlock: sr(60)
    }, {
        label: `Neon track joggers`,
        color: `#18252e`,
        accent: `#57ffd9`,
        unlock: T
    }, {
        label: `Frost joggers`,
        color: `#344b69`,
        accent: `#bfe9ff`,
        unlock: T
    }, {
        label: `Ember joggers`,
        color: `#322b38`,
        accent: `#ff8060`,
        unlock: T
    }],
    boots: [{
        label: `Oberoi sneakers`,
        color: `#eee9f3`,
        unlock: T
    }, {
        label: `Night sneakers`,
        color: `#302b3c`,
        unlock: T
    }, {
        label: `Amber sneakers`,
        color: `#edcf9a`,
        unlock: sr(30)
    }, {
        label: `Lilyville sneakers`,
        color: `#8d5db5`,
        unlock: or(3)
    }, {
        label: `Clutch sneakers`,
        color: `#e99450`,
        unlock: sr(90)
    }, {
        label: `Rocket sneakers`,
        color: `#a565ff`,
        unlock: cr
    }, {
        label: `Neon sneakers`,
        color: `#57ffd9`,
        unlock: T
    }, {
        label: `Frost sneakers`,
        color: `#e6f2ff`,
        unlock: T
    }, {
        label: `Ember sneakers`,
        color: `#ff8060`,
        unlock: T
    }]
}
  , ur = {
    hat: `Headgear`,
    hair: `Hair`,
    face: `Face`,
    skin: `Skin`,
    shirt: `Top`,
    pants: `Joggers`,
    boots: `Sneakers`
}
  , dr = Object.freeze({
    hat: 0,
    hair: 0,
    face: 0,
    skin: 0,
    shirt: 0,
    pants: 0,
    boots: 0
})
  , fr = [{
    title: `Oberoi Rookie`,
    short: `ROOK`,
    xp: 0
}, {
    title: `Chat Regular`,
    short: `REG`,
    xp: 100
}, {
    title: `Squadmate`,
    short: `SQD`,
    xp: 250
}, {
    title: `Block Builder`,
    short: `BLD`,
    xp: 450
}, {
    title: `SMP Explorer`,
    short: `SMP`,
    xp: 700
}, {
    title: `Clutch Player`,
    short: `CLT`,
    xp: 1e3
}, {
    title: `Raid Captain`,
    short: `RAID`,
    xp: 1400
}, {
    title: `SMP Veteran`,
    short: `VET`,
    xp: 1900
}, {
    title: `Highlight Maker`,
    short: `HYPE`,
    xp: 2500
}, {
    title: `Stream Legend`,
    short: `LIVE`,
    xp: 3200
}, {
    title: `Oberoi Captain`,
    short: `CPT`,
    xp: 4e3
}, {
    title: `Lilyville Legend`,
    short: `LILY`,
    xp: 5e3
}, {
    title: `SMP Champion`,
    short: `CHMP`,
    xp: 6200
}, {
    title: `Oberoi Ace`,
    short: `ACE`,
    xp: 7600
}, {
    title: `Oberoi Elite`,
    short: `ELTE`,
    xp: 9200
}, {
    title: `Oberoi Legend`,
    short: `LEG`,
    xp: 11e3
}];
function pr(e) {
    let t = Number.isFinite(e) ? Math.max(0, Math.floor(e)) : 0
      , n = 0;
    for (; n + 1 < fr.length && t >= fr[n + 1].xp; )
        n++;
    let r = fr[n]
      , i = fr[n + 1];
    return {
        level: n + 1,
        title: r.title,
        short: r.short,
        minXp: r.xp,
        nextXp: i?.xp ?? null,
        progress: i ? (t - r.xp) / (i.xp - r.xp) : 1
    }
}
var mr = (e, t=1e9) => typeof e == `number` && Number.isFinite(e) ? Math.min(t, Math.max(0, Math.floor(e))) : 0
  , hr = () => Array.from(globalThis.crypto.getRandomValues(new Uint8Array(8)), e => e.toString(16).padStart(2, `0`)).join(``);
function gr(e) {
    return typeof e == `string` && [...e.replace(/[\x00-\x1f\x7f<>​-‏‪-‮⁠-⁯﻿]/gu, ``).trim().replace(/\s+/g, ` `)].slice(0, 16).join(``).trim() || null
}
function _r(e) {
    let t = typeof e == `object` && e ? e : {}
      , n = {
        ...dr
    };
    for (let e of Zn) {
        let r = t[e];
        Number.isInteger(r) && r >= 0 && r < lr[e].length && (n[e] = r)
    }
    return n
}
var vr = (e, t) => `${e}:${t}`;
function yr(e, t, n) {
    let r = lr[t]?.[n];
    if (!r)
        return {
            unlocked: !1,
            reason: `missing`
        };
    let {unlock: i} = r;
    return i.kind === `free` ? {
        unlocked: !0,
        reason: `free`
    } : i.kind === `rank` ? pr(e.xp).level >= i.rank ? {
        unlocked: !0,
        reason: `rank`
    } : {
        unlocked: !1,
        reason: `rank`,
        rank: i.rank,
        title: fr[i.rank - 1]?.title ?? ``
    } : i.kind === `challenge` ? e.unlocks.includes(vr(t, n)) ? {
        unlocked: !0,
        reason: `owned`
    } : {
        unlocked: !1,
        reason: `challenge`,
        challenges: ni({
            kind: `cosmetic`,
            part: t,
            index: n
        })
    } : e.unlocks.includes(vr(t, n)) ? {
        unlocked: !0,
        reason: `owned`
    } : {
        unlocked: !1,
        reason: `coins`,
        price: i.price,
        affordable: e.coins >= i.price
    }
}
var br = (e, t, n) => yr(e, t, n).unlocked;
function xr(e, t, n, r) {
    let i = yr(e, t, n);
    return i.unlocked ? {
        ok: !1,
        error: `Already unlocked.`
    } : i.reason === `missing` ? {
        ok: !1,
        error: `Unknown item.`
    } : i.reason === `rank` ? {
        ok: !1,
        error: `Reach ${i.title} to unlock.`
    } : i.reason === `challenge` ? {
        ok: !1,
        error: `Earned by completing a daily Oberoi challenge.`
    } : i.affordable ? (e.coins -= i.price,
    e.unlocks.push(vr(t, n)),
    kr(e, r),
    {
        ok: !0
    }) : {
        ok: !1,
        error: `Needs ${i.price} coins.`
    }
}
function Sr(e, t, n, r) {
    let i = yr(e, t, n);
    return i.unlocked ? (e.avatar = {
        ...e.avatar,
        [t]: n
    },
    kr(e, r),
    {
        ok: !0
    }) : {
        ok: !1,
        error: i.reason === `missing` ? `Unknown item.` : i.reason === `rank` ? `Reach ${i.title} to unlock.` : i.reason === `challenge` ? `Earned by completing a daily Oberoi challenge.` : `Unlock for ${i.price} coins.`
    }
}
function Cr(e) {
    let t = _r(e.avatar);
    for (let n of Zn)
        br(e, n, t[n]) || (t[n] = dr[n]);
    return t
}
function wr() {
    return {
        version: 2,
        guestId: hr(),
        name: `AO Fan`,
        color: 0,
        volume: .32,
        touch: !1,
        controls: {
            ...$n
        },
        avatar: {
            ...dr
        },
        xp: 0,
        coins: 0,
        matches: 0,
        kills: 0,
        deaths: 0,
        wins: 0,
        bestWave: 0,
        unlocks: [],
        awarded: [],
        friends: [],
        createdAt: Date.now(),
        pose: 0,
        challenges: ci(),
        challengesDone: 0
    }
}
function Tr(e) {
    if (typeof e != `object` || !e)
        return null;
    let t = e
      , n = gr(t.name);
    return !n || typeof t.id != `string` || !/^[a-f0-9]{16}$/.test(t.id) ? null : {
        id: t.id,
        name: n,
        color: mr(t.color, v.length - 1),
        avatar: _r(t.avatar),
        favorite: t.favorite === !0,
        addedAt: mr(t.addedAt, 864e13),
        lastSeen: mr(t.lastSeen, 864e13),
        lastRoom: typeof t.lastRoom == `string` && /^[A-Z2-9]{5}$/.test(t.lastRoom) ? t.lastRoom : null,
        matches: mr(t.matches)
    }
}
function Er(e) {
    let t = wr();
    if (typeof e != `object` || !e || Array.isArray(e))
        return t;
    let n = e;
    return {
        ...t,
        guestId: typeof n.guestId == `string` && /^[a-f0-9]{16}$/.test(n.guestId) ? n.guestId : t.guestId,
        name: n.name === `Rookie` ? t.name : gr(n.name) ?? t.name,
        color: Number.isInteger(n.color) && n.color >= 0 && n.color < v.length ? n.color : 0,
        volume: typeof n.volume == `number` && Number.isFinite(n.volume) ? Math.min(1, Math.max(0, n.volume)) : t.volume,
        touch: n.touch === !0,
        controls: er(n.controls),
        avatar: _r(n.avatar),
        xp: mr(n.xp),
        coins: mr(n.coins),
        matches: mr(n.matches),
        kills: mr(n.kills),
        deaths: mr(n.deaths),
        wins: mr(n.wins),
        bestWave: mr(n.bestWave, 1e4),
        unlocks: Array.isArray(n.unlocks) ? [...new Set(n.unlocks.filter(e => typeof e == `string` && /^[a-z]+:\d+$/.test(e) && Kr(e)))] : [],
        awarded: Array.isArray(n.awarded) ? n.awarded.filter(e => typeof e == `string` && e.length <= 80).slice(-100) : [],
        friends: Array.isArray(n.friends) ? n.friends.map(Tr).filter(e => e !== null).slice(0, rr) : [],
        createdAt: mr(n.createdAt, 864e13) || t.createdAt,
        pose: Number.isInteger(n.pose) && n.pose >= 0 && n.pose < Br.length ? n.pose : 0,
        challenges: li(n.challenges),
        challengesDone: mr(n.challengesDone, 1e6)
    }
}
function Dr() {
    try {
        return typeof localStorage > `u` ? null : localStorage
    } catch {
        return null
    }
}
function Or(e=Dr()) {
    let t = null;
    try {
        t = JSON.parse(e?.getItem(`jetpack-profile`) || `null`)
    } catch {
        t = null
    }
    let n = Er(t);
    return e && (t === null || t.version !== 2) && kr(n, e),
    n
}
function kr(e, t=Dr()) {
    if (!t)
        return !1;
    try {
        return t.setItem(nr, JSON.stringify(e)),
        !0
    } catch {
        return !1
    }
}
var Ar = new WeakMap;
function jr(e) {
    let t = e.matchId;
    if (typeof t == `string` && t)
        return t.slice(0, 64);
    let n = Ar.get(e);
    return n || (n = `local-${hr()}`,
    Ar.set(e, n)),
    n
}
function Mr(e, t) {
    let n = e.players.find(e => e.id === t);
    if (!n || e.winner === null)
        return !1;
    if (e.winner === t)
        return !0;
    if (e.winner === `survivors`)
        return !n.bot;
    let r = /^team-(\d+)$/.exec(e.winner);
    return r !== null && Number(r[1]) === n.team && e.config.mode !== `ffa`
}
function Nr(e, t, n, r={}) {
    if (t.phase !== `finished`)
        return null;
    let i = t.players.find(e => e.id === n);
    if (!i)
        return null;
    let a = (r.matchKey ?? jr(t)).slice(0, 80)
      , o = pr(e.xp)
      , s = mr(i.kills, 500)
      , c = mr(i.deaths, 500)
      , l = Mr(t, n)
      , u = t.config.mode === `survival` ? mr(t.wave, 1e4) : 0;
    if (e.awarded.includes(a))
        return {
            key: a,
            duplicate: !0,
            xp: 0,
            coins: 0,
            kills: s,
            deaths: c,
            won: l,
            wave: u,
            rankBefore: o,
            rankAfter: o,
            rankUp: !1,
            unlocked: []
        };
    let d = Math.max(0, mr(i.score, 1e3) - s)
      , f = Math.min(ir, 25 + s * 10 + d * 15 + (l ? 60 : 0) + u * 20)
      , p = Math.min(ar, 5 + s * 2 + d * 3 + (l ? 15 : 0) + u * 3);
    e.xp += f,
    e.coins += p,
    e.matches += 1,
    e.kills += s,
    e.deaths += c,
    l && (e.wins += 1),
    e.bestWave = Math.max(e.bestWave, u),
    e.awarded = [...e.awarded, a].slice(-100);
    let m = pr(e.xp)
      , h = [];
    for (let e of Zn)
        lr[e].forEach( (t, n) => {
            t.unlock.kind === `rank` && t.unlock.rank > o.level && t.unlock.rank <= m.level && h.push(vr(e, n))
        }
        );
    return r.save !== !1 && kr(e, r.storage === void 0 ? Dr() : r.storage),
    {
        key: a,
        duplicate: !1,
        xp: f,
        coins: p,
        kills: s,
        deaths: c,
        won: l,
        wave: u,
        rankBefore: o,
        rankAfter: m,
        rankUp: m.level > o.level,
        unlocked: h
    }
}
function Pr(e, t, n, r=null, i=Date.now()) {
    for (let a of t) {
        if (a.id === n || a.bot || a.id.startsWith(`bot-`))
            continue;
        let t = gr(a.name);
        if (!t)
            continue;
        let o = e.friends.find(e => e.name.toLowerCase() === t.toLowerCase());
        o || (o = {
            id: hr(),
            name: t,
            color: 0,
            avatar: {
                ...dr
            },
            favorite: !1,
            addedAt: i,
            lastSeen: i,
            lastRoom: null,
            matches: 0
        },
        e.friends.push(o)),
        o.color = mr(a.color, v.length - 1),
        o.avatar = _r(a.avatar),
        o.lastSeen = i,
        o.matches += 1,
        r && /^[A-Z2-9]{5}$/.test(r) && (o.lastRoom = r)
    }
    for (e.friends.sort( (e, t) => Number(t.favorite) - Number(e.favorite) || t.lastSeen - e.lastSeen); e.friends.length > rr; ) {
        let t = e.friends.map(e => e.favorite).lastIndexOf(!1);
        e.friends.splice(t >= 0 ? t : e.friends.length - 1, 1)
    }
}
function Fr(e, t, n=Date.now()) {
    let r = gr(t);
    if (!r)
        return null;
    let i = e.friends.find(e => e.name.toLowerCase() === r.toLowerCase());
    if (i)
        return i.favorite = !0,
        i;
    if (e.friends.filter(e => e.favorite).length >= rr)
        return null;
    let a = {
        id: hr(),
        name: r,
        color: 0,
        avatar: {
            ...dr
        },
        favorite: !0,
        addedAt: n,
        lastSeen: 0,
        lastRoom: null,
        matches: 0
    };
    return e.friends.unshift(a),
    e.friends.length > rr && e.friends.splice(e.friends.map(e => e.favorite).lastIndexOf(!1), 1),
    a
}
function Ir(e, t, n) {
    let r = e.friends.find(e => e.id === t);
    return r ? (r.favorite = n,
    !0) : !1
}
function Lr(e, t) {
    let n = e.friends.length;
    return e.friends = e.friends.filter(e => e.id !== t),
    e.friends.length !== n
}
function Rr(e) {
    return {
        name: e.name,
        color: e.color,
        avatar: Cr(e)
    }
}
var zr = e => (e.deaths ? e.kills / e.deaths : e.kills).toFixed(2)
  , Br = [{
    id: `salute`,
    label: `Oberoi salute`,
    unlock: T
}, {
    id: `wave`,
    label: `Big wave`,
    unlock: T
}, {
    id: `point`,
    label: `Camera point`,
    unlock: or(3)
}, {
    id: `flex`,
    label: `Victory flex`,
    unlock: cr
}, {
    id: `hover`,
    label: `Jetpack hover`,
    unlock: cr
}, {
    id: `trophy`,
    label: `Trophy lift`,
    unlock: cr
}]
  , Vr = e => `pose:${e}`;
function Hr(e, t) {
    let n = Br[t];
    if (!n)
        return {
            unlocked: !1,
            reason: `missing`
        };
    let {unlock: r} = n;
    return r.kind === `free` ? {
        unlocked: !0,
        reason: `free`
    } : r.kind === `rank` ? pr(e.xp).level >= r.rank ? {
        unlocked: !0,
        reason: `rank`
    } : {
        unlocked: !1,
        reason: `rank`,
        rank: r.rank,
        title: fr[r.rank - 1]?.title ?? ``
    } : r.kind === `challenge` ? e.unlocks.includes(Vr(t)) ? {
        unlocked: !0,
        reason: `owned`
    } : {
        unlocked: !1,
        reason: `challenge`,
        challenges: ni({
            kind: `pose`,
            index: t
        })
    } : {
        unlocked: !1,
        reason: `missing`
    }
}
function Ur(e, t, n) {
    let r = Hr(e, t);
    return r.unlocked ? (e.pose = t,
    kr(e, n),
    {
        ok: !0
    }) : {
        ok: !1,
        error: r.reason === `rank` ? `Reach ${r.title} to unlock.` : r.reason === `challenge` ? `Earned by completing a daily Oberoi challenge.` : `Unknown pose.`
    }
}
var Wr = e => (Hr(e, e.pose).unlocked ? Br[e.pose] : Br[0]).id;
function Gr(e) {
    let t = 2166136261;
    for (let n = 0; n < e.length; n++)
        t = Math.imul(t ^ e.charCodeAt(n), 16777619);
    return Br[(t >>> 0) % Br.length].id
}
function Kr(e) {
    let[t,n] = e.split(`:`)
      , r = Number(n);
    if (t === `pose`)
        return Br[r]?.unlock.kind === `challenge`;
    if (!(t in lr))
        return !1;
    let i = lr[t][r]?.unlock.kind;
    return i === `coins` || i === `challenge`
}
var qr = (e, t) => {
    let n = lr[e].findIndex(e => e.label === t);
    if (n < 0)
        throw Error(`Unknown challenge reward ${e}:${t}`);
    return {
        kind: `cosmetic`,
        part: e,
        index: n
    }
}
  , Jr = e => ({
    kind: `pose`,
    index: Br.findIndex(t => t.id === e)
})
  , Yr = e => {
    let t = d(e);
    return !!t && /lilyville/i.test(`${t.name} ${t.subtitle}`)
}
  , Xr = e => {
    let t = d(e);
    return !!t && /\bSMP\b/.test(t.name)
}
  , Zr = [`teams`, `ctf`, `vip`, `bomb`]
  , Qr = [{
    id: `lily-win`,
    title: `Lilyville defender`,
    detail: `Win a match on a Lilyville arena (3+ players)`,
    goal: 1,
    tally: `best`,
    group: `any`,
    reward: qr(`shirt`, `Lilyville jersey`),
    measure: e => e.won && e.players >= 3 && Yr(e.map) ? 1 : 0
}, {
    id: `jet-kills`,
    title: `Sky clutch`,
    detail: `Get 3 jetpack kills in one match`,
    goal: 3,
    tally: `best`,
    group: `any`,
    reward: Jr(`hover`),
    measure: e => e.jetKills
}, {
    id: `flag-caps`,
    title: `Flag runner`,
    detail: `Capture 2 flags`,
    goal: 2,
    tally: `total`,
    group: `objective`,
    reward: qr(`hat`, `Champion cap`),
    measure: e => e.mode === `ctf` ? e.flagCaptures : 0
}, {
    id: `ffa-top3`,
    title: `Podium finish`,
    detail: `Finish top 3 in Deathmatch (4+ players)`,
    goal: 1,
    tally: `best`,
    group: `any`,
    reward: qr(`face`, `Victory shades`),
    measure: e => +(e.mode === `ffa` && e.players >= 4 && e.placement >= 1 && e.placement <= 3)
}, {
    id: `streak-5`,
    title: `On a roll`,
    detail: `Reach a 5-kill streak`,
    goal: 5,
    tally: `best`,
    group: `any`,
    reward: Jr(`flex`),
    measure: e => e.bestStreak
}, {
    id: `kills-20`,
    title: `Oberoi Army duty`,
    detail: `Rack up 20 kills today`,
    goal: 20,
    tally: `total`,
    group: `any`,
    reward: qr(`boots`, `Rocket sneakers`),
    measure: e => e.kills
}, {
    id: `smp-tour`,
    title: `SMP tour`,
    detail: `Play 3 matches on Oberoi SMP arenas`,
    goal: 3,
    tally: `total`,
    group: `any`,
    reward: qr(`hat`, `Lily beanie`),
    measure: e => +!!Xr(e.map)
}, {
    id: `bomb-plant`,
    title: `Plant it`,
    detail: `Plant the bomb in Bomb mode`,
    goal: 1,
    tally: `total`,
    group: `objective`,
    reward: qr(`hat`, `Clutch headset`),
    measure: e => e.mode === `bomb` ? e.bombPlants : 0
}, {
    id: `win-2`,
    title: `Double up`,
    detail: `Win 2 matches (3+ players)`,
    goal: 2,
    tally: `total`,
    group: `any`,
    reward: Jr(`trophy`),
    measure: e => e.won && e.players >= 3 ? 1 : 0
}, {
    id: `survival-5`,
    title: `Hold the base`,
    detail: `Reach wave 5 in Survival`,
    goal: 5,
    tally: `best`,
    group: `objective`,
    reward: qr(`shirt`, `AO champion hoodie`),
    measure: e => e.mode === `survival` ? e.wave : 0
}, {
    id: `vip-down`,
    title: `VIP hunter`,
    detail: `Take down the enemy VIP`,
    goal: 1,
    tally: `total`,
    group: `objective`,
    reward: qr(`hat`, `Champion cap`),
    measure: e => e.mode === `vip` ? e.vipTakedowns : 0
}, {
    id: `team-win`,
    title: `Squad goals`,
    detail: `Win a team match (3+ players)`,
    goal: 1,
    tally: `best`,
    group: `any`,
    reward: qr(`shirt`, `Lilyville jersey`),
    measure: e => e.won && e.players >= 3 && Zr.includes(e.mode) ? 1 : 0
}]
  , $r = new Set(Qr.map(e => e.id))
  , ei = e => Qr.find(t => t.id === e)
  , ti = (e, t) => e.kind === `pose` ? t.kind === `pose` && e.index === t.index : t.kind === `cosmetic` && e.part === t.part && e.index === t.index;
function ni(e) {
    return Qr.filter(t => ti(t.reward, e)).map(e => e.id)
}
var ri = e => e.kind === `pose` ? Vr(e.index) : vr(e.part, e.index)
  , ii = e => e.kind === `pose` ? `${Br[e.index]?.label ?? `Pose`} pose` : lr[e.part][e.index]?.label ?? `Item`;
function ai(e=new Date) {
    return `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, `0`)}-${String(e.getDate()).padStart(2, `0`)}`
}
function oi(e=new Date) {
    let t = new Date(e.getFullYear(),e.getMonth(),e.getDate() + 1);
    return Math.max(0, t.getTime() - e.getTime())
}
function si(e=ai()) {
    let t = 2166136261;
    for (let n of `fleet-rush:${e}`)
        t = Math.imul(t ^ n.charCodeAt(0), 16777619);
    let n = () => {
        t = t + 1831565813 | 0;
        let e = Math.imul(t ^ t >>> 15, 1 | t);
        return e = e + Math.imul(e ^ e >>> 7, 61 | e) ^ e,
        ((e ^ e >>> 14) >>> 0) / 4294967296
    }
      , r = [...Qr];
    for (let e = r.length - 1; e > 0; e--) {
        let t = Math.floor(n() * (e + 1));
        [r[e],r[t]] = [r[t], r[e]]
    }
    let i = [];
    for (let e of r) {
        if (i.length >= 3)
            break;
        e.group === `objective` && i.some(e => e.group === `objective`) || i.push(e)
    }
    return i
}
function ci(e=``) {
    return {
        day: e,
        progress: {},
        done: [],
        lastMatch: ``
    }
}
function li(e) {
    if (typeof e != `object` || !e || Array.isArray(e))
        return ci();
    let t = e
      , n = typeof t.day == `string` && /^\d{4}-\d{2}-\d{2}$/.test(t.day) ? t.day : ``
      , r = {};
    if (typeof t.progress == `object` && t.progress !== null && !Array.isArray(t.progress))
        for (let[e,n] of Object.entries(t.progress)) {
            let t = ei(e);
            t && (r[e] = mr(n, t.goal))
        }
    let i = Array.isArray(t.done) ? [...new Set(t.done.filter(e => typeof e == `string` && $r.has(e)))] : []
      , a = typeof t.lastMatch == `string` ? t.lastMatch.slice(0, 80) : ``;
    return n ? {
        day: n,
        progress: r,
        done: i,
        lastMatch: a
    } : ci()
}
function ui(e, t=new Date) {
    let n = ai(t);
    return e.challenges.day !== n && (e.challenges = ci(n),
    !0)
}
function di(e, t=new Date) {
    let n = ai(t)
      , r = e.challenges.day === n ? e.challenges : ci(n);
    return si(n).map(t => ({
        def: t,
        progress: Math.min(t.goal, r.progress[t.id] ?? 0),
        done: r.done.includes(t.id),
        owned: e.unlocks.includes(ri(t.reward))
    }))
}
function fi(e, t, n={}) {
    ui(e, n.now ?? new Date);
    let r = e.challenges
      , i = si(r.day);
    if (n.matchKey && r.lastMatch === n.matchKey.slice(0, 80))
        return i.map(e => {
            let t = r.progress[e.id] ?? 0;
            return {
                def: e,
                before: t,
                after: t,
                completed: !1,
                reward: null,
                coins: 0
            }
        }
        );
    n.matchKey && (r.lastMatch = n.matchKey.slice(0, 80));
    let a = i.map(n => {
        let i = Math.min(n.goal, r.progress[n.id] ?? 0);
        if (r.done.includes(n.id))
            return {
                def: n,
                before: i,
                after: i,
                completed: !1,
                reward: null,
                coins: 0
            };
        let a = mr(n.measure(t), 1e4)
          , o = Math.min(n.goal, n.tally === `best` ? Math.max(i, a) : i + a);
        if (r.progress[n.id] = o,
        o < n.goal)
            return {
                def: n,
                before: i,
                after: o,
                completed: !1,
                reward: null,
                coins: 0
            };
        r.done.push(n.id),
        e.challengesDone += 1,
        e.coins += 30;
        let s = ri(n.reward)
          , c = !e.unlocks.includes(s);
        return c && e.unlocks.push(s),
        {
            def: n,
            before: i,
            after: o,
            completed: !0,
            reward: c ? n.reward : null,
            coins: 30
        }
    }
    );
    return n.save !== !1 && kr(e, n.storage === void 0 ? Dr() : n.storage),
    a
}
var E = `#161616`
  , pi = l.teamColors;
l.teams;
var mi = l.colors.purple
  , hi = mi
  , gi = {
    hat: [{
        label: `Oberoi headset`,
        color: `#20202a`,
        accent: `#b884ff`
    }],
    hair: [{
        label: `Oberoi quiff`,
        color: `#211a20`
    }],
    face: [{
        label: `Oberoi frames`,
        color: `#242132`,
        accent: `#b795f4`
    }],
    skin: [{
        label: `Tan`,
        color: `#d9a679`
    }],
    shirt: [{
        label: `Oberoi hoodie`,
        color: `#24212d`,
        accent: `#a96cf3`
    }],
    pants: [{
        label: `Graphite joggers`,
        color: `#36313e`
    }],
    boots: [{
        label: `Oberoi sneakers`,
        color: `#eee9f3`
    }]
}
  , _i = e => {
    let t = lr[e];
    return t && t.length ? t : gi[e]
}
  , vi = (e, t) => /^#[0-9a-f]{6}$/i.test(e) ? e : /^#[0-9a-f]{8}$/i.test(e) && !/00$/i.test(e) ? e.slice(0, 7) : t
  , yi = e => /headset|headphone/i.test(e) ? `headset` : /visor/i.test(e) ? `visor` : /tactical/i.test(e) ? `tactical` : /helmet/i.test(e) ? `helmet` : /bandana/i.test(e) ? `bandana` : /beret/i.test(e) ? `beret` : /boonie|bush|bucket/i.test(e) ? `boonie` : /cap|snapback/i.test(e) ? `cap` : /beanie/i.test(e) ? `beanie` : /headband/i.test(e) ? `headband` : `none`
  , bi = e => /quiff|swept|pompadour/i.test(e) ? `quiff` : /bald/i.test(e) ? `bald` : /mohawk/i.test(e) ? `mohawk` : /long/i.test(e) ? `long` : /curl/i.test(e) ? `curly` : /spik/i.test(e) ? `spiky` : /buzz/i.test(e) ? `buzz` : `crop`
  , xi = e => /gas/i.test(e) ? `gasmask` : /visor/i.test(e) ? `visor` : /paint/i.test(e) ? `paint` : /sun|shade/i.test(e) ? `shades` : /frame|glass|spec/i.test(e) ? `frames` : /beard/i.test(e) ? `beard` : /goatee/i.test(e) ? `goatee` : /mous|must/i.test(e) ? `moustache` : /stubble/i.test(e) ? `stubble` : /patch/i.test(e) ? `patch` : /mask/i.test(e) ? `mask` : /grin|smil/i.test(e) ? `grin` : /scar/i.test(e) ? `scar` : /angry|focus/i.test(e) ? `angry` : `stern`
  , Si = e => {
    let t = /camo|woodland|tiger|desert|urban|arctic/i.test(e.label)
      , n = /jacket/i.test(e.label) ? `jacket` : /hood/i.test(e.label) ? `hoodie` : /jersey/i.test(e.label) ? `jersey` : `tee`;
    return {
        ...e,
        color: vi(e.color, `#24212d`),
        camo: t ? [e.accent ?? D(e.color, -.35), D(vi(e.color, `#24212d`), .28)] : void 0,
        stripes: /tiger|stripe/i.test(e.label),
        cut: n,
        emblem: /fleet|\bgf\b/i.test(e.label)
    }
}
  , Ci = e => {
    let t = Ei(_i(`hat`), e);
    return {
        ...t,
        style: yi(t.label)
    }
}
  , wi = e => {
    let t = Ei(_i(`hair`), e);
    return {
        ...t,
        color: vi(t.color, `#3a2a1c`),
        style: bi(t.label)
    }
}
  , Ti = e => {
    let t = Ei(_i(`face`), e);
    return {
        ...t,
        style: xi(t.label)
    }
}
;
Object.fromEntries([`hat`, `hair`, `face`, `skin`, `shirt`, `pants`, `boots`].map(e => [e, _i(e).map(e => e.label)]));
var Ei = (e, t) => e[(Math.trunc(Number.isFinite(t) ? t : 0) % e.length + e.length) % e.length]
  , Di = e => {
    let t = 2166136261;
    for (let n = 0; n < e.length; n++)
        t = Math.imul(t ^ e.charCodeAt(n), 16777619);
    return t >>> 0
}
;
function Oi(e) {
    let t = Di(e)
      , n = (e, n) => {
        let r = _i(e)
          , i = r.map( (e, t) => e.unlock?.kind === `challenge` ? -1 : t).filter(e => e >= 0);
        return i.length ? i[(t >>> n) % i.length] : (t >>> n) % r.length
    }
    ;
    return {
        hat: n(`hat`, 1),
        hair: n(`hair`, 5),
        face: n(`face`, 9),
        skin: n(`skin`, 13),
        shirt: n(`shirt`, 17),
        pants: n(`pants`, 21),
        boots: n(`boots`, 25)
    }
}
function ki(e) {
    let t = Si(Ei(_i(`shirt`), e.shirt))
      , n = Ci(e.hat);
    return {
        skin: vi(Ei(_i(`skin`), e.skin).color, `#d9a679`),
        hair: vi(wi(e.hair).color, `#3a2a1c`),
        shirt: t.color,
        shirtDark: t.camo?.[0] ?? D(t.color, -.25),
        pants: vi(Ei(_i(`pants`), e.pants).color, `#36313e`),
        boots: vi(Ei(_i(`boots`), e.boots).color, `#eee9f3`),
        hat: vi(n.color, `#20202a`),
        hasHat: n.style !== `none`
    }
}
function D(e, t) {
    let n = parseInt(e.slice(1, 7), 16);
    if (Number.isNaN(n))
        return e;
    let r = e => Math.round(Math.max(0, Math.min(255, t < 0 ? e * (1 + t) : e + (255 - e) * t)));
    return `#` + [n >> 16 & 255, n >> 8 & 255, n & 255].map(e => r(e).toString(16).padStart(2, `0`)).join(``)
}
function Ai(e) {
    let t = parseInt(e.slice(1, 7), 16);
    return Number.isNaN(t) ? .5 : (.2126 * (t >> 16 & 255) + .7152 * (t >> 8 & 255) + .0722 * (t & 255)) / 255
}
function ji(e, t, n, r, i=1) {
    let a = n / 6
      , o = e - 4.4 * a
      , s = t - 3 * a
      , c = o + 2.7 * a
      , l = s + 3 * a
      , u = 2.7 * a
      , d = [...Mi(c, l, u, 48, 318, 9), c + u * .74, l + .2 * a, c + .5 * a, l + .2 * a]
      , f = o + 6.4 * a;
    return [{
        k: `p`,
        d,
        s: r,
        lw: i,
        open: !0
    }, {
        k: `p`,
        d: [f, s + 6 * a, f, s, f + 2.6 * a, s],
        s: r,
        lw: i,
        open: !0
    }, {
        k: `p`,
        d: [f, s + 2.9 * a, f + 2.1 * a, s + 2.9 * a],
        s: r,
        lw: i,
        open: !0
    }]
}
function Mi(e, t, n, r, i, a=10) {
    let o = [];
    for (let s = 0; s <= a; s++) {
        let c = (r + (i - r) * s / a) * Math.PI / 180;
        o.push(e + Math.cos(c) * n, t - Math.sin(c) * n)
    }
    return o
}
var Ni = {
    x: 2,
    y: -11,
    r: 10.5
}
  , Pi = {
    x: 1,
    y: .5
}
  , Fi = {
    body: 6,
    head: 12
}
  , Ii = {
    x: -9.5,
    y: 14.5
};
function Li(e, t, n={}) {
    let r = ki(e)
      , i = wi(e.hair)
      , a = Ci(e.hat)
      , o = Ti(e.face)
      , s = Si(Ei(_i(`shirt`), e.shirt))
      , c = Si(Ei(_i(`pants`), e.pants))
      , l = n.crouch ? Fi.body : 0
      , u = []
      , d = []
      , f = Ni.x
      , p = Ni.y + (n.crouch ? Fi.head : 0)
      , m = Ni.r;
    u.push({
        k: `r`,
        x: -14,
        y: -1 + l,
        w: 8,
        h: 13,
        r: 2.5,
        f: `#2f2c38`,
        s: E,
        lw: 1.4
    }),
    u.push({
        k: `r`,
        x: -13,
        y: 0 + l,
        w: 2.2,
        h: 10,
        r: 1,
        f: `#77718a`
    }),
    u.push({
        k: `r`,
        x: -14,
        y: 4 + l,
        w: 8,
        h: 2.8,
        f: t,
        s: E,
        lw: .8
    }),
    u.push({
        k: `p`,
        d: [-12.5, 12 + l, -7, 12 + l, -8, 15 + l, -11.5, 15 + l],
        f: `#45404f`,
        s: E,
        lw: 1
    }),
    i.style === `long` && a.style !== `helmet` && a.style !== `tactical` && u.push({
        k: `p`,
        d: [f - 6, p - 7, f - 13, p + 2, f - 12, p + 11, f - 6, p + 8, f - 3, p + 2],
        f: i.color,
        s: E,
        lw: 1.2
    });
    let h = n.run ?? 0
      , g = n.crouch ? [{
        x: -7,
        y: 13,
        w: 9,
        h: 4.5,
        lift: 0
    }, {
        x: 0,
        y: 12.5,
        w: 9,
        h: 4.5,
        lift: 0
    }] : n.air ? [{
        x: -6.5,
        y: 10.5,
        w: 6.5,
        h: 6.5,
        lift: -1
    }, {
        x: 1.5,
        y: 10.5,
        w: 6.5,
        h: 6,
        lift: 0
    }] : [{
        x: -5.5 - h * 3,
        y: 10.5,
        w: 6.5,
        h: 6,
        lift: Math.max(0, h) * 2.2
    }, {
        x: 1.5 + h * 3,
        y: 10.5,
        w: 6.5,
        h: 6,
        lift: Math.max(0, -h) * 2.2
    }]
      , _ = Ei(_i(`boots`), e.boots)
      , v = /sneak|kick|trainer|shoe|runner/i.test(_.label)
      , ee = /jog|track|sweat/i.test(c.label);
    g.forEach( (e, t) => {
        let i = t === 0 ? D(c.color, -.18) : c.color
          , a = e.y - e.lift;
        d.push({
            k: `r`,
            x: e.x,
            y: a,
            w: e.w,
            h: e.h,
            r: 1.5,
            f: i,
            s: E,
            lw: 1.3
        }),
        c.camo && t === 1 && d.push({
            k: `e`,
            x: e.x + 3,
            y: a + 2.5,
            rx: 1.8,
            ry: 1.2,
            f: c.camo[0]
        }, {
            k: `e`,
            x: e.x + 4.6,
            y: a + 4.5,
            rx: 1.3,
            ry: .9,
            f: c.camo[1]
        }),
        ee && d.push({
            k: `r`,
            x: e.x + .7,
            y: a + e.h - 2,
            w: e.w - 1.4,
            h: 1.5,
            r: .6,
            f: D(i, -.35)
        }),
        c.accent && t === 1 && d.push({
            k: `p`,
            d: [e.x + 1.4, a + .8, e.x + 1.4, a + e.h - 2.4],
            s: c.accent,
            lw: .9,
            open: !0
        });
        let o = t === 0 ? D(r.boots, -.2) : r.boots
          , s = (n.crouch ? 15.5 : 15.6) - e.lift + (n.air ? .5 : 0);
        v ? (d.push({
            k: `r`,
            x: e.x - .5,
            y: s,
            w: e.w + 2.8,
            h: 3.6,
            r: 1.8,
            f: o,
            s: E,
            lw: 1.3
        }),
        d.push({
            k: `r`,
            x: e.x - .8,
            y: s + 2.7,
            w: e.w + 3.4,
            h: 1.9,
            r: .9,
            f: `#fbf9ff`,
            s: E,
            lw: 1
        })) : (d.push({
            k: `r`,
            x: e.x - .5,
            y: s,
            w: e.w + 2.5,
            h: 4.6,
            r: 1.8,
            f: o,
            s: E,
            lw: 1.3
        }),
        d.push({
            k: `p`,
            d: [e.x, s + 3.8, e.x + e.w + 1.6, s + 3.8],
            s: D(o, -.4),
            lw: .9,
            open: !0
        }))
    }
    );
    let y = -1.5 + l
      , b = n.crouch ? 10.5 : 13
      , x = s.accent ? vi(s.accent, D(s.color, .3)) : D(s.color, Ai(s.color) > .5 ? -.3 : .35);
    if (s.cut === `hoodie` && d.push({
        k: `p`,
        d: [-7.8, y + 3.4, -9.6, y - .6, -6.4, y - 3.4, -1.5, y - 2.6, .5, y + 1.2],
        f: D(s.color, Ai(s.color) > .5 ? -.12 : .1),
        s: E,
        lw: 1.2
    }),
    d.push({
        k: `r`,
        x: -7.5,
        y,
        w: 16,
        h: b,
        r: 3.5,
        f: s.color,
        s: E,
        lw: 1.5
    }),
    s.camo) {
        let[e,t] = s.camo;
        d.push({
            k: `e`,
            x: -3.5,
            y: y + 3,
            rx: 2.8,
            ry: 1.7,
            a: .3,
            f: e
        }, {
            k: `e`,
            x: 3.5,
            y: y + 7.5,
            rx: 3,
            ry: 1.6,
            a: -.4,
            f: e
        }, {
            k: `e`,
            x: 4.5,
            y: y + 2.5,
            rx: 1.8,
            ry: 1.2,
            f: t
        }, {
            k: `e`,
            x: -4,
            y: y + 8.5,
            rx: 2,
            ry: 1.2,
            a: .5,
            f: t
        }, {
            k: `e`,
            x: .5,
            y: y + 5,
            rx: 1.4,
            ry: 1,
            f: t
        })
    }
    if (s.stripes)
        for (let e = 0; e < 4; e++)
            d.push({
                k: `p`,
                d: [-6 + e * 4, y + 1, -4 + e * 4, y + 5, -6.5 + e * 4, y + 10],
                s: s.accent ?? `#1f1d10`,
                lw: 1.3,
                open: !0
            });
    s.cut === `jersey` && d.push({
        k: `r`,
        x: -7.2,
        y: y + 3.2,
        w: 15.4,
        h: 2,
        f: x
    }, {
        k: `p`,
        d: [1.6, y + .6, 4, y + 3, 6.4, y + .6],
        s: x,
        lw: 1.1,
        open: !0
    }),
    s.cut === `tee` && d.push({
        k: `p`,
        d: [1, y + .8, 3.8, y + 2.4, 6.6, y + .8],
        s: x,
        lw: 1,
        open: !0
    }),
    s.cut === `jacket` && d.push({
        k: `p`,
        d: [0, y + 1, 0, y + b - 3],
        s: x,
        lw: 1.3,
        open: !0
    }, {
        k: `p`,
        d: [-6, y + 1, -2, y + 4, 0, y + 1, 3, y + 4, 7, y + 1],
        s: x,
        lw: 1.7,
        open: !0
    }, {
        k: `p`,
        d: [-6, y + 9, -2, y + 10, 4, y + 10, 7, y + 9],
        s: x,
        lw: 1,
        open: !0
    }),
    d.push({
        k: `r`,
        x: -7.5,
        y: y + b - 2.8,
        w: 16,
        h: 2.8,
        r: .9,
        f: D(s.color, Ai(s.color) > .5 ? -.2 : .14),
        s: E,
        lw: 1
    }),
    s.cut === `hoodie` && d.push({
        k: `p`,
        d: [3.2, y + .6, 2.8, y + 4.6],
        s: `#f5f3fa`,
        lw: .9,
        open: !0
    }, {
        k: `p`,
        d: [5.8, y + .4, 6.1, y + 4.2],
        s: `#f5f3fa`,
        lw: .9,
        open: !0
    }),
    s.emblem && d.push(...ji(-1.3, y + (n.crouch ? 5.2 : 6), n.crouch ? 3.6 : 4.2, Ai(s.color) > .6 ? E : `#f5f3fa`, 1.05)),
    d.push({
        k: `r`,
        x: -7.6,
        y: y + 2.2,
        w: 2.4,
        h: 5,
        r: .6,
        f: t,
        s: E,
        lw: .7
    }),
    i.style === `long` && (a.style === `helmet` || a.style === `tactical`) && d.push({
        k: `p`,
        d: [f - 7, p - 2, f - 11, p + 6, f - 6, p + 7],
        f: i.color,
        s: E,
        lw: 1
    }),
    d.push({
        k: `c`,
        x: f,
        y: p,
        r: m,
        f: r.skin,
        s: E,
        lw: 1.7
    });
    let te = Ri(d, i, f, p, m, a.style);
    return zi(d, o, r, f, p, m),
    d.push({
        k: `e`,
        x: f - 6.2,
        y: p + 1,
        rx: 2.1,
        ry: 2.6,
        f: r.skin,
        s: E,
        lw: 1.1
    }),
    d.push({
        k: `p`,
        d: [f - 6.6, p, f - 5.8, p + 1.8],
        s: D(r.skin, -.35),
        lw: .8,
        open: !0
    }),
    Bi(d, a, f, p, m),
    d.push(...te),
    {
        back: u,
        body: d,
        colors: r
    }
}
function Ri(e, t, n, r, i, a) {
    if (t.style === `bald`)
        return e.push({
            k: `e`,
            x: n - 2,
            y: r - 6.5,
            rx: 3,
            ry: 1.3,
            a: -.3,
            f: `#ffffff`,
            o: .35
        }),
        [];
    let o = a === `helmet` || a === `tactical` || a === `beanie` || a === `bandana` || a === `boonie` || a === `cap`
      , s = [...Mi(n, r, i + .7, 208, 28, 12), n + 4, r - 5.8, n - 2, r - 5, n - 5.5, r + 1.5];
    if (t.style === `mohawk`) {
        if (e.push({
            k: `p`,
            d: s,
            f: t.color,
            o: .32
        }),
        !o) {
            let a = [];
            for (let e = 0; e <= 8; e++) {
                let t = 150 - e * 13.5
                  , o = i + (e % 2 ? 1 : 5.5);
                a.push(n + Math.cos(t * Math.PI / 180) * o, r - Math.sin(t * Math.PI / 180) * o)
            }
            a.push(...Mi(n, r, i - 2.5, 42, 150, 6)),
            e.push({
                k: `p`,
                d: a,
                f: t.color,
                s: E,
                lw: 1.1
            })
        }
        return []
    }
    if (e.push({
        k: `p`,
        d: s,
        f: t.color,
        s: E,
        lw: 1.2
    }),
    o)
        return [];
    if (t.style === `quiff`) {
        let e = D(t.color, .38);
        return [{
            k: `p`,
            d: [n + 9, r - 4.4, n + 11.2, r - 9.4, n + 9.4, r - 13.6, n + 5.4, r - 15.6, n - .5, r - 15.4, n - 5.6, r - 13.4, n - 9.4, r - 9.6, n - 10.8, r - 5, n - 6, r - 7.6, n - 1, r - 8.4, n + 4, r - 7],
            f: t.color,
            s: E,
            lw: 1.2
        }, {
            k: `p`,
            d: [n + 8.4, r - 11.6, n + 4.4, r - 13.4, n - 1.4, r - 13.2],
            s: e,
            lw: 1,
            open: !0
        }]
    }
    if (t.style === `curly`)
        for (let a = 0; a < 6; a++) {
            let o = (195 - a * 30) * Math.PI / 180;
            e.push({
                k: `c`,
                x: n + Math.cos(o) * (i + .5),
                y: r - Math.sin(o) * (i + .5),
                r: 2.6,
                f: t.color,
                s: E,
                lw: 1
            })
        }
    if (t.style === `spiky` || t.style === `crop`) {
        let a = t.style === `spiky` ? 5 : 4
          , o = t.style === `spiky` ? 4.5 : 1.8;
        for (let s = 0; s < a; s++) {
            let c = (160 - s * (110 / (a - 1))) * Math.PI / 180
              , l = c - .22
              , u = c - .11;
            e.push({
                k: `p`,
                d: [n + Math.cos(c) * i, r - Math.sin(c) * i, n + Math.cos(u) * (i + o), r - Math.sin(u) * (i + o), n + Math.cos(l) * i, r - Math.sin(l) * i],
                f: t.color,
                s: E,
                lw: 1
            })
        }
    }
    return []
}
function zi(e, t, n, r, i, a) {
    let o = r + 2.6
      , s = r + 7.6
      , c = i - .3
      , l = vi(t.color, `#2b1d13`)
      , u = [...Mi(r, i, a + .3, 345, 205, 12), r - 3.5, i + 2.5, r + 1, i + 3.4, r + 5, i + 2.8, r + 9.8, i + 1.6];
    t.style === `beard` && e.push({
        k: `p`,
        d: u,
        f: l,
        s: E,
        lw: 1.1
    });
    let d = t.style === `frames` && /fleet|stubble/i.test(t.label);
    if ((t.style === `stubble` || d) && e.push({
        k: `p`,
        d: u,
        f: l,
        o: .3
    }),
    d && e.push({
        k: `p`,
        d: [r + 3.6, i + 3.7, r + 7, i + 2.7, r + 9.8, i + 2.9, r + 9.6, i + 4, r + 4, i + 4.7],
        f: l,
        o: .34
    }),
    t.style === `paint` && e.push({
        k: `p`,
        d: [r + .5, i - 2.6, r + 12, i - 3.4, r + 12.3, i - .6, r + .8, i + .8],
        f: l,
        o: .75
    }, {
        k: `p`,
        d: [r + 1, i + 3, r + 11.5, i + 2.2],
        s: t.accent ?? `#1d2412`,
        lw: 1.4,
        open: !0,
        o: .8
    }),
    t.style === `goatee` && e.push({
        k: `p`,
        d: [r + 4, i + 6.5, r + 9, i + 5.8, r + 8, i + 9.6, r + 5, i + 10],
        f: l,
        s: E,
        lw: .9
    }),
    t.style === `mask` && (e.push({
        k: `p`,
        d: [...Mi(r, i, a + .4, 352, 200, 12), r - 3, i + 1.5, r + 6, i + 1.2, r + 11.5, i + .3],
        f: `#262626`,
        s: E,
        lw: 1.1
    }),
    e.push({
        k: `p`,
        d: [r + 3.5, i + 5.5, r + 4.8, i + 4.5, r + 6.1, i + 5.5, r + 7.4, i + 4.5, r + 8.7, i + 5.5],
        s: `#e6e6e6`,
        lw: .9,
        open: !0
    })),
    t.style === `gasmask`) {
        let n = vi(t.color, `#3a3f38`)
          , l = t.accent ?? `#8b9387`;
        e.push({
            k: `p`,
            d: [...Mi(r, i, a + .5, 15, -95, 10), r - 1, i + 4, r - 2, i - 4.5, r + 3, i - 5.5],
            f: n,
            s: E,
            lw: 1.2
        }),
        e.push({
            k: `c`,
            x: o + .4,
            y: c - .6,
            r: 2.4,
            f: `#cfe6ee`,
            s: E,
            lw: 1
        }, {
            k: `c`,
            x: s + .4,
            y: c - .8,
            r: 2.4,
            f: `#cfe6ee`,
            s: E,
            lw: 1
        }),
        e.push({
            k: `c`,
            x: r + 9.5,
            y: i + 6,
            r: 3.4,
            f: l,
            s: E,
            lw: 1.1
        }, {
            k: `p`,
            d: [r + 7.6, i + 6, r + 11.4, i + 6],
            s: E,
            lw: .8,
            open: !0
        });
        return
    }
    if (t.style === `visor`) {
        let n = t.accent ? vi(t.accent, `#8de2c6`) : `#8de2c6`;
        e.push({
            k: `p`,
            d: [r - 6, c - 1.6, o - 2.6, c - 2.8, s + 3.6, c - 2.8, s + 3.2, c + 2.2, o - 2.4, c + 2.2, r - 6, c + 1.2],
            f: vi(t.color, `#373048`),
            s: E,
            lw: 1.1
        });
        for (let t = 0; t < 4; t++)
            e.push({
                k: `r`,
                x: o - 1.6 + t * 2.6,
                y: c - .8,
                w: 1.7,
                h: 1.5,
                f: n
            })
    } else if (t.style === `shades`)
        e.push({
            k: `p`,
            d: [o - 2.8, c - 2.2, s + 3.2, c - 2.4, s + 2.4, c + 1.8, s - 1.4, c + 2, o + 1.8, c + .8, o - 2.3, c + 1.8],
            f: `#141414`,
            s: E,
            lw: 1
        }, {
            k: `p`,
            d: [o - 1, c - 1.2, o + 1.2, c - 1.3],
            s: `#9aa4aa`,
            lw: .8,
            open: !0
        });
    else {
        for (let n of [o, s])
            (t.style !== `patch` || n !== s) && e.push({
                k: `e`,
                x: n,
                y: c,
                rx: 1.7,
                ry: 2.1,
                f: `#ffffff`,
                s: E,
                lw: .8
            }, {
                k: `c`,
                x: n + .6,
                y: c + .2,
                r: 1.05,
                f: `#111111`
            });
        t.style === `patch` && e.push({
            k: `p`,
            d: [r - 6, i - 6, s + 3, c - 2.4],
            s: `#111`,
            lw: .9,
            open: !0
        }, {
            k: `e`,
            x: s,
            y: c + .2,
            rx: 2.4,
            ry: 2.6,
            f: `#111111`
        })
    }
    if (t.style === `frames`) {
        let n = t.accent ? vi(t.accent, hi) : hi;
        e.push({
            k: `r`,
            x: o - 2.6,
            y: c - 2.4,
            w: 5,
            h: 4.3,
            r: 1,
            f: `#e8f1ff`,
            o: .3
        }, {
            k: `r`,
            x: s - 2.2,
            y: c - 2.4,
            w: 4.4,
            h: 4.3,
            r: 1,
            f: `#e8f1ff`,
            o: .3
        }),
        e.push({
            k: `p`,
            d: [o - 2.6, c - 1.4, r - 4.6, i - .6],
            s: E,
            lw: 1.6,
            open: !0
        }, {
            k: `p`,
            d: [o - 2.6, c - 1.4, r - 4.6, i - .6],
            s: n,
            lw: .9,
            open: !0
        });
        for (let[t,r] of [[o - 2.6, 5], [s - 2.2, 4.4]])
            e.push({
                k: `r`,
                x: t,
                y: c - 2.4,
                w: r,
                h: 4.3,
                r: 1,
                s: E,
                lw: 2
            }, {
                k: `r`,
                x: t,
                y: c - 2.4,
                w: r,
                h: 4.3,
                r: 1,
                s: n,
                lw: 1.1
            });
        e.push({
            k: `p`,
            d: [o + 2.4, c - 1.2, s - 2.2, c - 1.2],
            s: n,
            lw: 1,
            open: !0
        })
    }
    let f = t.style === `grin` || t.style === `frames` ? .6 : t.style === `angry` ? -.9 : 0
      , p = t.style === `frames` ? .9 : 0;
    t.style !== `visor` && (e.push({
        k: `p`,
        d: [o - 2.2, c - 3.6 - f - p, o + 1.9, c - 2.6 + f - p],
        s: `#1a1410`,
        lw: 1.6,
        open: !0
    }),
    e.push({
        k: `p`,
        d: [s - 1.7, c - 2.6 + f - p, s + 2.3, c - 3.8 - f - p],
        s: `#1a1410`,
        lw: 1.6,
        open: !0
    })),
    t.style === `scar` && e.push({
        k: `p`,
        d: [s - 1.5, c - 5.5, s + 1.5, c + 4],
        s: `#b23a2f`,
        lw: 1,
        open: !0
    }),
    t.style !== `mask` && (e.push({
        k: `p`,
        d: [r + 10.3, i + .2, r + 11.9, i + 2.6, r + 10, i + 3],
        s: D(n.skin, -.4),
        lw: .9,
        open: !0
    }),
    (t.style === `moustache` || t.style === `beard` || t.style === `goatee`) && e.push({
        k: `p`,
        d: [r + 3.6, i + 5, r + 6.5, i + 3.7, r + 9.6, i + 3.9, r + 10.4, i + 5.6, r + 7, i + 5],
        f: l,
        s: E,
        lw: .8
    }),
    t.style === `frames` ? e.push({
        k: `p`,
        d: [r + 3.8, i + 4.8, r + 9.6, i + 4, r + 8.8, i + 6.8, r + 7, i + 8.2, r + 5.2, i + 7.4],
        f: `#ffffff`,
        s: E,
        lw: 1
    }, {
        k: `p`,
        d: [r + 3.4, i + 4.2, r + 2.8, i + 5.4],
        s: D(n.skin, -.4),
        lw: .8,
        open: !0
    }) : t.style === `grin` ? e.push({
        k: `p`,
        d: [r + 4, i + 5, r + 10, i + 4.4, r + 8.6, i + 7.6, r + 5.2, i + 7.6],
        f: `#ffffff`,
        s: E,
        lw: 1
    }) : e.push({
        k: `p`,
        d: [r + 4.6, i + 6.1, r + 9.2, i + 5.6],
        s: `#3a1d14`,
        lw: 1.1,
        open: !0
    }))
}
function Bi(e, t, n, r, i) {
    let a = vi(t.color, `#56603a`)
      , o = t.accent ? vi(t.accent, D(a, .25)) : D(a, .25);
    switch (t = {
        ...t,
        color: a
    },
    t.style) {
    case `helmet`:
    case `tactical`:
        {
            let a = [...Mi(n, r - .6, i + 2.4, 196, -8, 14), n + i + 2.8, r - 2.6, n - i - 2.6, r - 1.6];
            e.push({
                k: `p`,
                d: a,
                f: t.color,
                s: E,
                lw: 1.6
            }),
            e.push({
                k: `p`,
                d: Mi(n - 1, r - 1.4, i - 1, 150, 95, 5),
                s: o,
                lw: 1.8,
                open: !0
            }),
            e.push({
                k: `p`,
                d: [n - i - 3, r - 1.4, n + i + 3.4, r - 2.8],
                s: E,
                lw: 2.6,
                open: !0
            }),
            e.push({
                k: `p`,
                d: [n - i - 2.6, r - 1.5, n + i + 3, r - 2.8],
                s: D(t.color, -.2),
                lw: 1.2,
                open: !0
            }),
            t.style === `tactical` ? e.push({
                k: `r`,
                x: n + 1,
                y: r - 9.5,
                w: 10,
                h: 4,
                r: 2,
                f: `#1d1f20`,
                s: E,
                lw: 1
            }, {
                k: `r`,
                x: n + 3,
                y: r - 8.7,
                w: 6.5,
                h: 2.4,
                r: 1.2,
                f: o
            }) : e.push({
                k: `p`,
                d: [n - 4.5, r - 2.2, n - 2.2, r + 7.8],
                s: `#2b2a1f`,
                lw: 1,
                open: !0
            });
            return
        }
    case `bandana`:
        e.push({
            k: `p`,
            d: [...Mi(n, r, i + .8, 200, 22, 12), n + 9.8, r - 3.6, n + 2, r - 4.2, n - 6, r - 2.6, n - 10.2, r - 1.8],
            f: t.color,
            s: E,
            lw: 1.3
        }),
        e.push({
            k: `p`,
            d: [n - 10, r - 3.5, n - 16, r - 1, n - 14.5, r + 3.5, n - 11.5, r - .5],
            f: t.color,
            s: E,
            lw: 1.1
        }),
        e.push({
            k: `p`,
            d: [n - 10, r - 3.2, n - 15, r - 6.5, n - 15.6, r - 2.5],
            f: t.color,
            s: E,
            lw: 1.1
        });
        for (let[t,i] of [[-4, -8], [2, -9.5], [7, -7], [-7, -4.5]])
            e.push({
                k: `c`,
                x: n + (t ?? 0),
                y: r + (i ?? 0),
                r: .8,
                f: `#f1e6d6`,
                o: .8
            });
        return;
    case `beret`:
        e.push({
            k: `e`,
            x: n - 1.5,
            y: r - 8.2,
            rx: 11.8,
            ry: 4.6,
            a: -.2,
            f: t.color,
            s: E,
            lw: 1.3
        }),
        e.push({
            k: `p`,
            d: [n - 9, r - 5.3, n + 9, r - 7.8],
            s: E,
            lw: 1.8,
            open: !0
        }),
        e.push({
            k: `c`,
            x: n + 5.5,
            y: r - 9.5,
            r: 1.5,
            f: o,
            s: E,
            lw: .6
        });
        return;
    case `cap`:
        e.push({
            k: `p`,
            d: [...Mi(n, r, i + .9, 200, 12, 12), n - i, r - 2.5],
            f: t.color,
            s: E,
            lw: 1.3
        }),
        e.push({
            k: `p`,
            d: [n + 7, r - 5.6, n + 18.5, r - 4.2, n + 17.6, r - 2.4, n + 7.5, r - 3.6],
            f: o,
            s: E,
            lw: 1.2
        });
        return;
    case `boonie`:
        e.push({
            k: `p`,
            d: [...Mi(n, r - 1, i + .6, 180, 0, 12)],
            f: t.color,
            s: E,
            lw: 1.3
        }),
        e.push({
            k: `e`,
            x: n + .5,
            y: r - 3.2,
            rx: i + 6.5,
            ry: 2.6,
            a: -.06,
            f: o,
            s: E,
            lw: 1.2
        }),
        e.push({
            k: `p`,
            d: [n - i + 1, r - 6, n + i - 1, r - 7],
            s: D(t.color, -.35),
            lw: 1.6,
            open: !0
        });
        return;
    case `beanie`:
        e.push({
            k: `p`,
            d: [...Mi(n, r - .5, i + 1.2, 195, -10, 12)],
            f: t.color,
            s: E,
            lw: 1.3
        }),
        e.push({
            k: `r`,
            x: n - i - 1.2,
            y: r - 5.5,
            w: i * 2 + 2.6,
            h: 3.8,
            r: 1.6,
            f: o,
            s: E,
            lw: 1.1
        });
        return;
    case `headband`:
        e.push({
            k: `p`,
            d: [...Mi(n, r, i + .4, 185, 28, 10), ...Mi(n, r, i - 2.2, 28, 185, 10)],
            f: t.color,
            s: E,
            lw: .9
        }),
        e.push({
            k: `p`,
            d: [n - i, r - 1.5, n - i - 6, r + 3, n - i - 3.5, r + 4.5],
            f: o,
            s: E,
            lw: .9
        });
        return;
    case `headset`:
        {
            let a = Mi(n - 1.5, r - .5, i + 1.9, 214, 104, 10);
            e.push({
                k: `p`,
                d: a,
                s: E,
                lw: 4.2,
                open: !0
            }, {
                k: `p`,
                d: a,
                s: t.color,
                lw: 2.4,
                open: !0
            }),
            e.push({
                k: `p`,
                d: Mi(n - 1.5, r - .5, i + 1.9, 196, 130, 6),
                s: o,
                lw: .9,
                open: !0
            }),
            e.push({
                k: `p`,
                d: [n - 4.4, r + 4.6, n - 1.4, r + 8.6, n + 2.6, r + 9.6],
                s: E,
                lw: 2.2,
                open: !0
            }, {
                k: `p`,
                d: [n - 4.4, r + 4.6, n - 1.4, r + 8.6, n + 2.6, r + 9.6],
                s: t.color,
                lw: 1,
                open: !0
            }),
            e.push({
                k: `e`,
                x: n + 3.4,
                y: r + 9.4,
                rx: 1.8,
                ry: 1.3,
                a: -.2,
                f: t.color,
                s: E,
                lw: .8
            }),
            e.push({
                k: `e`,
                x: n - 6,
                y: r + 1.2,
                rx: 4,
                ry: 5.2,
                f: t.color,
                s: E,
                lw: 1.3
            }),
            e.push({
                k: `e`,
                x: n - 6.4,
                y: r + 1.2,
                rx: 2.5,
                ry: 3.6,
                s: o,
                lw: 1.1
            }),
            e.push({
                k: `e`,
                x: n - 6.4,
                y: r + 1.2,
                rx: 1,
                ry: 2,
                f: D(t.color, Ai(t.color) > .5 ? -.2 : .18)
            });
            return
        }
    case `visor`:
        e.push({
            k: `p`,
            d: [...Mi(n, r, i + .5, 190, 28, 10), ...Mi(n, r, i - 2.4, 28, 190, 10)],
            f: t.color,
            s: E,
            lw: 1
        }),
        e.push({
            k: `p`,
            d: [n + 6.4, r - 6.6, n + 17.4, r - 5.4, n + 16.8, r - 3.6, n + 7.4, r - 4.2],
            f: t.color,
            s: E,
            lw: 1.1
        });
        for (let t = 0; t < 3; t++)
            e.push({
                k: `r`,
                x: n - 4.6 + t * 3.4,
                y: r - 9.6 + t * .5,
                w: 1.8,
                h: 1.4,
                f: o
            });
        return;
    default:
        return
    }
}
var O = `#262829`
  , k = `#4a4e51`
  , Vi = `#8a8f94`
  , Hi = `#c4c8cc`
  , Ui = `#8b5a2b`
  , Wi = `#b07a40`
  , Gi = `#3e3a48`
  , A = (e, t, n, r, i, a=.8, o=E, s=1) => ({
    k: `r`,
    x: e,
    y: t,
    w: n,
    h: r,
    r: a,
    f: i,
    s: o,
    lw: s
})
  , j = (e, t, n=E, r=1) => ({
    k: `p`,
    d: e,
    f: t,
    s: n,
    lw: r
})
  , M = (e, t, n=1) => ({
    k: `p`,
    d: e,
    s: t,
    lw: n,
    open: !0
})
  , Ki = {
    minigun: {
        label: `MINIGUN`,
        hold: `rifle`,
        muzzle: 39,
        muzzleY: -3,
        fore: [16, 3],
        kick: 2,
        flash: 10,
        shapes: [A(-13, -8, 24, 13, `#385b58`), A(-8, 5, 13, 11, O, 3), A(-8, -13, 17, 4, k), A(-8, -11, 3, 5, k), A(6, -11, 3, 5, k), A(9, -8, 29, 3, k), A(9, -3, 29, 3, Vi), A(9, 2, 29, 3, k), A(17, -10, 4, 17, O), A(34, -10, 5, 17, O), M([11, -6, 32, -6], Hi, 1), M([11, 0, 32, 0], `#6fffd0`, 1), A(-3, -5, 9, 3, `#6fffd0`)]
    },
    m249: {
        label: `M249`,
        hold: `rifle`,
        muzzle: 35,
        muzzleY: -3,
        fore: [16, 1],
        kick: 2.5,
        flash: 9,
        shapes: [A(-14, -4, 12, 7, O), A(-3, -7, 25, 10, `#657044`), A(22, -4, 13, 3, k), A(3, 3, 11, 10, `#475134`), A(-2, 2, 4, 7, O), M([3, -9, 13, -9, 16, -7], k, 2), M([25, -1, 21, 8, 30, 8], k, 1.3), M([0, -5, 18, -5], Vi, 1)]
    },
    pistol: {
        label: `PISTOL`,
        hold: `pistol`,
        muzzle: 16,
        muzzleY: -3.5,
        kick: 2.5,
        flash: 7,
        shapes: [j([0, -1.5, 5, -1.5, 4, 7, -1, 6.6], O), A(-2, -6, 18, 5, k, 1), M([0, -5, 14, -5], Vi, 1), A(-1, -1.6, 13, 2.4, O, .5), M([4, .5, 5, 3.5, 7.5, 3.5, 8, .8], O, .9)]
    },
    magnum: {
        label: `MAGNUM`,
        hold: `pistol`,
        muzzle: 21,
        muzzleY: -3.6,
        kick: 4.5,
        flash: 10,
        shapes: [j([-1, -1, 4, -1, 2.4, 8, -3, 7.2], Ui), A(4, -5.4, 17, 3.6, Hi, .6), A(-1, -6.2, 7, 6, Vi, 1.2), M([1, -4.4, 5, -4.4], k, .8), M([1, -2.4, 5, -2.4], k, .8), M([-1.5, -6, -3, -8], O, 1.4), A(18.5, -7, 1.6, 1.8, O, .2, O, .4)]
    },
    uzi: {
        label: `UZI`,
        hold: `pistol`,
        muzzle: 20,
        muzzleY: -2.5,
        kick: 2.2,
        flash: 7,
        shapes: [A(-7, -6, 21, 7.2, O, 1), A(14, -3.6, 6, 2.6, k, .4), j([1, 1, 6, 1, 6.2, 14, 1.2, 14], O), A(2, 12, 4.4, 2.6, k, .3), M([-7, -2, -11, 1], k, 1.4), A(-4, -7.4, 3, 1.6, k, .3), M([-4, -4, 12, -4], Vi, .9), A(10, 1, 2, 2.5, k, .3)]
    },
    smg: {
        label: `SMG`,
        hold: `rifle`,
        muzzle: 24,
        muzzleY: -2.8,
        fore: [15, 1],
        kick: 2,
        flash: 7,
        shapes: [A(-13, -4.5, 9, 3.4, O, .6), A(-4.5, -5.6, 21, 6.2, O, 1), A(16, -4.4, 6, 3.8, k, .6), A(22, -3.2, 2.5, 1.6, O, .2), j([7, .6, 11, .6, 13.5, 10, 9.8, 10.6], k), j([-1, .6, 3.6, .6, 2.6, 7.4, -1.8, 7], O), M([-3, -3.6, 14, -3.6], Vi, .9)]
    },
    rifle: {
        label: `M4`,
        hold: `rifle`,
        muzzle: 33,
        muzzleY: -2.6,
        fore: [17, 1],
        kick: 3,
        flash: 9,
        shapes: [j([-16, -4.5, -6, -4.5, -6, 1.5, -15, 3.5], O), A(-6, -5.6, 18, 6.2, O, .8), A(-2, -8.5, 9, 2.9, k, .5), A(12, -4.8, 12, 5, k, .8), A(24, -3.2, 9, 1.8, O, .2), A(31, -4.2, 1.6, 3.6, O, .2, O, .5), j([5, .6, 9, .6, 10.2, 10, 6.2, 10], k), j([-2, .6, 2, .6, 1, 7, -3, 6.6], O), M([13, -3.2, 23, -3.2], Vi, .8)]
    },
    ak47: {
        label: `AK-47`,
        hold: `rifle`,
        muzzle: 34,
        muzzleY: -3,
        fore: [16, .5],
        kick: 4,
        flash: 10,
        shapes: [j([-17, -2.8, -6, -5.2, -6, 1, -16, 4.2], Ui), A(-6, -5.6, 17, 5.6, k, .6), A(11, -4.8, 10, 4.6, Wi, 1.2), A(21, -3.6, 13, 1.9, O, .2), M([12, -5.8, 27, -5.8], O, 1.4), A(32, -6.8, 1.4, 2.4, O, .2, O, .4), j([4, 0, 8.8, 0, 12.6, 9, 9, 11.6, 6.4, 9.4], O), j([-2, 0, 2, 0, 1, 6.6, -3, 6.2], Ui), M([-4, -3.6, 9, -3.6], Vi, .8)]
    },
    m14: {
        label: `M14`,
        hold: `rifle`,
        muzzle: 38,
        muzzleY: -3.2,
        fore: [18, .2],
        kick: 4.5,
        flash: 10,
        shapes: [j([-18, -2.6, -7, -5, 24, -4.6, 24, -.6, -4, 1.2, -6, 3, -17, 4.4], Ui), A(-5, -6.4, 14, 3, k, .5), A(24, -4, 14, 2, O, .2), A(4, 0, 5, 6.5, O, .4), M([-4, -3.4, 22, -3.4], Wi, .9), A(35.5, -5.6, 1.4, 2, O, .2, O, .4), M([-1, -6.5, 3, -8.5], O, 1)]
    },
    sniper: {
        label: `SNIPER`,
        hold: `rifle`,
        muzzle: 44,
        muzzleY: -2.6,
        fore: [16, 0],
        kick: 6,
        flash: 12,
        shapes: [j([-19, -4, -6, -4.2, -6, 1.8, -10, 1.8, -12, 4.6, -18, 4.6], O), A(-6, -5.4, 22, 5.6, k, .6), A(16, -3.4, 26, 2, O, .2), A(41, -4.2, 4, 3.6, O, .4), A(-3, -12, 17, 4.4, O, 2), {
            k: `c`,
            x: 13.2,
            y: -9.8,
            r: 1.8,
            f: `#7fd0e8`,
            s: E,
            lw: .7
        }, A(2, -8, 2, 2.4, O, .2), A(8, -8, 2, 2.4, O, .2), A(4, .4, 4, 5, O, .4), j([-2, .4, 2, .4, 1, 6.6, -3, 6.2], O), M([24, -1.4, 30, 5], k, 1), M([24, -1.4, 26, 5.6], k, 1)]
    },
    shotgun: {
        label: `SHOTGUN`,
        hold: `rifle`,
        muzzle: 33,
        muzzleY: -3.8,
        fore: [18, .5],
        kick: 6,
        flash: 13,
        shapes: [j([-17, -3.6, -6, -5, -6, 1, -15, 4.2], O), A(-6, -5.8, 18, 6.4, k, .8), A(12, -5.2, 21, 2.6, O, .3), A(12, -2.6, 18, 2.4, k, .3), A(14, -3.6, 10, 4.6, O, 1), M([16, -3, 16, .6], Vi, .8), M([19, -3, 19, .6], Vi, .8), M([22, -3, 22, .6], Vi, .8), j([-2, .6, 2, .6, 1, 7, -3, 6.6], O)]
    },
    saw: {
        label: `SAW`,
        hold: `rifle`,
        muzzle: 29,
        muzzleY: -3,
        fore: [14, 1],
        kick: 5,
        flash: 6,
        shapes: [j([-15, -4, -5, -4, -5, 2, -14, 4], O), A(-5, -7, 28, 10, k, 1), A(0, 2, 5, 7, O), A(7, -5, 11, 3, `#b3452d`), {
            k: `c`,
            x: 23,
            y: -3,
            r: 8,
            f: Hi,
            s: E,
            lw: 1
        }, {
            k: `c`,
            x: 23,
            y: -3,
            r: 3,
            f: k,
            s: E,
            lw: .8
        }, M([17, -9, 29, 3], Vi, 1), M([17, 3, 29, -9], Vi, 1)]
    },
    rocket: {
        label: `ROCKET`,
        hold: `shoulder`,
        muzzle: 30,
        muzzleY: -2,
        fore: [12, 4],
        kick: 7,
        flash: 14,
        shapes: [A(-16, -6.4, 44, 8.6, Gi, 2), j([28, -7.4, 32, -8.6, 32, 4.4, 28, 3.2], Gi), j([-16, -6, -20, -8, -20, 4.4, -16, 2.4], `#2c2934`), A(-3, -10.4, 7, 4, O, .6), A(-2, 2, 3.6, 7.6, O, .5), A(9, 2, 3.6, 6.6, O, .5), M([-14, -4.6, 26, -4.6], hi, 1.4), A(18, -6.4, 3, 8.6, hi, .4, E, .6), j([32, -5.8, 37.5, -2, 32, 1.8], `#b54434`)]
    },
    grenadeLauncher: {
        label: `LAUNCHER`,
        hold: `rifle`,
        muzzle: 26,
        muzzleY: -2.2,
        fore: [16, 1.2],
        kick: 5,
        flash: 12,
        shapes: [A(-15, -4, 9, 3, k, .6), A(-6, -5.6, 8, 6, O, .8), {
            k: `c`,
            x: 6,
            y: -1.8,
            r: 6.2,
            f: k,
            s: E,
            lw: 1
        }, {
            k: `c`,
            x: 6,
            y: -1.8,
            r: 1.4,
            f: O
        }, ...[0, 1, 2, 3, 4, 5].map(e => ({
            k: `c`,
            x: 6 + Math.cos(e * 1.047) * 3.8,
            y: -1.8 + Math.sin(e * 1.047) * 3.8,
            r: 1,
            f: O
        })), A(11, -6, 15, 7.6, O, 1.4), A(13, 1.4, 6, 3.2, k, .5), j([-2, .4, 2, .4, 1, 6.8, -3, 6.4], O)]
    },
    laser: {
        label: `PHASOR`,
        hold: `rifle`,
        muzzle: 29,
        muzzleY: -2,
        fore: [15, 1.4],
        kick: 1.5,
        flash: 9,
        shapes: [j([-12, -3, -4, -6.4, 22, -6, 28, -3.4, 28, .6, 6, 2.6, -12, 1.6], `#dfe6ec`), A(4, -4.6, 18, 2.8, `#7f45d8`, 1.2, E, .8), M([6, -3.2, 20, -3.2], `#e4d0ff`, 1), A(27, -4, 3, 4, `#c9a2ff`, .6, E, .8), j([-2, 1.6, 2.4, 1.6, 1.4, 7.4, -2.8, 7], `#4a5560`), A(-11, -2.4, 4, 2.4, `#7f45d8`, .5, E, .5)]
    },
    flamer: {
        label: `FLAMER`,
        hold: `rifle`,
        muzzle: 29,
        muzzleY: -2.6,
        fore: [15, 1.2],
        kick: .8,
        flash: 0,
        shapes: [A(-10, .6, 15, 7.8, `#b6422a`, 3), M([-8, 2.6, 3, 2.6], `#de7a52`, 1.2), A(-4, -5, 16, 4.6, k, 1), A(12, -4, 16, 2.8, O, .4), A(26.5, -5, 3.4, 4.8, Vi, .6), j([-1, .8, 3, .8, 2, 6.8, -2, 6.4], O), {
            k: `c`,
            x: 30.5,
            y: -.6,
            r: 1.2,
            f: `#ffb648`,
            s: `#ffb648`,
            lw: .1
        }]
    },
    machete: {
        label: `MACHETE`,
        hold: `blade`,
        muzzle: 34,
        muzzleY: -1,
        kick: 0,
        flash: 0,
        shapes: [A(-5, -2.2, 9, 4.4, `#1f1f1f`, 1.4), A(3.6, -3.2, 1.8, 6.4, k, .3), j([5.2, -2.6, 28, -4.6, 34, -3.2, 31.5, 1.6, 5.2, 1.8], Hi), M([7, -1.4, 29, -3.2], `#eef1f3`, .9)]
    },
    emp: {
        label: `EMP`,
        hold: `rifle`,
        muzzle: 28,
        muzzleY: -3,
        fore: [14, 1],
        kick: 2,
        flash: 6,
        shapes: [j([-16, -4, -6, -5, -6, 2, -15, 4], O), A(-6, -7, 25, 10, k), A(1, 2, 5, 7, O), A(17, -8, 11, 12, O, 2), A(20, -6, 4, 8, `#70e4f4`, 1), M([1, -5, 12, -5], `#70e4f4`, 1.2)]
    },
    shield: {
        label: `SHIELD`,
        hold: `shield`,
        muzzle: 0,
        muzzleY: 0,
        kick: 0,
        flash: 0,
        shapes: [A(-6, -2, 9, 4, O, 1)]
    }
}
  , qi = {
    pistol: [M([1, -3.4, 10, -3.4], hi, 1.1)],
    magnum: [M([6, -3.6, 16, -3.6], hi, .9)],
    uzi: [M([-5, -1.6, 10, -1.6], hi, 1.1)],
    smg: [M([-2, -1.6, 14, -1.6], hi, 1.1)],
    rifle: [M([-14.5, -1, -7, -1], hi, 1.4)],
    ak47: [M([-15.5, .2, -7, -1.8], hi, 1.3)],
    m14: [M([-16, 1, -8, -.8], hi, 1.3)],
    sniper: [M([-17, 1.6, -8, .6], hi, 1.3), M([0, -10, 10, -10], hi, .9)],
    shotgun: [M([-15, 1.2, -7, -1.2], hi, 1.3)],
    saw: [M([-13, .6, -6, -1.6], hi, 1.3)],
    grenadeLauncher: [M([12, -3.4, 25, -3.4], hi, 1.1)],
    flamer: [M([-3, -2.6, 11, -2.6], hi, 1)],
    machete: [A(-3.6, -2.2, 1.3, 4.4, hi, .3, E, .3), A(-.6, -2.2, 1.3, 4.4, hi, .3, E, .3)],
    emp: [M([-14.5, .4, -7, -1.4], hi, 1.3)]
};
for (let[e,t] of Object.entries(qi)) {
    let n = Ki[e];
    n && (n.shapes = [...n.shapes, ...t])
}
Ki.gun = Ki.rifle;
function Ji(e) {
    return Ki[e ?? `pistol`] ?? Ki.rifle
}
function Yi() {
    return [A(8, -21, 6, 40, `#a9c7d6`, 2, E, 1.6), {
        k: `r`,
        x: 9.3,
        y: -19,
        w: 3.4,
        h: 36,
        r: 1.2,
        f: `#d9edf6`,
        o: .55
    }, A(8.6, -15, 4.8, 7, `#25303a`, 1, E, .9), M([10, -12.5, 12, -12.5], `#7fd0e8`, .9), M([11, -2, 11, 14], `#6f8fa0`, .9), M([9.4, -18.6, 12.6, -18.6], hi, 1.6)]
}
var Xi = {
    frag: () => [{
        k: `e`,
        x: 0,
        y: 1,
        rx: 4.2,
        ry: 5.2,
        f: `#4a4656`,
        s: E,
        lw: 1.1
    }, M([-3.9, 1, 3.9, 1], hi, 1.4), M([-3.2, 3.6, 3.2, 3.6], `#2c2934`, .8), M([0, -3.4, 0, 5.6], `#2c2934`, .8), A(-1.8, -6.2, 3.6, 2.4, Vi, .4, E, .8), M([1.6, -5.4, 4.6, -3, 4.2, 0], k, .9)],
    gas: () => [A(-3.6, -5, 7.2, 10.6, `#8d9396`, 1.6, E, 1.1), A(-3.6, -1.4, 7.2, 2.6, `#7fc241`, .3, E, .6), A(-2, -7.2, 4, 2.4, O, .4, E, .7), M([2, -6.2, 5, -4.4], k, .9)],
    mine: () => [{
        k: `e`,
        x: 0,
        y: 1.5,
        rx: 7,
        ry: 3,
        f: `#3d4245`,
        s: E,
        lw: 1.1
    }, A(-4.6, -2.4, 9.2, 3.6, `#5d6467`, 1.2, E, .9), A(-1.4, -4, 2.8, 1.8, O, .3, E, .6)]
};
function Zi(e, t) {
    e.lineJoin = `round`,
    e.lineCap = `round`;
    for (let n of t) {
        if (e.beginPath(),
        n.k === `c`)
            e.arc(n.x, n.y, Math.max(0, n.r), 0, Math.PI * 2);
        else if (n.k === `e`)
            e.ellipse(n.x, n.y, Math.max(0, n.rx), Math.max(0, n.ry), n.a ?? 0, 0, Math.PI * 2);
        else if (n.k === `r`)
            e.roundRect(n.x, n.y, n.w, n.h, Math.max(0, Math.min(n.r ?? 0, n.w / 2, n.h / 2)));
        else {
            let t = n.d;
            e.moveTo(t[0] ?? 0, t[1] ?? 0);
            for (let n = 2; n < t.length; n += 2)
                e.lineTo(t[n] ?? 0, t[n + 1] ?? 0);
            n.open || e.closePath()
        }
        let t = n.o === void 0 ? -1 : e.globalAlpha;
        t >= 0 && (e.globalAlpha = t * n.o),
        n.f && !(n.k === `p` && n.open) && (e.fillStyle = n.f,
        e.fill()),
        n.s && (e.strokeStyle = n.s,
        e.lineWidth = n.lw ?? 1,
        e.stroke()),
        t >= 0 && (e.globalAlpha = t)
    }
}
function Qi(e) {
    return e.hold === `pistol` ? [10, 0] : e.hold === `shoulder` ? [2, -2] : e.hold === `blade` ? [8, 1] : e.hold === `shield` ? [6, 1] : [7, 1]
}
var $i = class {
    maxEntries;
    maxWeight;
    weigh;
    map = new Map;
    used = 0;
    constructor(e, t=1 / 0, n= () => 1) {
        this.maxEntries = e,
        this.maxWeight = t,
        this.weigh = n
    }
    get size() {
        return this.map.size
    }
    get weight() {
        return this.used
    }
    has(e) {
        return this.map.has(e)
    }
    get(e) {
        let t = this.map.get(e);
        return t !== void 0 && (this.map.delete(e),
        this.map.set(e, t)),
        t
    }
    set(e, t) {
        let n = this.map.get(e);
        n !== void 0 && (this.map.delete(e),
        this.used -= this.weigh(n)),
        this.map.set(e, t),
        this.used += this.weigh(t);
        for (let[t,n] of this.map) {
            if (this.map.size <= 1 || this.map.size <= this.maxEntries && this.used <= this.maxWeight || t === e)
                break;
            this.map.delete(t),
            this.used -= this.weigh(n)
        }
        return t
    }
    clear() {
        this.map.clear(),
        this.used = 0
    }
    keys() {
        return [...this.map.keys()]
    }
}
  , ea = e => Math.max(-4, Math.min(4, Math.round(e * 4)))
  , ta = e => (Math.round(e * 1e3) / 1e3).toString()
  , na = e => e < 2.5 ? 2 : 1;
function ra(e, t=[1 / 0, 1 / 0, -1 / 0, -1 / 0], n=0, r=0, i=1) {
    let a = (e, a, o) => {
        e = n + e * i,
        a = r + a * i,
        o *= i,
        e - o < t[0] && (t[0] = e - o),
        a - o < t[1] && (t[1] = a - o),
        e + o > t[2] && (t[2] = e + o),
        a + o > t[3] && (t[3] = a + o)
    }
    ;
    for (let t of e) {
        let e = t.s ? (t.lw ?? 1) / 2 : 0;
        if (t.k === `c`)
            a(t.x, t.y, t.r + e);
        else if (t.k === `e`)
            a(t.x, t.y, Math.max(t.rx, t.ry) + e);
        else if (t.k === `r`)
            a(t.x, t.y, e),
            a(t.x + t.w, t.y + t.h, e);
        else
            for (let n = 0; n + 1 < t.d.length; n += 2)
                a(t.d[n], t.d[n + 1], e)
    }
    return t
}
var ia = (e, t) => [Math.min(e[0], t[0]), Math.min(e[1], t[1]), Math.max(e[2], t[2]), Math.max(e[3], t[3])]
  , aa = class {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    set(e, t, n, r, i, a) {
        return this.a = e,
        this.b = t,
        this.c = n,
        this.d = r,
        this.e = i,
        this.f = a,
        this
    }
    copy(e) {
        return this.set(e.a, e.b, e.c, e.d, e.e, e.f)
    }
    translate(e, t) {
        return this.e += this.a * e + this.c * t,
        this.f += this.b * e + this.d * t,
        this
    }
    scale(e, t) {
        return this.a *= e,
        this.b *= e,
        this.c *= t,
        this.d *= t,
        this
    }
    rotate(e) {
        if (!e)
            return this;
        let t = Math.cos(e)
          , n = Math.sin(e)
          , {a: r, b: i, c: a, d: o} = this;
        return this.a = r * t + a * n,
        this.b = i * t + o * n,
        this.c = a * t - r * n,
        this.d = o * t - i * n,
        this
    }
    apply(e) {
        e.setTransform(this.a, this.b, this.c, this.d, this.e, this.f)
    }
}
  , oa = 1.7
  , sa = 1.6
  , ca = [1.4722000000000002, .715 - .715 * sa, .072 - .072 * sa, .213 - .213 * sa, 1.1709999999999998, .072 - .072 * sa, .213 - .213 * sa, .715 - .715 * sa, 1.5568000000000002]
  , la = e => e < 0 ? 0 : e > 255 ? 255 : e;
function ua(e) {
    for (let t = 0; t < e.length; t += 4) {
        if (e[t + 3] === 0)
            continue;
        let n = la(e[t] * oa)
          , r = la(e[t + 1] * oa)
          , i = la(e[t + 2] * oa);
        e[t] = la(ca[0] * n + ca[1] * r + ca[2] * i),
        e[t + 1] = la(ca[3] * n + ca[4] * r + ca[5] * i),
        e[t + 2] = la(ca[6] * n + ca[7] * r + ca[8] * i)
    }
    return e
}
var da = new Map;
function fa(e) {
    let t = da.get(e);
    if (t)
        return t;
    let n = parseInt(e.slice(1, 7), 16);
    if (Number.isNaN(n) || e.length !== 7)
        return e;
    let r = ua([n >> 16 & 255, n >> 8 & 255, n & 255, 255]);
    return t = `#` + Array.from(r.slice(0, 3), e => Math.round(e).toString(16).padStart(2, `0`)).join(``),
    da.set(e, t),
    t
}
var pa = e => e.canvas.width * e.canvas.height;
function ma(e, t, n, r=na(t)) {
    let i = Math.ceil(-e[0] * t) + 1
      , a = Math.ceil(-e[1] * t) + 1
      , o = Math.max(1, i + Math.ceil(e[2] * t) + 1)
      , s = Math.max(1, a + Math.ceil(e[3] * t) + 1)
      , c = document.createElement(`canvas`);
    c.width = o * r,
    c.height = s * r;
    let l = c.getContext(`2d`);
    return l && (l.setTransform(t * r, 0, 0, t * r, i * r, a * r),
    n(l)),
    {
        canvas: c,
        ox: i,
        oy: a,
        w: o,
        h: s,
        k: t,
        ss: r
    }
}
function ha(e) {
    let t = document.createElement(`canvas`);
    t.width = e.canvas.width,
    t.height = e.canvas.height;
    let n = t.getContext(`2d`, {
        willReadFrequently: !0
    });
    if (n && t.width && t.height) {
        n.drawImage(e.canvas, 0, 0);
        try {
            let e = n.getImageData(0, 0, t.width, t.height);
            ua(e.data),
            n.putImageData(e, 0, 0)
        } catch {}
    }
    return {
        ...e,
        canvas: t
    }
}
var ga = (e, t, n) => Math.max(t, Math.min(n, e))
  , N = e => {
    let t = Math.sin(e * 127.1 + 311.7) * 43758.5453;
    return t - Math.floor(t)
}
  , _a = `"JC Russo", "Russo One", "Arial Black", Arial, sans-serif`
  , va = `#b11d17`
  , ya = 256
  , ba = 260
  , xa = 420
  , Sa = (e, t, n, r) => {
    for (let i = Math.floor(e / n) - 2; i * n < t + n * 2; i++)
        r(i * n, i)
}
  , Ca = e => `${e.hat}.${e.hair}.${e.face}.${e.skin}.${e.shirt}.${e.pants}.${e.boots}`
  , wa = (e, t=1) => [e[0] - t, e[1] - t, e[2] + t, e[3] + t]
  , Ta = {
    outpost: {
        id: `outpost`,
        terrain: {
            light: `#aaaaaa`,
            face: `#808080`,
            deep: `#565656`
        }
    },
    catacombs: {
        id: `catacombs`,
        terrain: {
            light: `#a8998a`,
            face: `#7b6e60`,
            deep: `#4b4038`
        }
    },
    highrise: {
        id: `highrise`,
        terrain: {
            light: `#b8b7b0`,
            face: `#8f8e88`,
            deep: `#5c5b57`
        }
    },
    bunker: {
        id: `bunker`,
        terrain: {
            light: `#a2a8ac`,
            face: `#71777b`,
            deep: `#464b4f`
        }
    },
    snow: {
        id: `snow`,
        terrain: {
            light: `#c7d1d7`,
            face: `#95a1a9`,
            deep: `#66727b`
        },
        cap: `snow`
    },
    desert: {
        id: `desert`,
        terrain: {
            light: `#d8c08f`,
            face: `#b4976a`,
            deep: `#7f6847`
        }
    },
    moon: {
        id: `moon`,
        terrain: {
            light: `#b9b9bf`,
            face: `#8d8d95`,
            deep: `#5d5d66`
        }
    }
}
  , Ea = {
    metal: {
        light: `#a3aab0`,
        face: `#767e85`,
        deep: `#4b5258`
    },
    concrete: {
        light: `#b8b6ae`,
        face: `#908e87`,
        deep: `#5f5d58`
    },
    dirt: {
        light: `#a8835b`,
        face: `#9b7056`,
        deep: `#62483f`
    },
    grass: {
        light: `#a8835b`,
        face: `#9b7056`,
        deep: `#62483f`
    },
    sand: {
        light: `#e0c995`,
        face: `#c4a873`,
        deep: `#8e7650`
    }
}
  , Da = `DGCWSBMNI`
  , Oa = `dcspn`
  , ka = {
    d: `#5b4a39`,
    c: `#56595c`,
    s: `#a38a62`,
    p: `#8f7652`,
    n: `#8798aa`
};
function Aa(e, t) {
    switch (e) {
    case `D`:
    case `G`:
        return {
            light: `#c49a77`,
            face: `#9b7056`,
            deep: `#62483f`
        };
    case `C`:
        return t.id === `bunker` ? Ta.bunker.terrain : {
            light: `#aaaaaa`,
            face: `#808080`,
            deep: `#565656`
        };
    case `W`:
        return {
            light: `#b47f47`,
            face: `#8b5a2e`,
            deep: `#5e3c1d`
        };
    case `S`:
        return {
            light: `#e0c995`,
            face: `#c4a873`,
            deep: `#8e7650`
        };
    case `B`:
        return {
            light: `#dcc28c`,
            face: `#b9996a`,
            deep: `#86704c`
        };
    case `M`:
        return Ta.moon.terrain;
    case `N`:
        return {
            light: `#f4f8fb`,
            face: `#cfdbe4`,
            deep: `#9fb0be`
        };
    case `I`:
        return {
            light: `#e0f3fa`,
            face: `#a9d8ea`,
            deep: `#7fbcd6`
        };
    default:
        return t.terrain
    }
}
function ja(e, t, n) {
    for (let r = -2; r <= 2; r++)
        if (e(t + r, n) === `G` || e(t + r, n + 1) === `G`)
            return !0;
    return !1
}
function Ma(e, t, n, r) {
    let i = e + 8
      , a = t + 8
      , o = (e, t) => e >= -8 && e < i && t >= -8 && t < a && r(e, t)
      , s = new Map
      , c = (t, n) => (n + 8 + 1) * (e + 16 + 3) + (t + 8 + 1)
      , l = (e, t, n, r) => {
        let i = c(e, t)
          , a = s.get(i) ?? [];
        a.push(n, r),
        s.set(i, a)
    }
    ;
    for (let e = -8; e < a; e++)
        for (let t = -8; t < i; t++)
            o(t, e) && (o(t, e - 1) || l(t, e, t + 1, e),
            o(t + 1, e) || l(t + 1, e, t + 1, e + 1),
            o(t, e + 1) || l(t + 1, e + 1, t, e + 1),
            o(t - 1, e) || l(t, e + 1, t, e));
    let u = [];
    for (let[t,r] of s)
        for (; r.length; ) {
            let i = e + 16 + 3
              , a = t % i - 8 - 1
              , o = Math.floor(t / i) - 8 - 1
              , l = a
              , d = o
              , f = r.shift()
              , p = r.shift()
              , m = [a, o];
            for (let e = 0; e < 4e5; e++) {
                let e = f - l
                  , t = p - d;
                if (l = f,
                d = p,
                l === a && d === o)
                    break;
                m.push(l, d);
                let n = s.get(c(l, d));
                if (!n || !n.length)
                    break;
                let r = 0;
                if (n.length > 2)
                    for (let i = 0; i < n.length; i += 2) {
                        let a = n[i] - l;
                        if (e * (n[i + 1] - d) - t * a < 0) {
                            r = i;
                            break
                        }
                    }
                f = n[r],
                p = n[r + 1],
                n.splice(r, 2)
            }
            m.length >= 6 && u.push(Pa(Pa(Na(m).map(e => e * n), n * .5), n * .28))
        }
    let d = new Path2D;
    for (let e of u) {
        d.moveTo(e[0], e[1]);
        for (let t = 2; t < e.length; t += 2)
            d.lineTo(e[t], e[t + 1]);
        d.closePath()
    }
    return {
        path: d,
        loops: u
    }
}
function Na(e) {
    let t = []
      , n = e.length / 2;
    for (let r = 0; r < n; r++) {
        let i = e[(r - 1 + n) % n * 2]
          , a = e[(r - 1 + n) % n * 2 + 1]
          , o = e[r * 2]
          , s = e[r * 2 + 1]
          , c = e[(r + 1) % n * 2]
          , l = e[(r + 1) % n * 2 + 1];
        i === o && o === c || a === s && s === l || i === o && a === s || t.push(o, s)
    }
    return t
}
function Pa(e, t) {
    let n = []
      , r = e.length / 2;
    for (let i = 0; i < r; i++) {
        let a = e[(i - 1 + r) % r * 2]
          , o = e[(i - 1 + r) % r * 2 + 1]
          , s = e[i * 2]
          , c = e[i * 2 + 1]
          , l = e[(i + 1) % r * 2]
          , u = e[(i + 1) % r * 2 + 1]
          , d = Math.hypot(a - s, o - c)
          , f = Math.hypot(l - s, u - c);
        if (d < 1e-6 || f < 1e-6) {
            n.push(s, c);
            continue
        }
        let p = Math.min(t, d / 2)
          , m = Math.min(t, f / 2);
        n.push(s + (a - s) / d * p, c + (o - c) / d * p, s + (l - s) / f * m, c + (u - c) / f * m)
    }
    return n
}
function Fa(e) {
    let t = e => /moon|lunar|space/.test(e) ? `moon` : /cata|cave|tomb|crypt|tunnel|ruin/.test(e) ? `catacombs` : /high|tower|rise|city|roof|urban|sky/.test(e) ? `highrise` : /bunk|reactor|facility|indus|factory|lab|depot|base\b|yard|hangar/.test(e) ? `bunker` : /snow|ice|frost|glacier|blind|winter|arctic/.test(e) ? `snow` : /desert|sand|dune|bazaar|pyramid/.test(e) ? `desert` : /outpost|jungle|forest|canopy|drydock/.test(e) ? `outpost` : null;
    return (typeof e.theme == `string` ? t(e.theme.toLowerCase()) : null) ?? t(e.id.toLowerCase()) ?? `outpost`
}
var Ia = class {
    canvas;
    ctx;
    width = 1;
    height = 1;
    dpr = 1;
    scale = 1;
    baseScale = 1;
    scopeLevel = 1;
    backdrop = `auto`;
    camera = {
        x: 0,
        y: 0
    };
    shake = 0;
    shakeX = 0;
    shakeY = 0;
    flash = 0;
    hitMark = {
        t: 0,
        life: .2,
        kill: !1
    };
    damageFrom = [];
    focus = null;
    elapsed = 0;
    lastEvent = 0;
    lastTick = -1;
    lastMap = ``;
    lastLocal = null;
    map = null;
    particles = [];
    recoil = new Map;
    muzzle = new Map;
    hurt = new Map;
    seen = new Map;
    bounces = new Map;
    prepared = new WeakMap;
    gridPrepared = new WeakMap;
    reduced = !1;
    k = 1;
    world = new aa;
    m = new aa;
    sprites = new $i(640,16e6,pa);
    strips = new Map;
    stripKey = ``;
    fontEpoch = 0;
    stainList = [];
    stainChunks = new Map;
    stainScale = 0;
    colorMemo = new Map;
    quality = 1;
    frameMs = 1e3 / 60;
    slowFor = 0;
    fastFor = 0;
    media;
    motionChange = () => {
        this.reduced = this.media.matches
    }
    ;
    observer;
    constructor(e) {
        this.canvas = e;
        let t = e.getContext(`2d`, {
            alpha: !1
        });
        if (!t)
            throw Error(`Your browser does not support Canvas 2D.`);
        this.ctx = t,
        this.media = window.matchMedia(`(prefers-reduced-motion: reduce)`),
        this.reduced = this.media.matches,
        this.media.addEventListener(`change`, this.motionChange),
        this.observer = new ResizeObserver( () => this.resize()),
        this.observer.observe(e),
        this.resize();
        try {
            typeof FontFace < `u` && document.fonts && new FontFace(`JC Russo`,`url(/fonts/russo-one-latin.woff2)`).load().then(e => {
                document.fonts.add(e),
                this.fontEpoch++
            }
            ).catch( () => void 0)
        } catch {}
    }
    resize() {
        let e = this.canvas.getBoundingClientRect();
        this.width = Math.max(1, e.width),
        this.height = Math.max(1, e.height),
        this.dpr = Math.min(window.devicePixelRatio || 1, 2),
        this.canvas.width = Math.round(this.width * this.dpr),
        this.canvas.height = Math.round(this.height * this.dpr),
        this.baseScale = this.width < this.height ? Math.max(this.width / 560, this.height / 980) : Math.max(this.width / 900, this.height / 540),
        this.scale = this.baseScale / (1 + (this.scopeLevel - 1) * .32)
    }
    setFocus(e, t=`killer`) {
        this.focus = e ? {
            id: e,
            kind: t
        } : null
    }
    setScope(e) {
        this.scopeLevel = typeof e == `boolean` ? e ? 3 : 1 : ga(e, 1, 7),
        this.scale = this.baseScale / (1 + (this.scopeLevel - 1) * .32)
    }
    setBackdrop(e) {
        this.backdrop = e
    }
    screenToWorld(e, t) {
        let n = this.canvas.getBoundingClientRect();
        return {
            x: (e - n.left - this.width / 2) / this.scale + this.camera.x - this.shakeX,
            y: (t - n.top - this.height / 2) / this.scale + this.camera.y - this.shakeY
        }
    }
    destroy() {
        this.observer.disconnect(),
        this.media.removeEventListener(`change`, this.motionChange),
        this.particles = [],
        this.seen.clear(),
        this.recoil.clear(),
        this.muzzle.clear(),
        this.hurt.clear(),
        this.bounces.clear(),
        this.sprites.clear(),
        this.strips.clear(),
        this.clearStains()
    }
    adapt(e) {
        !(e > 0) || e > .25 || (this.frameMs += (e * 1e3 - this.frameMs) * .08,
        this.frameMs > 22 ? (this.slowFor += e,
        this.fastFor = 0) : this.frameMs < 18 ? (this.fastFor += e,
        this.slowFor = 0) : (this.slowFor = 0,
        this.fastFor = 0),
        this.slowFor > 1 && this.quality > .4 ? (this.quality = Math.max(.4, Math.round((this.quality - .2) * 10) / 10),
        this.slowFor = 0) : this.fastFor > 4 && this.quality < 1 && (this.quality = Math.min(1, Math.round((this.quality + .2) * 10) / 10),
        this.fastFor = 0))
    }
    budget(e) {
        return Math.round(e * this.quality)
    }
    fx(e) {
        return e <= 0 ? 0 : Math.max(1, Math.round(e * this.quality))
    }
    render(e, t, n) {
        let r = this.ctx;
        if (this.adapt(n),
        n = ga(n, 0, .05),
        this.elapsed += n,
        r.setTransform(this.dpr, 0, 0, this.dpr, 0, 0),
        this.backdrop === `menu` || this.backdrop === `auto` && t === null) {
            this.menuBackdrop();
            return
        }
        let i = ie.find(t => t.id === e.map) ?? ie[0];
        if (!i)
            return;
        this.map = i;
        let a = Ta[Fa(i)]
          , o = e.players.find(e => e.id === t)
          , s = this.lastMap !== e.map || e.tick < this.lastTick;
        s && (this.particles = [],
        this.lastEvent = 0,
        this.bounces.clear(),
        this.seen.clear(),
        this.clearStains(),
        this.hitMark.t = 0,
        this.damageFrom = []),
        s && e.events.length && (this.lastEvent = Math.max(0, ...e.events.map(e => e.id)) - 1);
        let c = this.width / this.scale / 2
          , l = this.height / this.scale / 2
          , u = o && (o.hp <= 0 || o.respawnTimer > 0) && this.focus ? e.players.find(e => e.id === this.focus.id && e.hp > 0 && e.respawnTimer <= 0) : void 0
          , d = u ?? o
          , f = d ? d.x + Math.cos(d.aim) * 70 : i.width * .5 + (this.reduced ? 0 : Math.sin(this.elapsed * .075) * 160)
          , p = d ? d.y - 25 + Math.sin(d.aim) * 30 : i.height * .55
          , m = i.width <= c * 2 ? i.width / 2 : ga(f, c, i.width - c)
          , h = i.height <= l * 2 ? i.height / 2 : ga(p, l - 80, i.height - l + 60)
          , g = s || this.lastLocal !== t ? 1 : 1 - Math.exp(-n * 7);
        this.camera.x += (m - this.camera.x) * g,
        this.camera.y += (h - this.camera.y) * g,
        this.lastMap = e.map,
        this.lastTick = e.tick,
        this.lastLocal = t;
        let _ = e.config.mode !== `ffa` && e.config.mode !== `survival`;
        for (let t of e.players)
            this.seen.set(t.id, {
                avatar: t.avatar ?? Oi(t.id),
                accent: this.accent(t, _),
                x: t.x,
                y: t.y,
                facing: Math.cos(t.aim) >= 0 ? 1 : -1
            });
        for (let t of e.events)
            t.id > this.lastEvent && (this.event(t, o, e),
            this.lastEvent = t.id);
        this.trackProjectiles(e.projectiles, n);
        let v = Math.exp(-n * 16);
        for (let e of [this.recoil, this.muzzle, this.hurt])
            for (let[t,r] of e) {
                let i = e === this.recoil ? r * v : r - n;
                i <= .01 ? e.delete(t) : e.set(t, i)
            }
        this.shake *= Math.exp(-n * 14),
        this.flash = Math.max(0, this.flash - n * 3),
        this.hitMark.t = Math.max(0, this.hitMark.t - n),
        this.damageFrom.length && (this.damageFrom = this.damageFrom.filter(e => (e.life -= n) > 0)),
        this.shakeX = this.reduced ? 0 : Math.sin(this.elapsed * 97) * this.shake,
        this.shakeY = this.reduced ? 0 : Math.cos(this.elapsed * 113) * this.shake * .7,
        this.k = this.dpr * this.scale,
        this.world.set(this.k, 0, 0, this.k, this.dpr * (this.width / 2 + this.scale * (this.shakeX - this.camera.x)), this.dpr * (this.height / 2 + this.scale * (this.shakeY - this.camera.y))),
        r.clearRect(0, 0, this.width, this.height),
        this.background(a, i),
        r.save(),
        r.translate(this.width / 2, this.height / 2),
        r.scale(this.scale, this.scale),
        r.translate(-this.camera.x + this.shakeX, -this.camera.y + this.shakeY),
        this.objectiveGround(e, i),
        this.terrain(i, a),
        this.stains(n);
        let ee, y = 170;
        if (o)
            for (let t of e.pickups) {
                let e = Math.hypot(o.x - t.x, o.y - t.y);
                t.timer <= 0 && e < y && (y = e,
                ee = t)
            }
        for (let t of e.pickups)
            t.timer <= 0 && this.pickup(t, t === ee);
        this.world.apply(r);
        for (let t of e.mines ?? [])
            this.mine(t.x, t.y, t.arm, o, t.owner);
        this.flags(e),
        this.bomb(e);
        for (let n of e.players)
            n.respawnTimer <= 0 && n.hp > 0 && this.player(n, e, _, n.id === t);
        for (let t of e.projectiles)
            this.projectile(t, e.tick);
        this.gas(e),
        this.drawParticles(n),
        o && o.hp > 0 && o.respawnTimer <= 0 && this.aimGuide(o),
        r.restore(),
        this.screenEffects(e, o, _, u)
    }
    menuBackdrop() {
        let e = this.ctx
          , t = this.width
          , n = this.height
          , r = e.createRadialGradient(t / 2, n * .42, 10, t / 2, n * .5, Math.max(t, n) * .75);
        r.addColorStop(0, `#1d1428`),
        r.addColorStop(.55, `#110b18`),
        r.addColorStop(1, `#07050a`),
        e.fillStyle = r,
        e.fillRect(0, 0, t, n);
        let i = this.reduced ? 0 : Math.sin(this.elapsed * .6) * .03
          , a = Math.max(t, n) / 1200;
        e.save(),
        e.fillStyle = `#1b1324`;
        for (let r = 0; r < 14; r++)
            this.clump(e, r / 13 * t, n * .98, (90 + N(r + 3) * 80) * a, r + 40, .65);
        e.fillRect(0, n * .98, t, n),
        e.fillStyle = `#1f1629`;
        for (let[r,o,s,c] of [[-30 * a, n * .12, 1, 1], [t + 30 * a, n * .1, -1, 2], [-50 * a, n * .62, 1, 3], [t + 60 * a, n * .6, -1, 4]])
            this.palm(e, r, o, 260 * a, s, i, c);
        e.restore();
        let o = e.createLinearGradient(0, n * .6, 0, n);
        o.addColorStop(0, `rgba(0,0,0,0)`),
        o.addColorStop(1, `rgba(0,0,0,.55)`),
        e.fillStyle = o,
        e.fillRect(0, 0, t, n)
    }
    palm(e, t, n, r, i, a, o) {
        e.save(),
        e.translate(t, n),
        e.scale(i, 1),
        e.rotate(a);
        for (let t = 0; t < 6; t++) {
            let n = -.75 + t * .36 + (N(o * 9 + t) - .5) * .25
              , i = r * (.7 + N(o + t) * .45)
              , a = r * (.22 + N(o * 5 + t) * .18)
              , s = e => ({
                x: i * e,
                y: e * e * a
            });
            e.save(),
            e.rotate(n),
            e.beginPath(),
            e.moveTo(0, 0);
            for (let t = 1; t <= 16; t++) {
                let n = t / 16
                  , i = s(n)
                  , a = s(Math.max(0, n - 1 / 32))
                  , o = Math.sin(n * Math.PI) * r * .2 + 4;
                e.lineTo(a.x + o * .35, a.y - o * .6),
                e.lineTo(i.x, i.y)
            }
            for (let t = 16; t >= 1; t--) {
                let n = t / 16;
                s(n);
                let i = s(Math.max(0, n - 1 / 32))
                  , a = Math.sin(n * Math.PI) * r * .26 + 4;
                e.lineTo(i.x + a * .25, i.y + a),
                e.lineTo(s(n - 1 / 16).x, s(n - 1 / 16).y)
            }
            e.closePath(),
            e.fill(),
            e.restore()
        }
        e.restore()
    }
    clump(e, t, n, r, i, a=.78) {
        let o = 9 + Math.floor(N(i) * 5);
        e.beginPath(),
        e.moveTo(t - r, n);
        for (let s = 0; s <= o * 2; s++) {
            let c = s / (o * 2)
              , l = Math.PI - c * Math.PI + (N(i * 7 + s) - .5) * (Math.PI / o) * .9
              , u = s % 2 ? r * (.38 + N(i + s * 3) * .12) : r * (.7 + N(i * 3 + s) * .35);
            e.lineTo(t + Math.cos(l) * u, n - Math.sin(l) * u * a)
        }
        e.lineTo(t + r, n),
        e.closePath(),
        e.fill()
    }
    strip(e, t, n, r, i, a) {
        let o = this.ctx
          , s = this.k
          , c = this.width / this.scale
          , l = this.height / this.scale
          , u = this.camera.x * t
          , d = Math.max(r, -n)
          , f = Math.min(i, l - n);
        if (f <= d)
            return;
        let p = this.strips.get(e);
        if (!p || u < p.u0 || u + c > p.u1 || d < p.v0 || f > p.v1) {
            let t = u - c * .3
              , n = u + c * 1.3
              , o = Math.max(r, d - l * .3)
              , m = Math.min(i, f + l * .3)
              , h = p?.canvas ?? document.createElement(`canvas`)
              , g = Math.ceil((n - t) * s)
              , _ = Math.ceil((m - o) * s);
            (h.width !== g || h.height !== _) && (h.width = g,
            h.height = _);
            let v = h.getContext(`2d`);
            if (!v)
                return;
            v.setTransform(1, 0, 0, 1, 0, 0),
            v.clearRect(0, 0, g, _),
            v.setTransform(s, 0, 0, s, -t * s, -o * s),
            a(v, t, n),
            p = {
                canvas: h,
                u0: t,
                u1: n,
                v0: o,
                v1: m
            },
            this.strips.set(e, p)
        }
        o.save(),
        o.setTransform(1, 0, 0, 1, 0, 0),
        o.drawImage(p.canvas, Math.round((p.u0 - u) * s), Math.round((n + p.v0) * s)),
        o.restore()
    }
    starfield(e, t) {
        let n = this.ctx
          , r = this.k
          , i = this.strips.get(`stars`);
        if (!i) {
            let n = document.createElement(`canvas`);
            n.width = Math.max(1, Math.round(e * r)),
            n.height = Math.ceil((t * .75 + 2) * r);
            let a = n.getContext(`2d`);
            if (!a)
                return;
            a.setTransform(r, 0, 0, r, 0, 0);
            for (let n = 0; n < 90; n++) {
                let r = (N(n) * 2400 % e + e) % e
                  , i = N(n + 50) * t * .75;
                a.fillStyle = `rgba(255,255,255,${.35 + N(n + 9) * .6})`,
                a.fillRect(r, i, 1.6, 1.6)
            }
            i = {
                canvas: n,
                u0: 0,
                u1: e,
                v0: 0,
                v1: t * .75
            },
            this.strips.set(`stars`, i)
        }
        let a = Math.round((-this.camera.x * .02 % e + e) % e * r);
        n.save(),
        n.setTransform(1, 0, 0, 1, 0, 0),
        n.drawImage(i.canvas, a, 0),
        n.drawImage(i.canvas, a - i.canvas.width, 0),
        n.restore()
    }
    background(e, t) {
        let n = this.ctx;
        n.save(),
        n.scale(this.scale, this.scale);
        let r = this.width / this.scale
          , i = this.height / this.scale
          , a = `${e.id}|${this.k}|${r}|${i}`;
        a !== this.stripKey && (this.strips.clear(),
        this.stripKey = a);
        let o = this.camera.x
          , s = this.camera.y
          , c = i * .5 - (s - t.height * .55) * .18
          , l = (e, t) => {
            let a = n.createLinearGradient(0, 0, 0, i);
            a.addColorStop(0, e),
            a.addColorStop(1, t),
            n.fillStyle = a,
            n.fillRect(0, 0, r, i)
        }
          , u = (e, t, n) => {
            let i = o * e
              , a = Math.floor((i - t * 2) / t);
            for (let e = a; e * t - i < r + t * 2; e++)
                n(e * t - i, e)
        }
        ;
        if (e.id === `outpost` || e.id === `desert`) {
            let t = e.id === `desert`;
            l(t ? `#ecd9ae` : `#8edee8`, t ? `#f7ecd3` : `#dcf7ec`),
            t && (n.fillStyle = `#fbf3dd`,
            n.beginPath(),
            n.arc(r * .78 - o * .02, i * .2, 46, 0, Math.PI * 2),
            n.fill()),
            t || (n.fillStyle = `#fff8d8`,
            n.beginPath(),
            n.arc(r * .82 - o * .02, i * .18, 32, 0, Math.PI * 2),
            n.fill(),
            n.fillStyle = `#ffffff75`,
            u(.025, 420, (e, t) => {
                let r = i * .15 + N(t) * 90;
                n.beginPath(),
                n.ellipse(e, r, 58, 13, 0, 0, Math.PI * 2),
                n.ellipse(e - 16, r - 10, 26, 19, 0, 0, Math.PI * 2),
                n.ellipse(e + 16, r - 7, 24, 16, 0, 0, Math.PI * 2),
                n.fill()
            }
            )),
            n.beginPath(),
            n.moveTo(-10, i + 10),
            u(.05, 520, (e, t) => {
                let r = 120 + N(t * 1.7) * 150;
                n.lineTo(e, c - 20),
                n.quadraticCurveTo(e + 150, c - r - 30, e + 260, c - r),
                n.quadraticCurveTo(e + 380, c - r + 25, e + 520, c - 20)
            }
            ),
            n.lineTo(r + 10, i + 10),
            n.closePath(),
            n.fillStyle = t ? `#d9b98a` : `#81bbc0`,
            n.fill(),
            n.strokeStyle = t ? `#e8cfa6` : `#b6e8df`,
            n.lineWidth = 2,
            n.stroke();
            let a = t ? [[.14, 0, `#e3c690`], [.28, 70, `#d4b077`]] : [[.14, 0, `#98d59d`], [.28, 70, `#78bc91`]];
            for (let[e,o,s] of a) {
                n.fillStyle = s;
                let a = c + o;
                t ? (n.beginPath(),
                n.moveTo(-10, i + 10),
                u(e, 300, (e, t) => {
                    n.quadraticCurveTo(e + 150, a - 30 - N(t + o) * 40, e + 300, a)
                }
                ),
                n.lineTo(r + 10, i + 10),
                n.closePath(),
                n.fill()) : this.strip(`clump${o}`, e, c, o - 90, o + 15, (e, t, n) => {
                    e.fillStyle = s,
                    Sa(t, n, 64, (t, n) => this.clump(e, t, o + 14, 42 + N(n * 3.1 + o) * 48, n * 13 + o, .85))
                }
                ),
                n.fillStyle = s,
                n.fillRect(-10, a + 12, r + 20, i)
            }
            let s = n.createLinearGradient(0, c + 80, 0, i);
            s.addColorStop(0, t ? `#cfa96f` : `#70b68e`),
            s.addColorStop(1, t ? `#c09a62` : `#529e86`),
            n.fillStyle = s,
            n.fillRect(-10, c + 80, r + 20, i)
        } else if (e.id === `moon`) {
            l(`#05060c`, `#1a1c2a`),
            this.starfield(r, i);
            let e = r * .8 - o * .01
              , t = i * .2;
            n.fillStyle = `#3f7fd0`,
            n.beginPath(),
            n.arc(e, t, 34, 0, Math.PI * 2),
            n.fill(),
            n.fillStyle = `#5fa85a`,
            n.beginPath(),
            n.ellipse(e - 8, t - 6, 12, 8, .5, 0, Math.PI * 2),
            n.ellipse(e + 12, t + 10, 8, 6, -.4, 0, Math.PI * 2),
            n.fill(),
            n.fillStyle = `rgba(5,6,12,.55)`,
            n.beginPath(),
            n.arc(e + 12, t + 6, 34, -1.2, 1.9),
            n.fill();
            for (let[e,t,a] of [[.08, 0, `#4a4b57`], [.2, 70, `#5f606c`]])
                this.strip(`hills${t}`, e, c, t - 102, t + 86, (e, n, r) => {
                    e.fillStyle = a,
                    e.beginPath();
                    let i = n;
                    Sa(n, r, 260, (r, a) => {
                        let o = 30 + N(a * 3 + t) * 70;
                        i === n && e.moveTo(r, t + 96),
                        e.lineTo(r, t),
                        e.quadraticCurveTo(r + 60, t - o, r + 130, t - o * .8),
                        e.quadraticCurveTo(r + 200, t - o * .5, r + 260, t),
                        i = r + 260
                    }
                    ),
                    e.lineTo(i, t + 96),
                    e.closePath(),
                    e.fill(),
                    e.fillStyle = `rgba(0,0,0,.18)`,
                    Sa(n, r, 190, (n, r) => {
                        e.beginPath(),
                        e.ellipse(n + 60, t + 30 + N(r) * 40, 22 + N(r + 4) * 18, 6, 0, 0, Math.PI * 2),
                        e.fill()
                    }
                    )
                }
                ),
                n.fillStyle = a,
                n.fillRect(-10, c + t + 82, r + 20, i)
        } else if (e.id === `snow`) {
            l(`#c9dcea`, `#eef4f8`),
            n.beginPath(),
            n.moveTo(-10, i + 10),
            u(.05, 460, (e, t) => {
                let r = 150 + N(t * 2.3) * 170;
                n.lineTo(e, c),
                n.lineTo(e + 230, c - r),
                n.lineTo(e + 460, c)
            }
            ),
            n.lineTo(r + 10, i + 10),
            n.closePath(),
            n.fillStyle = `#dfe9f1`,
            n.fill(),
            n.strokeStyle = `#b9cbd8`,
            n.lineWidth = 2,
            n.stroke();
            for (let[e,t,a] of [[.15, 20, `#7f998f`], [.3, 80, `#61786f`]])
                this.strip(`pines${t}`, e, c, t - 142, t + 11, (e, n, r) => Sa(n, r, 70, (n, r) => {
                    let i = 70 + N(r * 5 + t) * 80
                      , o = t + 10;
                    e.fillStyle = a,
                    e.beginPath(),
                    e.moveTo(n, o - i);
                    for (let t = 1; t <= 4; t++)
                        e.lineTo(n + 8 + t * 6, o - i + t * i / 4.5),
                        e.lineTo(n + 4 + t * 3, o - i + t * i / 4.5);
                    for (let t = 4; t >= 1; t--)
                        e.lineTo(n - 4 - t * 3, o - i + t * i / 4.5),
                        e.lineTo(n - 8 - t * 6, o - i + t * i / 4.5);
                    e.closePath(),
                    e.fill(),
                    e.fillStyle = `#f4f8fb`,
                    e.beginPath(),
                    e.moveTo(n, o - i),
                    e.lineTo(n + 6, o - i + 12),
                    e.lineTo(n - 6, o - i + 12),
                    e.closePath(),
                    e.fill()
                }
                )),
                n.fillStyle = t > 50 ? `#e6eef3` : `#dbe5ec`,
                n.fillRect(-10, c + t + 8, r + 20, i)
        } else if (e.id === `highrise`) {
            l(`#9ec7df`, `#e2eff3`),
            this.strip(`clouds`, .03, 0, i * .15 - 30, i * .35 + 16, (e, t, n) => {
                e.fillStyle = `rgba(255,255,255,.75)`,
                Sa(t, n, 420, (t, n) => {
                    let r = i * .15 + N(n) * i * .2;
                    e.beginPath(),
                    e.ellipse(t, r, 60, 14, 0, 0, Math.PI * 2),
                    e.ellipse(t + 40, r - 9, 38, 14, 0, 0, Math.PI * 2),
                    e.fill()
                }
                )
            }
            );
            for (let[e,t,n,r] of [[.1, `#a9bccb`, `#bccbd7`, 0], [.24, `#8399ad`, `#9aaebf`, 90]])
                this.strip(`towers${r}`, e, c, r - 452, 152, (e, i, a) => Sa(i, a, 120, (i, a) => {
                    let o = 160 + N(a * 2.7 + r) * 260
                      , s = 90 + N(a + r) * 25
                      , c = r - o;
                    e.fillStyle = t,
                    e.fillRect(i, c, s, 152 - c),
                    N(a + 9) > .6 && e.fillRect(i + s * .4, c - 30, 4, 30),
                    e.fillStyle = n;
                    for (let t = c + 14; t < r + 60; t += 22)
                        for (let n = i + 10; n < i + s - 12; n += 18)
                            e.fillRect(n, t, 8, 10)
                }
                ));
            n.fillStyle = `#6f8396`,
            n.fillRect(-10, c + 150, r + 20, i)
        } else if (e.id === `bunker`) {
            l(`#41474b`, `#565d61`),
            n.strokeStyle = `#3a3f43`,
            n.lineWidth = 3,
            n.beginPath(),
            u(.3, 140, e => {
                n.moveTo(e, 0),
                n.lineTo(e, i)
            }
            ),
            n.stroke();
            for (let e = 0; e < 6; e++) {
                let t = ((e * 150 - s * .3) % 900 + 900) % 900 - 50;
                n.strokeStyle = `#3a3f43`,
                n.beginPath(),
                n.moveTo(0, t),
                n.lineTo(r, t),
                n.stroke(),
                n.strokeStyle = `#626a6f`,
                n.lineWidth = 1,
                n.beginPath(),
                n.moveTo(0, t + 3),
                n.lineTo(r, t + 3),
                n.stroke(),
                n.lineWidth = 3
            }
            for (let[e,t] of [[i * .22, 9], [i * .3, 6]])
                n.fillStyle = `#5e666b`,
                n.fillRect(-10, e - t, r + 20, t * 2),
                n.strokeStyle = `#2b2f32`,
                n.lineWidth = 1.5,
                n.strokeRect(-10, e - t, r + 20, t * 2),
                n.fillStyle = `#7a8287`,
                n.fillRect(-10, e - t + 2, r + 20, 2),
                n.fillStyle = `rgba(181,132,255,.7)`,
                n.fillRect(-10, e + t - 3, r + 20, 1.5),
                n.fillStyle = `#4c5357`,
                u(.3, 240, r => {
                    n.fillRect(r, e - t - 2, 10, t * 2 + 4)
                }
                );
            this.strip(`lamps`, .3, 0, i * .42 - 72, i * .42 + 112, (e, t, n) => Sa(t, n, 420, (t, n) => {
                let r = i * .42 + N(n) * 40
                  , a = e.createRadialGradient(t, r, 2, t, r, 70);
                a.addColorStop(0, `rgba(255,214,120,.35)`),
                a.addColorStop(1, `rgba(255,214,120,0)`),
                e.fillStyle = a,
                e.fillRect(t - 70, r - 70, 140, 140),
                e.fillStyle = `#ffd98a`,
                e.fillRect(t - 9, r - 4, 18, 8),
                e.strokeStyle = `#2b2f32`,
                e.lineWidth = 1.5,
                e.strokeRect(t - 9, r - 4, 18, 8)
            }
            )),
            this.strip(`hazard`, .3, 0, i * .78 - 1, i * .78 + 15, (e, t, n) => Sa(t, n, 560, t => {
                for (let n = 0; n < 8; n++)
                    e.fillStyle = n % 2 ? `#2b2b2b` : `#d9a92b`,
                    e.beginPath(),
                    e.moveTo(t + n * 14, i * .78),
                    e.lineTo(t + n * 14 + 14, i * .78),
                    e.lineTo(t + n * 14 + 4, i * .78 + 14),
                    e.lineTo(t + n * 14 - 10, i * .78 + 14),
                    e.closePath(),
                    e.fill()
            }
            ))
        } else
            l(`#2a211e`, `#3e312a`),
            n.fillStyle = `#352a24`,
            n.fillRect(-10, c - 260, r + 20, i),
            this.strip(`arches`, .14, c, -182, 122, (e, t, n) => Sa(t, n, 240, (t, n) => {
                if (e.fillStyle = `#211915`,
                e.beginPath(),
                e.moveTo(t + 50, 120),
                e.lineTo(t + 50, -110),
                e.arc(t + 120, -110, 70, Math.PI, 0),
                e.lineTo(t + 190, 120),
                e.closePath(),
                e.fill(),
                N(n * 3) > .45) {
                    let n = e.createRadialGradient(t + 120, -60, 3, t + 120, -60, 90);
                    n.addColorStop(0, `rgba(255,170,80,.32)`),
                    n.addColorStop(1, `rgba(255,170,80,0)`),
                    e.fillStyle = n,
                    e.fillRect(t + 30, -150, 180, 180)
                }
            }
            )),
            u(.14, 240, (e, t) => {
                N(t * 3) > .45 && (n.fillStyle = `#ffb455`,
                n.beginPath(),
                n.ellipse(e + 120, c - 64, 4, 7 + Math.sin(this.elapsed * 9 + t) * 1.5, 0, 0, Math.PI * 2),
                n.fill(),
                n.fillStyle = `#4a382c`,
                n.fillRect(e + 117, c - 58, 6, 14))
            }
            ),
            this.strip(`stalactites`, .22, 0, -10, 121, (e, t, n) => {
                e.fillStyle = `#1f1714`,
                Sa(t, n, 90, (t, n) => {
                    let r = 30 + N(n * 7) * 90;
                    e.beginPath(),
                    e.moveTo(t, -10),
                    e.lineTo(t + 26, -10),
                    e.lineTo(t + 12, r),
                    e.closePath(),
                    e.fill()
                }
                )
            }
            ),
            n.fillStyle = `#2a201b`,
            n.fillRect(-10, c + 120, r + 20, i);
        n.restore()
    }
    prepareGrid(e, t, n, r) {
        let i = this.gridPrepared.get(e);
        if (i && i.theme === t.id)
            return i;
        let a = n.length
          , o = Math.max(...n.map(e => e.length))
          , s = (e, t) => n[ga(t, 0, a - 1)]?.[ga(e, 0, o - 1)] ?? `.`
          , c = e => Da.includes(e)
          , l = Ma(o, a, r, (e, t) => c(s(e, t)))
          , u = Ma(o, a, r, (e, t) => s(e, t) !== `.`)
          , d = r * .5
          , f = new Map
          , p = new Map;
        for (let e = 0; e < a; e++)
            for (let t = 0; t < o; ) {
                let n = s(t, e)
                  , i = t + 1;
                for (; i < o && s(i, e) === n; )
                    i++;
                if (n !== `.`) {
                    let a = Da.includes(n) ? 0 : d
                      , o = f.get(n) ?? new Path2D;
                    o.rect(t * r - a, e * r - a, (i - t) * r + a * 2, r + a * 2),
                    f.set(n, o),
                    p.set(n, (p.get(n) ?? 0) + i - t)
                }
                t = i
            }
        let m = [...p].filter( ([e]) => Da.includes(e)).sort( (e, t) => t[1] - e[1])[0]?.[0] ?? `C`
          , h = new Map;
        for (let e of l.loops)
            for (let t = 0; t < e.length; t += 2) {
                let n = e[t]
                  , i = e[t + 1]
                  , a = e[(t + 2) % e.length]
                  , o = e[(t + 3) % e.length]
                  , c = Math.hypot(a - n, o - i);
                if (c < .5)
                    continue;
                let l = (o - i) / c
                  , u = -(a - n) / c;
                if (u > -.4)
                    continue;
                let d = (n + a) / 2 - l * r * .4
                  , f = (i + o) / 2 - u * r * .4
                  , p = s(Math.floor(d / r), Math.floor(f / r))
                  , m = p === `G` || p === `D` ? `G` : p === `N` || p === `I` ? `N` : ``;
                if (p === `D` && !ja(s, Math.floor(d / r), Math.floor(f / r)) || !m)
                    continue;
                let g = h.get(m) ?? new Path2D;
                g.moveTo(n, i),
                g.lineTo(a, o),
                h.set(m, g)
            }
        let g = [...f.keys()]
          , _ = {
            theme: t.id,
            base: m,
            solid: l.path,
            fill: u.path,
            materials: g.filter(e => Da.includes(e) && e !== m).map(e => [e, f.get(e)]),
            backdrop: g.filter(e => Oa.includes(e)).map(e => [e, f.get(e)]),
            lips: [...h]
        };
        return this.gridPrepared.set(e, _),
        _
    }
    gridTerrain(e, t, n, r) {
        let i = this.ctx
          , a = this.prepareGrid(e, t, n, r)
          , o = Math.max(3, r * .36);
        i.save(),
        i.lineJoin = `round`,
        i.lineCap = `round`,
        i.save(),
        i.clip(a.fill);
        for (let[e,t] of a.backdrop)
            i.fillStyle = ka[e] ?? `#4f4a44`,
            i.fill(t);
        i.restore(),
        i.strokeStyle = `rgba(20,20,20,.5)`,
        i.lineWidth = 2,
        i.stroke(a.fill),
        i.save(),
        i.clip(a.solid);
        let s = Aa(a.base, t);
        i.fillStyle = s.face,
        i.fill(a.solid),
        i.strokeStyle = D(s.face, -.35),
        i.lineWidth = o * 2 + 2.4,
        i.stroke(a.solid),
        i.strokeStyle = s.light,
        i.lineWidth = o * 2,
        i.stroke(a.solid);
        for (let[e,n] of a.materials) {
            if (Aa(e, t).face === s.face)
                continue;
            let r = Aa(e, t);
            i.save(),
            i.clip(n),
            i.fillStyle = r.face,
            i.fill(n),
            i.strokeStyle = D(r.face, -.35),
            i.lineWidth = o * 2 + 2.4,
            i.stroke(a.solid),
            i.strokeStyle = r.light,
            i.lineWidth = o * 2,
            i.stroke(a.solid),
            i.restore()
        }
        for (let[e,t] of a.lips) {
            let n = e === `G`;
            i.strokeStyle = n ? `#287955` : `#b9c9d6`,
            i.lineWidth = 17,
            i.stroke(t),
            i.strokeStyle = n ? `#4abf77` : `#f4f8fb`,
            i.lineWidth = 13,
            i.stroke(t),
            i.strokeStyle = n ? `#9ae99b` : `#ffffff`,
            i.lineWidth = 5,
            i.stroke(t)
        }
        i.restore(),
        i.strokeStyle = E,
        i.lineWidth = 4.4,
        i.stroke(a.solid),
        i.restore()
    }
    prepare(e, t) {
        let n = this.prepared.get(e);
        if (n && n.theme === t.id)
            return n;
        let r = []
          , i = new Map;
        for (let n of e.platforms) {
            let e = n.kind ?? `rock`;
            if (e === `bridge` || e === `crate` || e === `wood` || e === `ice`) {
                r.push(n);
                continue
            }
            let a = Ea[e] ?? (e === `snow` ? Ta.snow.terrain : t.terrain)
              , o = e === `snow` || t.cap === `snow` && (e === `rock` || e === `concrete`) ? `snow` : e === `grass` ? `grass` : null
              , s = `${a.light}${a.face}${o ?? ``}${e === `metal` ? `m` : ``}`
              , c = Math.min(n.w, n.h)
              , l = {
                p: n,
                pal: a,
                cap: o,
                metal: e === `metal`,
                b: c >= 28 ? 7 : Math.max(2, c * .25),
                sides: [{
                    exposed: !0,
                    open: []
                }, {
                    exposed: !0,
                    open: []
                }, {
                    exposed: !0,
                    open: []
                }, {
                    exposed: !0,
                    open: []
                }]
            }
              , u = i.get(s) ?? [];
            u.push(l),
            i.set(s, u)
        }
        let a = (e, t, n) => {
            let r = [[e, t]];
            for (let[e,t] of n)
                r = r.flatMap( ([n,r]) => t <= n || e >= r ? [[n, r]] : [...e > n ? [[n, e]] : [], ...t < r ? [[t, r]] : []]);
            return r.filter( ([e,t]) => t - e > .5)
        }
        ;
        for (let e of i.values())
            for (let t of e) {
                let {x: n, y: r, w: i, h: o} = t.p
                  , s = .5
                  , c = e.filter(e => e !== t).map(e => e.p)
                  , l = c.filter(e => e.y < r - s && e.y + e.h >= r - s && e.x < n + i && e.x + e.w > n).map(e => [e.x, e.x + e.w])
                  , u = c.filter(e => e.y <= r + o + s && e.y + e.h > r + o + s && e.x < n + i && e.x + e.w > n).map(e => [e.x, e.x + e.w])
                  , d = c.filter(e => e.x < n - s && e.x + e.w >= n - s && e.y < r + o && e.y + e.h > r).map(e => [e.y, e.y + e.h])
                  , f = c.filter(e => e.x <= n + i + s && e.x + e.w > n + i + s && e.y < r + o && e.y + e.h > r).map(e => [e.y, e.y + e.h]);
                [[l, n, n + i], [f, r, r + o], [u, n, n + i], [d, r, r + o]].forEach( ([e,n,r], i) => {
                    let o = a(n, r, e)
                      , s = o.reduce( (e, [t,n]) => e + n - t, 0);
                    t.sides[i] = {
                        open: o,
                        exposed: s > (r - n) * .4
                    }
                }
                )
            }
        let o = {
            theme: t.id,
            groups: [...i.values()],
            specials: r
        };
        return this.prepared.set(e, o),
        o
    }
    terrain(e, t) {
        let n = e.terrain;
        if (n && Array.isArray(n.grid) && n.grid.length && typeof n.cell == `number`) {
            this.gridTerrain(e, t, n.grid, n.cell);
            return
        }
        let r = this.ctx
          , i = this.prepare(e, t)
          , a = this.width / this.scale / 2 + 60
          , o = this.height / this.scale / 2 + 60
          , s = e => !(e.x + e.w < this.camera.x - a || e.x > this.camera.x + a || e.y + e.h < this.camera.y - o || e.y > this.camera.y + o)
          , c = (e, t) => e.some( ([e,n]) => t >= e - .6 && t <= n + .6);
        for (let e of i.groups) {
            let t = e.filter(e => s(e.p));
            if (!t.length)
                continue;
            let n = t[0].pal;
            r.fillStyle = E;
            for (let {p: e} of t)
                r.fillRect(e.x - 2.2, e.y - 2.2, e.w + 4.4, e.h + 4.4);
            r.fillStyle = n.light;
            for (let {p: e} of t)
                r.fillRect(e.x, e.y, e.w, e.h);
            r.save(),
            r.beginPath();
            for (let {p: e} of t)
                r.rect(e.x, e.y, e.w, e.h);
            r.clip();
            for (let e of t) {
                let {x: t, y: i, w: a, h: o} = e.p
                  , s = e.b
                  , [c,l,u,d] = e.sides
                  , f = c.exposed ? s : -s
                  , p = l.exposed ? s : -s
                  , m = u.exposed ? s : -s
                  , h = d.exposed ? s : -s;
                r.fillStyle = o >= 260 && a >= 60 ? n.deep : n.face,
                a - h - p > 0 && o - f - m > 0 && r.fillRect(t + h, i + f, a - h - p, o - f - m)
            }
            r.restore(),
            r.strokeStyle = E,
            r.lineWidth = 1,
            r.beginPath();
            for (let e of t) {
                let {x: t, y: n, w: i, h: a} = e.p
                  , o = e.b
                  , [s,l,u,d] = e.sides
                  , f = t + (d.exposed ? o : 0)
                  , p = t + i - (l.exposed ? o : 0)
                  , m = n + (s.exposed ? o : 0)
                  , h = n + a - (u.exposed ? o : 0);
                if (p <= f || h <= m)
                    continue;
                let g = (e, t, n, r) => {
                    for (let[i,a] of e) {
                        let e = Math.max(i, t)
                          , o = Math.min(a, n);
                        o > e && r(e, o)
                    }
                }
                ;
                s.exposed && g(s.open, f, p, (e, t) => {
                    r.moveTo(e, n + o),
                    r.lineTo(t, n + o)
                }
                ),
                u.exposed && g(u.open, f, p, (e, t) => {
                    r.moveTo(e, n + a - o),
                    r.lineTo(t, n + a - o)
                }
                ),
                d.exposed && g(d.open, m, h, (e, n) => {
                    r.moveTo(t + o, e),
                    r.lineTo(t + o, n)
                }
                ),
                l.exposed && g(l.open, m, h, (e, n) => {
                    r.moveTo(t + i - o, e),
                    r.lineTo(t + i - o, n)
                }
                ),
                s.exposed && d.exposed && c(s.open, t) && c(d.open, n) && (r.moveTo(t, n),
                r.lineTo(t + o, n + o)),
                s.exposed && l.exposed && c(s.open, t + i) && c(l.open, n) && (r.moveTo(t + i, n),
                r.lineTo(t + i - o, n + o)),
                u.exposed && d.exposed && c(u.open, t) && c(d.open, n + a) && (r.moveTo(t, n + a),
                r.lineTo(t + o, n + a - o)),
                u.exposed && l.exposed && c(u.open, t + i) && c(l.open, n + a) && (r.moveTo(t + i, n + a),
                r.lineTo(t + i - o, n + a - o))
            }
            r.stroke();
            for (let e of t) {
                let {x: t, y: n, w: i, h: a} = e.p;
                if (e.metal && e.sides[0].exposed) {
                    r.fillStyle = `#3d4246`;
                    for (let[t,i] of e.sides[0].open)
                        for (let a = t + 10; a < i - 6; a += 28)
                            r.fillRect(a, n + e.b / 2 - .8, 1.8, 1.8)
                }
                if (e.cap)
                    for (let[t,r] of e.sides[0].open)
                        r - t > 4 && this.cap(t, n, r - t, a, e.cap)
            }
        }
        for (let e of i.specials)
            this.platform(e)
    }
    platform(e) {
        let t = this.width / this.scale / 2 + 60
          , n = this.height / this.scale / 2 + 60;
        if (e.x + e.w < this.camera.x - t || e.x > this.camera.x + t || e.y + e.h < this.camera.y - n || e.y > this.camera.y + n)
            return;
        let r = this.ctx
          , {x: i, y: a, w: o, h: s} = e
          , c = e.kind ?? `rock`;
        if (r.save(),
        r.lineJoin = `miter`,
        c === `bridge`) {
            let e = Math.min(s, 7);
            if (r.fillStyle = `#9b9b9b`,
            r.fillRect(i, a, o, e),
            r.fillStyle = `#c4c4c4`,
            r.fillRect(i + 1, a + 1, o - 2, 2),
            s > e + 3) {
                let t = a + s - 3;
                r.strokeStyle = `#555`,
                r.lineWidth = 2,
                r.beginPath(),
                r.moveTo(i, t),
                r.lineTo(i + o, t);
                let n = Math.max(14, s * 1.4);
                for (let s = 0; s + n <= o + .1; s += n)
                    r.moveTo(i + s, a + e),
                    r.lineTo(i + s + n / 2, t),
                    r.lineTo(i + s + n, a + e);
                r.stroke(),
                r.strokeStyle = E,
                r.lineWidth = 1,
                r.strokeRect(i, t - 1.5, o, 3)
            }
            r.strokeStyle = E,
            r.lineWidth = 1.8,
            r.strokeRect(i, a, o, e),
            r.fillStyle = `#5e5e5e`;
            for (let t = 8; t < o - 4; t += 26)
                r.fillRect(i + t, a + e - 3, 2, 2)
        } else if (c === `crate`) {
            this.bevel(i, a, o, s, {
                light: `#b98a4f`,
                face: `#9a6c37`,
                deep: `#7a5228`
            }),
            r.strokeStyle = `#5d3e1d`,
            r.lineWidth = 2.5;
            let e = this.bevelSize(o, s);
            r.beginPath(),
            r.moveTo(i + e, a + e),
            r.lineTo(i + o - e, a + s - e),
            r.moveTo(i + o - e, a + e),
            r.lineTo(i + e, a + s - e),
            r.stroke(),
            r.strokeStyle = E,
            r.lineWidth = 2.2,
            r.strokeRect(i, a, o, s)
        } else if (c === `wood`) {
            r.fillStyle = `#9b6b3a`,
            r.fillRect(i, a, o, s),
            r.strokeStyle = `#6e4823`,
            r.lineWidth = 1.2;
            for (let e = 6; e < s; e += 7)
                r.beginPath(),
                r.moveTo(i, a + e),
                r.lineTo(i + o, a + e),
                r.stroke();
            for (let e = 30; e < o; e += 60)
                r.beginPath(),
                r.moveTo(i + e + e / 60 % 2 * 12, a),
                r.lineTo(i + e + e / 60 % 2 * 12, a + s),
                r.stroke();
            r.fillStyle = `#c08d55`,
            r.fillRect(i + 1, a + 1, o - 2, 2),
            r.strokeStyle = E,
            r.lineWidth = 2.2,
            r.strokeRect(i, a, o, s)
        } else if (c === `ice`) {
            this.bevel(i, a, o, s, {
                light: `#e0f3fa`,
                face: `#a9d8ea`,
                deep: `#7fbcd6`
            }),
            r.strokeStyle = `rgba(255,255,255,.75)`,
            r.lineWidth = 2;
            for (let e = 18; e < o - 10; e += 46)
                r.beginPath(),
                r.moveTo(i + e, a + s * .75),
                r.lineTo(i + e + Math.min(14, s * .4), a + s * .3),
                r.stroke()
        }
        r.restore()
    }
    bevelSize(e, t) {
        return ga(Math.min(e, t) * .14, 2.5, 10)
    }
    bevel(e, t, n, r, i) {
        let a = this.ctx
          , o = this.bevelSize(n, r);
        a.fillStyle = i.light,
        a.fillRect(e, t, n, r),
        n > o * 2 + 2 && r > o * 2 + 2 && (a.fillStyle = r >= 260 && n >= 60 ? i.deep : i.face,
        a.fillRect(e + o, t + o, n - o * 2, r - o * 2),
        a.strokeStyle = E,
        a.lineWidth = 1,
        a.strokeRect(e + o, t + o, n - o * 2, r - o * 2),
        a.beginPath(),
        a.moveTo(e, t),
        a.lineTo(e + o, t + o),
        a.moveTo(e + n, t),
        a.lineTo(e + n - o, t + o),
        a.moveTo(e, t + r),
        a.lineTo(e + o, t + r - o),
        a.moveTo(e + n, t + r),
        a.lineTo(e + n - o, t + r - o),
        a.stroke()),
        a.strokeStyle = E,
        a.lineWidth = 2.2,
        a.strokeRect(e, t, n, r)
    }
    cap(e, t, n, r, i) {
        let a = this.ctx
          , o = Math.min(7, r * .45);
        a.beginPath(),
        a.moveTo(e, t),
        a.lineTo(e + n, t),
        a.lineTo(e + n, t + o);
        for (let r = n; r > 9; r -= 9) {
            let n = i === `snow` ? o + (N(e + r) > .6 ? 4 : 0) : o + 3;
            a.lineTo(e + r - 4.5, t + n),
            a.lineTo(e + r - 9, t + o)
        }
        a.lineTo(e, t + o),
        a.closePath(),
        a.fillStyle = i === `snow` ? `#f4f8fb` : `#6f9a45`,
        a.fill(),
        a.strokeStyle = E,
        a.lineWidth = 1.2,
        a.stroke(),
        a.fillStyle = i === `snow` ? `#ffffff` : `#8fbc5c`,
        a.fillRect(e + 1, t + 1, n - 2, 1.6),
        a.fillStyle = E,
        a.fillRect(e - .5, t - 2.2, n + 1, 2.2)
    }
    cached(e, t, n) {
        let r = `${e}|${ta(this.k)}${t ? `|h` : ``}`
          , i = this.sprites.get(r);
        if (i)
            return i;
        if (t)
            return this.sprites.set(r, ha(this.cached(e, !1, n)));
        let[a,o] = n();
        return this.sprites.set(r, ma(wa(a), this.k, o))
    }
    drawSprite(e, t, n, r=0, i=1, a=0, o=0) {
        let s = this.ctx
          , c = this.world;
        r ? this.drawSpriteAt(e, this.m.copy(c).translate(t, n).rotate(r).translate(a, o).scale(i, 1)) : (s.setTransform(i, 0, 0, 1, Math.round(c.e + c.a * (t + a)), Math.round(c.f + c.d * (n + o))),
        s.drawImage(e.canvas, -e.ox, -e.oy, e.w, e.h))
    }
    drawSpriteAt(e, t) {
        t.apply(this.ctx),
        this.ctx.drawImage(e.canvas, -e.ox / e.k, -e.oy / e.k, e.w / e.k, e.h / e.k)
    }
    local(e, t, n=0, r=1) {
        this.m.copy(this.world).translate(e, t).rotate(n).scale(r, 1).apply(this.ctx)
    }
    label(e, t, n, r) {
        return this.cached(`lb|${t}|${n}|${r}|${this.fontEpoch}|${e}`, !1, () => {
            let i = this.ctx;
            i.save(),
            i.font = `${t}px ${_a}`;
            let a = i.measureText(e).width;
            return i.restore(),
            [[-a / 2 - 3, -t - 3, a / 2 + 3, t * .4 + 2], i => {
                i.font = `${t}px ${_a}`,
                i.textAlign = `center`,
                i.textBaseline = `alphabetic`,
                i.lineWidth = 3,
                i.strokeStyle = r,
                i.lineJoin = `round`,
                i.strokeText(e, 0, 0),
                i.fillStyle = n,
                i.fillText(e, 0, 0)
            }
            ]
        }
        )
    }
    colors(e) {
        let t = Ca(e)
          , n = this.colorMemo.get(t);
        return n || (n = ki(e),
        this.colorMemo.size > 256 && this.colorMemo.clear(),
        this.colorMemo.set(t, n)),
        n
    }
    accent(e, t) {
        return t ? pi[e.team % 2] ?? pi[0] : v[e.color % v.length] ?? `#399b89`
    }
    player(e, t, n, r) {
        let i = this.ctx
          , a = this.seen.get(e.id)
          , o = a?.avatar ?? e.avatar ?? Oi(e.id)
          , s = a?.accent ?? this.accent(e, n)
          , c = Math.cos(e.aim) >= 0 ? 1 : -1
          , l = Math.abs(e.vx)
          , u = e.grounded && l > 25 ? Math.sin(this.elapsed * 17 + e.x * .05) * Math.min(1, l / 150) : 0
          , d = !!e.crouching
          , f = !e.grounded
          , p = d || f ? 0 : ea(u)
          , m = {
            run: p / 4,
            air: f,
            crouch: d
        }
          , h = this.colors(o)
          , g = e.guns[e.activeGun]
          , _ = Ji(g?.id)
          , v = t.objective
          , ee = !!e.vip || v?.kind === `vip` && v.vips.includes(e.id)
          , y = (this.hurt.get(e.id) ?? 0) > 0
          , x = f && !this.reduced ? ga(e.vx / 2400, -.08, .08) : 0
          , te = Ca(o)
          , S = e.x
          , ne = e.y;
        i.save(),
        e.invulnerable > 0 && (i.globalAlpha = this.reduced ? .7 : .55 + Math.abs(Math.sin(this.elapsed * 12)) * .4),
        ee && (this.local(S, ne, x),
        i.save(),
        i.globalAlpha *= .5 + Math.sin(this.elapsed * 4) * .15,
        i.strokeStyle = y ? fa(`#ffd23f`) : `#ffd23f`,
        i.lineWidth = 3,
        i.beginPath(),
        i.ellipse(0, 2, 26, 30, 0, 0, Math.PI * 2),
        i.stroke(),
        i.restore());
        for (let n of t.flags ?? [])
            n.carrier === e.id && (this.local(S, ne, x),
            this.flag(-c * 15, -6, pi[n.team % 2] ?? pi[0], -c, .8));
        this.drawSprite(this.cached(`pb|${te}|${s}|${+!!d}`, y, () => {
            let {back: e} = Li(o, s, m);
            return [ra(e), t => Zi(t, e)]
        }
        ), S, ne, x, c),
        (e.carryingBomb || v?.kind === `bomb` && v.carrier === e.id) && (this.local(S, ne, x, c),
        this.bombShape(-11, 4 + (d ? Fi.body : 0), .7, !1, 1)),
        e.jetting && e.fuel > 0 && this.jetFlame(e, c, x, y),
        g?.dual && this.arm(e, g.id, h, c, !0, !1, x, y),
        this.drawSprite(this.cached(`pd|${te}|${s}|${d ? `c` : f ? `a` : p}`, y, () => {
            let {body: e} = Li(o, s, m);
            return [ra(e), t => Zi(t, e)]
        }
        ), S, ne, x, c),
        this.arm(e, g?.id, h, c, !1, _.hold === `shield` || !!e.shielding, x, y),
        i.globalAlpha = 1,
        this.local(S, ne, x),
        e.invulnerable > 0 && (i.save(),
        i.globalAlpha = .22 + (this.reduced ? 0 : Math.sin(this.elapsed * 8) * .06),
        i.fillStyle = `#ffffff`,
        i.beginPath(),
        i.arc(0, -2, 30, 0, Math.PI * 2),
        i.fill(),
        i.globalAlpha = .6,
        i.strokeStyle = `#ffffff`,
        i.lineWidth = 1.5,
        i.stroke(),
        i.restore());
        let re = -27 + (d ? Fi.head : 0);
        ee && this.crown(0, re - 6);
        let ie = re - (ee ? 25 : 13);
        (e.goldenTime ?? 0) > 0 && (this.local(S, ne),
        i.strokeStyle = `#ffd45d`,
        i.lineWidth = 2.5,
        i.beginPath(),
        i.ellipse(0, -3, 27, 32, 0, 0, Math.PI * 2),
        i.stroke(),
        this.drawSprite(this.label(`GOLD HEART ${Math.ceil(e.goldenTime)}s`, 8, `#ffe38a`, `#3b260d`), S, ne, 0, 1, 0, ie - 22));
        let ae = e.name.slice(0, 16) + (r ? ` (YOU)` : ``);
        this.drawSprite(this.label(ae, 10, r ? `#d4b5ff` : n ? e.team % 2 == 0 ? `#d4b5ff` : `#ffd08a` : `#ffffff`, `rgba(10,10,10,.85)`), S, ne, 0, 1, 0, ie - 5),
        this.local(S, ne);
        let oe = ga(e.hp / 100, 0, 1);
        if (i.fillStyle = `#141218`,
        i.fillRect(-23, ie - 1, 46, 7),
        i.fillStyle = `#493f50`,
        i.fillRect(-21, ie + 1, 42, 3),
        i.fillStyle = oe > .5 ? `#82e697` : oe > .25 ? `#ffd166` : `#ff6579`,
        i.fillRect(-21, ie + 1, 42 * oe, 3),
        this.local(S, ne, x),
        e.reloadTimer > 0) {
            let t = b[g?.id ?? `pistol`]?.reload ?? 1.5
              , n = ga(1 - e.reloadTimer / Math.max(.1, t), 0, 1);
            i.strokeStyle = `rgba(20,20,20,.6)`,
            i.lineWidth = 4,
            i.beginPath(),
            i.arc(0, re - 1, 6, 0, Math.PI * 2),
            i.stroke(),
            i.strokeStyle = `#ffffff`,
            i.lineWidth = 2.4,
            i.beginPath(),
            i.arc(0, re - 1, 6, -Math.PI / 2, -Math.PI / 2 + n * Math.PI * 2),
            i.stroke()
        }
        v?.kind === `bomb` && v.carrier === e.id && v.plantProgress > 0 && this.progressArc(0, re - 14, 9, v.plantProgress / Math.max(.1, v.plantTime), `#ffcf3a`),
        i.restore()
    }
    jetFlame(e, t, n, r) {
        let i = e.crouching ? Fi.body : 0
          , a = Ii.x
          , o = Ii.y + i
          , s = 11 + N(this.lastTick * 3 + e.x) * 9
          , c = Math.round(s * 2) / 2
          , l = this.cached(`jf|${c}|${i}`, r, () => [[a - 4.5, o - .5, a + 4.5, o + c + .5], e => {
            e.beginPath(),
            e.moveTo(a - 3.2, o),
            e.quadraticCurveTo(a - 4, o + c * .5, a, o + c),
            e.quadraticCurveTo(a + 4, o + c * .5, a + 3.2, o),
            e.closePath(),
            e.fillStyle = `#ff8a1e`,
            e.fill(),
            e.beginPath(),
            e.moveTo(a - 2, o),
            e.quadraticCurveTo(a - 2.2, o + c * .35, a, o + c * .65),
            e.quadraticCurveTo(a + 2.2, o + c * .35, a + 2, o),
            e.closePath(),
            e.fillStyle = `#ffd84a`,
            e.fill(),
            e.beginPath(),
            e.ellipse(a, o + 2, 1.2, 2.4, 0, 0, Math.PI * 2),
            e.fillStyle = `#fffbe0`,
            e.fill()
        }
        ]);
        this.drawSprite(l, e.x, e.y, n, t),
        !this.reduced && this.particles.length < this.budget(260) && N(this.lastTick + e.x) > 1 - .65 * this.quality && this.particles.push({
            x: e.x + a * t,
            y: e.y + o + s,
            vx: -e.vx * .1 + (N(this.elapsed * 50) - .5) * 30,
            vy: 40,
            life: .45,
            age: 0,
            size: 3.5,
            color: `#d9d9d9`,
            type: `smoke`
        })
    }
    arm(e, t, n, r, i, a, o, s) {
        let c = this.ctx
          , l = Ji(t)
          , u = e.crouching ? Fi.body : 0
          , d = this.m.copy(this.world).translate(e.x, e.y).rotate(o);
        d.translate(Pi.x * r - (i ? 2 * r : 0), Pi.y + u + (i ? 1.5 : 0));
        let f = e.aim;
        e.reloadTimer > 0 && l.hold !== `blade` && l.hold !== `shield` && (f += r * .55),
        d.rotate(f),
        r < 0 && d.scale(1, -1);
        let p = (this.recoil.get(e.id) ?? 0) * (i ? .7 : 1);
        l.hold !== `blade` && l.hold !== `shield` && d.translate(-p * l.kick, 0).rotate(-p * l.kick * .035);
        let m = t ? b[t] : void 0
          , h = m?.melee && e.fireTimer > 0 ? ga((m.fireInterval - e.fireTimer) / .22, 0, 1) : e.meleeTimer > 0 ? ga((.65 - e.meleeTimer) / .25, 0, 1) : 1
          , g = h < 1;
        g && (l.hold === `blade` ? d.rotate(-1.5 + h * 2.6) : d.translate(Math.sin(h * Math.PI) * (l.hold === `shield` ? 9 : 7), 0));
        let[_,v] = Qi(l);
        i && d.translate(0, 2.5);
        let ee = a || l.hold === `shield`
          , y = i ? D(n.shirt, -.2) : n.shirt
          , x = l.fore && !i ? l.fore : void 0
          , te = this.cached(`arm|${t ?? ``}|${+!!ee}|${+!!i}|${y}|${n.skin}`, s, () => {
            let e = ra(l.shapes, void 0, _, v);
            return ee && ra(Yi(), e, _, v),
            [ia(e, ra([{
                k: `c`,
                x: 0,
                y: 0,
                r: 3
            }, {
                k: `c`,
                x: _,
                y: v + 1,
                r: 3.5
            }, ...x ? [{
                k: `c`,
                x: _ + x[0],
                y: v + x[1],
                r: 3.5
            }] : []])), e => {
                e.save(),
                e.translate(_, v),
                Zi(e, l.shapes),
                ee && Zi(e, Yi()),
                e.restore();
                let t = (t, n) => {
                    e.beginPath(),
                    e.moveTo(0, 0),
                    e.lineTo(t, n),
                    e.strokeStyle = E,
                    e.lineWidth = 5.6,
                    e.lineCap = `round`,
                    e.stroke(),
                    e.strokeStyle = y,
                    e.lineWidth = 3.6,
                    e.stroke()
                }
                  , r = (t, r) => {
                    e.beginPath(),
                    e.arc(t, r, 2.3, 0, Math.PI * 2),
                    e.fillStyle = n.skin,
                    e.fill(),
                    e.strokeStyle = E,
                    e.lineWidth = 1,
                    e.stroke()
                }
                ;
                t(_, v + 1),
                r(_, v + 1),
                x && (t(_ + x[0], v + x[1]),
                r(_ + x[0], v + x[1]))
            }
            ]
        }
        );
        if (this.drawSpriteAt(te, d),
        g && l.hold === `blade` && !i && (d.apply(c),
        c.strokeStyle = `rgba(255,255,255,.7)`,
        c.lineWidth = 3,
        c.beginPath(),
        c.arc(0, 0, 36, -.6, .5),
        c.stroke()),
        (i ? 0 : this.muzzle.get(e.id) ?? 0) > 0 && l.flash > 0) {
            let e = l.flash
              , n = t === `laser`;
            this.drawSpriteAt(this.cached(`mz|${e}|${+!!n}`, s, () => [n ? [2 - e * .6, -e * .6, 2 + e * .6, e * .6] : [-e * 1.1, -e * .8, e * 2.1, e * .8], t => this.muzzleFlash(t, e, n)]), d.translate(_ + l.muzzle, v + l.muzzleY))
        }
    }
    muzzleFlash(e, t, n) {
        if (n) {
            e.fillStyle = `rgba(190,150,255,.78)`,
            e.beginPath(),
            e.arc(2, 0, t * .6, 0, Math.PI * 2),
            e.fill(),
            e.fillStyle = `#ffffff`,
            e.beginPath(),
            e.arc(2, 0, t * .3, 0, Math.PI * 2),
            e.fill();
            return
        }
        let r = (n, r) => {
            e.beginPath();
            for (let i = 0; i < 10; i++) {
                let a = -Math.PI / 2 + i * Math.PI / 5
                  , o = i % 2 ? r : n
                  , s = Math.abs(Math.cos(a)) > .7 ? 1.5 : 1;
                e.lineTo(t * .5 + Math.cos(a) * o * s, Math.sin(a) * o * .75)
            }
            e.closePath()
        }
        ;
        r(t, t * .4),
        e.fillStyle = `#ff9a1f`,
        e.fill(),
        r(t * .6, t * .25),
        e.fillStyle = `#ffe36a`,
        e.fill(),
        e.fillStyle = `#ffffff`,
        e.beginPath(),
        e.arc(t * .3, 0, t * .18, 0, Math.PI * 2),
        e.fill()
    }
    crown(e, t) {
        let n = this.ctx;
        n.beginPath(),
        n.moveTo(e - 8, t),
        n.lineTo(e - 9, t - 9),
        n.lineTo(e - 4, t - 4),
        n.lineTo(e, t - 11),
        n.lineTo(e + 4, t - 4),
        n.lineTo(e + 9, t - 9),
        n.lineTo(e + 8, t),
        n.closePath(),
        n.fillStyle = `#ffcc2e`,
        n.fill(),
        n.strokeStyle = E,
        n.lineWidth = 1.4,
        n.lineJoin = `round`,
        n.stroke(),
        n.fillStyle = mi,
        n.beginPath(),
        n.arc(e, t - 3, 1.7, 0, Math.PI * 2),
        n.fill()
    }
    progressArc(e, t, n, r, i) {
        let a = this.ctx;
        a.strokeStyle = `rgba(15,15,15,.65)`,
        a.lineWidth = 5,
        a.beginPath(),
        a.arc(e, t, n, 0, Math.PI * 2),
        a.stroke(),
        a.strokeStyle = i,
        a.lineWidth = 3,
        a.beginPath(),
        a.arc(e, t, n, -Math.PI / 2, -Math.PI / 2 + ga(r, 0, 1) * Math.PI * 2),
        a.stroke()
    }
    aimGuide(e) {
        let t = this.ctx
          , n = e.crouching ? Fi.body : 0
          , r = Math.cos(e.aim) >= 0 ? 1 : -1
          , i = e.x + Pi.x * r
          , a = e.y + Pi.y + n;
        if (Ji(e.guns[e.activeGun]?.id).hold === `blade`)
            return;
        let o = Math.cos(e.aim)
          , s = Math.sin(e.aim);
        t.save(),
        t.lineCap = `butt`;
        for (let e = 58; e <= 150; e += 26)
            t.beginPath(),
            t.moveTo(i + o * e, a + s * e),
            t.lineTo(i + o * (e + 10), a + s * (e + 10)),
            t.strokeStyle = `rgba(30,30,30,.35)`,
            t.lineWidth = 4,
            t.stroke(),
            t.strokeStyle = `rgba(255,255,255,.92)`,
            t.lineWidth = 2.2,
            t.stroke();
        t.restore()
    }
    pickup(e, t) {
        let n = !!e.dropped
          , r = n || this.reduced ? 0 : Math.sin(this.elapsed * 2.6 + e.x * .03) * 2.5;
        if (n && e.expires !== void 0 && e.expires < 4 && Math.sin(this.elapsed * 14) > .2)
            return;
        let i = e.kind === `grenade` ? e.grenade ?? `frag` : ``
          , a = this.cached(`pk|${e.kind}|${+!!e.golden}|${i}|${+!!n}|${this.fontEpoch}`, !1, () => {
            let t = [-27, -27, 27, 27];
            if (e.kind === `grenade`)
                t = ia(t, ra(Xi[i || `frag`](), void 0, 0, 0, 1.4));
            else if (e.kind !== `health` && e.kind !== `fuel`) {
                let r = Ji(e.kind);
                t = ia(t, wa(ra(r.hold === `shield` ? Yi() : r.shapes, void 0, r.hold === `shield` ? -11 : -r.muzzle / 2 + 2, 0), n ? 6 : 0))
            }
            return [t, t => this.pickupArt(t, e, n)]
        }
        );
        if (this.drawSprite(a, e.x, e.y + r + (n ? 10 : 0)),
        t) {
            let t = ``;
            t = e.golden ? `GOLDEN HEART` : e.kind === `health` ? `MEDKIT` : e.kind === `fuel` ? `JET FUEL` : e.kind === `grenade` ? i === `frag` ? `FRAG GRENADE` : i === `gas` ? `GAS GRENADE` : `PROXIMITY MINE` : (b[e.kind]?.name ?? Ji(e.kind).label).toUpperCase() + (e.gun ? `  ${e.gun.ammo}/${e.gun.reserve}` : ``),
            this.drawSprite(this.label(t, 9, `#ffffff`, `rgba(10,10,10,.8)`), e.x, e.y - 18)
        }
    }
    pickupArt(e, t, n) {
        let r = e.createRadialGradient(0, 0, 2, 0, 0, 26);
        if (r.addColorStop(0, n ? `rgba(255,255,255,.45)` : `rgba(255,248,236,.6)`),
        r.addColorStop(1, `rgba(255,248,236,0)`),
        e.fillStyle = r,
        e.beginPath(),
        e.arc(0, 0, 26, 0, Math.PI * 2),
        e.fill(),
        t.golden)
            e.fillStyle = `#ffd34f`,
            e.strokeStyle = `#6d4510`,
            e.lineWidth = 2,
            e.beginPath(),
            e.moveTo(0, 12),
            e.bezierCurveTo(-23, -1, -14, -19, 0, -8),
            e.bezierCurveTo(14, -19, 23, -1, 0, 12),
            e.fill(),
            e.stroke(),
            e.strokeStyle = `#fff3bf`,
            e.lineWidth = 2,
            e.beginPath(),
            e.moveTo(-9, -5),
            e.lineTo(-5, -7),
            e.stroke();
        else if (t.kind === `health`)
            e.fillStyle = `#f4f4f0`,
            e.strokeStyle = E,
            e.lineWidth = 1.6,
            e.beginPath(),
            e.roundRect(-10, -8, 20, 16, 2.5),
            e.fill(),
            e.stroke(),
            e.fillStyle = `#d8342b`,
            e.fillRect(-2.5, -5.5, 5, 11),
            e.fillRect(-5.5, -2.5, 11, 5),
            e.fillStyle = `#9a9a9a`,
            e.fillRect(-4, -11, 8, 3);
        else if (t.kind === `fuel`)
            e.fillStyle = `#7444c4`,
            e.strokeStyle = E,
            e.lineWidth = 1.6,
            e.beginPath(),
            e.roundRect(-8, -10, 16, 20, 3),
            e.fill(),
            e.stroke(),
            e.fillStyle = `#d4b5ff`,
            e.fillRect(-5, -7, 3, 14),
            e.fillStyle = `#1d1d1d`,
            e.fillRect(2, -13, 5, 4),
            e.fillStyle = `#ffffff`,
            e.font = `8px ${_a}`,
            e.textAlign = `center`,
            e.textBaseline = `middle`,
            e.fillText(`F`, 2, 1);
        else if (t.kind === `grenade`)
            e.scale(1.4, 1.4),
            Zi(e, Xi[t.grenade ?? `frag`]()),
            e.scale(1 / 1.4, 1 / 1.4);
        else {
            let r = Ji(t.kind);
            n && e.rotate(-.12),
            e.translate(r.hold === `shield` ? -11 : -r.muzzle / 2 + 2, 0),
            Zi(e, r.hold === `shield` ? Yi() : r.shapes)
        }
    }
    mine(e, t, n, r, i) {
        let a = this.ctx;
        a.save(),
        a.translate(e, t),
        Zi(a, Xi.mine());
        let o = n <= 0
          , s = o ? Math.sin(this.elapsed * 14) > 0 : Math.sin(this.elapsed * 5) > .3;
        a.fillStyle = o ? s ? `#ff2a1f` : `#6a1410` : s ? `#ffd23f` : `#6d5a17`,
        a.beginPath(),
        a.arc(0, -4.4, 1.6, 0, Math.PI * 2),
        a.fill(),
        o && s && (a.fillStyle = `rgba(255,40,30,.25)`,
        a.beginPath(),
        a.arc(0, -4.4, 6, 0, Math.PI * 2),
        a.fill()),
        r && i === r.id && (a.setLineDash([4, 5]),
        a.strokeStyle = `rgba(255,60,40,.35)`,
        a.lineWidth = 1.2,
        a.beginPath(),
        a.arc(0, 0, 50, Math.PI, 0),
        a.stroke(),
        a.setLineDash([])),
        a.restore()
    }
    gas(e) {
        let t = this.ctx;
        for (let n of e.areas ?? []) {
            let e = ga(n.life / 1.2, 0, 1);
            t.save();
            for (let r = 0; r < 8; r++) {
                let i = r / 8 * Math.PI * 2 + (this.reduced ? 0 : this.elapsed * .4)
                  , a = n.radius * (.35 + N(n.id + r) * .25)
                  , o = this.reduced ? 0 : Math.sin(this.elapsed * 1.7 + r) * 5;
                t.globalAlpha = .24 * e,
                t.fillStyle = r % 2 ? `#8fcf4a` : `#b5e36a`,
                t.beginPath(),
                t.arc(n.x + Math.cos(i) * a * .9, n.y + Math.sin(i) * a * .55 + o, n.radius * (.45 + N(n.id * 3 + r) * .15), 0, Math.PI * 2),
                t.fill()
            }
            t.globalAlpha = .3 * e,
            t.fillStyle = `#a7dd5c`,
            t.beginPath(),
            t.arc(n.x, n.y, n.radius * .55, 0, Math.PI * 2),
            t.fill(),
            t.globalAlpha = .5 * e,
            t.strokeStyle = `#6fa832`,
            t.lineWidth = 2,
            t.setLineDash([6, 6]),
            t.beginPath(),
            t.arc(n.x, n.y, n.radius, 0, Math.PI * 2),
            t.stroke(),
            t.setLineDash([]),
            t.restore()
        }
    }
    flag(e, t, n, r, i=1) {
        let a = this.ctx;
        a.save(),
        a.translate(e, t),
        a.scale(r * i, i),
        a.strokeStyle = E,
        a.lineWidth = 3.4,
        a.beginPath(),
        a.moveTo(0, 22),
        a.lineTo(0, -40),
        a.stroke(),
        a.strokeStyle = `#d0d0d0`,
        a.lineWidth = 1.6,
        a.stroke();
        let o = this.reduced ? 0 : Math.sin(this.elapsed * 7 + e * .03) * 2.5;
        a.beginPath(),
        a.moveTo(1, -39),
        a.quadraticCurveTo(14, -43 + o, 29, -37 + o),
        a.lineTo(23, -29 + o),
        a.lineTo(29, -21 + o),
        a.quadraticCurveTo(14, -25 - o, 1, -21),
        a.closePath(),
        a.fillStyle = n,
        a.fill(),
        a.strokeStyle = E,
        a.lineWidth = 1.6,
        a.stroke(),
        r < 0 && (a.translate(23, 0),
        a.scale(-1, 1)),
        Zi(a, ji(11.5, -31 + o * .5, 8.4, E, 3.2)),
        Zi(a, ji(11.5, -31 + o * .5, 8.4, `#ffffff`, 1.6)),
        a.restore(),
        a.save(),
        a.translate(e, t),
        a.scale(i, i),
        a.fillStyle = mi,
        a.strokeStyle = E,
        a.lineWidth = 1.2,
        a.beginPath(),
        a.arc(0, -41.5, 2.6, 0, Math.PI * 2),
        a.fill(),
        a.stroke(),
        a.restore()
    }
    basePad(e, t, n) {
        let r = this.ctx
          , i = pi[n % 2] ?? pi[0];
        r.save(),
        r.globalAlpha = .85,
        r.fillStyle = i,
        r.strokeStyle = E,
        r.lineWidth = 1.6,
        r.beginPath(),
        r.moveTo(e - 30, t + 20),
        r.lineTo(e - 24, t + 14),
        r.lineTo(e + 24, t + 14),
        r.lineTo(e + 30, t + 20),
        r.closePath(),
        r.fill(),
        r.stroke(),
        r.restore()
    }
    flags(e) {
        for (let t of e.flags ?? []) {
            let e = pi[t.team % 2] ?? pi[0];
            this.basePad(t.homeX, t.homeY, t.team),
            t.carrier || (this.flag(t.x, t.y, e, 1),
            t.returnTimer > 0 && this.progressArc(t.x, t.y - 52, 7, 1 - t.returnTimer / 15, `#ffffff`))
        }
    }
    objectiveGround(e, t) {
        let n = this.ctx
          , r = e.objective;
        r?.kind === `vip` && t.bases && t.bases.forEach( (e, t) => this.basePad(e.x, e.y, t)),
        r?.kind === `bomb` && r.sites.forEach( (e, t) => {
            let i = r.planted && r.site === t
              , a = i && !this.reduced ? .5 + Math.sin(this.elapsed * 8) * .3 : .6;
            n.save(),
            n.translate(e.x, e.y + 20);
            for (let[e,t] of [[48, `#d8342b`], [34, `#ffffff`], [20, `#d8342b`]])
                n.globalAlpha = a,
                n.fillStyle = t,
                n.beginPath(),
                n.ellipse(0, 0, e, e * .22, 0, 0, Math.PI * 2),
                n.fill();
            n.globalAlpha = 1,
            n.strokeStyle = E,
            n.lineWidth = 1.4,
            n.beginPath(),
            n.ellipse(0, 0, 48, 10.5, 0, 0, Math.PI * 2),
            n.stroke(),
            n.font = `30px ${_a}`,
            n.textAlign = `center`,
            n.textBaseline = `alphabetic`,
            n.lineWidth = 5,
            n.strokeStyle = E,
            n.lineJoin = `round`,
            n.strokeText(e.label, 0, -70),
            n.fillStyle = i ? `#ff5a4a` : `#ffffff`,
            n.fillText(e.label, 0, -70),
            n.restore()
        }
        )
    }
    bomb(e) {
        let t = e.objective;
        if (t?.kind !== `bomb` || t.carrier)
            return;
        let n = this.ctx
          , r = t.planted ? ga(t.fuse / Math.max(.1, t.fuseTime), 0, 1) : 1
          , i = t.planted ? 4 + (1 - r) * 18 : 2;
        if (this.bombShape(t.x, t.y + 12, 1, t.planted, +(Math.sin(this.elapsed * i) > 0)),
        t.planted) {
            this.progressArc(t.x, t.y - 18, 11, r, `#ff3b2f`),
            t.defuseProgress > 0 && this.progressArc(t.x, t.y - 18, 16, t.defuseProgress / Math.max(.1, t.defuseTime), `#5aa2ff`),
            n.save(),
            n.font = `11px ${_a}`,
            n.textAlign = `center`,
            n.lineWidth = 3,
            n.strokeStyle = E,
            n.lineJoin = `round`;
            let e = Math.max(0, t.fuse).toFixed(0);
            n.strokeText(e, t.x, t.y - 14),
            n.fillStyle = `#ffffff`,
            n.fillText(e, t.x, t.y - 14),
            n.restore()
        }
    }
    bombShape(e, t, n, r, i) {
        let a = this.ctx;
        a.save(),
        a.translate(e, t),
        a.scale(n, n),
        a.fillStyle = `#7a1e1a`,
        a.strokeStyle = E,
        a.lineWidth = 1.4,
        a.beginPath(),
        a.roundRect(-7, -6, 14, 12, 2),
        a.fill(),
        a.stroke(),
        a.fillStyle = `#c33a2a`,
        a.fillRect(-6, -5, 3.5, 10),
        a.fillRect(2.5, -5, 3.5, 10),
        a.fillStyle = `#1d1d1d`,
        a.beginPath(),
        a.roundRect(-3.5, -4, 7, 5, 1),
        a.fill(),
        a.fillStyle = i ? r ? `#ff3b2f` : `#ffd23f` : `#3d0e0b`,
        a.beginPath(),
        a.arc(0, -1.5, 1.4, 0, Math.PI * 2),
        a.fill(),
        a.strokeStyle = `#d9d9d9`,
        a.lineWidth = .8,
        a.beginPath(),
        a.moveTo(-5, 4),
        a.quadraticCurveTo(0, 8, 5, 4),
        a.stroke(),
        a.restore()
    }
    trackProjectiles(e, t) {
        let n = new Set;
        for (let r of e) {
            n.add(r.id);
            let e = this.bounces.get(r.id);
            e !== void 0 && r.bounces > e && (r.weapon === `grenade` || r.weapon === `grenadeLauncher` ? this.burst(r.x, r.y, 3, `#a89a80`, `dust`, 50) : (this.burst(r.x, r.y, 7, `#ffd36a`, `spark`, 190),
            this.particles.push({
                x: r.x,
                y: r.y,
                vx: 0,
                vy: 0,
                age: 0,
                life: .16,
                size: 12,
                color: `#fff3c0`,
                type: `ring`
            }))),
            this.bounces.set(r.id, r.bounces),
            !this.reduced && (r.weapon === `rocket` || r.weapon === `grenadeLauncher`) && this.particles.length < this.budget(300) && N(r.id + this.elapsed * 60) < t * 40 && this.particles.push({
                x: r.x - r.vx * .02,
                y: r.y - r.vy * .02,
                vx: (N(this.elapsed) - .5) * 20,
                vy: -10,
                age: 0,
                life: r.weapon === `rocket` ? .8 : .5,
                size: r.weapon === `rocket` ? 6 : 4,
                color: `#cfcfcf`,
                type: `smoke`
            })
        }
        for (let e of this.bounces.keys())
            n.has(e) || this.bounces.delete(e)
    }
    projectile(e, t) {
        let n = this.ctx
          , r = Math.atan2(e.vy, e.vx)
          , i = Math.hypot(e.vx, e.vy);
        if (n.save(),
        n.translate(e.x, e.y),
        e.weapon === `grenade`)
            n.rotate(this.reduced ? 0 : this.elapsed * 10 + e.id),
            Zi(n, Xi[e.grenadeKind ?? `frag`]()),
            e.grenadeKind === `gas` && !this.reduced && N(e.id + t) > .6 && this.particles.length < this.budget(300) && this.particles.push({
                x: e.x,
                y: e.y,
                vx: 0,
                vy: -12,
                age: 0,
                life: .5,
                size: 4,
                color: `#9fd65a`,
                type: `gas`
            });
        else if (e.weapon === `grenadeLauncher`)
            n.rotate(r),
            n.fillStyle = `#4a4656`,
            n.strokeStyle = E,
            n.lineWidth = 1,
            n.beginPath(),
            n.roundRect(-5, -3, 9, 6, 3),
            n.fill(),
            n.stroke(),
            n.fillStyle = mi,
            n.fillRect(-5, -3, 2.5, 6);
        else if (e.weapon === `rocket`) {
            n.rotate(r);
            let i = 9 + N(e.id + t) * 8;
            n.fillStyle = `#ff9a1f`,
            n.beginPath(),
            n.moveTo(-9, -2.5),
            n.lineTo(-9 - i, 0),
            n.lineTo(-9, 2.5),
            n.closePath(),
            n.fill(),
            n.fillStyle = `#fff1a0`,
            n.beginPath(),
            n.moveTo(-9, -1.2),
            n.lineTo(-9 - i * .5, 0),
            n.lineTo(-9, 1.2),
            n.closePath(),
            n.fill(),
            n.fillStyle = `#3e3a48`,
            n.strokeStyle = E,
            n.lineWidth = 1,
            n.beginPath(),
            n.roundRect(-10, -3, 14, 6, 1.5),
            n.fill(),
            n.stroke(),
            n.fillStyle = mi,
            n.fillRect(-4, -2.4, 2.4, 4.8),
            n.fillStyle = `#b54434`,
            n.beginPath(),
            n.moveTo(4, -3),
            n.lineTo(10, 0),
            n.lineTo(4, 3),
            n.closePath(),
            n.fill(),
            n.stroke(),
            n.fillStyle = `#2c2934`,
            n.beginPath(),
            n.moveTo(-10, -3),
            n.lineTo(-13, -5.5),
            n.lineTo(-8, -3),
            n.moveTo(-10, 3),
            n.lineTo(-13, 5.5),
            n.lineTo(-8, 3),
            n.fill()
        } else if (e.weapon === `flamer`) {
            let t = ga(.55 - e.life, 0, .55) / .55
              , r = 5 + t * 11;
            n.globalAlpha = .85 - t * .35,
            n.fillStyle = t > .6 ? `#e2541c` : `#ff8a1e`,
            n.beginPath(),
            n.arc(0, 0, r, 0, Math.PI * 2),
            n.fill(),
            n.fillStyle = `#ffd84a`,
            n.beginPath(),
            n.arc(0, 0, r * .55, 0, Math.PI * 2),
            n.fill()
        } else if (e.weapon === `saw`) {
            n.rotate(this.elapsed * 24 + e.id),
            n.beginPath();
            for (let e = 0; e < 24; e++) {
                let t = e * Math.PI / 12
                  , r = e % 2 ? 7 : 10;
                n.lineTo(Math.cos(t) * r, Math.sin(t) * r)
            }
            n.closePath(),
            n.fillStyle = `#c6cbd0`,
            n.strokeStyle = E,
            n.lineWidth = 1.5,
            n.fill(),
            n.stroke(),
            n.fillStyle = `#d65b32`,
            n.beginPath(),
            n.arc(0, 0, 3, 0, Math.PI * 2),
            n.fill()
        } else if (e.weapon === `emp`) {
            let t = e.radius + Math.sin(this.elapsed * 15) * 2;
            n.fillStyle = `rgba(100,225,255,.15)`,
            n.strokeStyle = `#8befff`,
            n.lineWidth = 2,
            n.beginPath(),
            n.arc(0, 0, t, 0, Math.PI * 2),
            n.fill(),
            n.stroke(),
            n.beginPath(),
            n.moveTo(-t * .7, 0),
            n.lineTo(-7, -9),
            n.lineTo(0, 5),
            n.lineTo(7, -8),
            n.lineTo(t * .7, 0),
            n.stroke()
        } else if (e.weapon === `laser`)
            n.rotate(r),
            n.lineCap = `round`,
            n.strokeStyle = `rgba(165,101,255,.6)`,
            n.lineWidth = 5,
            n.beginPath(),
            n.moveTo(-34, 0),
            n.lineTo(4, 0),
            n.stroke(),
            n.strokeStyle = `#f4ecff`,
            n.lineWidth = 2,
            n.stroke();
        else {
            n.rotate(r);
            let t = e.weapon === `sniper` || e.weapon === `m14` || e.weapon === `magnum`
              , a = ga(i * (t ? .03 : .016), 8, t ? 52 : 22);
            n.lineCap = `round`,
            n.strokeStyle = `rgba(255,190,60,.75)`,
            n.lineWidth = t ? 3.4 : e.weapon === `shotgun` ? 2.4 : 2.8,
            n.beginPath(),
            n.moveTo(-a, 0),
            n.lineTo(2, 0),
            n.stroke(),
            n.strokeStyle = `#fffbe6`,
            n.lineWidth = t ? 1.6 : 1.2,
            n.beginPath(),
            n.moveTo(-a * .6, 0),
            n.lineTo(2, 0),
            n.stroke()
        }
        n.restore()
    }
    event(e, t, n) {
        let r = !!t && Math.hypot(t.x - e.x, t.y - e.y) < 520;
        switch (e.type) {
        case `shot`:
            {
                if (!e.actor || e.weapon === `grenade`)
                    break;
                this.recoil.set(e.actor, 1);
                let r = Ji(e.weapon);
                if (r.flash > 0 && this.muzzle.set(e.actor, .07),
                t?.id === e.actor && r.kick >= 5 && (this.shake = Math.max(this.shake, r.kick * .35)),
                !this.reduced && r.hold !== `blade` && r.hold !== `shield` && e.weapon !== `laser` && e.weapon !== `flamer` && e.weapon !== `rocket` && this.particles.length < this.budget(300)) {
                    let t = n.players.find(t => t.id === e.actor)
                      , r = t && Math.cos(t.aim) < 0 ? -1 : 1;
                    this.particles.push({
                        x: e.x + r * 4,
                        y: e.y + 2,
                        vx: -r * (40 + N(e.id) * 50),
                        vy: -110 - N(e.id + 1) * 60,
                        age: 0,
                        life: 1.1,
                        size: e.weapon === `shotgun` ? 3.2 : 2.4,
                        color: e.weapon === `shotgun` ? `#c33a2a` : `#d9a93b`,
                        type: `casing`,
                        rot: 0,
                        vr: 18
                    })
                }
                break
            }
        case `hit`:
            {
                e.target && this.hurt.set(e.target, .1);
                let r = e.actor ? n.players.find(t => t.id === e.actor) : void 0
                  , i = r ? Math.atan2(e.y - r.y, e.x - r.x) : -Math.PI / 2;
                if (this.spray(e.x, e.y - 4, i, this.fx(this.reduced ? 2 : 6), 150),
                t && t.id === e.target) {
                    if (this.shake = Math.max(this.shake, 2.5),
                    this.flash = Math.max(this.flash, .35),
                    r && r.id !== t.id) {
                        let e = this.damageFrom.find(e => e.id === r.id);
                        e ? Object.assign(e, {
                            x: r.x,
                            y: r.y,
                            life: 1.1
                        }) : (this.damageFrom.push({
                            id: r.id,
                            x: r.x,
                            y: r.y,
                            life: 1.1
                        }),
                        this.damageFrom.length > 4 && this.damageFrom.shift())
                    }
                } else
                    t && e.actor === t.id && !(this.hitMark.kill && this.hitMark.t > .15) && (this.hitMark = {
                        t: .2,
                        life: .2,
                        kill: !1
                    });
                break
            }
        case `kill`:
            this.gibs(e),
            r && (this.shake = Math.max(this.shake, 4)),
            t && e.actor === t.id && e.target !== t.id && (this.hitMark = {
                t: .45,
                life: .45,
                kill: !0
            }),
            t && e.target === t.id && (this.damageFrom = []);
            break;
        case `explosion`:
            {
                let t = (e.weapon && e.weapon !== `grenade` ? b[e.weapon]?.blastRadius : void 0) ?? (e.weapon === `grenade` ? 95 : 85);
                r && (this.shake = Math.max(this.shake, 9)),
                this.particles.push({
                    x: e.x,
                    y: e.y,
                    vx: 0,
                    vy: 0,
                    age: 0,
                    life: .32,
                    size: t * 1.1,
                    color: `#fff3c0`,
                    type: `ring`
                });
                let n = this.fx(this.reduced ? 6 : 16);
                for (let r = 0; r < n; r++) {
                    let n = N(e.id + r) * Math.PI * 2
                      , i = 30 + N(e.id * 2 + r) * t * 1.4;
                    this.particles.push({
                        x: e.x,
                        y: e.y,
                        vx: Math.cos(n) * i,
                        vy: Math.sin(n) * i - 30,
                        age: 0,
                        life: .35 + N(r + e.id) * .3,
                        size: t * (.18 + N(r * 3 + e.id) * .2),
                        color: r % 3 ? `#ff9a1f` : `#ffd84a`,
                        type: `fire`
                    })
                }
                this.burst(e.x, e.y, this.reduced ? 3 : 9, `#5c5c5c`, `smoke`, 70),
                this.burst(e.x, e.y, this.reduced ? 3 : 8, `#3a3a3a`, `chip`, 260);
                break
            }
        case `gas`:
            this.burst(e.x, e.y, this.reduced ? 4 : 12, `#9fd65a`, `gas`, 90),
            this.particles.push({
                x: e.x,
                y: e.y,
                vx: 0,
                vy: 0,
                age: 0,
                life: .4,
                size: 60,
                color: `#b5e36a`,
                type: `ring`
            });
            break;
        case `mine`:
            e.text === `armed` ? this.particles.push({
                x: e.x,
                y: e.y - 4,
                vx: 0,
                vy: 0,
                age: 0,
                life: .35,
                size: 22,
                color: `#ff3b2f`,
                type: `ring`
            }) : e.text === `placed` && this.burst(e.x, e.y, 3, `#a89a80`, `dust`, 40);
            break;
        case `block`:
            this.burst(e.x, e.y, 8, `#cfefff`, `spark`, 170),
            this.particles.push({
                x: e.x,
                y: e.y,
                vx: 0,
                vy: 0,
                age: 0,
                life: .2,
                size: 16,
                color: `#9fd8ff`,
                type: `ring`
            });
            break;
        case `drop`:
            this.burst(e.x, e.y + 14, 4, `#b0a58f`, `dust`, 50);
            break;
        case `pickup`:
            this.particles.push({
                x: e.x,
                y: e.y,
                vx: 0,
                vy: 0,
                age: 0,
                life: .35,
                size: 26,
                color: `#ffffff`,
                type: `ring`
            }),
            this.burst(e.x, e.y, 5, `#ffffff`, `spark`, 70);
            break;
        case `respawn`:
            this.particles.push({
                x: e.x,
                y: e.y,
                vx: 0,
                vy: 0,
                age: 0,
                life: .5,
                size: 36,
                color: `#ffffff`,
                type: `ring`
            });
            break;
        case `melee`:
            this.particles.push({
                x: e.x,
                y: e.y - 4,
                vx: 0,
                vy: 0,
                age: 0,
                life: .18,
                size: 30,
                color: `#ffffff`,
                type: `slash`,
                rot: n.players.find(t => t.id === e.actor)?.aim ?? 0
            });
            break;
        case `objective`:
            this.particles.push({
                x: e.x,
                y: e.y,
                vx: 0,
                vy: 0,
                age: 0,
                life: .6,
                size: 70,
                color: `#ffcc2e`,
                type: `ring`
            }),
            e.text && this.particles.push({
                x: e.x,
                y: e.y - 40,
                vx: 0,
                vy: -26,
                age: 0,
                life: 1.6,
                size: 14,
                color: `#ffcc2e`,
                type: `text`,
                text: e.text.toUpperCase().slice(0, 32)
            })
        }
        let i = this.budget(xa);
        this.particles.length > i && this.particles.splice(0, this.particles.length - i)
    }
    spray(e, t, n, r, i) {
        for (let a = 0; a < r; a++) {
            let r = N(e + t + a + this.elapsed)
              , o = n + (r - .5) * 1.3
              , s = i * (.4 + N(a + r) * .8);
            this.particles.push({
                x: e,
                y: t,
                vx: Math.cos(o) * s,
                vy: Math.sin(o) * s - 40,
                age: 0,
                life: .9,
                size: 1.6 + r * 1.6,
                color: va,
                type: `blood`
            })
        }
    }
    gibs(e) {
        let t = e.target ? this.seen.get(e.target) : void 0
          , n = ki(t?.avatar ?? Oi(e.target ?? `x`))
          , r = t?.facing ?? 1;
        [[`head`, n.skin, n.hasHat ? n.hat : n.hair, 8], [`torso`, n.shirt, n.shirtDark, 7], [`limb`, n.shirt, void 0, 4], [`limb`, n.pants, void 0, 4], [`boot`, n.boots, void 0, 4], [`boot`, n.boots, void 0, 4]].forEach( ([t,n,i,a], o) => {
            let s = -Math.PI / 2 + (N(e.id + o * 7) - .5) * 2.2
              , c = 140 + N(e.id * 3 + o) * 180;
            this.particles.push({
                x: e.x,
                y: e.y - (t === `head` ? 12 : 0),
                vx: Math.cos(s) * c - r * 30,
                vy: Math.sin(s) * c,
                age: 0,
                life: 2.6,
                size: a,
                color: n,
                color2: i,
                type: `gib`,
                part: t,
                rot: 0,
                vr: (N(o + e.id) - .5) * 18
            })
        }
        ),
        this.spray(e.x, e.y - 6, -Math.PI / 2, this.fx(this.reduced ? 5 : 16), 220),
        this.burst(e.x, e.y, this.reduced ? 2 : 5, `#d9d9d9`, `smoke`, 60)
    }
    burst(e, t, n, r, i, a) {
        this.reduced && (n = Math.ceil(n / 2)),
        n = this.fx(n);
        for (let o = 0; o < n; o++) {
            let n = N(o + e * .37 + t * .11 + this.lastEvent)
              , s = n * Math.PI * 2
              , c = i === `smoke` ? .9 : i === `gas` ? 1.2 : i === `dust` ? .5 : i === `chip` ? 1 : .3 + n * .3
              , l = i === `smoke` ? 7 + n * 8 : i === `gas` ? 10 + n * 10 : i === `dust` ? 4 + n * 3 : 1.6 + n * 2.4;
            this.particles.push({
                x: e,
                y: t,
                vx: Math.cos(s) * a * (.4 + n * .6),
                vy: Math.sin(s) * a * (.4 + n * .6),
                age: 0,
                life: c,
                size: l,
                color: r,
                type: i,
                rot: n * 6,
                vr: (n - .5) * 14
            })
        }
    }
    land(e, t) {
        for (let n of this.map?.platforms ?? [])
            if (!(e.x < n.x || e.x > n.x + n.w) && t <= n.y && e.y >= n.y)
                return e.y = n.y - (e.type === `gib` ? e.size * .5 : 1),
                !0;
        return !1
    }
    drawParticles(e) {
        let t = this.ctx
          , n = this.world
          , r = this.m
          , i = !0
          , a = () => {
            i ||= (n.apply(t),
            !0)
        }
          , o = [];
        t.save();
        for (let s = this.particles.length - 1; s >= 0; s--) {
            let c = this.particles[s];
            if (!c || (c.age += e,
            c.age > c.life))
                continue;
            let l = c.y;
            if (c.rest || (c.x += c.vx * e,
            c.y += c.vy * e),
            (c.type === `chip` || c.type === `spark` || c.type === `blood` || c.type === `gib` || c.type === `casing`) && (c.vy += (c.type === `spark` ? 300 : 900) * e),
            (c.type === `smoke` || c.type === `gas`) && (c.vx *= 1 - e * 1.5,
            c.vy -= 12 * e),
            c.type === `fire` && (c.vx *= 1 - e * 5,
            c.vy *= 1 - e * 5,
            c.vy -= 40 * e),
            c.rot !== void 0 && c.vr && !c.rest && (c.rot += c.vr * e),
            (c.type === `blood` || c.type === `gib` || c.type === `casing`) && !c.rest && c.vy > 0 && this.land(c, l)) {
                if (c.type === `blood`) {
                    this.addStain(c.x, c.y, c.size * 1.7),
                    c.life = -1;
                    continue
                }
                Math.abs(c.vy) < 120 ? (c.rest = !0,
                c.vy = 0,
                c.vx = 0) : (c.vy *= -.35,
                c.vx *= .6,
                c.vr = (c.vr ?? 0) * .5)
            }
            let u = c.age / c.life;
            c.type === `blood` ? o.push(c) : c.type === `ring` ? (a(),
            t.globalAlpha = 1 - u,
            t.strokeStyle = c.color,
            t.lineWidth = 4 * (1 - u) + .5,
            t.beginPath(),
            t.arc(c.x, c.y, c.size * (.15 + u * .85), 0, Math.PI * 2),
            t.stroke()) : c.type === `text` ? (a(),
            t.globalAlpha = u > .7 ? (1 - u) / .3 : 1,
            t.font = `${c.size}px ${_a}`,
            t.textAlign = `center`,
            t.lineWidth = 4,
            t.strokeStyle = E,
            t.lineJoin = `round`,
            t.strokeText(c.text ?? ``, c.x, c.y),
            t.fillStyle = c.color,
            t.fillText(c.text ?? ``, c.x, c.y)) : c.type === `spark` ? (a(),
            t.globalAlpha = 1 - u,
            t.strokeStyle = c.color,
            t.lineWidth = c.size * (1 - u * .5),
            t.lineCap = `round`,
            t.beginPath(),
            t.moveTo(c.x, c.y),
            t.lineTo(c.x - c.vx * .03, c.y - c.vy * .03),
            t.stroke()) : c.type === `smoke` || c.type === `gas` || c.type === `dust` ? (a(),
            t.globalAlpha = (1 - u) * (c.type === `gas` ? .4 : c.type === `dust` ? .6 : .5),
            t.fillStyle = c.color,
            t.beginPath(),
            t.arc(c.x, c.y, c.size * (.5 + u), 0, Math.PI * 2),
            t.fill()) : c.type === `fire` ? (a(),
            t.globalAlpha = 1 - u,
            t.fillStyle = u > .5 ? `#6b6b6b` : c.color,
            t.beginPath(),
            t.arc(c.x, c.y, c.size * (.6 + u * .6), 0, Math.PI * 2),
            t.fill()) : c.type === `casing` ? (t.globalAlpha = u > .75 ? (1 - u) / .25 : 1,
            r.copy(n).translate(c.x, c.y).rotate(c.rot ?? 0).apply(t),
            i = !1,
            t.fillStyle = c.color,
            t.fillRect(-c.size, -c.size * .4, c.size * 2, c.size * .8)) : c.type === `slash` ? (t.globalAlpha = 1 - u,
            r.copy(n).translate(c.x, c.y).rotate(c.rot ?? 0).apply(t),
            i = !1,
            t.strokeStyle = c.color,
            t.lineWidth = 3.5 * (1 - u) + .5,
            t.lineCap = `round`,
            t.beginPath(),
            t.arc(0, 0, c.size, -.9, .9),
            t.stroke()) : c.type === `gib` ? (t.globalAlpha = u > .8 ? (1 - u) / .2 : 1,
            this.drawSprite(this.gibSprite(c), c.x, c.y, c.rot ?? 0),
            i = !1) : (t.globalAlpha = 1 - u,
            r.copy(n).translate(c.x, c.y).rotate(c.rot ?? u * 8).apply(t),
            i = !1,
            t.fillStyle = c.color,
            t.fillRect(-c.size / 2, -c.size / 2, c.size, c.size))
        }
        if (o.length) {
            a(),
            t.globalAlpha = 1;
            for (let e = 0; e < o.length; ) {
                let n = o[e].color;
                for (t.fillStyle = n,
                t.beginPath(); e < o.length && o[e].color === n; e++) {
                    let n = o[e];
                    t.moveTo(n.x + n.size, n.y),
                    t.arc(n.x, n.y, n.size, 0, Math.PI * 2)
                }
                t.fill()
            }
        }
        t.restore();
        let s = 0;
        for (let e of this.particles)
            e.age <= e.life && (this.particles[s++] = e);
        this.particles.length = s
    }
    gibSprite(e) {
        return this.cached(`gib|${e.part}|${e.color}|${e.color2 ?? ``}|${e.size}`, !1, () => {
            let t = this.gibShapes(e);
            return [ra(t), e => Zi(e, t)]
        }
        )
    }
    gibShapes(e) {
        let t = e.size
          , n = [];
        return e.part === `head` ? (n.push({
            k: `c`,
            x: 0,
            y: 0,
            r: t,
            f: e.color,
            s: E,
            lw: 1.4
        }),
        e.color2 && n.push({
            k: `p`,
            d: [-t - 1, 0, -t * .7, -t * .8, 0, -t - 1.5, t * .7, -t * .8, t + 1, 0],
            f: e.color2,
            s: E,
            lw: 1.2
        }),
        n.push({
            k: `p`,
            d: [t * .2, -t * .1, t * .6, t * .2],
            s: E,
            lw: 1.2,
            open: !0
        }, {
            k: `p`,
            d: [t * .2, t * .2, t * .6, -t * .1],
            s: E,
            lw: 1.2,
            open: !0
        })) : e.part === `torso` ? n.push({
            k: `r`,
            x: -t,
            y: -t * .8,
            w: t * 2,
            h: t * 1.6,
            r: 2,
            f: e.color,
            s: E,
            lw: 1.3
        }, {
            k: `p`,
            d: [-t * .6, t * .8, t * .6, t * .8],
            s: va,
            lw: 2,
            open: !0
        }) : e.part === `boot` ? n.push({
            k: `r`,
            x: -t,
            y: -t * .5,
            w: t * 2,
            h: t,
            r: 1.5,
            f: e.color,
            s: E,
            lw: 1.2
        }) : n.push({
            k: `r`,
            x: -t * 1.2,
            y: -t * .5,
            w: t * 2.4,
            h: t,
            r: t * .4,
            f: e.color,
            s: E,
            lw: 1.2
        }, {
            k: `c`,
            x: t * 1.2,
            y: 0,
            r: t * .45,
            f: va
        }),
        n
    }
    clearStains() {
        this.stainList = [],
        this.stainChunks.clear()
    }
    get chunkSize() {
        return ya / this.stainScale
    }
    addStain(e, t, n) {
        let r = {
            x: e,
            y: t,
            size: n,
            age: 0,
            life: 3.5,
            level: 12,
            chunks: []
        };
        if (this.stainList.push(r),
        this.stainList.length > ba)
            for (let e of this.stainList.splice(0, this.stainList.length - ba))
                e.life = -1,
                this.dirtyStain(e);
        this.stainScale && this.placeStain(r, !0)
    }
    dirtyStain(e) {
        for (let t of e.chunks) {
            let e = this.stainChunks.get(t);
            e && (e.dirty = !0)
        }
    }
    placeStain(e, t) {
        let n = this.chunkSize
          , r = Math.floor((e.x - e.size - 1) / n)
          , i = Math.floor((e.x + e.size + 1) / n)
          , a = Math.floor((e.y + .5 - e.size * .35 - 1) / n)
          , o = Math.floor((e.y + .5 + e.size * .35 + 1) / n);
        for (let n = a; n <= o; n++)
            for (let a = r; a <= i; a++) {
                let r = (n + 4096) * 8192 + (a + 4096)
                  , i = this.stainChunks.get(r);
                if (!i) {
                    let e = document.createElement(`canvas`);
                    e.width = ya,
                    e.height = ya;
                    let t = e.getContext(`2d`);
                    if (!t)
                        continue;
                    i = {
                        canvas: e,
                        g: t,
                        cx: a,
                        cy: n,
                        list: [],
                        dirty: !1
                    },
                    this.stainChunks.set(r, i)
                }
                i.list.push(e),
                e.chunks.push(r),
                t && !i.dirty && this.paintStain(i, e)
            }
    }
    paintStain(e, t) {
        let n = e.g
          , r = this.stainScale;
        n.setTransform(r, 0, 0, r, -e.cx * ya, -e.cy * ya),
        n.globalAlpha = t.level / 20,
        n.fillStyle = va,
        n.beginPath(),
        n.ellipse(t.x, t.y + .5, t.size, t.size * .35, 0, 0, Math.PI * 2),
        n.fill()
    }
    stains(e) {
        let t = this.ctx;
        if (this.stainScale !== this.k) {
            this.stainScale = this.k,
            this.stainChunks.clear();
            for (let e of this.stainList)
                e.chunks = [],
                this.placeStain(e, !1);
            for (let e of this.stainChunks.values())
                e.dirty = !0
        }
        let n = 0;
        for (let t of this.stainList) {
            t.age += e;
            let r = t.age > t.life ? -1 : Math.round(ga((t.life - t.age) / 1.5, 0, .6) * 20);
            r !== t.level && (t.level = r,
            this.dirtyStain(t)),
            r >= 0 && (this.stainList[n++] = t)
        }
        if (this.stainList.length = n,
        !this.stainChunks.size)
            return;
        let r = Math.round(this.world.e)
          , i = Math.round(this.world.f)
          , a = this.canvas.width
          , o = this.canvas.height;
        t.save(),
        t.setTransform(1, 0, 0, 1, 0, 0);
        for (let[e,n] of this.stainChunks) {
            if (n.dirty) {
                if (n.list = n.list.filter(e => e.level >= 0 && e.life > 0),
                !n.list.length) {
                    this.stainChunks.delete(e);
                    continue
                }
                n.g.setTransform(1, 0, 0, 1, 0, 0),
                n.g.clearRect(0, 0, ya, ya);
                for (let e of n.list)
                    e.level > 0 && this.paintStain(n, e);
                n.dirty = !1
            }
            let s = r + n.cx * ya
              , c = i + n.cy * ya;
            s >= a || c >= o || s + ya <= 0 || c + ya <= 0 || t.drawImage(n.canvas, s, c)
        }
        t.restore()
    }
    hitMarker(e) {
        let t = Ji(e.guns[e.activeGun]?.id)
          , n = Math.cos(e.aim) >= 0 ? 1 : -1
          , r = t.hold === `blade` ? 40 : 165
          , i = e.crouching ? Fi.body : 0
          , a = this.toScreen(e.x + Pi.x * n + Math.cos(e.aim) * r, e.y + Pi.y + i + Math.sin(e.aim) * r)
          , {t: o, life: s, kill: c} = this.hitMark
          , l = o / s
          , u = (c ? 9 : 6) + (this.reduced ? 0 : (1 - l) * (c ? 6 : 3))
          , d = c ? 9 : 6
          , f = this.ctx;
        f.save(),
        f.translate(a.x, a.y),
        f.globalAlpha = Math.min(1, l * 2.2),
        f.lineCap = `round`,
        f.beginPath();
        for (let e = 0; e < 4; e++) {
            let t = Math.PI / 4 + e * Math.PI / 2
              , n = Math.cos(t)
              , r = Math.sin(t);
            f.moveTo(n * u, r * u),
            f.lineTo(n * (u + d), r * (u + d))
        }
        f.strokeStyle = `rgba(0,0,0,.75)`,
        f.lineWidth = c ? 6 : 5,
        f.stroke(),
        f.strokeStyle = c ? `#ff3b2f` : `#ffffff`,
        f.lineWidth = c ? 3.2 : 2.6,
        f.stroke(),
        f.restore()
    }
    damageArcs(e, t) {
        if (!this.damageFrom.length)
            return;
        let n = this.ctx
          , r = this.toScreen(e.x, e.y - 20)
          , i = ga(Math.min(this.width, this.height) * .14, 62, 104);
        n.save(),
        n.lineCap = `round`;
        for (let a of this.damageFrom) {
            let o = t.players.find(e => e.id === a.id && e.hp > 0 && e.respawnTimer <= 0)
              , s = Math.atan2((o?.y ?? a.y) - e.y, (o?.x ?? a.x) - e.x);
            n.globalAlpha = Math.min(1, a.life / .5) * .9,
            n.beginPath(),
            n.arc(r.x, r.y, i, s - .32, s + .32),
            n.strokeStyle = `rgba(0,0,0,.55)`,
            n.lineWidth = 11,
            n.stroke(),
            n.strokeStyle = `#ff2a1f`,
            n.lineWidth = 6,
            n.stroke(),
            n.beginPath(),
            n.moveTo(r.x + Math.cos(s) * (i + 12), r.y + Math.sin(s) * (i + 12)),
            n.lineTo(r.x + Math.cos(s - .1) * (i + 2), r.y + Math.sin(s - .1) * (i + 2)),
            n.lineTo(r.x + Math.cos(s + .1) * (i + 2), r.y + Math.sin(s + .1) * (i + 2)),
            n.closePath(),
            n.fillStyle = `#ff2a1f`,
            n.fill()
        }
        n.restore()
    }
    focusMarker(e, t) {
        let n = this.ctx
          , r = this.reduced ? 0 : Math.sin(this.elapsed * 6) * 3
          , i = this.toScreen(e.x, e.y - 58);
        n.save(),
        n.translate(i.x, i.y + r),
        n.lineJoin = `round`,
        n.beginPath(),
        n.moveTo(-11, -8),
        n.lineTo(0, 4),
        n.lineTo(11, -8),
        n.lineTo(11, -14),
        n.lineTo(0, -2),
        n.lineTo(-11, -14),
        n.closePath(),
        n.fillStyle = t ? `#ff3b2f` : `#ffd23f`,
        n.fill(),
        n.strokeStyle = `#000`,
        n.lineWidth = 2.5,
        n.stroke(),
        n.restore()
    }
    toScreen(e, t) {
        return {
            x: (e - this.camera.x + this.shakeX) * this.scale + this.width / 2,
            y: (t - this.camera.y + this.shakeY) * this.scale + this.height / 2
        }
    }
    edgePoint(e, t) {
        let n = this.width / 2
          , r = this.height / 2
          , i = this.width * .44
          , a = this.height * .4
          , o = e - n
          , s = t - r
          , c = 1 / Math.max(1e-6, Math.hypot(o / i, s / a));
        return {
            x: n + o * Math.min(1, c),
            y: r + s * Math.min(1, c),
            angle: Math.atan2(s, o)
        }
    }
    screenEffects(e, t, n, r) {
        let i = this.ctx;
        if (r && this.focus && this.focusMarker(r, this.focus.kind === `killer`),
        t && t.hp > 0 && t.respawnTimer <= 0) {
            this.damageArcs(t, e),
            this.hitMark.t > 0 && this.hitMarker(t);
            for (let r of e.players) {
                if (r.id === t.id || r.hp <= 0 || r.respawnTimer > 0 || n && r.team === t.team)
                    continue;
                let e = this.toScreen(r.x, r.y);
                if (e.x > 10 && e.x < this.width - 10 && e.y > 10 && e.y < this.height - 10)
                    continue;
                let a = this.edgePoint(e.x, e.y);
                i.save(),
                i.translate(a.x, a.y),
                i.rotate(a.angle),
                i.beginPath(),
                i.moveTo(13, 0),
                i.lineTo(-8, -10),
                i.lineTo(-8, 10),
                i.closePath(),
                i.fillStyle = `rgba(255,255,255,.35)`,
                i.fill(),
                i.strokeStyle = `#e3241b`,
                i.lineWidth = 3.2,
                i.lineJoin = `miter`,
                i.stroke(),
                i.restore()
            }
            let r = [];
            for (let n of e.flags ?? [])
                if (n.carrier !== t.id) {
                    let t = n.carrier ? e.players.find(e => e.id === n.carrier) : void 0;
                    r.push({
                        x: t?.x ?? n.x,
                        y: (t?.y ?? n.y) - 20,
                        color: pi[n.team % 2] ?? pi[0]
                    })
                }
            let a = e.objective;
            if (a?.kind === `bomb` && a.carrier !== t.id) {
                let t = a.carrier ? e.players.find(e => e.id === a.carrier) : void 0;
                r.push({
                    x: t?.x ?? a.x,
                    y: t?.y ?? a.y,
                    color: `#ffcc2e`
                })
            }
            if (a?.kind === `vip`)
                for (let n of a.vips) {
                    let i = n && n !== t.id ? e.players.find(e => e.id === n) : void 0;
                    i && i.hp > 0 && r.push({
                        x: i.x,
                        y: i.y - 20,
                        color: `#ffcc2e`
                    })
                }
            for (let e of r) {
                let t = this.toScreen(e.x, e.y);
                if (t.x > 20 && t.x < this.width - 20 && t.y > 20 && t.y < this.height - 20)
                    continue;
                let n = this.edgePoint(t.x, t.y);
                i.save(),
                i.translate(n.x, n.y),
                i.beginPath(),
                i.arc(0, 0, 10, 0, Math.PI * 2),
                i.fillStyle = e.color,
                i.fill(),
                i.strokeStyle = `#ffffff`,
                i.lineWidth = 2.5,
                i.stroke(),
                i.rotate(n.angle),
                i.beginPath(),
                i.moveTo(16, 0),
                i.lineTo(10, -5),
                i.lineTo(10, 5),
                i.closePath(),
                i.fillStyle = `#ffffff`,
                i.fill(),
                i.restore()
            }
            let o = ga(1 - t.hp / 35, 0, 1)
              , s = Math.max(o * (this.reduced ? .5 : .4 + Math.sin(this.elapsed * 5) * .12), this.flash);
            if (s > .01) {
                let e = i.createRadialGradient(this.width / 2, this.height / 2, Math.min(this.width, this.height) * .3, this.width / 2, this.height / 2, Math.max(this.width, this.height) * .72);
                e.addColorStop(0, `rgba(200,0,0,0)`),
                e.addColorStop(1, `rgba(190,10,10,${(s * .55).toFixed(3)})`),
                i.fillStyle = e,
                i.fillRect(0, 0, this.width, this.height)
            }
        }
        this.scopeLevel > 1 && (i.save(),
        i.strokeStyle = `rgba(255,255,255,.18)`,
        i.lineWidth = 1,
        i.beginPath(),
        i.moveTo(this.width / 2, 0),
        i.lineTo(this.width / 2, this.height),
        i.moveTo(0, this.height / 2),
        i.lineTo(this.width, this.height / 2),
        i.stroke(),
        i.restore())
    }
}
  , La = class {
    context = null;
    gain = null;
    noiseBuffer = null;
    jetGain = null;
    jetOscillator = null;
    seen = 0;
    lastVoice = 0;
    lastTick = 0;
    enabled = !0;
    volume = .32;
    unlock() {
        if (!this.context) {
            this.context = new AudioContext,
            this.gain = this.context.createGain();
            let e = this.context.createDynamicsCompressor();
            e.threshold.value = -10,
            e.knee.value = 18,
            e.ratio.value = 8,
            e.attack.value = .003,
            e.release.value = .16,
            this.gain.connect(e),
            e.connect(this.context.destination),
            this.noiseBuffer = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
            let t = this.noiseBuffer.getChannelData(0);
            for (let e = 0; e < t.length; e++)
                t[e] = Math.random() * 2 - 1;
            this.jetGain = this.context.createGain(),
            this.jetGain.gain.value = 0,
            this.jetOscillator = this.context.createOscillator(),
            this.jetOscillator.type = `sawtooth`,
            this.jetOscillator.frequency.value = 110;
            let n = this.context.createBiquadFilter();
            n.type = `lowpass`,
            n.frequency.value = 340,
            this.jetOscillator.connect(n),
            n.connect(this.jetGain),
            this.jetGain.connect(this.gain),
            this.jetOscillator.start()
        }
        this.context.resume(),
        this.setVolume(this.volume)
    }
    setVolume(e) {
        this.volume = Number.isFinite(e) ? Math.max(0, Math.min(1, e)) : .32,
        this.gain && (this.gain.gain.value = this.enabled ? this.volume : 0)
    }
    toggle() {
        this.enabled = !this.enabled,
        this.setVolume(this.volume),
        !this.enabled && typeof speechSynthesis < `u` && speechSynthesis.cancel()
    }
    tone(e, t, n, r=`square`, i=.2) {
        if (!this.enabled || !this.context || !this.gain)
            return;
        let a = this.context.currentTime
          , o = this.context.createOscillator()
          , s = this.context.createGain();
        o.type = r,
        o.frequency.setValueAtTime(e, a),
        o.frequency.exponentialRampToValueAtTime(Math.max(10, t), a + n),
        s.gain.setValueAtTime(i, a),
        s.gain.exponentialRampToValueAtTime(.001, a + n),
        o.connect(s),
        s.connect(this.gain),
        o.start(a),
        o.stop(a + n)
    }
    noise(e, t, n) {
        if (!this.enabled || !this.context || !this.gain)
            return;
        let r = this.context
          , i = this.noiseBuffer;
        if (!i)
            return;
        let a = r.createBufferSource()
          , o = r.createBiquadFilter()
          , s = r.createGain();
        a.buffer = i,
        o.type = `lowpass`,
        o.frequency.value = n,
        s.gain.setValueAtTime(t, r.currentTime),
        s.gain.exponentialRampToValueAtTime(.001, r.currentTime + e),
        a.connect(o),
        o.connect(s),
        s.connect(this.gain),
        a.start(0, Math.random() * .4, e),
        a.stop(r.currentTime + e)
    }
    ui() {
        this.tone(520, 780, .065, `sine`, .25)
    }
    note(e, t, n, r, i, a=e) {
        if (!this.enabled || !this.context || !this.gain)
            return;
        let o = this.context.currentTime + t
          , s = this.context.createOscillator()
          , c = this.context.createGain();
        s.type = r,
        s.frequency.setValueAtTime(e, o),
        a !== e && s.frequency.exponentialRampToValueAtTime(Math.max(10, a), o + n),
        c.gain.setValueAtTime(1e-4, o),
        c.gain.exponentialRampToValueAtTime(i, o + .012),
        c.gain.exponentialRampToValueAtTime(.001, o + n),
        s.connect(c),
        c.connect(this.gain),
        s.start(o),
        s.stop(o + n + .02)
    }
    sting(e) {
        if (!this.enabled || !this.context)
            return;
        let t = e => 440 * 2 ** (e / 12);
        for (let[n,r,i,a,o] of {
            start: [[-5, 0, .12, `square`, .1], [0, .11, .12, `square`, .1], [4, .22, .12, `square`, .1], [7, .33, .34, `square`, .12], [-17, .33, .4, `triangle`, .22]],
            first: [[7, 0, .08, `square`, .09], [12, .08, .22, `square`, .1]],
            lead: [[0, 0, .09, `square`, .08], [4, .08, .09, `square`, .08], [9, .16, .22, `triangle`, .14]],
            lost: [[4, 0, .14, `triangle`, .14], [0, .13, .14, `triangle`, .14], [-5, .26, .3, `triangle`, .14]],
            comeback: [[0, 0, .08, `square`, .09], [4, .07, .08, `square`, .09], [7, .14, .08, `square`, .09], [12, .21, .36, `square`, .11], [-12, .21, .4, `triangle`, .2]],
            streak: [[12, 0, .07, `square`, .08], [16, .06, .07, `square`, .08], [19, .12, .2, `square`, .09]],
            objective: [[2, 0, .1, `triangle`, .16], [9, .1, .26, `triangle`, .16]],
            alert: [[10, 0, .12, `square`, .08], [5, .14, .12, `square`, .08], [10, .28, .12, `square`, .08]],
            final: [[0, 0, .1, `square`, .09], [0, .16, .1, `square`, .09], [12, .32, .3, `square`, .1]],
            wave: [[-12, 0, .3, `sawtooth`, .07], [-5, .12, .3, `triangle`, .14]],
            victory: [[0, 0, .12, `square`, .09], [4, .12, .12, `square`, .09], [7, .24, .12, `square`, .09], [12, .36, .5, `square`, .1], [-12, .36, .55, `triangle`, .2], [16, .62, .4, `triangle`, .1]],
            defeat: [[7, 0, .18, `triangle`, .15], [3, .18, .18, `triangle`, .15], [0, .36, .18, `triangle`, .15], [-5, .54, .5, `triangle`, .16]],
            draw: [[0, 0, .16, `triangle`, .14], [5, .16, .16, `triangle`, .14], [0, .32, .3, `triangle`, .14]],
            challenge: [[12, 0, .08, `sine`, .14], [16, .08, .08, `sine`, .14], [19, .16, .08, `sine`, .14], [24, .24, .4, `sine`, .16], [7, .24, .4, `triangle`, .12]]
        }[e] ?? [])
            this.note(t(n), r, i, a, o)
    }
    chat(e) {
        let t = {
            GG: `Good game, Oberoi!`,
            CM: `Cover me!`,
            MO: `Move out!`,
            GM: `Oh, they got me!`,
            RU: `Oberoi, ready up!`,
            CB: `Come on, boy!`,
            HH: `Oberoi Army, let us go!`,
            LG: `Let's go, Oberoi!`,
            BI: `Bring it!`,
            GS: `Clutch time!`,
            NS: `Nice clutch!`,
            WP: `Well played!`,
            NN: `No, no!`
        }[e.trim().toUpperCase()];
        if (!t || !this.enabled || this.volume <= 0 || performance.now() - this.lastVoice < 2200)
            return;
        if (this.lastVoice = performance.now(),
        typeof speechSynthesis > `u` || typeof SpeechSynthesisUtterance > `u`) {
            this.ui();
            return
        }
        let n = new SpeechSynthesisUtterance(t);
        n.lang = `en-US`,
        n.rate = 1.05,
        n.pitch = 1,
        n.volume = Math.min(.8, this.volume * 1.5),
        speechSynthesis.cancel(),
        speechSynthesis.speak(n)
    }
    jet(e, t=100) {
        if (!this.context || !this.jetGain || !this.jetOscillator)
            return;
        let n = this.context.currentTime
          , r = e && this.enabled ? .055 : 0;
        this.jetGain.gain.cancelScheduledValues(n),
        this.jetGain.gain.setValueAtTime(this.jetGain.gain.value, n),
        this.jetGain.gain.linearRampToValueAtTime(r, n + .025),
        this.jetGain.gain.linearRampToValueAtTime(0, n + .18),
        this.jetOscillator.frequency.setTargetAtTime(88 + Math.max(0, Math.min(100, t)) * .45, n, .03)
    }
    reset() {
        this.seen = 0,
        this.jet(!1)
    }
    update(e, t) {
        for (let n of e)
            if (!(n.id <= this.seen)) {
                if (this.seen = n.id,
                n.type === `shot`) {
                    let e = n.actor === t;
                    n.weapon === `rocket` || n.weapon === `grenadeLauncher` ? (this.noise(.22, e ? .4 : .12, 650),
                    this.tone(110, 40, .2, `sawtooth`, .15)) : n.weapon === `emp` ? this.tone(260, 1400, .45, `sine`, e ? .15 : .035) : n.weapon === `laser` ? this.tone(1100, 180, .11, `sawtooth`, e ? .12 : .035) : n.weapon === `saw` ? (this.tone(210, 80, .17, `sawtooth`, e ? .18 : .04),
                    this.noise(.12, e ? .15 : .035, 1900)) : n.weapon === `grenade` ? this.noise(.12, e ? .18 : .03, 900) : n.weapon === `shotgun` ? (this.noise(.17, e ? .5 : .1, 1700),
                    this.tone(95, 28, .16, `triangle`, .2)) : n.weapon === `flamer` ? this.noise(.09, e ? .2 : .045, 800) : n.weapon === `minigun` ? (this.noise(.045, e ? .2 : .04, 1600),
                    this.tone(135, 55, .045, `sawtooth`, e ? .07 : .018)) : (this.noise(.065, e ? .3 : .055, 2800),
                    this.tone(n.weapon === `sniper` ? 120 : 220, 45, .065, `triangle`, e ? .15 : .035))
                }
                n.type === `explosion` && (this.noise(.45, .5, 600),
                this.tone(90, 20, .35, `triangle`, .35)),
                n.type === `hit` && n.target === t ? (this.tone(240, 90, .09, `triangle`, .24),
                this.noise(.05, .12, 900)) : n.type === `hit` && n.actor === t && performance.now() - this.lastTick > 45 && (this.lastTick = performance.now(),
                this.tone(1650, 1250, .035, `square`, .07)),
                n.type === `kill` && n.actor === t && n.target !== t && (this.tone(650, 1e3, .12, `sine`, .35),
                this.note(1975, .07, .09, `square`, .06)),
                n.type === `pickup` && n.actor === t && this.tone(480, 1100, .15, `sine`, .3),
                n.type === `reload` && n.actor === t && this.noise(.08, .2, 3e3),
                n.type === `melee` && n.actor === t && (this.noise(.1, .22, 1400),
                this.tone(300, 80, .1, `triangle`, .12)),
                n.type === `block` && (this.tone(1200, 620, .075, `triangle`, n.target === t ? .3 : .06),
                this.noise(.045, .12, 4500)),
                n.type === `gas` && this.noise(.55, n.actor === t ? .22 : .08, 1800),
                n.type === `mine` && n.actor === t && n.text === `armed` && this.tone(900, 1200, .07, `sine`, .2),
                n.type === `objective` && (this.tone(440, 660, .15, `triangle`, .23),
                this.tone(660, 880, .27, `sine`, .18))
            }
    }
}
  , Ra = 3
  , za = 3200
  , Ba = 140
  , Va = {
    3: [`ON A ROLL!`, `3 IN A ROW`],
    5: [`CLUTCH MODE!`, `5 WITHOUT A SCRATCH`],
    8: [`HIGHLIGHT REEL!`, `8 STRAIGHT · CLIP IT`],
    12: [`OBEROI LEGEND!`, `12 STREAK · UNREAL`]
}
  , Ha = {
    lead: 6e3,
    lost: 6e3,
    "flag-taken": 3500,
    "flag-lost": 3500,
    "bomb-carry": 8e3,
    returned: 5e3
}
  , Ua = e => e === `teams` || e === `ctf` || e === `vip` || e === `bomb`
  , Wa = e => e.toUpperCase()
  , Ga = class {
    queue = [];
    showing = null;
    lastShown = -1 / 0;
    cooldowns = new Map;
    seen = -1;
    primed = !1;
    firstDone = !1;
    finalDone = !1;
    leader = null;
    deficit = 0;
    lastWave = 0;
    streaks = new Map;
    stats = {
        jetKills: 0,
        bestStreak: 0,
        flagCaptures: 0,
        bombPlants: 0,
        vipTakedowns: 0
    };
    reset() {
        this.queue = [],
        this.showing = null,
        this.lastShown = -1 / 0,
        this.cooldowns.clear(),
        this.seen = -1,
        this.primed = !1,
        this.firstDone = !1,
        this.finalDone = !1,
        this.leader = null,
        this.deficit = 0,
        this.lastWave = 0,
        this.streaks.clear(),
        Object.assign(this.stats, {
            jetKills: 0,
            bestStreak: 0,
            flagCaptures: 0,
            bombPlants: 0,
            vipTakedowns: 0
        })
    }
    push(e, t) {
        t < (this.cooldowns.get(e.key) ?? 0) || (this.cooldowns.set(e.key, t + (Ha[e.key] ?? 0)),
        this.showing?.key === e.key && e.priority >= this.showing.priority && (this.showing = null,
        this.lastShown = -1 / 0),
        this.queue = this.queue.filter(t => t.key !== e.key),
        this.queue.push({
            ...e,
            at: t
        }),
        this.queue.sort( (e, t) => t.priority - e.priority || e.at - t.at),
        this.queue.length > Ra && (this.queue.length = Ra))
    }
    frame(e) {
        this.queue = this.queue.filter(t => e - t.at < (t.ttl ?? za));
        let t = this.queue[0];
        return this.showing && e >= this.showing.until && (this.lastShown = e,
        this.showing = null),
        this.showing && t && t.priority >= 4 && this.showing.priority <= 2 && e - (this.showing.until - this.showing.hold) > 450 && (this.showing = null),
        !this.showing && t && e - this.lastShown >= Ba ? (this.queue.shift(),
        this.showing = {
            ...t,
            until: e + t.hold
        },
        {
            callout: this.showing,
            fresh: !0
        }) : {
            callout: this.showing,
            fresh: !1
        }
    }
    observe(e, t, n) {
        let r = e.players.find(e => e.id === t);
        if (!r)
            return;
        let i = e.config.mode;
        if (!this.primed) {
            if (this.primed = !0,
            !(e.config.duration - e.time < 4 || e.tick < 240)) {
                this.seen = e.events.reduce( (e, t) => Math.max(e, t.id), -1),
                this.firstDone = e.players.some(e => e.kills > 0),
                this.finalDone = e.time <= 30,
                this.lastWave = e.wave,
                this.leader = this.currentLeader(e);
                return
            }
            let t = i === `survival` ? `HOLD THE BASE TOGETHER` : i === `ctf` ? `BRING THEIR FLAG HOME` : i === `bomb` ? `PLANT IT OR STOP IT` : i === `vip` ? `GUARD YOUR VIP` : i === `teams` ? `${y[0] ?? `OBEROI`} VS ${y[1] ?? `LILY`}` : `EVERY PILOT FOR THEMSELVES`;
            this.push({
                key: `start`,
                title: i === `survival` ? `OBEROI, HOLD THE LINE!` : `OBEROI, DEPLOY!`,
                sub: t,
                priority: 5,
                tone: `good`,
                sting: `start`,
                hold: 2100,
                banner: !0
            }, n),
            this.lastWave = e.wave
        }
        for (let t of e.events)
            t.id <= this.seen || (this.seen = t.id,
            this.onEvent(e, r, t, n));
        this.scoreCheck(e, r, n),
        !this.finalDone && i !== `survival` && e.config.duration >= 60 && e.time <= 30 && e.time > 0 && e.phase === `playing` && (this.finalDone = !0,
        this.push({
            key: `final`,
            title: `FINAL 30!`,
            sub: `MAKE IT COUNT`,
            priority: 4,
            tone: `neutral`,
            sting: `final`,
            hold: 1700,
            banner: !0
        }, n)),
        i === `survival` && e.wave > this.lastWave && (this.lastWave = e.wave,
        e.wave > 1 && this.push({
            key: `wave`,
            title: `WAVE ${e.wave}`,
            sub: `INCOMING · STICK TOGETHER`,
            priority: 3,
            tone: `neutral`,
            sting: `wave`,
            hold: 1600,
            banner: !0
        }, n))
    }
    matchStats(e, t, n) {
        let r = Rn(e)
          , i = e.players.find(e => e.id === t);
        return {
            map: e.config.map,
            mode: e.config.mode,
            won: n,
            placement: r.findIndex(e => e.id === t) + 1,
            players: e.players.length,
            kills: i?.kills ?? 0,
            wave: e.config.mode === `survival` ? e.wave : 0,
            ...this.stats
        }
    }
    enemies(e, t, n) {
        return !!t && !!n && t.id !== n.id && (e.config.mode === `ffa` || t.team !== n.team)
    }
    teamName(e) {
        return y[e] ?? `TEAM ${e + 1}`
    }
    onEvent(e, t, n, r) {
        let i = t => e.players.find(e => e.id === t)
          , a = i(n.actor)
          , o = i(n.target)
          , s = n.text ?? ``;
        if (n.type === `kill`) {
            let n = o ? this.streaks.get(o.id) ?? 0 : 0;
            if (o && this.streaks.set(o.id, 0),
            !this.enemies(e, a, o) || !a || !o)
                return;
            let i = (this.streaks.get(a.id) ?? 0) + 1;
            this.streaks.set(a.id, i);
            let s = a.id === t.id;
            if (s && (this.stats.bestStreak = Math.max(this.stats.bestStreak, i),
            t.grounded || this.stats.jetKills++),
            this.firstDone || (this.firstDone = !0,
            this.push({
                key: `first`,
                title: `FIRST TAKEDOWN!`,
                sub: s ? `YOU STRIKE FIRST` : `${Wa(a.name)} STRIKES FIRST`,
                priority: 3,
                tone: s ? `good` : o.id === t.id ? `bad` : `neutral`,
                sting: `first`,
                hold: 1600,
                banner: !0
            }, r)),
            s && n >= 5 && this.push({
                key: `shutdown`,
                title: `STREAK SNAPPED!`,
                sub: `${Wa(o.name)}'S RUN ENDS AT ${n}`,
                priority: 3,
                tone: `good`,
                sting: `streak`,
                hold: 1600,
                banner: !0
            }, r),
            s && Va[i]) {
                let[e,t] = Va[i];
                this.push({
                    key: `streak`,
                    title: e,
                    sub: t,
                    priority: 3,
                    tone: `good`,
                    sting: `streak`,
                    hold: 1700,
                    banner: !0
                }, r)
            }
            return
        }
        let c = t.team
          , l = !!a && a.team === c;
        if (n.type === `pickup` && s === `FLAG TAKEN` && a)
            a.id === t.id ? this.push({
                key: `flag-taken`,
                title: `YOU HAVE THE FLAG!`,
                sub: `BRING IT HOME`,
                priority: 3,
                tone: `good`,
                sting: `objective`,
                hold: 1600,
                banner: !0
            }, r) : l ? this.push({
                key: `flag-taken`,
                title: `FLAG GRABBED!`,
                sub: `${Wa(a.name)} IS RUNNING IT`,
                priority: 2,
                tone: `good`,
                sting: `objective`,
                hold: 1400,
                banner: !0
            }, r) : this.push({
                key: `flag-lost`,
                title: `OUR FLAG IS OUT!`,
                sub: `STOP ${Wa(a.name)}`,
                priority: 3,
                tone: `bad`,
                sting: `alert`,
                hold: 1600,
                banner: !0
            }, r);
        else if (n.type === `pickup` && s.startsWith(`FLAG CAPTURE`) && a) {
            a.id === t.id && this.stats.flagCaptures++;
            let e = s.replace(`FLAG CAPTURE`, ``).trim();
            this.push({
                key: `capture`,
                title: a.id === t.id ? `YOU CAPTURED IT!` : `FLAG CAPTURED!`,
                sub: `${this.teamName(a.team)} ${e}`,
                priority: 4,
                tone: l ? `good` : `bad`,
                sting: l ? `objective` : `alert`,
                hold: 1800,
                banner: !0
            }, r)
        } else if (n.type === `pickup` && s === `FLAG RETURNED` && a)
            this.push({
                key: `returned`,
                title: `FLAG RETURNED`,
                sub: `${Wa(a.name)} SAVES IT`,
                priority: 1,
                tone: l ? `good` : `neutral`,
                sting: null,
                hold: 1200,
                banner: !0
            }, r);
        else if (n.type === `objective`) {
            if (s.startsWith(`BOMB PLANTED`)) {
                a?.id === t.id && this.stats.bombPlants++;
                let e = s.replace(`BOMB PLANTED`, ``).trim();
                this.push({
                    key: `plant`,
                    title: `BOMB PLANTED!`,
                    sub: `${e ? `${e} · ` : ``}${l ? `HOLD THE SITE` : `DEFUSE IT NOW`}`,
                    priority: 4,
                    tone: l ? `good` : `bad`,
                    sting: l ? `objective` : `alert`,
                    hold: 1800,
                    banner: !0
                }, r)
            } else if (s.includes(`TAKES ROUND`)) {
                let[e,t=``] = s.split(` · `)
                  , n = y.findIndex(e => t.startsWith(e));
                this.push({
                    key: `round`,
                    title: n >= 0 ? `ROUND TO ${this.teamName(n)}` : `ROUND OVER`,
                    sub: e,
                    priority: 4,
                    tone: n === c ? `good` : n >= 0 ? `bad` : `neutral`,
                    sting: n === c ? `objective` : `alert`,
                    hold: 1800,
                    banner: !0
                }, r)
            } else if (s.startsWith(`VIP DOWN`)) {
                a?.id === t.id && this.stats.vipTakedowns++;
                let e = o?.team === c;
                this.push({
                    key: `vip`,
                    title: e ? `OUR VIP IS DOWN!` : `VIP DOWN!`,
                    sub: s.split(` · `)[1] ?? ``,
                    priority: 4,
                    tone: e ? `bad` : `good`,
                    sting: e ? `alert` : `objective`,
                    hold: 1700,
                    banner: !0
                }, r)
            } else
                / IS THE .* VIP$/.test(s) && a?.id === t.id ? this.push({
                    key: `vip-you`,
                    title: `YOU ARE THE VIP`,
                    sub: `STAY ALIVE · STAY CLOSE`,
                    priority: 3,
                    tone: `neutral`,
                    sting: `objective`,
                    hold: 1700,
                    banner: !0
                }, r) : s.endsWith(`HAS THE BOMB`) && a?.id === t.id && this.push({
                    key: `bomb-carry`,
                    title: `YOU HAVE THE BOMB`,
                    sub: `FIND A SITE`,
                    priority: 2,
                    tone: `neutral`,
                    sting: null,
                    hold: 1300,
                    banner: !0
                }, r)
        }
    }
    currentLeader(e) {
        let t = e.config.mode;
        if (t === `survival`)
            return null;
        if (Ua(t)) {
            let t = this.teamScores(e);
            return t[0] === t[1] ? null : t[0] > t[1] ? `team-0` : `team-1`
        }
        let n = Rn(e)
          , r = n[0]
          , i = n[1];
        return !r || r.score <= 0 || i && i.score === r.score ? null : r.id
    }
    teamScores(e) {
        if (e.config.mode === `teams`) {
            let t = [0, 0];
            for (let n of e.players)
                t[+(n.team === 1)] += n.score;
            return t
        }
        return [e.teamScores?.[0] ?? 0, e.teamScores?.[1] ?? 0]
    }
    scoreCheck(e, t, n) {
        let r = e.config.mode;
        if (r === `survival` || e.phase !== `playing`)
            return;
        let i = Ua(r)
          , a = i ? `team-${t.team}` : t.id
          , o = 0;
        if (i) {
            let n = this.teamScores(e);
            o = n[1 - t.team] - n[t.team]
        } else {
            let n = Rn(e)[0];
            o = n ? n.score - t.score : 0
        }
        this.deficit = Math.max(this.deficit, o);
        let s = this.currentLeader(e);
        if (s === null || s === this.leader)
            return;
        let c = this.leader;
        if (this.leader = s,
        c === null)
            return;
        let l = r === `teams` ? 5 : i ? 2 : 3;
        if (s === a) {
            let e = this.deficit >= l;
            this.deficit = 0,
            e ? this.push({
                key: `comeback`,
                title: `COMEBACK!`,
                sub: i ? `${this.teamName(t.team)} TAKES THE LEAD` : `FROM BEHIND TO ON TOP`,
                priority: 4,
                tone: `good`,
                sting: `comeback`,
                hold: 1800,
                banner: !0
            }, n) : this.push({
                key: `lead`,
                title: i ? `${this.teamName(t.team)} LEADS!` : `YOU TOOK THE LEAD!`,
                sub: i ? `KEEP THE PRESSURE ON` : `NOW HOLD IT`,
                priority: 3,
                tone: `good`,
                sting: `lead`,
                hold: 1500,
                banner: !0
            }, n)
        } else if (i)
            this.push({
                key: `lost`,
                title: `${this.teamName(1 - t.team)} LEADS`,
                sub: `TIME TO ANSWER BACK`,
                priority: 3,
                tone: `bad`,
                sting: `lost`,
                hold: 1500,
                banner: !0
            }, n);
        else if (c === t.id) {
            let t = e.players.find(e => e.id === s)?.name ?? `A RIVAL`;
            this.push({
                key: `lost`,
                title: `LEAD LOST!`,
                sub: `${Wa(t)} IS AHEAD`,
                priority: 3,
                tone: `bad`,
                sting: `lost`,
                hold: 1500,
                banner: !0
            }, n)
        }
    }
}
  , Ka = `#ffc463`
  , qa = `#c98a2c`;
function Ja(e, t, n, r) {
    let i = (e, n=``) => `<path${n ? ` class="${n}"` : ``} d="${e}" stroke="${r}" stroke-width="21" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${e}" stroke="url(#${t}s)" stroke-width="13" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
      , a = (e, t, i=10) => `<circle cx="${e}" cy="${t}" r="${i}" fill="${n}" stroke="${r}" stroke-width="4"/>`
      , o = `${i(`M70 124L50 144L62 158`)}${a(63, 157, 9)}`
      , s = `${i(`M70 124c-8 14-10 26-6 38`)}${a(64, 164)}`;
    switch (e) {
    case `salute`:
        {
            let e = `<ellipse cx="147" cy="60" rx="14" ry="7.5" transform="rotate(-38 147 60)" fill="${n}" stroke="${r}" stroke-width="4"/>`;
            return {
                sky: ``,
                under: s,
                over: `${i(`M130 124L164 110L150 66`)}${e}`,
                lift: 0
            }
        }
    case `wave`:
        {
            let e = `<path d="M182 30q8 10 0 22M190 24q12 16 0 34" fill="none" stroke="${l.colors.orange}" stroke-width="3.5" stroke-linecap="round"/>`;
            return {
                sky: ``,
                under: o,
                over: `<g class="pose-wave-arm">${i(`M130 124L160 98L166 54`)}${a(166, 48, 11)}<path d="M158 40l-3-9M166 37v-10M174 40l3-9" stroke="${r}" stroke-width="3" stroke-linecap="round"/></g>${e}`,
                lift: 0
            }
        }
    case `point`:
        {
            let e = `<path d="M186 96l15-8" stroke="${r}" stroke-width="9" stroke-linecap="round"/><path d="M186 96l15-8" stroke="${n}" stroke-width="4.5" stroke-linecap="round"/>`
              , t = `<path d="M196 62l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="${l.colors.orange}" stroke="${r}" stroke-width="2"/>`;
            return {
                sky: ``,
                under: o,
                over: `${i(`M130 124L160 114L178 102`)}${e}${a(180, 100)}${t}`,
                lift: 0
            }
        }
    case `flex`:
        {
            let e = e => `<path d="M${e - 9} 124q9-14 18 0" fill="url(#${t}s)" stroke="${r}" stroke-width="3.5"/>`
              , n = `<path d="M18 74l-8-4M16 88h-9M180 74l8-4M182 88h9" stroke="${l.colors.orange}" stroke-width="3.5" stroke-linecap="round"/>`;
            return {
                sky: ``,
                under: `${i(`M70 124L40 124L36 90`)}${i(`M130 124L160 124L164 90`)}${e(52)}${e(148)}${a(36, 84, 11)}${a(164, 84, 11)}${n}`,
                over: ``,
                lift: 0
            }
        }
    case `hover`:
        {
            let e = e => `<g class="pose-flame"><path d="M${e - 8} 132h16l-8 50z" fill="${l.colors.orange}" stroke="${r}" stroke-width="3" stroke-linejoin="round"/><path d="M${e - 3.5} 134h7l-3.5 26z" fill="#fff6e0"/></g>`
              , t = [l.colors.purple, l.colors.orange, l.colors.white, l.colors.light, Ka]
              , n = Array.from({
                length: 18
            }, (e, n) => {
                let r = 8 + n * 53 % 186
                  , i = -18 + n * 37 % 70
                  , a = n * 47 % 180
                  , o = t[n % t.length];
                return `<g class="confetti" style="--d:${n % 6 * -.4}s"><rect x="${r}" y="${i}" width="${n % 3 ? 7 : 5}" height="${n % 3 ? 4 : 9}" rx="1" fill="${o}" transform="rotate(${a} ${r + 3} ${i + 2})"/></g>`
            }
            ).join(``);
            return {
                sky: `${e(65)}${e(135)}`,
                under: ``,
                over: `${i(`M70 124L50 96L40 60`)}${i(`M130 124L150 96L160 60`)}${a(39, 54, 11)}${a(161, 54, 11)}<g class="pose-confetti">${n}</g>`,
                lift: 18
            }
        }
    case `trophy`:
        {
            let e = `<g class="pose-trophy"><path d="M138 4h28v8c0 12-6 20-14 20s-14-8-14-20z" fill="${Ka}" stroke="${r}" stroke-width="3.5" stroke-linejoin="round"/><path d="M138 8c-8 0-9 12 1 14M166 8c8 0 9 12-1 14" fill="none" stroke="${r}" stroke-width="3"/><rect x="148.5" y="31" width="7" height="7" fill="${qa}" stroke="${r}" stroke-width="3"/><rect x="141" y="37" width="22" height="6" rx="2" fill="${Ka}" stroke="${r}" stroke-width="3"/><path d="M148 12h-3v8h4v-3h-2M155 20v-8h4M155 16h3" fill="none" stroke="${qa}" stroke-width="2"/></g>`
              , t = `<path d="M124 -6l2 6 6 2-6 2-2 6-2-6-6-2 6-2zM180 2l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="${l.colors.white}" stroke="${r}" stroke-width="1.5"/>`;
            return {
                sky: ``,
                under: o,
                over: `${i(`M130 124L150 92L152 54`)}${e}${a(152, 48, 10)}${t}`,
                lift: 0
            }
        }
    }
}
var Ya = [`grounded`, `jetting`, `crouching`, `shielding`, `vip`, `carryingBomb`, `firing`, `bot`]
  , Xa = ce()
  , Za = class {
    events = [];
    roster = [];
    rosterVersion = -1;
    pickups = [];
    catalogue = new Map;
    pickupVersion = -1;
    stats = {
        messages: 0,
        baselines: 0,
        skipped: 0,
        rosterUpdates: 0,
        pickupUpdates: 0,
        pickupGaps: 0
    };
    ready = !1;
    reset() {
        this.events = [],
        this.roster = [],
        this.rosterVersion = -1,
        this.pickups = [],
        this.catalogue = new Map,
        this.pickupVersion = -1,
        this.ready = !1
    }
    apply(e) {
        let t = e.w;
        if (this.stats.messages++,
        e.base && (this.stats.baselines++,
        this.reset(),
        this.ready = !0,
        this.roster = e.base.ro,
        this.rosterVersion = t.rv,
        this.pickups = e.base.pickups.map($a),
        this.catalogue = new Map(this.pickups.map(e => [e.id, e])),
        this.pickupVersion = t.pv),
        !this.ready || (e.repair?.ro && (this.roster = e.repair.ro,
        this.rosterVersion = t.rv),
        e.repair?.pickups && (this.pickups = e.repair.pickups.map($a),
        this.catalogue = new Map(this.pickups.map(e => [e.id, e])),
        this.pickupVersion = t.pv),
        t.ro && (t.rv !== this.rosterVersion && this.stats.rosterUpdates++,
        this.roster = t.ro,
        this.rosterVersion = t.rv),
        t.rv !== this.rosterVersion || this.roster.length !== t.players.length))
            return this.stats.skipped++,
            null;
        let n = t.players.map( (e, t) => Qa(e, this.roster[t]))
          , r = e => e === void 0 ? void 0 : typeof e == `number` ? n[e]?.id : e;
        if (e.base && this.mergeEvents(e.base.events, r),
        e.repair?.events && this.mergeEvents(e.repair.events, r),
        t.ev?.length && this.mergeEvents(t.ev, r),
        t.pk) {
            t.pv !== this.pickupVersion && this.stats.pickupUpdates++;
            let e = [];
            for (let n of t.pk) {
                let t = typeof n == `number` ? this.catalogue.get(n) : $a(n);
                t ? e.push(t) : this.stats.pickupGaps++
            }
            this.pickups = e,
            this.catalogue = new Map(e.map(e => [e.id, e])),
            this.pickupVersion = t.pv
        } else
            t.pv !== this.pickupVersion && (this.stats.pickupGaps++,
            this.pickupVersion = t.pv);
        if (e.me) {
            let t = {
                ...e.me,
                input: {
                    ...Xa
                },
                botTimer: 0,
                botTarget: null,
                lastAttacker: null
            }
              , r = n.findIndex(e => e.id === t.id);
            r >= 0 ? n[r] = t : n.push(t)
        }
        let i = new Map(n.map(e => [e.id, e.team]))
          , a = t.projectiles.map(e => {
            let t = r(e.o) ?? ``
              , n = {
                id: e.i,
                owner: t,
                team: i.get(t) ?? 0,
                x: e.x,
                y: e.y,
                vx: e.u,
                vy: e.v,
                damage: 0,
                life: e.l,
                weapon: e.w,
                radius: e.r,
                explosive: e.e === 1,
                bounces: e.b ?? 0
            };
            return e.g && (n.grenadeKind = e.g),
            n
        }
        )
          , o = {
            map: t.map,
            config: t.config,
            players: n,
            projectiles: a,
            pickups: this.pickups,
            events: this.events,
            tick: t.tick,
            time: t.time,
            phase: t.phase,
            winner: t.winner,
            nextId: t.nextId,
            wave: t.wave
        };
        return t.matchId !== void 0 && (o.matchId = t.matchId),
        t.flags && (o.flags = t.flags),
        t.teamScores && (o.teamScores = t.teamScores),
        t.mines && (o.mines = t.mines),
        t.areas && (o.areas = t.areas),
        t.objective && (o.objective = t.objective),
        o
    }
    mergeEvents(e, t) {
        let n = new Set(this.events.map(e => e.id))
          , r = e.filter(e => !n.has(e.i));
        if (!r.length)
            return;
        let i = this.events.concat(r.map(e => {
            let n = {
                id: e.i,
                type: e.k,
                x: e.x,
                y: e.y
            }
              , r = t(e.a)
              , i = t(e.t);
            return r !== void 0 && (n.actor = r),
            i !== void 0 && (n.target = i),
            e.tx !== void 0 && (n.text = e.tx),
            e.w !== void 0 && (n.weapon = e.w),
            e.g !== void 0 && (n.grenadeKind = e.g),
            n
        }
        ));
        i.sort( (e, t) => e.id - t.id),
        this.events = i.length > 80 ? i.slice(i.length - 80) : i
    }
}
;
function Qa(e, t) {
    let n = {
        id: t.i,
        name: t.n,
        x: e.x,
        y: e.y,
        vx: e.u,
        vy: e.v,
        aim: e.a,
        hp: e.h,
        fuel: e.f,
        team: e.t,
        color: t.c,
        bot: !1,
        kills: e.k,
        deaths: e.d,
        score: e.s,
        guns: e.g ? [e.w ? {
            id: e.g,
            ammo: 0,
            reserve: 0,
            dual: !0
        } : {
            id: e.g,
            ammo: 0,
            reserve: 0
        }] : [],
        activeGun: 0,
        grenades: 0,
        grounded: !1,
        jetting: !1,
        firing: !1,
        reloadTimer: e.rt ?? 0,
        fireTimer: e.ft ?? 0,
        respawnTimer: e.rs ?? 0,
        invulnerable: e.iv ?? 0,
        meleeTimer: e.mt ?? 0,
        grenadeTimer: 0,
        goldenTime: e.gt ?? 0,
        lastAttacker: null,
        botTimer: 0,
        botTarget: null,
        input: Xa
    };
    for (let t = 0; t < Ya.length; t++)
        e.m & 1 << t && (n[Ya[t]] = !0);
    let r = t.av;
    return r && (n.avatar = {
        hat: r[0] ?? 0,
        hair: r[1] ?? 0,
        face: r[2] ?? 0,
        skin: r[3] ?? 0,
        shirt: r[4] ?? 0,
        pants: r[5] ?? 0,
        boots: r[6] ?? 0
    }),
    n
}
function $a(e) {
    let t = {
        id: e.i,
        x: e.x,
        y: e.y,
        kind: e.k,
        timer: 0
    };
    return e.g && (t.grenade = e.g),
    e.gold && (t.golden = !0),
    e.d && (t.dropped = !0),
    e.gun && (t.gun = e.gun),
    e.lf && (t.lockedFor = e.lf),
    e.d && (t.expires = e.ex ? 3.9 : 30),
    t
}
var eo = (e, t) => JSON.stringify(Object.entries(e).sort()) === JSON.stringify(Object.entries(t).sort())
  , to = class {
    desired = null;
    sent = null;
    reset() {
        this.desired = this.sent = null
    }
    view(e) {
        return {
            ...this.desired ?? e
        }
    }
    offer(e) {
        return this.desired = {
            ...e
        },
        this.next()
    }
    confirm(e) {
        return this.sent && eo(this.sent, e) && (this.sent = null),
        !this.sent && this.desired && eo(this.desired, e) && (this.desired = null),
        this.next()
    }
    flush() {
        return !this.desired || this.sent && eo(this.sent, this.desired) ? null : (this.sent = {
            ...this.desired
        },
        {
            ...this.sent
        })
    }
    next() {
        return this.sent || !this.desired ? null : (this.sent = {
            ...this.desired
        },
        {
            ...this.sent
        })
    }
}
  , no = {
    moveOn: .3,
    moveOff: .2,
    jetOn: .42,
    jetOff: .28,
    downOn: .76,
    downOff: .6,
    aimOn: .2,
    aimOff: .14,
    fireOn: .3,
    fireOff: .18
}
  , ro = {
    steady: .16,
    normal: .09,
    quick: .025
}
  , io = e => Number.isFinite(e) ? e : 0
  , ao = (e, t, n, r) => e >= (t ? r : n);
function oo(e, t, n, r=1) {
    let i = Math.max(.5, Math.min(1.5, Number.isFinite(r) ? r : 1))
      , a = e => Math.sign(io(e)) * Math.min(1, Math.abs(io(e))) ** (1 / i);
    e = a(e),
    t = a(t);
    let o = no;
    return {
        left: ao(-e, n.left, o.moveOn, o.moveOff),
        right: ao(e, n.right, o.moveOn, o.moveOff),
        jet: ao(-t, n.jet, o.jetOn, o.jetOff),
        down: ao(t, n.down, o.downOn, o.downOff)
    }
}
function so(e, t) {
    e = Math.max(0, io(e));
    let n = no
      , r = ao(e, t.fire, n.fireOn, n.fireOff);
    return {
        aiming: r || ao(e, t.aiming, n.aimOn, n.aimOff),
        fire: r
    }
}
var co = e => Math.atan2(Math.sin(e), Math.cos(e));
function lo(e, t, n, r, i=1, a=1) {
    if (t = io(t),
    e === null || !Number.isFinite(e))
        return co(t);
    let o = 1 + Math.max(0, .65 - Math.max(0, io(a))) * 1.5
      , s = Math.max(0, io(n))
      , c = ro[r] * o / Math.max(.5, Math.min(1.5, Number.isFinite(i) ? i : 1));
    return co(e + co(t - e) * (1 - Math.exp(-s / c)))
}
var uo = [`death`, `kill`, `hurt`, `hit`]
  , fo = {
    hit: 8,
    hurt: 26,
    kill: [18, 40, 30],
    death: [70, 60, 140]
};
function po(e, t, n) {
    let r = -1;
    for (let t of e)
        t.id > r && (r = t.id);
    if (n < 0 || e.length && r < n)
        return {
            cues: [],
            seen: Math.max(0, r)
        };
    let i = new Set, a;
    for (let r of e)
        r.id <= n || (r.type === `hit` ? r.target === t ? i.add(`hurt`) : r.actor === t && i.add(`hit`) : r.type === `kill` && (r.target === t ? (i.add(`death`),
        a = r) : r.actor === t && i.add(`kill`)));
    return {
        cues: uo.filter(e => i.has(e)),
        seen: Math.max(n, r),
        death: a
    }
}
var mo = class {
    vibrate;
    enabled = !0;
    last = -1 / 0;
    constructor(e) {
        this.vibrate = e
    }
    get supported() {
        return !!this.vibrate
    }
    play(e, t) {
        let n = e[0];
        if (!n || !this.enabled || !this.vibrate || (n === `hit` || n === `hurt`) && t - this.last < 90)
            return null;
        this.last = t;
        try {
            this.vibrate(fo[n])
        } catch {
            return null
        }
        return n
    }
}
;
function ho(e, t, n) {
    let r = !e.actor || e.actor === n
      , i = r ? null : t.players.find(t => t.id === e.actor) ?? null
      , a = !!i && i.hp > 0 && i.respawnTimer <= 0;
    return {
        killer: i,
        cause: e.text ?? ``,
        self: r,
        killerHp: a ? Math.max(1, Math.ceil(i.hp)) : 0,
        killerAlive: a
    }
}
var go = e => document.querySelector(e)
  , _o = go(`#app`)
  , vo = go(`#arena`)
  , yo = new Ia(vo)
  , P = new La
  , F = e => e.replace(/[&<>"']/g, e => ({
    "&": `&amp;`,
    "<": `&lt;`,
    ">": `&gt;`,
    '"': `&quot;`,
    "'": `&#39;`
})[e])
  , I = Or();
P.volume = I.volume;
var bo = new mo(typeof navigator.vibrate == `function` ? e => navigator.vibrate(e) : null);
bo.enabled = I.controls.haptics;
var xo = -1
  , So = null
  , Co = [`home`, `local`, `online`, `avatar`, `armory`, `stats`, `friends`]
  , L = Ts()
  , R = `menu`
  , wo = `home`
  , z = Kt({
    ...L,
    bots: 6,
    duration: 99999,
    killLimit: 99999
})
  , B = `local`
  , V = !1
  , H = null
  , To = null
  , Eo = 0
  , Do = 0
  , Oo = 0
  , ko = 0
  , Ao = 0
  , jo = !1
  , Mo = !1
  , No = ``
  , Po = 0
  , Fo = ``
  , Io = ce()
  , Lo = {
    x: innerWidth * .7,
    y: innerHeight * .5,
    active: !1
}
  , Ro = 0
  , zo = null
  , Bo = 0
  , Vo = 0
  , Ho = new Za
  , Uo = new to
  , Wo = {
    total: 0,
    messages: 0,
    snapshotBytes: 0,
    snapshots: 0,
    leanSnapshots: 0,
    fullSnapshots: 0,
    maxSnapshot: 0,
    since: 0
}
  , Go = new TextEncoder
  , Ko = () => W.has(`lean`) ? {
    lean: !0,
    ...W.has(`resilient-v1`) ? {
        resilient: !0,
        ...W.has(`input-ack`) ? {
            inputAck: !0
        } : {}
    } : {}
} : {}
  , qo = () => W.has(`input-ack`) ? new a : new i(!0,30)
  , Jo = new o
  , Yo = new i(!0,30)
  , Xo = 0
  , Zo = performance.now()
  , Qo = 0
  , $o = {
    skippedInputs: 0,
    forcedReconnects: 0,
    resyncRequests: 0,
    inputReceipts: 0
}
  , es = []
  , U = null
  , ts = 1
  , ns = ``
  , rs = !1
  , is = !1
  , as = `hat`
  , os = `rifle`
  , ss = null
  , W = new Set
  , cs = sessionStorage.getItem(`jetpack-resume`) || ``
  , ls = !1
  , us = {
    status: `idle`,
    list: [],
    message: ``
}
  , ds = []
  , fs = new Set
  , ps = new Set
  , G = {
    moveX: 0,
    moveY: 0,
    aimX: 0,
    aimY: 0,
    fire: !1,
    jet: !1,
    aiming: !1
}
  , ms = {
    left: !1,
    right: !1,
    jet: !1,
    down: !1
}
  , hs = new Set
  , gs = {
    small: .82,
    medium: 1,
    large: 1.2
}
  , _s = 10 * Math.PI / 180
  , vs = 750
  , ys = .45
  , bs = null
  , xs = null
  , Ss = null
  , Cs = null;
function ws() {
    kr(I)
}
function Ts() {
    try {
        let e = JSON.parse(localStorage.getItem(`jetpack-config`) || `{}`)
          , t = {
            ...ee,
            ...e
        };
        return localStorage.getItem(`fleet-easy-bots-v1`) || (t.difficulty = `recruit`,
        localStorage.setItem(`jetpack-config`, JSON.stringify(t)),
        localStorage.setItem(`fleet-easy-bots-v1`, `1`)),
        ie.some(e => e.id === t.map) || (t.map = ee.map),
        S.some(e => e.id === t.mode) || (t.mode = ee.mode),
        t
    } catch {
        return {
            ...ee
        }
    }
}
function Es() {
    try {
        localStorage.setItem(`jetpack-config`, JSON.stringify(L))
    } catch {}
}
var Ds = e => ie.find(t => t.id === e) ?? ie[0]
  , Os = e => {
    let t = se(e);
    return `BEST FOR ${t.min}–${t.max} PILOTS`
}
  , ks = e => S.find(t => t.id === e) ?? S[0]
  , As = e => b[e]
  , js = e => ks(e).teams
  , Ms = e => !ks(e).legacy
  , Ns = e => e.id === `grenadeLauncher` || e.legacy === !1
  , Ps = e => y[e] ?? `TEAM ${e + 1}`
  , Fs = e => v[e] ?? v[0]
  , Is = e => `${Math.floor(Math.max(0, e) / 60)}:${Math.floor(Math.max(0, e) % 60).toString().padStart(2, `0`)}`
  , K = e => e.toUpperCase();
function Ls(e, t) {
    let n = parseInt(e.replace(`#`, ``).slice(0, 6), 16);
    if (Number.isNaN(n))
        return e;
    let r = e => Math.max(0, Math.min(255, Math.round(e + (t > 0 ? 255 - e : e) * t / 100)));
    return `#${[n >> 16 & 255, n >> 8 & 255, n & 255].map(e => r(e).toString(16).padStart(2, `0`)).join(``)}`
}
function q(e) {
    let t = go(`#toast`);
    t.textContent = e,
    t.classList.add(`visible`),
    clearTimeout(Po),
    Po = window.setTimeout( () => t.classList.remove(`visible`), 3600)
}
function Rs(e) {
    let t = typeof e == `object` && e ? e : {}
      , n = {
        ...I.avatar
    };
    for (let e of Zn)
        n[e] = Number.isInteger(t[e]) ? t[e] : 0;
    return n
}
var zs = {
    back: `<path d="M15 5 8 12l7 7"/>`,
    sound: `<path d="m11 5-5 4H3v6h3l5 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>`,
    mute: `<path d="m11 5-5 4H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6"/>`,
    pause: `<path d="M9 6v12M15 6v12"/>`,
    expand: `<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>`,
    shrink: `<path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/>`,
    install: `<path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 19h14"/>`,
    close: `<path d="m6 6 12 12M6 18 18 6"/>`,
    heart: `<path d="M12 20s-7-4.4-9-9a4.6 4.6 0 0 1 9-2.4A4.6 4.6 0 0 1 21 11c-2 4.6-9 9-9 9Z" fill="currentColor"/>`,
    jet: `<path d="M12 3c3 4 4 7 4 10a4 4 0 0 1-8 0c0-3 1-6 4-10Zm-2 15 2 4 2-4" fill="currentColor"/>`,
    scope: `<circle cx="12" cy="12" r="7"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/>`,
    reload: `<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>`,
    swap: `<path d="M4 8h14l-4-4m6 12H6l4 4"/>`,
    hand: `<path d="M7 12V6a1.5 1.5 0 0 1 3 0v5m0-6.5a1.5 1.5 0 0 1 3 0V11m0-5a1.5 1.5 0 0 1 3 0v6m0-3a1.5 1.5 0 0 1 3 0v5a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3.5L3.5 13a1.5 1.5 0 0 1 2.6-1.5L7 13"/>`,
    fist: `<path d="M7 10V8a2 2 0 0 1 4 0v1m0-1a2 2 0 0 1 4 0v1m0 0a2 2 0 0 1 4 0v5a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6v-3a2 2 0 0 1 4 0" fill="currentColor" fill-opacity=".25"/>`,
    crouch: `<circle cx="12" cy="6" r="2.5"/><path d="M8 20l2-5h5l2 5M10 15l-1-5h6l1 5M7 12h3"/>`,
    chat: `<path d="M4 5h16v11H9l-5 4V5Z"/>`,
    trophy: `<path d="M7 3h10v7a5 5 0 0 1-10 0V3Zm0 2H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4m-5 3v6m-4 0h8"/>`,
    star: `<path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7Z"/>`,
    lock: `<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>`,
    coin: `<circle cx="12" cy="12" r="8"/><path d="M12 7v10M9 9.5h4.5a1.8 1.8 0 0 1 0 3.5h-3a1.8 1.8 0 0 0 0 3.5H15"/>`,
    copy: `<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>`,
    refresh: `<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>`,
    plus: `<path d="M12 5v14M5 12h14"/>`,
    gear: `<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>`,
    dice: `<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/>`
}
  , J = e => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${zs[e] ?? zs.star}</svg>`
  , Bs = 0
  , Y = `#141218`
  , Vs = `#f5f3fa`;
function Hs(e, t) {
    let n = lr[e];
    return n[(t % n.length + n.length) % n.length] ?? n[0]
}
var Us = e => {
    let t = parseInt(e.replace(`#`, ``).slice(0, 6), 16);
    return !Number.isNaN(t) && (t >> 16 & 255) * .3 + (t >> 8 & 255) * .59 + (t & 255) * .11 > 170
}
;
function Ws(e, t=4.6) {
    return `<path d="M18 12.5h-6.5a5 5 0 0 0-5 5v5a5 5 0 0 0 5 5H18v-7.5h-5M23 27.5v-15h11M23 20h8.5" fill="none" stroke="${e}" stroke-width="${t}" stroke-linecap="square" stroke-linejoin="miter"/>`
}
function Gs(e=l.colors.purple, t=l.colors.white, n=Y) {
    return `<rect x="1.5" y="1.5" width="37" height="37" rx="9" fill="${e}" stroke="${n}" stroke-width="3"/>${Ws(t)}`
}
function Ks(e, t) {
    let n = t.label.toLowerCase()
      , r = t.accent ?? Ls(t.color, -28);
    return /builder|raid/.test(n) ? `<pattern id="${e}" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="${t.color}"/><path d="M0 0h8v8H0zM8 8h8v8H8z" fill="${r}" fill-opacity=".22"/></pattern>` : `<pattern id="${e}" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="${t.color}"/></pattern>`
}
function qs(e) {
    let t = e.color
      , n = e.label.toLowerCase()
      , r = `stroke="${Y}" stroke-width="3.5" stroke-linejoin="round"`;
    return /bald/.test(n) ? `<path d="M76 40c8-6 18-8 26-8" stroke="#fff" stroke-opacity=".45" stroke-width="5" fill="none" stroke-linecap="round"/>` : /quiff/.test(n) ? `<path d="M55 78c-5-28 7-46 27-52 6-12 22-18 40-16 14 2 24 10 26 20-8-3-15-2-20 2 12 8 19 22 17 46-4-12-11-20-21-24-10-8-26-10-40-6-13 4-23 14-29 30z" fill="${t}" ${r}/><path d="M88 28c11-10 28-13 42-8" stroke="#fff" stroke-opacity=".22" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M57 70c2 6 1 12-2 16M143 70c-2 6-1 12 2 16" stroke="${t}" stroke-width="5" stroke-linecap="round"/>` : /buzz/.test(n) ? `<path d="M57 66c3-23 21-37 43-37s40 14 43 37c-11-8-26-12-43-12s-32 4-43 12z" fill="${t}" ${r}/>` : /curly/.test(n) ? [[60, 58], [70, 44], [84, 36], [100, 33], [116, 36], [130, 44], [140, 58]].map( ([e,n]) => `<circle cx="${e}" cy="${n}" r="12" fill="${t}" ${r}/>`).join(``) : /spiky/.test(n) ? `<path d="M55 68 50 46l14 6 0-22 15 13 8-21 13 17 12-19 6 21 15-12-1 22 13-4-7 21c-12-9-28-13-48-13s-34 5-45 12z" fill="${t}" ${r}/>` : /mohawk/.test(n) ? `<path d="M57 66c3-23 21-37 43-37s40 14 43 37c-11-8-26-12-43-12s-32 4-43 12z" fill="${Ls(t, 35)}" ${r}/><path d="M88 40c0-17 4-29 12-37 8 8 12 20 12 37z" fill="${t}" ${r}/>` : `<path d="M55 70c-3-28 17-46 45-46s48 18 45 46c-6-7-13-11-21-12l-5-8-6 7c-6-2-13-2-19-1l-6-7-4 8c-12 2-22 7-29 13z" fill="${t}" ${r}/>`
}
function Js(e, t) {
    let n = e.color
      , r = e.accent ?? `#666`
      , i = e.label.toLowerCase()
      , a = `<ellipse cx="84" cy="84" rx="7" ry="6" fill="#fff" stroke="${Y}" stroke-width="2.5"/><ellipse cx="116" cy="84" rx="7" ry="6" fill="#fff" stroke="${Y}" stroke-width="2.5"/><circle cx="85.5" cy="85" r="3.5" fill="${Y}"/><circle cx="114.5" cy="85" r="3.5" fill="${Y}"/>`
      , o = `${a}<path d="M76 89q8 3 16 0M108 89q8 3 16 0" stroke="${Ls(t, -28)}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
      , s = `<path d="M72 71q10-6 20-1M108 70q10-5 20 1" stroke="${Y}" stroke-width="5" fill="none" stroke-linecap="round"/>`
      , c = `<path d="M71 70l21 6M129 70l-21 6" stroke="${Y}" stroke-width="5.5" stroke-linecap="round"/>`
      , l = `<path d="M80 99Q100 124 120 99Z" fill="#fff" stroke="${Y}" stroke-width="3" stroke-linejoin="round"/><path d="M86 108q14 9 28 0q-14 6-28 0z" fill="#7a2a3a"/>`
      , u = `<path d="M88 104q12 9 24 0" stroke="${Y}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
      , d = e => `<path d="M60 92c3 16 20 28 40 28s37-12 40-28c-5 12-15 18-27 20q-13 3-26 0c-12-2-22-8-27-20z" fill="${e}" fill-opacity=".34"/><path d="M85 97q15-6 30 0" stroke="${e}" stroke-opacity=".4" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    return /frame/.test(i) ? `${d(n)}${o}${s}${l}<g fill="#e6f1ff" fill-opacity=".22" stroke-linejoin="round"><rect x="68" y="73" width="29" height="22" rx="5" stroke="${Y}" stroke-width="6"/><rect x="103" y="73" width="29" height="22" rx="5" stroke="${Y}" stroke-width="6"/><rect x="68" y="73" width="29" height="22" rx="5" stroke="${r}" stroke-width="2.8"/><rect x="103" y="73" width="29" height="22" rx="5" stroke="${r}" stroke-width="2.8"/></g><path d="M97 80h6M72 72.5h56M68 79l-11-2M132 79l11-2" stroke="${Y}" stroke-width="2.6" fill="none" stroke-linecap="round"/>` : /grin/.test(i) ? `${d(Ls(t, -45))}${o}${s}${l}` : /moustache/.test(i) ? `${a}${s}<path d="M82 101c6-7 12-5 18-1 6-4 12-6 18 1-4 7-11 7-18 3-7 4-14 4-18-3z" fill="${n}" stroke="${Y}" stroke-width="2.5" stroke-linejoin="round"/><path d="M93 112h14" stroke="${Y}" stroke-width="3.5" stroke-linecap="round"/>` : /focus|angry/.test(i) ? `${a}${c}<path d="M90 107h20" stroke="${Y}" stroke-width="4" stroke-linecap="round"/>` : /scar/.test(i) ? `${a}${c}${u}<path d="M110 62l13 32" stroke="${n}" stroke-width="3.5" stroke-linecap="round"/><path d="M112 70l7-3M115 78l7-3M118 86l7-3" stroke="${n}" stroke-width="2.5" stroke-linecap="round"/>` : /shade/.test(i) ? `<path d="M68 76h64v4l-4 12c-2 5-19 5-22 0l-3-8h-6l-3 8c-3 5-20 5-22 0l-4-12z" fill="${n}" stroke="${Y}" stroke-width="2.5" stroke-linejoin="round"/><path d="M76 81h8M108 81h8" stroke="${r}" stroke-width="3" stroke-linecap="round"/>${u}` : /visor/.test(i) ? `<rect x="62" y="74" width="76" height="18" rx="9" fill="${n}" stroke="${Y}" stroke-width="3.5"/><path d="M72 83h10M88 83h10M104 83h10M120 83h8" stroke="${r}" stroke-width="5" stroke-linecap="square"/>${u}` : /mask/.test(i) ? `${a}${s}<path d="M62 94c6-4 22-6 38-6s32 2 38 6c-2 16-18 26-38 26s-36-10-38-26z" fill="${n}" stroke="${Y}" stroke-width="3.5" stroke-linejoin="round"/><path d="M62 96l-6-8M138 96l6-8" stroke="${Y}" stroke-width="2.5"/><path d="M90 104h20M88 110h24" stroke="${r}" stroke-width="2.5" stroke-linecap="round"/>` : `${a}${s}${u}`
}
function Ys(e) {
    let t = e.color
      , n = e.accent ?? Ls(t, -25)
      , r = e.label.toLowerCase()
      , i = `stroke="${Y}" stroke-width="4" stroke-linejoin="round"`;
    if (/bare/.test(r))
        return {
            back: ``,
            front: ``,
            coversHair: !1
        };
    if (/headset/.test(r)) {
        let e = `<path d="M50 86c0-40 22-62 50-62s50 22 50 62" fill="none" stroke="${Y}" stroke-width="12"/><path d="M50 86c0-40 22-62 50-62s50 22 50 62" fill="none" stroke="${t}" stroke-width="6"/>`
          , r = (e, r) => `<rect x="${e}" y="64" width="24" height="38" rx="10" fill="${t}" stroke="${Y}" stroke-width="3.5"/><rect x="${r}" y="71" width="4.5" height="24" rx="2.2" fill="${n}"/>`;
        return {
            back: e,
            front: `${r(36, 40)}${r(140, 155.5)}`,
            coversHair: !1
        }
    }
    if (/bandana/.test(r))
        return {
            back: ``,
            front: `<path d="M53 67c12-14 28-21 47-21s35 7 47 21l-3 11c-13-9-27-14-44-14s-31 5-44 14z" fill="${t}" ${i}/><path d="M145 67l19 1-7 13zM146 72l12 16-11 1z" fill="${t}" ${i}/><circle cx="76" cy="62" r="2.5" fill="${n}"/><circle cx="100" cy="57" r="2.5" fill="${n}"/><circle cx="124" cy="62" r="2.5" fill="${n}"/>`,
            coversHair: !1
        };
    if (/visor/.test(r))
        return {
            back: ``,
            front: `<path d="M54 60c14-8 30-12 46-12s32 4 46 12l-2 9c-13-6-28-9-44-9s-31 3-44 9z" fill="${t}" ${i}/><path d="M60 66c12-4 26-6 40-6s28 2 40 6l-6 10c-10-3-22-4-34-4s-24 1-34 4z" fill="${n}" fill-opacity=".75" stroke="${Y}" stroke-width="3"/>`,
            coversHair: !1
        };
    if (/cap/.test(r)) {
        let e = /fleet/.test(r) ? `<g transform="translate(88 38) scale(.6)">${Ws(n, 5)}</g>` : `<circle cx="100" cy="48" r="5" fill="${n}" stroke="${Y}" stroke-width="2"/>`;
        return {
            back: ``,
            front: `<path d="M55 67c0-24 20-41 45-41s45 17 45 41z" fill="${t}" ${i}/><path d="M97 64h66c0 8-8 13-17 13H97z" fill="${Ls(t, -22)}" ${i}/><circle cx="100" cy="28" r="4" fill="${n}" stroke="${Y}" stroke-width="2"/>${e}`,
            coversHair: !0
        }
    }
    return /bucket|boonie/.test(r) ? {
        back: ``,
        front: `<path d="M60 63c0-21 17-35 40-35s40 14 40 35z" fill="${t}" ${i}/><path d="M42 68c20-8 96-8 116 0l-6 8c-24-6-80-6-104 0z" fill="${t}" ${i}/><path d="M60 60h80" stroke="${n}" stroke-width="5"/>`,
        coversHair: !0
    } : /beanie/.test(r) ? {
        back: ``,
        front: `<path d="M54 67c0-26 20-43 46-43s46 17 46 43z" fill="${t}" ${i}/><rect x="50" y="59" width="100" height="16" rx="8" fill="${Ls(t, -15)}" stroke="${Y}" stroke-width="3.5"/><path d="M64 62v10M76 61v12M88 61v12M100 61v12M112 61v12M124 61v12M136 62v10" stroke="${Y}" stroke-opacity=".35" stroke-width="2"/>`,
        coversHair: !0
    } : {
        back: ``,
        front: `<path d="M50 75c0-32 22-53 50-53s50 21 50 53z" fill="${t}" stroke="${Y}" stroke-width="4.5"/>`,
        coversHair: !0
    }
}
function Xs(e) {
    let t = Hs(`skin`, e.skin).color
      , n = Ys(Hs(`hat`, e.hat))
      , r = Hs(`hair`, e.hair)
      , i = Hs(`face`, e.face);
    return `${/long/.test(r.label.toLowerCase()) ? `<path d="M52 72c-8 34 0 58 12 66h72c12-8 20-32 12-66z" fill="${r.color}" stroke="${Y}" stroke-width="4" stroke-linejoin="round"/>` : ``}<circle cx="55" cy="82" r="9" fill="${t}" stroke="${Y}" stroke-width="4"/><circle cx="145" cy="82" r="9" fill="${t}" stroke="${Y}" stroke-width="4"/><circle cx="100" cy="76" r="46" fill="${t}" stroke="${Y}" stroke-width="4.5"/>${n.back}${n.coversHair ? `` : qs(r)}${Js(i, t)}${n.front}`
}
function Zs(e, t) {
    return `<path d="M72 126C58 128 48 118 42 106" stroke="${Y}" stroke-width="21" fill="none" stroke-linecap="round"/><path d="M72 126C58 128 48 118 42 106" stroke="url(#${e}s)" stroke-width="13" fill="none" stroke-linecap="round"/><g transform="rotate(30 40 104)"><path class="flash" d="M6 91L-88 97L6 103Z" fill="url(#${e}f)"/><path class="flash" d="M8 97l-13-11 4 9-16 2 16 4-7 12 14-10z" fill="#ffe7b0" stroke="${l.colors.orange}" stroke-width="1.5"/><path d="M6 90h40v12H6z" fill="#3a3446" stroke="${Y}" stroke-width="3.5" stroke-linejoin="round"/><path d="M11 93.5h30" stroke="${l.colors.light}" stroke-opacity=".8" stroke-width="2"/><path d="M32 102h11l-3 14h-10z" fill="#24212d" stroke="${Y}" stroke-width="3.5" stroke-linejoin="round"/></g><circle cx="40" cy="104" r="10" fill="${t}" stroke="${Y}" stroke-width="4"/>`
}
function Qs(e, t) {
    let n = t.label.toLowerCase()
      , r = t.accent ?? Ls(t.color, -25)
      , i = Ls(t.color, Us(t.color) ? -22 : 22)
      , a = Us(t.color) ? l.colors.deep : r
      , o = (e, t, n) => `<g transform="translate(${e} ${t}) scale(${n})"><rect x="1.5" y="1.5" width="37" height="37" rx="9" fill="${a}" stroke="${Y}" stroke-width="3.4"/>${Ws(l.colors.white, 5)}</g>`
      , s = `<rect x="64" y="110" width="72" height="62" rx="18" fill="url(#${e}s)" stroke="${Y}" stroke-width="4.5"/>`
      , c = `<path d="M67 164h66" stroke="${i}" stroke-width="7"/>`;
    return /jacket/.test(n) ? `${s}<path d="M100 113v50M76 112l15 15 9-13 9 13 15-15M74 146l17 5M109 151l17-5" fill="none" stroke="${r}" stroke-width="4" stroke-linejoin="round"/>${o(111, 132, .3)}${c}` : /jersey/.test(n) ? `${s}<path d="M66 124v38M134 124v38" stroke="${r}" stroke-width="6"/><path d="M86 111l14 14 14-14" fill="none" stroke="${r}" stroke-width="5" stroke-linejoin="round"/>${o(91, 132, .45)}${c}` : /tee/.test(n) ? `${s}<path d="M86 112q14 9 28 0" fill="none" stroke="${i}" stroke-width="5"/>${o(90, 128, .5)}` : `${s}<path d="M74 113c8 8 44 8 52 0" fill="${i}" stroke="${Y}" stroke-width="3.5" stroke-linejoin="round"/><path d="M93 119v12M107 119v12" stroke="${Vs}" stroke-width="2.6" stroke-linecap="round"/><circle cx="93" cy="132" r="2.2" fill="${r}"/><circle cx="107" cy="132" r="2.2" fill="${r}"/><path d="M80 148h40l5 13H75z" fill="${Ls(t.color, Us(t.color) ? -10 : 10)}" stroke="${Y}" stroke-opacity=".55" stroke-width="2.5" stroke-linejoin="round"/>${o(91, 134, .45)}${c}`
}
function $s(e, t, n) {
    let r = Hs(`skin`, t.skin).color
      , i = Hs(`shirt`, t.shirt)
      , a = Hs(`pants`, t.pants)
      , o = Hs(`boots`, t.boots).color
      , s = Ls(a.color, -22)
      , c = a.accent ? `<path d="M81 168v26M119 168v26" stroke="${a.accent}" stroke-width="3"/>` : ``
      , u = `<path d="M66 211c0-8 6-14 14-14h20v14z" fill="${o}" stroke="${Y}" stroke-width="3.5" stroke-linejoin="round"/><path d="M84 201l7 2M86 205l7 2" stroke="${Us(o) ? l.colors.purple : Vs}" stroke-width="2.2" stroke-linecap="round"/><path d="M63 210h37v6c0 2-2 4-4 4H67c-3 0-4-2-4-4z" fill="${Vs}" stroke="${Y}" stroke-width="3.5" stroke-linejoin="round"/>`
      , d = `<path d="M79 164h20l-1 32H80z" fill="url(#${e}p)" stroke="${Y}" stroke-width="4" stroke-linejoin="round"/><path d="M101 164h20l-1 32h-18z" fill="url(#${e}p)" stroke="${Y}" stroke-width="4" stroke-linejoin="round"/>${c}<rect x="79" y="191" width="20" height="8" rx="2" fill="${s}" stroke="${Y}" stroke-width="3"/><rect x="101" y="191" width="20" height="8" rx="2" fill="${s}" stroke="${Y}" stroke-width="3"/>${u}<g transform="matrix(-1 0 0 1 200 0)">${u}</g>`
      , f = [58, 128].map(e => `<rect x="${e}" y="100" width="14" height="34" rx="6" fill="#2b2636" stroke="${Y}" stroke-width="3.5"/><rect x="${e + 3}" y="104" width="8" height="5" rx="2" fill="${l.colors.purple}"/>`).join(``)
      , p = Qs(e, i);
    if (n === `hero`)
        return `${f}${d}${p}<g>${Zs(e, r)}</g><g transform="matrix(-1 0 0 1 200 0)">${Zs(e, r)}</g>`;
    if (n === `bare`)
        return `${f}${d}${p}`;
    let m = `<g transform="translate(34 128) rotate(-20) scale(1.12)"><path d="${ac.ak47}" fill="#2a2632" stroke="${Y}" stroke-width="2.5" stroke-linejoin="round"/></g>`
      , h = t => `<path d="${t}" stroke="${Y}" stroke-width="21" fill="none" stroke-linecap="round"/><path d="${t}" stroke="url(#${e}s)" stroke-width="13" fill="none" stroke-linecap="round"/>`;
    return `${f}${d}${p}${h(`M70 124c-10 12-12 24-6 36`)}${h(`M130 124c10 6 12 14 6 22`)}${m}<circle cx="66" cy="160" r="10" fill="${r}" stroke="${Y}" stroke-width="4"/><circle cx="135" cy="146" r="10" fill="${r}" stroke="${Y}" stroke-width="4"/>`
}
function ec(e, t) {
    return `<defs>${Ks(`${e}s`, Hs(`shirt`, t.shirt))}${Ks(`${e}p`, Hs(`pants`, t.pants))}<linearGradient id="${e}f" x1="1" x2="0" y1="0" y2="0"><stop offset="0" stop-color="#fff6e0"/><stop offset=".2" stop-color="#ffd27a"/><stop offset=".65" stop-color="${l.colors.orange}" stop-opacity=".85"/><stop offset="1" stop-color="${l.colors.purple}" stop-opacity="0"/></linearGradient></defs>`
}
var tc = e => Br.some(t => t.id === e);
function nc(e, t) {
    let n = `sv${++Bs}`;
    if (tc(t)) {
        let r = Ja(t, n, Hs(`skin`, e.skin).color, Y);
        return `${ec(n, e)}<ellipse cx="100" cy="221" rx="${r.lift ? 38 : 52}" ry="${r.lift ? 5 : 6}" fill="#000" opacity="${r.lift ? .22 : .32}"/><g class="pose pose-${t}"${r.lift ? ` transform="translate(0 ${-r.lift})"` : ``}>${r.sky}${$s(n, e, `bare`)}${r.under}${Xs(e)}${r.over}</g>`
    }
    return `${ec(n, e)}<ellipse cx="100" cy="221" rx="52" ry="6" fill="#000" opacity=".32"/>${$s(n, e, t)}${Xs(e)}`
}
function rc(e, t=`idle`, n=``) {
    return t === `head` ? `<svg class="soldier-head ${n}" viewBox="30 2 140 140" aria-hidden="true">${Xs(e)}</svg>` : `<svg class="soldier ${n}" viewBox="${t === `hero` ? `-72 4 344 228` : tc(t) ? `-6 -30 216 258` : `20 4 160 224`}" aria-hidden="true">${nc(e, t)}</svg>`
}
function ic() {
    let[e,...t] = l.name.toUpperCase().split(` `);
    return `<svg class="logo" viewBox="0 0 760 220" role="img" aria-label="${F(l.name)}, ${F(l.tagline.toLowerCase())}"><defs><filter id="logoShadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter></defs><circle cx="120" cy="122" r="104" fill="#000" opacity=".45" filter="url(#logoShadow)"/><circle cx="112" cy="110" r="104" fill="${l.colors.panel}"/><image href="logo.png" x="24" y="55" width="176" height="110" preserveAspectRatio="xMidYMid meet"/><text x="242" y="128" textLength="490" lengthAdjust="spacingAndGlyphs" class="logo-word"><tspan>${F(e)}</tspan> <tspan class="logo-accent">${F(t.join(` `))}</tspan></text><g transform="translate(244 150) scale(.55)">${Gs(l.colors.purple, l.colors.white, l.colors.purple)}</g><text x="276" y="168" class="logo-sub">${F(l.tagline)}</text></svg>`
}
var X = (e, t, n, r) => `M${e} ${t}h${n}v${r}h${-n}z`
  , ac = {
    minigun: `${X(8, 12, 38, 19)}${X(46, 10, 62, 7)}${X(46, 19, 62, 7)}${X(46, 28, 62, 7)}${X(64, 7, 7, 31)}${X(101, 7, 10, 31)}${X(18, 31, 23, 12)}M18 12V4h22v8M8 23H2v13h9z`,
    pistol: `${X(34, 13, 50, 11)}M40 24h15l-4 15h-13z${X(84, 15, 6, 6)}`,
    magnum: `${X(30, 15, 62, 8)}${X(46, 11, 20, 15)}M36 23h13l-6 16h-12z`,
    smg: `${X(24, 13, 64, 12)}${X(88, 16, 16, 5)}M52 25h9v16h-9zM34 25h11l-4 10h-11z${X(10, 15, 16, 7)}`,
    m249: `${X(5, 15, 22, 12)}${X(27, 11, 53, 16)}${X(80, 15, 36, 5)}${X(44, 27, 23, 15)}${X(32, 27, 7, 12)}M40 11V5h22l7 6M91 20l-8 16h22l-8-16z`,
    uzi: `${X(30, 11, 54, 15)}${X(84, 15, 12, 6)}M52 26h10v17h-10z${X(24, 14, 8, 8)}`,
    rifle: `M4 16l20-4h52v12H42l-8 8H18l-4-8H4z${X(76, 15, 34, 5)}M50 24h9l3 15h-9z${X(46, 7, 18, 5)}`,
    ak47: `M2 17l22-5h50v12H44l-10 7H18l-4-7H2z${X(74, 15, 40, 4)}M52 24c5 0 10 5 11 15l-8 2c-1-8-3-11-7-13z`,
    m14: `M2 18l24-4h58v10H46l-12 7H16l-3-7H2z${X(84, 16, 32, 4)}M54 24h7v11h-7z${X(52, 9, 22, 4)}`,
    shotgun: `M4 16l18-3h42v11H38l-8 9H14l-2-9H4z${X(64, 14, 50, 5)}${X(66, 20, 32, 5)}`,
    sniper: `M0 18l22-5h46v10H40l-8 8H14l-3-8H0z${X(68, 16, 52, 3)}${X(38, 5, 30, 6)}M42 11h4v3h-4zM60 11h4v3h-4zM54 23h6l2 11h-6z`,
    rocket: `${X(8, 12, 104, 14)}${X(2, 9, 8, 20)}${X(110, 9, 8, 20)}M44 26h8v13h-8zM62 26h8v8h-8z${X(50, 5, 14, 7)}`,
    laser: `M8 13h72l14 5v8l-14 5H42l-6 10H24l2-10H8z${X(94, 19, 22, 4)}`,
    flamer: `${X(20, 13, 74, 10)}${X(94, 15, 22, 6)}M30 23h28v15H30zM68 23h8v12h-8z`,
    saw: `M2 17l18-5h48l6 3v10h-6l-12 2v10H40v-10H20l-6-4H2z${X(74, 16, 10, 8)}M101.0 3.0L104.2 7.9L109.5 5.3L109.8 11.2L115.7 11.5L113.1 16.8L118.0 20.0L113.1 23.2L115.7 28.5L109.8 28.8L109.5 34.7L104.2 32.1L101.0 37.0L97.8 32.1L92.5 34.7L92.2 28.8L86.3 28.5L88.9 23.2L84.0 20.0L88.9 16.8L86.3 11.5L92.2 11.2L92.5 5.3L97.8 7.9zM101 16a4 4 0 1 1 0 8a4 4 0 1 1 0-8z`,
    grenadeLauncher: `${X(14, 12, 62, 14)}${X(74, 9, 36, 20)}M28 26h11l-4 13h-11z`,
    machete: `M14 18h22v8H14zM36 16c32-7 62-7 80 0-6 9-42 13-80 10z`,
    shield: `M42 2h36v6l7 4v22l-7 4v4H42v-4l-7-4V12l7-4z`,
    emp: `M6 15l14-4h50v16H44l-6 12H26l2-12H14l-8-4z${X(70, 14, 8, 10)}${X(80, 9, 6, 20)}${X(90, 6, 6, 26)}${X(100, 3, 6, 32)}${X(28, 6, 26, 5)}`
}
  , oc = new Set([`saw`])
  , sc = (e, t=`gun-art`) => `<svg class="${t}" viewBox="0 0 120 44" aria-hidden="true"><path d="${ac[e] ?? ac.rifle}"${oc.has(e) ? ` fill-rule="evenodd"` : ``}/></svg>`
  , cc = {
    frag: [`#8456c9`, `#3f2569`],
    gas: [`#c8b531`, `#7d6f12`],
    mine: [`#b9322a`, `#5e1712`]
};
function lc(e) {
    let[t,n] = cc[e] ?? cc.frag;
    return e === `mine` ? `<svg class="nade" viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="20" cy="26" rx="15" ry="7" fill="${n}" stroke="${Y}" stroke-width="2.5"/><path d="M5 24c0-7 7-11 15-11s15 4 15 11c-4 3-9 4-15 4s-11-1-15-4z" fill="${t}" stroke="${Y}" stroke-width="2.5"/><circle cx="20" cy="17" r="3" fill="#ffeb6a" stroke="${Y}" stroke-width="1.5"/></svg>` : `<svg class="nade" viewBox="0 0 40 40" aria-hidden="true"><path d="M15 6h10v5H15z" fill="#8c9196" stroke="${Y}" stroke-width="2"/><path d="M25 7c6-1 9 3 8 8l-4 1" fill="none" stroke="${Y}" stroke-width="2.5"/><circle cx="12" cy="7" r="4" fill="none" stroke="#c9ced3" stroke-width="2"/><ellipse cx="20" cy="24" rx="11" ry="13" fill="${t}" stroke="${Y}" stroke-width="2.5"/>${e === `gas` ? `<path d="M11 22h18M11 27h18" stroke="${n}" stroke-width="3"/>` : `<path d="M20 11v26M9 20h22M9 28h22" stroke="${n}" stroke-width="1.8"/>`}</svg>`
}
function uc(e) {
    let t = 2166136261;
    for (let n of e)
        t = Math.imul(t ^ n.charCodeAt(0), 16777619);
    return () => ((t = Math.imul(t ^ t >>> 15, 2246822507) ^ Math.imul(t ^ t >>> 13, 3266489909)) >>> 0) / 4294967296
}
function dc(e) {
    let t = `${e.theme ?? ``} ${e.id} ${e.name}`.toLowerCase();
    return /snow|ice|arctic|frost/.test(t) ? {
        sky: `#dfeaf0`,
        hills: `#c3d1da`,
        bush: `#a9bfc7`,
        ground: `#eef3f6`,
        rock: `#9aa6ad`
    } : /desert|sand|dune|valley|canyon/.test(t) ? {
        sky: `#f1dfb6`,
        hills: `#dcc495`,
        bush: `#bfa46d`,
        ground: `#cdb07a`,
        rock: `#a08a62`
    } : /cave|catacomb|bunker|night|reactor|underground/.test(t) ? {
        sky: `#4a4d57`,
        hills: `#3c3f48`,
        bush: `#33363e`,
        ground: `#5c5f68`,
        rock: `#7c8088`
    } : {
        sky: `#ddd6ee`,
        hills: `#bdb2d9`,
        bush: `#7f9c66`,
        ground: `#7d9a5a`,
        rock: `#8c8f92`
    }
}
function fc(e, t=`map-art`) {
    let n = e.width
      , r = e.height
      , i = dc(e)
      , a = uc(e.id)
      , o = Math.max(5, n / 200)
      , s = `M0 ${r}V${(r * .5).toFixed(0)}`;
    for (let e = 0; e <= n; e += n / 30) {
        let t = (r * (.4 + a() * .1)).toFixed(0);
        s += `V${t}H${(e + n / 30).toFixed(0)}`
    }
    s += `V${r}z`;
    let c = `M0 ${r * .55}L${n * .14} ${r * .36}L${n * .26} ${r * .5}L${n * .42} ${r * .3}L${n * .56} ${r * .48}L${n * .72} ${r * .34}L${n * .86} ${r * .47}L${n} ${r * .38}V${r}H0z`
      , l = e => e === `bridge` || e === `wood` || e === `crate` ? `#9b8360` : e === `grass` ? `#6f8f45` : e === `dirt` ? `#8a6a45` : e === `sand` ? `#cdb07a` : e === `snow` || e === `ice` ? `#e9eff3` : i.rock
      , u = t => e.platforms.map(e => `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" ${t(e.kind)}/>`).join(``)
      , d = `<g stroke="${Y}" stroke-width="${o * 2}" stroke-linejoin="round">${u( () => `fill="${Y}"`)}</g>${u(e => `fill="${l(e)}"`)}`;
    return `<svg class="${t}" viewBox="0 0 ${n} ${r}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="${n}" height="${r}" fill="${i.sky}"/><path d="${c}" fill="${i.hills}"/><path d="${s}" fill="${i.bush}"/>${d}</svg>`
}
var pc = ( () => {
    let e = uc(`fleet-smp`)
      , t = (t, n, r) => {
        let i = ``
          , a = t;
        for (let o = 0; o < 1600; o += r)
            a = Math.max(t - n, Math.min(t + n, a + Math.round((e() - .5) * 2.4) * r / 2)),
            i += `M${o} ${a}h${r}V900h-${r}z`;
        return i
    }
    ;
    return `<svg class="scene-art" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path d="${t(700, 50, 80)}M1300 900V520h32v-48h64v48h32v380zM1356 472v-96h12v96z" fill="#1a1527"/><path d="M1356 368h12v8h-12z" fill="${l.colors.orange}" opacity=".7"/><path d="${t(810, 30, 40)}" fill="#14111d"/></svg>`
}
)();
function mc(e, t=`rank-badge`) {
    let n = Math.min(4, Math.max(1, Math.ceil(e.level / 4)))
      , r = (e.level - 1) % 4
      , i = Array.from({
        length: n
    }, (e, t) => `<path d="M8 ${16 + t * 7}l12-6 12 6" />`).join(``)
      , a = Array.from({
        length: r
    }, (e, t) => `<circle cx="${12 + t * 8}" cy="9" r="2.6" fill="${l.colors.white}" stroke="none"/>`).join(``);
    return `<svg class="${t}" viewBox="0 0 40 46" aria-hidden="true"><path d="M4 4h32v26L20 44 4 30z" fill="${l.colors.deep}" stroke="${l.colors.light}" stroke-width="2.5" stroke-linejoin="round"/><g fill="none" stroke="${l.colors.orange}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${i}</g>${a}</svg>`
}
function hc() {
    let e = pr(I.xp);
    return `<button class="profile-chip" data-action="page:stats" aria-label="Profile ${F(I.name)}, ${F(e.title)}">${rc(I.avatar, `head`, `chip-head`)}<span><strong>${F(I.name)}</strong><small>${F(K(e.title))}</small></span>${mc(e)}</button>`
}
function gc() {
    try {
        return Yn(z, B)
    } catch {
        return {
            label: ks(z.config.mode).short,
            value: ``,
            detail: ``
        }
    }
}
function _c(e) {
    let t = e.grenadeKind ?? `frag`;
    return {
        kind: t,
        count: e.grenadeInventory?.[t] ?? e.grenades,
        name: te[t]?.short ?? `FRAG`
    }
}
var Z = (e, t, n=`blue`, r=`cut-all`, i=``) => `<button class="btn btn-${n} ${r} ${i}" ${t}><span>${e}</span></button>`;
function vc(e, t=`page:home`, n=`BACK`) {
    return `<header class="page-top"><button class="btn btn-blue cut-br back-btn" data-action="${t}" aria-label="${n === `BACK` ? `Back` : F(n)}">${J(`back`)}<span>${n}</span></button><h1 class="chrome page-title">${e}</h1><div class="page-top-side">${hc()}</div></header>`
}
var yc = (e, t) => `<div class="scene" aria-hidden="true">${pc}</div><main class="page ${e}">${t}</main><div id="modal-root"></div>`;
function bc(e) {
    R = e,
    document.body.dataset.screen = e
}
function Q() {
    bc(`menu`),
    jo = !1,
    _o.className = `menu-shell page-${wo}`,
    _o.innerHTML = {
        home: xc,
        local: jc,
        online: Mc,
        avatar: Hc,
        armory: Wc,
        stats: Gc,
        friends: Kc
    }[wo](),
    wo === `online` && Nc()
}
function xc() {
    let e = Ds(L.map);
    return yc(`home`, `
    <div class="corner corner-tl">${Z(`ARMORY`, `data-action="page:armory"`, `blue`, `cut-br`, `corner-btn`)}</div>
    <div class="corner corner-tr">${hc()}${sl ? `<button class="round-icon" data-action="install" aria-label="Install Oberoi Rush on this device">${J(`install`)}</button>` : ``}${dl(`round-icon`)}<button class="round-icon" data-action="sound" aria-label="Sound ${P.enabled ? `on` : `off`}" aria-pressed="${P.enabled}">${J(P.enabled ? `sound` : `mute`)}</button></div>
    <div class="logo-wrap">${ic()}</div>
    <div class="arcade-pilot" aria-hidden="true"><div class="pilot-orbit"></div>${rc(I.avatar, `idle`, `arcade-pilot-art`)}<span>GEAR UP. GO WILD.</span></div>
    <div class="arcade-stickers" aria-hidden="true"><span>JET. SHOOT. REPEAT.</span><b>BIG GUNS<br>BIG ENERGY</b><small>YOUR ARENA. YOUR RULES.</small></div>
    <nav class="home-main" aria-label="Play">
      ${Z(`PLAY VS BOTS`, `data-action="quick-bots"`, `blue`, `cut-none`, `play-btn`)}
      ${Z(`CUSTOM BATTLE`, `data-action="page:local"`, `blue`, `cut-bottom`, `play-btn`)}
      <p class="home-meta">${F(K(e.name))} · ${F(ks(L.mode).short)} · ${L.bots || 4} BOTS<br>A / D MOVE · SPACE JETPACK · MOUSE AIM + FIRE</p>
      ${Sc()}<p class="phone-tip">TWO THUMBS TO PLAY · TURN PHONE SIDEWAYS FOR MORE ROOM</p>
    </nav>
    <footer class="home-foot">${F(l.community.toUpperCase())} EDITION · BOT BATTLES</footer>
    <div class="corner corner-bl">${Z(`AVATAR`, `data-action="page:avatar"`, `blue`, `cut-br`, `corner-btn`)}${Z(`SETTINGS`, `data-action="settings"`, `blue`, `cut-br`, `corner-btn`)}</div>
    <div class="corner corner-br">${Z(`TUTORIAL`, `data-action="training"`, `blue`, `cut-bl`, `corner-btn`)}${Z(`STATS`, `data-action="page:stats"`, `blue`, `cut-bl`, `corner-btn`)}</div>`)
}
function Sc() {
    let e = di(I)
      , t = e.filter(e => e.done).length;
    return `<button class="challenge-chip ${t === e.length ? `all-done` : ``}" data-action="page:stats" aria-label="Daily Oberoi challenges, ${t} of ${e.length} done">${J(`star`)}<span>DAILY CHALLENGES</span><b>${t}/${e.length}</b></button>`
}
function Cc(e, t, n, r, i=!1) {
    return `<label class="field"><span>${t}</span><select id="${e}" ${i ? `disabled` : ``}>${n.map( ([e,t]) => `<option value="${e}" ${String(e) === String(r) ? `selected` : ``}>${t}</option>`).join(``)}</select></label>`
}
var wc = {
    vip: 3,
    bomb: 5
};
function Tc(e) {
    if (e === `ctf`)
        return [[3, `3`]];
    let t = wc[e];
    return t ? [3, 5, 7, 10].map(e => [e * t, `${e}`]) : [5, 10, 15, 25, 50, 100].map(e => [e, `${e}`])
}
var Ec = e => Tc(e).map( ([e]) => e)
  , Dc = (e, t) => wc[e] ? `${Math.round(t / wc[e])}` : `${t}`;
function Oc(e, t, n) {
    let r = Tc(t.mode)
      , i = t.mode === `ctf` ? `CAPTURES` : t.mode === `survival` ? `SCORE LIMIT` : wc[t.mode] ? `ROUNDS TO WIN` : `KILL LIMIT`
      , a = t => e ? `${e}-${t}` : t;
    return `<div class="field-grid">
    ${Cc(a(`bot-count`), `BOTS`, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(e => [e, `${e}`]), t.bots, !n)}
    ${Cc(a(`difficulty`), `BOT SKILL`, [[`recruit`, `EASY`], [`regular`, `NORMAL`], [`veteran`, `HARD`]], t.difficulty, !n)}
    ${Cc(a(`duration`), `TIME`, [60, 120, 180, 300, 600, 900].map(e => [e, `${e / 60} MIN`]), t.duration, !n)}
    ${Cc(a(`kill-limit`), i, r.some( ([e]) => e === t.killLimit) ? r : [...r, [t.killLimit, Dc(t.mode, t.killLimit)]], t.killLimit, !n || t.mode === `survival` || t.mode === `ctf`)}
    <label class="field toggle"><span>FRIENDLY FIRE</span><input type="checkbox" id="${a(`friendly-fire`)}" ${t.friendlyFire ? `checked` : ``} ${n ? `` : `disabled`}><i aria-hidden="true"></i></label>
  </div>`
}
function kc(e, t=`data-mode`) {
    return `<div class="mode-grid">${S.map(n => `<button class="mode-btn ${e === n.id ? `selected` : ``}" ${t}="${n.id}" aria-pressed="${e === n.id}"${n.legacy ? `` : ` aria-label="${F(n.name)}, bonus mode"`}>${n.legacy ? `` : `<em class="extra-tag">EXTRA</em>`}<strong>${F(n.short)}</strong>${n.short.toUpperCase() === n.name.toUpperCase() ? `` : `<span>${F(K(n.name))}</span>`}</button>`).join(``)}</div>`
}
function Ac(e, t=`data-map`) {
    return `<div class="map-strip">${ie.map(n => `<button class="map-thumb ${e === n.id ? `selected` : ``}" ${t}="${n.id}" aria-pressed="${e === n.id}" aria-label="Map ${F(n.name)}">${fc(n)}<span>${F(K(n.name))}</span></button>`).join(``)}</div>`
}
function jc() {
    let e = Ds(L.map)
      , t = ks(L.mode);
    return yc(`local`, `${vc(`CUSTOM BATTLE`)}
    <div class="page-body local-grid">
      <section class="panel map-panel" aria-label="Map">
        <h2 class="panel-title">MAP <span>${ie.length} LOCATIONS</span></h2>
        <div class="map-hero">${fc(e, `map-art large`)}<div class="map-caption"><strong>${F(K(e.name))}</strong><span>${F(e.subtitle)}</span><span class="map-fit">${Os(e)}</span></div></div>
        ${Ac(L.map)}
      </section>
      <section class="panel rules-panel" aria-label="Match rules">
        <h2 class="panel-title">GAME MODE</h2>
        ${kc(L.mode)}
        <p class="mode-note">${F(t.description)}${Ms(t.id) ? ` <b class="extra-note">BONUS MODE</b>` : ``}</p>
        ${Oc(``, L, !0)}
        <label class="field name-field"><span>GAMER TAG</span><input id="pilot-name" maxlength="16" value="${F(I.name)}" autocomplete="nickname"></label>
        ${Z(`START MATCH`, `data-action="deploy"`, `gold`, `cut-top`, `start-btn`)}
      </section>
    </div>`)
}
function Mc() {
    let e = Ds(L.map)
      , t = ks(L.mode);
    return yc(`online`, `${vc(`PLAY ONLINE`)}
    <div class="page-body online-grid">
      <section class="panel online-panel" aria-label="Join a match">
        <div class="callsign-row">${rc(I.avatar, `head`, `callsign-head`)}<label class="field name-field"><span>GAMER TAG</span><input id="pilot-name" maxlength="16" value="${F(I.name)}" autocomplete="nickname"></label></div>
        ${Z(`QUICK MATCH`, `data-action="matchmake"`, `gold`, `cut-top`, `wide-btn`)}
        <p class="hint">Drop into a public deathmatch. Bots hold empty seats.</p>
        ${Z(`CREATE ROOM`, `data-action="create"`, `blue`, `cut-none`, `wide-btn`)}
        <label class="check-line"><input type="checkbox" id="room-public"> <span>List my room publicly</span></label>
        <label class="field pass-field"><span>ROOM PASSWORD · OPTIONAL</span><input id="room-password" type="password" maxlength="32" autocomplete="new-password" placeholder="Empty = open room" spellcheck="false"></label>
        <p class="hint">${F(K(e.name))} · ${F(K(t.name))}. The host can change rules in the room.</p>
        <div class="join-row"><input id="room-code" placeholder="CODE" maxlength="5" autocomplete="off" aria-label="Room code" spellcheck="false">${Z(`JOIN ROOM`, `data-action="join"`, `blue`, `cut-bottom`)}</div>
        <label class="field pass-field"><span>PASSWORD · ONLY FOR LOCKED ROOMS</span><input id="join-password" type="password" maxlength="32" autocomplete="off" placeholder="Leave empty for open rooms" spellcheck="false"></label>
      </section>
      <section class="panel browser-panel" aria-label="Public rooms">
        <h2 class="panel-title">SERVER LIST <button class="mini-btn" data-action="list-rooms" aria-label="Refresh room list">${J(`refresh`)}</button></h2>
        <div id="room-list" class="room-list" aria-live="polite"></div>
      </section>
    </div>`)
}
function Nc() {
    let e = document.getElementById(`room-list`);
    e && (e.innerHTML = us.status === `loading` || us.status === `idle` ? `<p class="empty">Looking for live rooms…</p>` : us.status === `ok` ? us.list.length ? `<div class="room-head"><span>ROOM</span><span>MAP</span><span>MODE</span><span>PLAYERS</span></div>${us.list.map(e => `<button class="room-row ${e.locked ? `locked` : ``}" data-join-code="${F(e.code)}" ${e.locked ? `data-locked="1"` : ``} ${e.joinable ? `` : `disabled`} aria-label="Join ${F(e.host)}'s room ${F(e.code)}${e.locked ? `, locked, needs a password` : ``}"><strong>${e.locked ? `<span class="lock-tag">${J(`lock`)} LOCKED</span>` : ``}${F(e.host)}<small>${F(e.code)}${e.quick ? ` · QUICK` : ``}</small></strong><span>${F(K(Ds(e.map).name))}</span><span>${F(ks(e.mode).short)}</span><span>${e.players}/${e.capacity}${e.state === `playing` ? ` · LIVE` : ``}</span></button>`).join(``)}` : `<p class="empty">No public rooms yet. Hit QUICK MATCH to open one.</p>` : `<p class="empty">${F(us.message)}</p>`)
}
function Pc(e, t) {
    let n = yr(I, e, t);
    return n.unlocked ? {
        locked: !1,
        text: ``
    } : n.reason === `rank` ? {
        locked: !0,
        text: `RANK ${n.rank} · ${K(n.title)}`
    } : n.reason === `coins` ? {
        locked: !0,
        text: `${n.price} COINS`,
        price: n.price,
        affordable: n.affordable
    } : n.reason === `challenge` ? {
        locked: !0,
        text: `CHALLENGE`
    } : {
        locked: !0,
        text: `UNAVAILABLE`
    }
}
function Fc(e) {
    return e.unlocked ? `` : e.reason === `rank` ? `RANK ${e.rank}` : e.reason === `challenge` ? `CHALLENGE` : e.reason === `coins` ? `${e.price} COINS` : `UNAVAILABLE`
}
function Ic(e, t=`reward-art`) {
    return e.kind === `pose` ? rc(I.avatar, Br[e.index]?.id ?? `salute`, t) : e.part === `boots` || e.part === `skin` ? `<i class="chip ${t}" style="--chip:${lr[e.part][e.index]?.color ?? `#fff`}"></i>` : rc({
        ...I.avatar,
        [e.part]: e.index
    }, e.part === `shirt` || e.part === `pants` ? `idle` : `head`, t)
}
function Lc() {
    let e = Math.ceil(oi() / 6e4)
      , t = Math.floor(e / 60)
      , n = e % 60;
    return `NEW SET IN ${t ? `${t}H ` : ``}${n}M`
}
function Rc() {
    let e = di(I);
    return `<section class="challenge-board" aria-label="Daily Oberoi challenges">
    <h2 class="panel-title">DAILY OBEROI CHALLENGES <span>${e.filter(e => e.done).length}/${e.length} DONE · ${Lc()}</span></h2>
    <ol class="challenge-list">${e.map( ({def: e, progress: t, done: n, owned: r}) => `<li class="challenge-card ${n ? `done` : ``}">
      <div class="challenge-reward" aria-hidden="true">${Ic(e.reward)}</div>
      <div class="challenge-text"><strong>${F(K(e.title))}</strong><span>${F(e.detail)}</span>
        <div class="challenge-bar" role="progressbar" aria-label="${F(e.title)} progress" aria-valuemin="0" aria-valuemax="${e.goal}" aria-valuenow="${t}"><i style="width:${Math.round(t / e.goal * 100)}%"></i><b>${t}/${e.goal}</b></div>
        <em>${n ? `${J(`star`)} COMPLETE · ${F(K(ii(e.reward)))} UNLOCKED` : `REWARD: ${F(K(ii(e.reward)))}${r ? ` (OWNED)` : ``} + 30 COINS`}</em>
      </div></li>`).join(``)}</ol>
  </section>`
}
function zc() {
    let e = Wr(I);
    return `<section class="pose-picker" aria-label="Victory pose">
    <h2 class="panel-title">VICTORY POSE <span>STRUCK ON THE RESULTS SCREEN</span></h2>
    <div class="option-grid pose-grid">${Br.map( (t, n) => {
        let r = Hr(I, n)
          , i = e === t.id;
        return `<button class="option pose-option ${i ? `selected` : ``} ${r.unlocked ? `` : `locked`}" data-pose="${n}" aria-pressed="${i}" aria-label="${F(t.label)}${r.unlocked ? `` : `, locked, ${Fc(r)}`}">${rc(I.avatar, t.id, `option-art pose-art`)}<span>${F(K(t.label))}</span>${r.unlocked ? i ? `<em class="on">EQUIPPED</em>` : `` : `<em>${J(`lock`)}${Fc(r)}</em>`}</button>`
    }
    ).join(``)}</div>
  </section>`
}
var Bc = [{
    name: `Neon Rider`,
    color: `#57ffd9`,
    parts: {
        hat: `Neon headset`,
        shirt: `Neon Oberoi jacket`,
        pants: `Neon track joggers`,
        boots: `Neon sneakers`
    }
}, {
    name: `Frost Drip`,
    color: `#69bdff`,
    parts: {
        hat: `Frost beanie`,
        shirt: `Frost Oberoi hoodie`,
        pants: `Frost joggers`,
        boots: `Frost sneakers`
    }
}, {
    name: `Ember Ace`,
    color: `#ff8060`,
    parts: {
        hat: `Ember cap`,
        shirt: `Ember Oberoi jersey`,
        pants: `Ember joggers`,
        boots: `Ember sneakers`
    }
}];
function Vc(e) {
    let t = {
        ...I.avatar
    };
    for (let[n,r] of Object.entries(Bc[e].parts)) {
        let e = n;
        t[e] = lr[e].findIndex(e => e.label === r)
    }
    return t
}
function Hc() {
    let e = lr[as]
      , t = I.avatar[as];
    return yc(`avatar`, `${vc(`AVATAR`)}
    <div class="page-body avatar-grid">
      <section class="panel avatar-stage" aria-label="Preview">
        <div class="stage-art">${rc(I.avatar, `idle`, `avatar-preview`)}</div>
        <label class="field name-field"><span>GAMER TAG</span><input id="pilot-name" maxlength="16" value="${F(I.name)}" autocomplete="nickname"></label>
        <div class="swatch-row" role="group" aria-label="Name tag color">${v.map( (e, t) => `<button class="swatch ${I.color === t ? `selected` : ``}" style="--swatch:${e}" data-color="${t}" aria-label="Tag color ${t + 1}" aria-pressed="${I.color === t}"></button>`).join(``)}</div>
        <div class="avatar-steps">${Zn.map(e => {
        let t = Hs(e, I.avatar[e]);
        return `<div class="step-row"><button class="step" data-part="${e}" data-step="-1" aria-label="Previous ${ur[e]}">◀</button><span><small>${K(ur[e])}</small>${F(K(t.label))}</span><button class="step" data-part="${e}" data-step="1" aria-label="Next ${ur[e]}">▶</button></div>`
    }
    ).join(``)}</div>
      </section>
      <section class="panel locker" aria-label="Locker">
        <h2 class="panel-title">FRESH FITS <span>FREE · TAP TO EQUIP</span></h2>
        <div class="outfit-grid">${Bc.map( (e, t) => {
        let n = Vc(t)
          , r = Object.keys(e.parts).every(e => I.avatar[e] === n[e]);
        return `<button class="outfit-card ${r ? `selected` : ``}" data-action="outfit:${t}" aria-label="Equip ${e.name}" aria-pressed="${r}" style="--fit:${e.color}">${rc(n, `idle`, `outfit-art`)}<strong>${e.name}</strong><small>${r ? `EQUIPPED` : `EQUIP FREE`}</small></button>`
    }
    ).join(``)}</div>
        <div class="part-tabs" role="tablist" aria-label="Avatar part">${Zn.map(e => `<button role="tab" aria-selected="${as === e}" data-avatar-part="${e}">${K(ur[e])}</button>`).join(``)}</div>
        <div class="coin-line">${J(`coin`)}<strong>${I.coins}</strong><span>COINS EARNED IN MATCHES</span>${Z(`${J(`dice`)} RANDOM`, `data-action="avatar-random"`, `dark`, `cut-all`, `small`)}</div>
        <div class="option-grid">${e.map( (e, n) => {
        let r = Pc(as, n)
          , i = {
            ...I.avatar,
            [as]: n
        };
        return `<button class="option ${t === n ? `selected` : ``} ${r.locked ? `locked` : ``}" data-option="${n}" aria-pressed="${t === n}" aria-label="${F(e.label)}${r.locked ? `, locked, ${r.text}` : ``}">${as === `skin` || as === `boots` ? `<i class="chip" style="--chip:${e.color}"></i>` : rc(i, as === `shirt` || as === `pants` ? `idle` : `head`, `option-art`)}<span>${F(K(e.label))}</span>${r.locked ? `<em>${J(`lock`)}${r.text}</em>` : t === n ? `<em class="on">EQUIPPED</em>` : ``}</button>`
    }
    ).join(``)}</div>
      </section>
    </div>`)
}
var Uc = [[`DAMAGE`, `dmg`, e => e.damage * e.pellets, !1], [`FIRE RATE`, `rate`, e => e.melee ? 1 / Math.max(.1, e.fireInterval) : 1 / e.fireInterval, !1], [`RANGE`, `range`, e => e.range, !1], [`ACCURACY`, `acc`, e => 1 - Math.min(.25, e.spread) / .25, !1], [`MAGAZINE`, `mag`, e => e.melee ? 0 : e.magazine, !1], [`RELOAD`, `reload`, e => e.melee ? 0 : e.reload, !0]];
function Wc() {
    let e = Object.values(b)
      , t = As(os) ?? e[0]
      , n = Uc.map( ([n,,r,i]) => {
        let a = e.map(r).filter(e => e > 0)
          , o = Math.max(...a)
          , s = Math.min(...a)
          , c = r(t)
          , l = c <= 0 ? 0 : i ? 100 - (c - s) / (o - s || 1) * 80 : Math.max(6, c / o * 100)
          , u = n === `FIRE RATE` ? `${(1 / t.fireInterval).toFixed(1)}/s` : n === `ACCURACY` ? `${Math.round(l)}` : n === `RELOAD` ? t.melee ? `—` : `${t.reload.toFixed(1)}s` : n === `MAGAZINE` ? t.melee ? `—` : `${t.magazine}` : n === `DAMAGE` ? `${t.damage}${t.pellets > 1 ? `×${t.pellets}` : ``}` : `${t.range}`;
        return `<div class="stat-bar"><span>${n}</span><div class="bar"><i style="width:${l.toFixed(0)}%"></i></div><b>${u}</b></div>`
    }
    ).join(``)
      , r = [Ns(t) ? `BONUS GEAR` : ``, t.id === `emp` ? `EMP PULSE` : ``, t.maxZoom && t.maxZoom > 1 ? `ZOOM ${t.maxZoom}X` : ``, t.dual ? `DUAL WIELD` : ``, t.explosive ? `EXPLOSIVE` : ``, t.melee ? `MELEE` : ``, t.ricochet ? `RICOCHET` : ``, t.blocksFront ? `BLOCKS FIRE` : ``, t.gravity ? `ARCING` : ``].filter(Boolean);
    return yc(`armory`, `${vc(`ARMORY`)}
    <div class="page-body armory-grid">
      <section class="panel gun-detail" aria-label="${F(t.name)} details">
        <div class="gun-stage">${sc(t.id, `gun-art big`)}</div>
        <h2 class="gun-name">${F(K(t.name))}${t.short.toUpperCase() === t.name.toUpperCase() ? `` : ` <small>${F(t.short)}</small>`}</h2>
        <p class="gun-desc">${F(t.description)}</p>
        <div class="tag-row">${r.map(e => `<span>${e}</span>`).join(``)}</div>
        <div class="stat-list">${n}</div>
      </section>
      <section class="panel gun-rack" aria-label="Weapons">
        <h2 class="panel-title">GEAR <span>${e.length}</span></h2>
        <div class="rack-grid">${e.map(e => `<button class="rack-item ${e.id === t.id ? `selected` : ``}" data-weapon="${e.id}" aria-pressed="${e.id === t.id}">${Ns(e) ? `<em class="extra-tag">EXTRA</em>` : ``}${sc(e.id)}<span>${F(K(e.name))}</span></button>`).join(``)}</div>
        <h2 class="panel-title">GRENADES <span>B / TAP TO SWITCH TYPE</span></h2>
        <div class="nade-grid">${x.map(e => `<div class="nade-card">${lc(e)}<div><strong>${F(K(te[e].name))}</strong><span>${F(te[e].description)}</span><small>CARRY ${te[e].max} · START ${te[e].spawn}</small></div></div>`).join(``)}</div>
      </section>
    </div>`)
}
function Gc() {
    let e = pr(I.xp)
      , t = e.nextXp
      , n = [[`MATCHES`, `${I.matches}`], [`WINS`, `${I.wins}`], [`KILLS`, `${I.kills}`], [`DEATHS`, `${I.deaths}`], [`K/D`, zr(I)], [`WIN RATE`, I.matches ? `${Math.round(I.wins / I.matches * 100)}%` : `0%`], [`BEST WAVE`, `${I.bestWave}`], [`COINS`, `${I.coins}`]];
    return yc(`stats`, `${vc(`PROFILE`)}
    <div class="page-body stats-grid">
      <section class="panel rank-card" aria-label="Rank">
        ${rc(I.avatar, Wr(I), `stats-soldier`)}
        <div class="rank-info">${mc(e, `rank-badge big`)}<div><small>RANK ${e.level}</small><strong>${F(K(e.title))}</strong><span>${F(I.name)}</span></div></div>
        <div class="xp-bar" role="progressbar" aria-label="Experience to next rank" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(e.progress * 100)}"><i style="width:${Math.round(e.progress * 100)}%"></i><span>${I.xp} XP${t ? ` / ${t}` : ` · MAX RANK`}</span></div>
      </section>
      <section class="panel stat-card" aria-label="Career">
        ${Rc()}
        ${zc()}
        <h2 class="panel-title">CAREER</h2>
        <div class="tile-grid">${n.map( ([e,t]) => `<div class="tile"><strong>${t}</strong><span>${e}</span></div>`).join(``)}</div>
        <h2 class="panel-title">OBEROI RANKS</h2>
        <ol class="rank-ladder">${fr.map( (t, n) => `<li class="${n + 1 === e.level ? `current` : n + 1 < e.level ? `done` : ``}">${mc(pr(t.xp), `rank-badge tiny`)}<span>${F(K(t.title))}</span><b>${t.xp} XP</b></li>`).join(``)}</ol>
      </section>
    </div>`)
}
function Kc() {
    let e = e => {
        if (!e)
            return `NOT MET YET`;
        let t = Math.round((Date.now() - e) / 6e4);
        return t < 1 ? `JUST NOW` : t < 60 ? `${t} MIN AGO` : t < 1440 ? `${Math.round(t / 60)} H AGO` : `${Math.round(t / 1440)} D AGO`
    }
    ;
    return yc(`friends`, `${vc(`FRIENDS`)}
    <div class="page-body friends-grid">
      <section class="panel" aria-label="Friend list">
        <h2 class="panel-title">OBEROI MATES <span>${I.friends.length}</span></h2>
        <div class="friend-list">${I.friends.length ? I.friends.map(t => `<div class="friend-row">${rc(t.avatar, `head`, `friend-head`)}<div><strong style="--tag:${Fs(t.color)}">${F(t.name)}</strong><small>${t.matches} MATCHES · ${e(t.lastSeen)}</small></div>
          <button class="mini-btn ${t.favorite ? `on` : ``}" data-friend-fav="${t.id}" aria-pressed="${t.favorite}" aria-label="${t.favorite ? `Unpin` : `Pin`} ${F(t.name)}">${J(`star`)}</button>
          ${t.lastRoom ? `<button class="mini-btn text" data-join-code="${t.lastRoom}" aria-label="Join ${F(t.name)}'s last room ${t.lastRoom}">JOIN ${t.lastRoom}</button>` : ``}
          <button class="mini-btn" data-friend-remove="${t.id}" aria-label="Remove ${F(t.name)}">${J(`close`)}</button></div>`).join(``) : `<p class="empty">Play online and the players you squad up with appear here. Add a friend by name to pin them.</p>`}</div>
      </section>
      <section class="panel" aria-label="Add friend">
        <h2 class="panel-title">ADD FRIEND</h2>
        <div class="join-row"><input id="friend-name" maxlength="16" placeholder="GAMER TAG" aria-label="Friend gamer tag">${Z(`${J(`plus`)} ADD`, `data-action="friend-add"`, `blue`, `cut-bottom`)}</div>
        <p class="hint">Friends are stored on this device only. Share your room code to play together; their last room appears here once you meet online.</p>
        ${Z(`PLAY ONLINE`, `data-action="page:online"`, `gold`, `cut-top`, `wide-btn`)}
      </section>
    </div>`)
}
function qc(e, t, n) {
    let r = js(t)
      , i = H?.vote?.votes[e.id]
      , a = H && !H.quick && H.hostId === B && e.id !== B && W.has(`kick`) ? `<span class="host-tools"><button class="mini-btn text" data-kick="${F(e.id)}" aria-label="Kick ${F(e.name)}">KICK</button><button class="mini-btn text danger" data-kick="${F(e.id)}" data-ban="1" aria-label="Ban ${F(e.name)} from this room">BAN</button></span>` : ``
      , o = e.away ? `RECONNECTING` : n ? i ? `VOTED` : `VOTING` : H?.quick ? `IN QUEUE` : e.host ? `HOST` : e.ready ? `READY` : `NOT READY`;
    return `<div class="roster-row ${e.id === B ? `is-you` : ``} ${r ? `team-${e.team}` : ``}">${rc(Rs(e.avatar), `head`, `roster-head`)}<strong style="--tag:${Fs(e.color)}">${F(e.name)}${e.id === B ? ` <em>YOU</em>` : ``}</strong>${r ? `<small class="team-tag">${Ps(e.team)}</small>` : ``}<span class="state ${e.away ? `away` : e.host || e.ready || i ? `ready` : ``}">${o}</span>${a}</div>`
}
var Jc = null;
function Yc() {
    let e = H?.quick ? H.vote : void 0;
    if (!e) {
        Jc = null;
        return
    }
    let t = `${H.code}:${e.maps.join(`,`)}`;
    !Jc || Jc.key !== t ? Jc = {
        key: t,
        serverEnds: e.endsAt,
        localEnds: Date.now() + Math.max(0, Math.min(Xn.quickVoteMs, e.endsAt - Date.now()))
    } : e.endsAt !== Jc.serverEnds && (Jc.localEnds += e.endsAt - Jc.serverEnds,
    Jc.serverEnds = e.endsAt)
}
var Xc = () => Jc ? Math.max(0, Math.ceil((Jc.localEnds - Date.now()) / 1e3)) : 0;
function Zc(e) {
    let t = e.votes[B]
      , n = new Map;
    for (let t of Object.values(e.votes))
        n.set(t, (n.get(t) ?? 0) + 1);
    return `<h2 class="panel-title">VOTE FOR THE NEXT MAP <span class="vote-timer" id="vote-countdown">${Xc()}s</span></h2>
    <div class="vote-grid">${e.maps.map(e => {
        let r = Ds(e)
          , i = n.get(e) ?? 0;
        return `<button class="vote-card ${t === e ? `selected` : ``}" data-vote="${F(e)}" aria-pressed="${t === e}" aria-label="Vote for ${F(r.name)}, ${i} vote${i === 1 ? `` : `s`}${t === e ? `, your vote` : ``}">${fc(r)}<strong>${F(K(r.name))}${t === e ? `<em>YOUR VOTE</em>` : ``}</strong><span class="vote-count"><b>${i}</b> VOTE${i === 1 ? `` : `S`}</span></button>`
    }
    ).join(``)}</div>
    <p class="hint">${t ? `You can change your vote until the timer ends.` : `Tap a map to vote.`} Most votes wins; ties are picked at random. The match starts by itself.</p>`
}
function Qc() {
    if (!H)
        return;
    let e = document.getElementById(`chat-input`)
      , t = e?.value ?? ``
      , n = document.activeElement?.id === `chat-input`
      , r = [e?.selectionStart ?? t.length, e?.selectionEnd ?? t.length];
    bc(`lobby`),
    _o.className = `menu-shell page-lobby`;
    let i = H.players.find(e => e.id === B)
      , a = H.hostId === B
      , o = a && !H.quick ? Uo.view(H.config) : H.config
      , s = Ds(o.map)
      , c = ks(o.mode)
      , l = a && !H.quick
      , u = H.quick ? H.vote : void 0;
    Yc();
    let d = H.quick ? u ? `QUICK MATCH · VOTING` : `QUICK MATCH` : H.visibility === `public` ? `PUBLIC ROOM` : `PRIVATE ROOM`;
    _o.innerHTML = yc(`lobby`, `
    <header class="page-top"><button class="btn btn-blue cut-br back-btn" data-action="leave" aria-label="Leave room">${J(`back`)}<span>LEAVE</span></button><h1 class="chrome page-title">${d}</h1><button class="room-code ${H.locked ? `locked` : ``}" data-action="copy-code" aria-label="Copy invite link for room ${F(H.code)}${H.locked ? `. The password is not included.` : ``}"><span>${H.locked ? `${J(`lock`)} LOCKED ROOM` : `ROOM CODE`}</span><strong>${F(H.code)}</strong><small>${J(`copy`)} ${H.locked ? `COPY INVITE · NO PASSWORD` : `TAP TO COPY INVITE`}</small></button></header>
    <div class="page-body lobby-grid">
      <section class="panel roster-panel" aria-label="Squad">
        <h2 class="panel-title">SQUAD <span>${H.players.length}/12</span></h2>
        <div class="roster">${H.players.map(e => qc(e, o.mode, !!u)).join(``)}<div class="roster-row bot-row"><span class="bot-ico">${J(`plus`)}</span><strong>${Math.max(0, Math.min(o.bots, 12 - H.players.length))} BOTS</strong><span class="state">AUTO-FILL</span></div></div>
        ${js(o.mode) ? Z(`SWITCH TO ${Ps(+(i?.team === 0))}`, `data-action="team"`, `dark`, `cut-all`, `small team-switch`) : ``}
      </section>
      <section class="panel lobby-rules ${u ? `voting` : ``}" aria-label="${u ? `Map vote` : `Match rules`}">${u ? Zc(u) : `
        <h2 class="panel-title">${l ? `MATCH SETUP` : `MATCH RULES`}${H.locked ? `<span class="lock-tag">${J(`lock`)} PASSWORD SET</span>` : ``}</h2>
        <div class="map-hero small">${fc(s, `map-art large`)}<div class="map-caption"><strong>${F(K(s.name))}</strong><span>${F(K(c.name))} · ${o.duration / 60} MIN</span></div></div>
        <p class="rules-line">${F(K(s.name))} · ${F(K(c.name))} · ${o.duration / 60} MIN · ${H.players.length + Math.max(0, Math.min(o.bots, 12 - H.players.length))} PLAYERS</p>
        ${l ? `${Cc(`lobby-map`, `MAP`, ie.map(e => [e.id, K(e.name)]), o.map)}${Cc(`lobby-mode`, `MODE`, S.map(e => [e.id, `${K(e.name)}${e.legacy ? `` : ` · EXTRA`}`]), o.mode)}${Oc(`lobby`, o, !0)}` : `<p class="mode-note">${F(c.description)}${Ms(c.id) ? ` <b class="extra-note">BONUS MODE</b>` : ``}</p><p class="hint">${H.quick ? `Quick match: standard rules. The next match starts automatically.` : `Only the host can change the rules.`}</p>`}`}
      </section>
      <section class="panel chat-panel" aria-label="Chat">
        <h2 class="panel-title"><b>${J(`chat`)} CHAT</b></h2>
        <div id="chat-log" class="chat-log" aria-live="polite"></div>
        <div class="chat-row"><input id="chat-input" maxlength="120" placeholder="${W.has(`chat`) ? `Say something…` : `Chat needs the updated room server`}" aria-label="Chat message" ${W.has(`chat`) ? `` : `disabled`} autocomplete="off">${Z(`SEND`, `data-action="chat-send" ${W.has(`chat`) ? `` : `disabled`}`, `blue`, `cut-all`, `small`)}</div>
      </section>
    </div>
    <footer class="lobby-foot">${H.quick ? `<p id="network-message" class="voting-line" role="status">${u ? `VOTING · MATCH STARTS IN <b id="vote-foot">${Xc()}s</b>` : `STARTING SOON · THE SERVER LAUNCHES QUICK MATCHES AUTOMATICALLY`}</p>` : `<p id="network-message" role="status">${a ? `Launch when the whole squad is ready.` : `The host launches the match when everyone is ready.`}</p>${Z(a ? `START MATCH` : i?.ready ? `NOT READY` : `READY`, `data-action="${a ? `start-room` : `ready`}"`, a || !i?.ready ? `gold` : `blue`, `cut-top`, `start-btn`)}`}</footer>`),
    nl();
    let f = document.getElementById(`chat-input`);
    if (f && (f.value = t,
    n)) {
        f.focus();
        try {
            f.setSelectionRange(r[0], r[1])
        } catch {}
    }
}
function $c() {
    if (R !== `lobby` || !Jc)
        return;
    let e = `${Xc()}s`;
    for (let t of [`vote-countdown`, `vote-foot`]) {
        let n = document.getElementById(t);
        n && n.textContent !== e && (n.textContent = e)
    }
}
setInterval($c, 250);
var el = new WeakMap;
function tl(e, t) {
    return el.get(e) !== t && (el.set(e, t),
    e.innerHTML = t,
    !0)
}
function nl() {
    let e = document.getElementById(`chat-log`);
    e && tl(e, ds.slice(-30).map(e => `<p class="${e.kind}"><b style="--tag:${Fs(e.color)}">${e.kind === `system` ? `` : `${F(e.name)}:`}</b> ${F(e.text)}</p>`).join(``) || `<p class="system">Say hi. Messages stay in this room.</p>`) && (e.scrollTop = e.scrollHeight);
    let t = document.getElementById(`game-chat`);
    t && tl(t, ds.filter(e => Date.now() - e.time < 9e3).slice(-4).map(e => `<p class="${e.kind}">${e.kind === `system` ? F(K(e.text)) : `<b style="--tag:${Fs(e.color)}">${F(e.name)}:</b> ${F(e.text)}`}</p>`).join(``))
}
var rl = e => `<svg class="frame" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="${e}" vector-effect="non-scaling-stroke"/></svg>`;
function il() {
    bc(`playing`),
    jo = !1,
    No = ``,
    Kl(),
    Mu = 0,
    ts = 1,
    ns = ``,
    cu = 0,
    su = 0,
    fu.reset(),
    ou = ``,
    Mo = !1,
    lu = ``,
    du = [],
    xo = -1,
    So = null,
    yo.setFocus(null),
    _o.className = `game-shell`,
    _o.innerHTML = `
    <div class="hud-top">
      <button class="hud-round zoom-btn" data-action="scope" aria-label="Zoom 1X. Tap to change." aria-pressed="false"><b id="zoom-level">1X</b><small>ZOOM</small></button>
      <div class="hud-cluster">
        <div class="hud-vitals">${rl(`M1 1H99V27L87 39H1Z`)}
          <div class="vital">${J(`heart`)}<div class="bar health"><i id="health-fill"></i></div><span class="sr-only" id="health-value">100</span></div>
          <div class="vital">${J(`jet`)}<div class="bar fuel"><i id="fuel-fill"></i><b id="boost" class="vital-tag boost hidden" role="status"></b><b id="emp" class="vital-tag emp hidden" role="status"></b></div><span class="sr-only" id="fuel-value">100</span></div>
          <button class="hud-pause" data-action="pause" aria-label="Pause">${J(`pause`)}</button>
        </div>
        <div class="hud-clock"><strong id="timer">3:00</strong><div class="hud-objective" id="objective"><span id="match-mode">DM</span><b id="objective-value">0</b></div></div>
        <button class="hud-weapon" data-pulse="swap" aria-label="Switch weapon">${rl(`M1 1H99V39H13L1 27Z`)}<span class="hud-gun" id="gun-art"></span><span class="weapon-name" id="weapon-name">M4</span><strong id="ammo">030</strong><span id="reserve">120</span><i id="emp-charge" class="emp-charge hidden" aria-hidden="true"><i></i></i></button>
        <button class="hud-round hud-nade" data-pulse="grenadeCycle" aria-label="Switch grenade type"><span id="nade-art">${lc(`frag`)}</span><b id="grenades">3</b></button>
      </div>
      <div class="hud-side">
        <span id="network-status">${V ? `ONLINE` : `SOLO`}</span>
        ${dl(`hud-round small`)}
        <button class="hud-round small" data-action="scoreboard" aria-label="Scoreboard">${J(`trophy`)}</button>
        ${V ? `<button class="hud-round small" data-action="chat-open" aria-label="Chat">${J(`chat`)}</button>` : ``}
      </div>
    </div>
    <div id="kill-feed" class="kill-feed" aria-live="polite"></div>
    <div id="game-chat" class="game-chat"></div>
    <div id="objective-detail" class="objective-detail"></div>
    <div id="respawn" class="respawn hidden"></div>
    <button id="pickup-hint" class="pickup-hint hidden" data-pulse="pickup"></button>
    <div id="kill-callout" class="kill-callout" aria-live="polite"></div>
    <div id="reconnect" class="reconnect hidden" role="status"><strong>RECONNECTING…</strong><span>Holding your seat for 30 seconds.</span></div>
    <div class="desktop-controls" aria-label="Keyboard controls"><span><kbd>A</kbd><kbd>D</kbd> MOVE</span><span><kbd>W</kbd>/<kbd>SPACE</kbd> JET</span><span>CLICK FIRE</span><span><kbd>Q</kbd> SWAP</span><span><kbd>R</kbd> RELOAD</span><span><kbd>G</kbd> GRENADE</span><span><kbd>B</kbd> TYPE</span><span><kbd>F</kbd> MELEE</span><span><kbd>C</kbd> CROUCH</span><span><kbd>E</kbd> PICK UP</span><span><kbd>TAB</kbd> SCORES</span>${V ? `<span><kbd>T</kbd> CHAT</span>` : ``}</div>
    <div id="touch-controls" class="${Zl()}" style="--stick-scale:${gs[I.controls.stickSize]}">
      <div class="stick-area move-area" aria-hidden="true"></div>
      <div class="stick-area aim-area" aria-hidden="true"></div>
      <div class="stick-zone move-zone" id="move-stick" aria-label="Move and fly joystick"><span class="stick-caption">MOVE + FLY</span><i class="knob"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 5l5 7H15zM20 35l5-7H15zM5 20l7-5v10zM35 20l-7-5v10z"/></svg></i></div>
      <div class="stick-zone aim-zone" id="aim-stick" aria-label="Aim and fire joystick"><span class="stick-caption">AIM + FIRE</span><i class="knob"><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="9"/><path d="M20 4v10M20 26v10M4 20h10M26 20h10"/></svg></i></div>
      <div class="touch-actions">
        <button class="round-btn t-grenade" data-pulse="grenade" aria-label="Throw grenade"><span id="touch-nade">${lc(`frag`)}</span><b id="touch-grenades">3</b><small>GRENADE</small></button>
        <button class="round-btn t-crouch" data-hold="crouch" aria-label="Crouch" aria-pressed="false">${J(`crouch`)}<small>CROUCH</small></button>
        <button class="round-btn t-melee" data-pulse="melee" aria-label="Melee">${J(`fist`)}<small>MELEE</small></button>
        <button class="round-btn t-reload" data-pulse="reload" aria-label="Reload">${J(`reload`)}<small>RELOAD</small></button>
        <button class="round-btn t-swap" data-pulse="swap" aria-label="Switch weapon">${J(`swap`)}<small>SWAP</small></button>
        <button class="round-btn t-pickup" data-pulse="pickup" aria-label="Pick up weapon">${J(`hand`)}<small>PICK UP</small></button>
      </div>
    </div>
    <div id="scoreboard" class="scoreboard hidden" role="dialog" aria-label="Scoreboard"></div>
    <div id="chat-entry" class="chat-entry hidden"><input id="game-chat-input" maxlength="120" placeholder="Message · Enter to send" aria-label="Chat message" autocomplete="off"></div>
    <div id="modal-root"></div>`,
    tu(),
    U && _o.insertAdjacentHTML(`beforeend`, `<div id="training-coach" class="training-coach" role="status"></div>`)
}
var al = new Map(Object.values(b).map(e => [e.name, e.id]));
function ol(e, t, n) {
    let r = z.config.mode === `survival`
      , i = r ? `<span>${n ? `SPECTATING ${F(K(n.name))}` : `Spectating until the wave ends`}</span>` : `<span>RESPAWN IN</span><strong>${Math.max(1, Math.ceil(e.respawnTimer))}</strong>`;
    if (!t)
        return `${r ? `<strong>DOWN!</strong>` : ``}${i}`;
    let a = `<div class="respawn-timer">${i}</div>`
      , o = al.get(t.cause)
      , s = o ? sc(o, `gun-art death-gun`) : t.cause === `GRENADE` ? lc(`frag`) : t.cause === `MINE` ? lc(`mine`) : t.cause === `GAS` ? lc(`gas`) : ``
      , c = t.cause === `FALL` ? t.self ? `OFF THE MAP` : `KNOCKED OFF THE MAP` : t.cause === `GAS` ? `GASSED` : K(t.cause)
      , l = c ? `<p class="death-how">${s}<span>${F(c)}</span>${t.killer ? t.killerAlive ? `<em>${t.killerHp} HP LEFT</em>` : `<em>ALSO DOWN</em>` : ``}</p>` : ``;
    return t.killer ? `<div class="death-card"><small>${js(z.config.mode) && t.killer.team === e.team ? `TEAMKILLED BY` : `FRAGGED BY`}</small><b style="--tag:${Fs(t.killer.color)}">${F(t.killer.name)}${t.killer.bot ? `<em class="bot">BOT</em>` : ``}</b>${l}</div>${a}` : `<div class="death-card self"><b>${t.cause === `FALL` ? `YOU FELL` : `SELF-DESTRUCT`}</b>${l}</div>${a}`
}
var sl = null
  , cl = document
  , ll = () => !!(document.fullscreenElement ?? cl.webkitFullscreenElement)
  , ul = () => !!(document.fullscreenEnabled || cl.webkitFullscreenEnabled) && !matchMedia(`(display-mode: fullscreen), (display-mode: standalone)`).matches;
function dl(e) {
    if (!ul())
        return ``;
    let t = ll();
    return `<button class="${e} fs-toggle" data-action="fullscreen" aria-label="${t ? `Exit full screen` : `Full screen`}" aria-pressed="${t}">${J(t ? `shrink` : `expand`)}</button>`
}
async function fl() {
    if (ll()) {
        try {
            await (document.exitFullscreen ? document.exitFullscreen() : cl.webkitExitFullscreen?.())
        } catch {}
        return
    }
    let e = document.documentElement;
    try {
        await (e.requestFullscreen ? e.requestFullscreen({
            navigationUI: `hide`
        }) : e.webkitRequestFullscreen?.())
    } catch {
        q(`Full screen is not available in this browser.`);
        return
    }
    try {
        await window.screen.orientation.lock?.(`landscape`)
    } catch {}
}
function pl() {
    for (let e of document.querySelectorAll(`.fs-toggle`)) {
        let t = ll();
        e.setAttribute(`aria-pressed`, String(t)),
        e.setAttribute(`aria-label`, t ? `Exit full screen` : `Full screen`),
        e.innerHTML = J(t ? `shrink` : `expand`)
    }
}
document.addEventListener(`fullscreenchange`, pl),
document.addEventListener(`webkitfullscreenchange`, pl),
window.addEventListener(`beforeinstallprompt`, e => {
    e.preventDefault(),
    sl = e,
    R === `menu` && wo === `home` && Q()
}
),
window.addEventListener(`appinstalled`, () => {
    sl = null,
    q(`Oberoi Rush installed. Open it from your home screen.`),
    R === `menu` && wo === `home` && Q()
}
),
`serviceWorker` in navigator && window.addEventListener(`load`, () => {
    navigator.serviceWorker.register(`/sw.js`).catch( () => void 0)
}
);
function ml() {
    let e = js(z.config.mode);
    return `<div class="score-heading"><span>#</span><span>PLAYER</span><span>K</span><span>D</span><span>SCORE</span></div>${Rn(z).map( (t, n) => `<div class="score-row ${t.id === B ? `is-you` : ``} ${e ? `team-${t.team}` : ``}"><small>${n + 1}</small><strong>${rc(Rs(t.avatar), `head`, `score-head`)}<span style="--tag:${Fs(t.color)}">${F(t.name)}</span>${t.id === B ? `<em>YOU</em>` : ``}${t.bot ? `<em class="bot">BOT</em>` : ``}</strong><span>${t.kills}</span><span>${t.deaths}</span><span>${t.score}</span></div>`).join(``)}`
}
function hl() {
    bc(`results`),
    Io = ce(),
    fs.clear(),
    is = !1;
    let e = z.players.find(e => e.id === B)
      , t = Rn(z)[0]
      , n = z.winner === B || z.winner?.startsWith(`team-`) && z.winner === `team-${e?.team}` || z.winner === `survivors`
      , r = z.winner === null ? `Nobody took the lead.` : z.winner.startsWith(`team-`) ? `${Ps(Number(z.winner.slice(5)))} wins the match` : z.winner === `swarm` ? `The bots overran the base` : z.winner === `survivors` ? `Survived to wave ${z.wave}` : `${t?.name ?? `Nobody`} tops the scoreboard`;
    if (ss = null,
    !U && e) {
        try {
            ss = Nr(I, z, B)
        } catch (e) {
            console.warn(`Award failed`, e)
        }
        if (V && H && !ss?.duplicate)
            try {
                Pr(I, z.players, B, H.code),
                ws()
            } catch {}
        ss?.rankUp && q(`RANK UP: ${K(ss.rankAfter.title)}`)
    }
    let i = [];
    if (!U && e && ss && !ss.duplicate)
        try {
            fu.observe(z, B, performance.now()),
            i = fi(I, fu.matchStats(z, B, ss.won), {
                matchKey: ss.key
            })
        } catch (e) {
            console.warn(`Challenge progress failed`, e)
        }
    let a = i.filter(e => e.completed)
      , o = pr(I.xp)
      , s = z.winner === null ? `DRAW` : n ? `VICTORY` : z.config.mode === `ffa` || z.config.mode === `survival` ? `GAME OVER` : `DEFEAT`
      , c = H?.hostId === B
      , l = V ? H?.quick ? `<p class="hint next-round" id="next-round">The map vote for the next round opens automatically.</p>` : c ? Z(`RETURN TO ROOM`, `data-action="rematch"`, `gold`, `cut-top`, `wide-btn`) : `<p class="hint next-round">Waiting for the host to reopen the room.</p>` : Z(`PLAY AGAIN`, `data-action="deploy"`, `gold`, `cut-top`, `wide-btn`);
    _o.className = `results-shell`,
    _o.innerHTML = `<main class="results">
    <section class="panel results-panel" aria-label="Match results">
      <p class="results-callout ${n ? `win` : ``}">${F(gl(!!n))}</p>
      <h1 class="chrome results-title ${n ? `win` : ``}">${s}</h1>
      <p class="results-sub">${F(r)} · ${F(K(ks(z.config.mode).name))} · ${F(K(Ds(z.config.map).name))}</p>
      <div class="results-body">
        <div class="results-me staged">
          ${_l(e)}
          ${vl(i)}
          <div class="result-stats"><div><strong>${e?.kills ?? 0}</strong><span>KILLS</span></div><div><strong>${e?.deaths ?? 0}</strong><span>DEATHS</span></div><div><strong>${z.config.mode === `survival` ? z.wave : e?.score ?? 0}</strong><span>${z.config.mode === `survival` ? `WAVE` : `SCORE`}</span></div></div>
          <div class="xp-box">${mc(o, `rank-badge big`)}<div><small>${F(K(o.title))}</small><strong>${ss && !ss.duplicate ? `+${ss.xp} XP · +${ss.coins} COINS` : U ? `TUTORIAL · NO XP` : `NO XP AWARDED`}</strong><div class="xp-bar"><i style="width:${Math.round(o.progress * 100)}%"></i><span>${I.xp}${o.nextXp ? ` / ${o.nextXp}` : ``} XP</span></div>${ss?.rankUp ? `<em class="promo">RANK UP!</em>` : ``}${ss?.unlocked.length ? `<em class="promo">${ss.unlocked.length} NEW AVATAR ITEM${ss.unlocked.length > 1 ? `S` : ``}</em>` : ``}</div></div>
          ${yl(i)}
        </div>
        <div class="result-scoreboard">${ml()}</div>
      </div>
      <div class="results-actions">${l}${Z(`MAIN MENU`, `data-action="leave"`, `blue`, `cut-bottom`, `wide-btn`)}</div>
    </section></main><div id="modal-root"></div>`,
    P.sting(z.winner === null ? `draw` : n ? `victory` : `defeat`),
    a.length && (ss?.rankUp || q(`CHALLENGE COMPLETE: ${K(a[0].def.title)}${a[0].reward ? ` · ${K(ii(a[0].reward))} UNLOCKED` : ``}`),
    window.setTimeout( () => {
        R === `results` && P.sting(`challenge`)
    }
    , 1100))
}
function gl(e) {
    return z.winner === null ? `DEAD EVEN · GG, OBEROI` : z.config.mode === `survival` ? e ? `BASE HELD · THE OBEROI ARMY SALUTES YOU` : `THE BASE FELL · RUN IT BACK` : e ? `GG! THE OBEROI ARMY SALUTES YOU` : `GG · RUN IT BACK`
}
function _l(e) {
    let t = Rn(z)
      , n = z.winner
      , r = [];
    n?.startsWith(`team-`) ? r = t.filter(e => e.team === Number(n.slice(5))).slice(0, 3) : n === `survivors` ? r = t.filter(e => !e.bot).slice(0, 3) : n && n !== `swarm` && (r = t.filter(e => e.id === n));
    let i = r.map(e => ({
        p: e,
        winner: !0
    }));
    if (e && !r.some(t => t.id === e.id) && i.push({
        p: e,
        winner: !1
    }),
    !i.length)
        return ``;
    let a = js(z.config.mode);
    return `<div class="victory-stage" style="--figures:${i.length}" aria-label="Victory poses">${i.map( ({p: e, winner: t}) => {
        let n = e.id === B
          , r = n ? Rs(e.avatar ?? I.avatar) : e.avatar ? Rs(e.avatar) : Oi(e.id)
          , i = n ? t || z.winner === null ? Wr(I) : `wave` : Gr(e.id)
          , o = t ? n ? `YOU · WINNER` : `WINNER` : `YOU · GG`;
        return `<figure class="podium-fig ${t ? `winner` : ``} ${n ? `you` : ``} ${a ? `team-${e.team}` : ``}">${rc(r, i, `podium-art`)}<figcaption><b style="--tag:${Fs(e.color)}">${F(e.name)}</b><small>${t ? J(`star`) : ``}${o}</small></figcaption></figure>`
    }
    ).join(``)}</div>`
}
function vl(e) {
    return e.filter(e => e.completed).map(e => `<div class="challenge-complete" role="status"><div class="challenge-reward" aria-hidden="true">${Ic(e.def.reward)}</div><div><em>CHALLENGE COMPLETE!</em><strong>${F(K(e.def.title))}</strong><small>${e.reward ? `${F(K(ii(e.reward)))} UNLOCKED · ` : ``}+${e.coins} COINS</small></div></div>`).join(``)
}
function yl(e) {
    let t = e.filter(e => !e.completed).map(e => `<li class="${e.after >= e.def.goal ? `done` : ``}"><span>${F(K(e.def.title))}</span><div class="challenge-bar"><i style="width:${Math.round(e.after / e.def.goal * 100)}%"></i><b>${e.after}/${e.def.goal}${e.after > e.before ? ` <ins>+${e.after - e.before}</ins>` : ``}</b></div></li>`).join(``);
    return t ? `<section class="challenge-results" aria-label="Daily challenge progress"><h3>DAILY CHALLENGES</h3><ul>${t}</ul></section>` : ``
}
function bl(e) {
    No = e,
    Kl(),
    !V && R === `playing` && (jo = !0);
    let t = go(`#modal-root`);
    if (!t)
        return;
    let n = ``
      , r = `Menu`;
    e === `help` ? (r = `Controls`,
    n = `<h2 class="chrome modal-title">CONTROLS</h2><div class="control-cols"><div><h3>KEYBOARD + MOUSE</h3><dl class="keys"><dt><kbd>A</kbd><kbd>D</kbd></dt><dd>Move</dd><dt><kbd>W</kbd> / <kbd>SPACE</kbd></dt><dd>Jetpack (hold)</dd><dt><kbd>MOUSE</kbd></dt><dd>Aim · hold click to fire</dd><dt><kbd>Q</kbd></dt><dd>Swap weapons</dd><dt><kbd>R</kbd></dt><dd>Reload</dd><dt><kbd>E</kbd></dt><dd>Pick up weapon</dd><dt><kbd>G</kbd></dt><dd>Throw grenade</dd><dt><kbd>B</kbd></dt><dd>Switch grenade type</dd><dt><kbd>F</kbd></dt><dd>Melee</dd><dt><kbd>C</kbd></dt><dd>Crouch (hold)</dd><dt><kbd>S</kbd></dt><dd>Drop through bridges</dd><dt><kbd>Z</kbd> / right click</dt><dd>Cycle zoom 1X up to the gun's max</dd><dt><kbd>TAB</kbd></dt><dd>Scoreboard</dd><dt><kbd>T</kbd></dt><dd>Chat (online)</dd></dl></div><div><h3>TOUCH</h3><ul class="touch-help"><li><b>Left stick</b> moves. Push up to fly.</li><li><b>Right stick</b> aims. Push further, past the ring, to fire.</li><li><b>Floating sticks</b> (default): touch anywhere in the lower left or right of the screen and the stick centres under your thumb. Size, placement, aim sensitivity and aim assist live in SETTINGS.</li><li><b>Weapon panel</b> swaps guns. <b>Grenade circle</b> switches type.</li><li><b>Grenade</b> and <b>fist</b> buttons throw and melee.</li><li>Release thrust to refuel the jetpack.</li></ul></div></div>${Z(`GOT IT`, `data-action="close-modal"`, `gold`, `cut-top`, `wide-btn`)}`) : e === `settings` ? (r = `Settings`,
    n = `<h2 class="chrome modal-title">SETTINGS</h2><label class="setting-line"><span>SOUND EFFECTS</span><input id="sound-enabled" type="checkbox" ${P.enabled ? `checked` : ``}><i aria-hidden="true"></i></label><label class="setting-line range"><span>VOLUME</span><input id="volume" type="range" min="0" max="100" value="${Math.round(I.volume * 100)}"></label><label class="setting-line"><span>ALWAYS SHOW TOUCH CONTROLS</span><input id="touch-enabled" type="checkbox" ${I.touch ? `checked` : ``}><i aria-hidden="true"></i></label>${$l()}<p class="hint">Reduced motion follows your device. Profile, rank and avatar are saved in this browser only.</p><div class="modal-actions">${Z(`CONTROLS`, `data-action="help"`, `blue`, `cut-all`)}${Z(`DONE`, `data-action="close-modal"`, `gold`, `cut-top`)}</div>`) : (r = `Match menu`,
    n = `<h2 class="chrome modal-title">${V ? `MENU` : `PAUSED`}</h2>${V ? `<p class="hint">The match continues while this menu is open.</p>` : ``}<div class="modal-stack">${Z(`RESUME`, `data-action="close-modal"`, `gold`, `cut-top`, `wide-btn`)}${Z(`CONTROLS`, `data-action="help"`, `blue`, `cut-none`, `wide-btn`)}${Z(`SETTINGS`, `data-action="settings"`, `blue`, `cut-none`, `wide-btn`)}${Z(`LEAVE MATCH`, `data-action="leave"`, `red`, `cut-bottom`, `wide-btn`)}</div>`),
    t.innerHTML = `<div class="modal-backdrop"><section class="modal panel" role="dialog" aria-modal="true" aria-label="${r}"><button class="mini-btn close-modal" data-action="close-modal" aria-label="Close">${J(`close`)}</button>${n}</section></div>`,
    go(`.close-modal`)?.focus()
}
function xl() {
    No = ``;
    let e = go(`#modal-root`);
    e && (e.innerHTML = ``),
    jo = !1
}
function Sl() {
    let e = document.getElementById(`pilot-name`);
    e && (I.name = gr(e.value) ?? `Rookie`),
    ws()
}
function Cl(e) {
    z = Kt(e);
    let t = qt(z, `local`, I.name, {
        color: I.color,
        team: 0,
        avatar: {
            ...I.avatar
        }
    });
    return B = t.id,
    t
}
function wl() {
    Sl(),
    Es(),
    Dl(),
    U = null,
    Cl({
        ...L
    }),
    P.unlock(),
    P.reset(),
    il()
}
function Tl() {
    Sl(),
    Dl(),
    U = {
        step: 0,
        startX: Cl({
            ...L,
            mode: `ffa`,
            bots: 0,
            duration: 900,
            killLimit: 100
        }).x
    },
    P.unlock(),
    P.reset(),
    il()
}
function El() {
    Uo.reset(),
    Jo.reset(),
    Yo = qo(),
    To &&= (To.onclose = null,
    To.close(),
    null),
    H = null,
    V = !1,
    es.length = 0,
    Ho.reset(),
    xu(),
    bu = !1,
    xs?.(!1),
    xs = null
}
function Dl() {
    Qo++,
    To?.readyState === WebSocket.OPEN && Fl({
        type: `leave`
    }),
    El(),
    ls = !1,
    Ol(``),
    kl(``),
    ds.length = 0
}
function Ol(e, t=!0) {
    cs = e;
    try {
        e && t ? sessionStorage.setItem(Qn, e) : sessionStorage.removeItem(Qn)
    } catch {}
    e || jl(``)
}
function kl(e) {
    let t = new URL(location.href);
    e ? t.searchParams.set(`room`, e) : t.searchParams.delete(`room`),
    history.replaceState(null, ``, `${t.pathname}${t.search}${t.hash}`)
}
var Al = `${Qn}-room`;
function jl(e) {
    try {
        e ? sessionStorage.setItem(Al, e) : sessionStorage.removeItem(Al)
    } catch {}
}
async function Ml() {
    if (Cs && (To?.readyState === WebSocket.OPEN || To?.readyState === WebSocket.CONNECTING))
        return Cs;
    if (To?.readyState === WebSocket.OPEN)
        return;
    El(),
    Fo = ``,
    Zo = performance.now();
    let e = new Promise( (e, t) => {
        let n = new WebSocket(`${location.protocol === `https:` ? `wss` : `ws`}://${location.host}/ws`);
        To = n;
        let r = setTimeout( () => {
            n.close(),
            t(Error(`Room server did not respond. Start it with bun run dev or bun start.`))
        }
        , 7e3);
        xs = n => {
            clearTimeout(r),
            n ? e() : t(Error(`Connection was replaced.`))
        }
        ,
        n.onopen = () => {
            V = !0
        }
        ,
        n.onerror = () => {
            clearTimeout(r),
            t(Error(`Cannot reach the room server. Open the game through its Bun server to play online.`))
        }
        ,
        n.onmessage = e => {
            if (To === n)
                try {
                    let t = String(e.data)
                      , n = JSON.parse(t)
                      , r = Go.encode(t).length;
                    Zo = performance.now(),
                    Wo.total += r,
                    Wo.messages++,
                    Wo.since ||= performance.now(),
                    (n.type === `snapshot` || n.type === `lean`) && (Wo.snapshotBytes += r,
                    Wo.snapshots++,
                    Wo.maxSnapshot = Math.max(Wo.maxSnapshot, r),
                    n.type === `lean` ? Wo.leanSnapshots++ : Wo.fullSnapshots++),
                    Ll(n)
                } catch (e) {
                    console.error(`Invalid server message`, e)
                }
        }
        ,
        n.onclose = () => {
            To === n && (clearTimeout(r),
            t(Error(`Connection closed before the handshake completed.`)),
            xs?.(!1),
            xs = null,
            Ss &&= (Ss(`retry`),
            null),
            V && (V = !1,
            (R === `playing` || R === `lobby` || R === `results`) && H && !ls && (cs && W.has(`resume`) ? Pl() : Nl(`Connection lost. Back to the menu.`))))
        }
    }
    );
    Cs = e;
    try {
        await e
    } finally {
        Cs === e && (Cs = null)
    }
}
function Nl(e) {
    Dl(),
    U = null,
    q(e),
    Bl(),
    wo = `online`,
    Q()
}
async function Pl(e=!1) {
    let t = cs;
    if (!t)
        return;
    let n = ++Qo
      , r = crypto.randomUUID()
      , i = performance.now() + 55e3;
    ls = !0,
    document.getElementById(`reconnect`)?.classList.remove(`hidden`);
    let a = document.getElementById(`network-message`);
    a && (a.textContent = `Reconnecting…`),
    e && q(`Rejoining your last match…`);
    for (let a = 1; performance.now() < i && ls && n === Qo; a++) {
        if (await new Promise(t => setTimeout(t, e && a === 1 ? 0 : Math.min(4e3, 250 * 2 ** Math.min(a - 1, 4)) + Math.random() * 200)),
        !ls)
            return;
        try {
            if (await Ml(),
            !ls || n !== Qo)
                return;
            if (!W.has(`resume`))
                break;
            let e = await new Promise(e => {
                Ss = e,
                Fl({
                    type: `resume`,
                    token: t,
                    ...W.has(`resilient-v1`) ? {
                        attemptId: r
                    } : {},
                    ...Ko()
                }),
                setTimeout( () => e(`retry`), 6e3)
            }
            );
            if (Ss = null,
            t = cs || t,
            e === `ok`) {
                ls = !1,
                document.getElementById(`reconnect`)?.classList.add(`hidden`),
                q(`Back in the fight.`);
                return
            }
            if (e === `fail`)
                break
        } catch {}
    }
    ls && n === Qo && (ls = !1,
    e ? (Dl(),
    q(`Your last room is no longer available.`),
    Q(),
    Fu && (Iu(),
    zl())) : Nl(`Could not rejoin the room. It may have closed.`))
}
function Fl(e) {
    return To?.readyState === WebSocket.OPEN ? (e.type === `input` || e.type === `control` || e.type === `net`) && To.bufferedAmount > 1024 ? ($o.skippedInputs++,
    !1) : (To.send(JSON.stringify(e)),
    !0) : !1
}
function Il(e=!1) {
    let t = performance.now()
      , n = z.matchId;
    !V || ls || !H || !W.has(`resilient-v1`) || !n || !e && t - Math.max(Xo, Do) < 100 || Fl({
        type: `net`,
        tick: z.tick,
        matchId: n,
        ...e ? {
            resync: !0
        } : {}
    }) && (Xo = t,
    e && $o.resyncRequests++)
}
function Ll(e) {
    if (e.type === `welcome`)
        ls || (B = e.id),
        W = new Set(Array.isArray(e.features) ? e.features : []),
        Yo = qo(),
        !ls && e.resumeToken && (Ol(e.resumeToken, !1),
        jl(``)),
        xs?.(!0),
        xs = null;
    else if (e.type === `resumed`)
        Ho.reset(),
        B = e.id,
        Ol(e.resumeToken),
        jl(e.code),
        xu(),
        Ss?.(`ok`),
        Ss = null;
    else if (e.type === `error`) {
        if (e.code === `resume_failed`) {
            Ss?.(`fail`),
            Ss = null;
            return
        }
        Fo = e.message,
        q(e.message);
        let t = document.getElementById(`network-message`);
        if (t && (t.textContent = e.message),
        e.code === `password`) {
            let e = document.getElementById(`join-password`);
            e?.focus(),
            e?.select()
        }
        if ((e.code === `kicked` || e.code === `banned`) && R === `menu` && wo === `online`) {
            let t = document.getElementById(`room-list`);
            t && t.insertAdjacentHTML(`afterbegin`, `<p class="empty notice">${F(e.message)}</p>`)
        }
    } else if (e.type === `room`) {
        if ((H?.code !== e.room.code || e.room.quick || e.room.hostId !== e.id || e.room.state !== `lobby`) && Uo.reset(),
        H = e.room,
        B = e.id,
        V = !0,
        cs && (Ol(cs),
        jl(H.code)),
        kl(H.code),
        !H.quick) {
            let e = Uo.confirm(H.config);
            L = Uo.view(H.config),
            e && Fl({
                type: `configure`,
                config: e
            })
        }
        if (H.state === `lobby` && !ls)
            Qc();
        else if (R === `results` && H.quick && typeof H.restartIn == `number`) {
            let e = document.getElementById(`next-round`);
            e && (e.textContent = `Map vote opens in ${Math.ceil(H.restartIn / 1e3)}s.`)
        }
    } else if (e.type === `snapshot`)
        Rl(e.world, e.ack);
    else if (e.type === `lean`) {
        let t = Ho.apply(e);
        t ? Rl(t, e.ack) : performance.now() - Xo > 2e3 && Il(!0)
    } else if (e.type === `inputAck`)
        e.matchId === z.matchId && Yo.acknowledge(e.seq, performance.now()) && $o.inputReceipts++;
    else if (e.type === `pong`)
        ko = Math.round(performance.now() - e.time);
    else if (e.type === `left`) {
        let e = !!H;
        H = null,
        V = !1,
        es.length = 0,
        Ho.reset(),
        xu(),
        ds.length = 0,
        Ol(cs, !1),
        jl(``),
        U = null,
        No = ``,
        Jc = null,
        kl(``),
        Bl(),
        e && (wo = `online`),
        Q(),
        wo === `online` && zl()
    } else
        e.type === `rooms` ? (us = {
            status: `ok`,
            list: e.rooms,
            message: ``
        },
        Nc()) : e.type === `chat` ? (ds.push(e.entry),
        ds.length > 60 && ds.shift(),
        nl(),
        e.entry.kind === `player` && (e.entry.from !== B && P.ui(),
        P.chat(e.entry.text))) : e.type === `chatHistory` && (ds.length = 0,
        ds.push(...e.entries),
        nl())
}
function Rl(e, t) {
    (z.matchId !== e.matchId || e.tick < z.tick) && (Yo = qo(),
    Jo.reset(),
    es.length = 0,
    xu()),
    z = e,
    Ao = performance.now(),
    Bo++,
    Jo.observe(z.tick, Ao),
    Yo.acknowledge(t, Ao),
    Il(),
    es.length && z.tick < es[es.length - 1].world.tick && (es.length = 0),
    es.push({
        world: z,
        at: Ao
    }),
    es.length > 24 && es.shift(),
    R !== `playing` && (R !== `results` || z.phase === `playing`) && (U = null,
    P.unlock(),
    P.reset(),
    il()),
    z.phase === `finished` && R === `playing` && hl(),
    Du(t)
}
async function zl() {
    us = {
        status: `loading`,
        list: [],
        message: ``
    },
    Nc();
    try {
        if (await Ml(),
        !W.has(`list`)) {
            us = {
                status: `unsupported`,
                list: [],
                message: `This server has no public room list. Create a room and share its code.`
            },
            Nc();
            return
        }
        Fl({
            type: `list`
        })
    } catch (e) {
        us = {
            status: `offline`,
            list: [],
            message: e instanceof Error ? e.message : `Room server offline.`
        },
        Nc()
    }
}
function Bl() {
    z = Kt({
        ...L,
        bots: 6,
        duration: 99999,
        killLimit: 99999
    })
}
function Vl() {
    if (H && H.hostId === B && !H.quick) {
        let e = Uo.offer(L);
        e && Fl({
            type: `configure`,
            config: e
        })
    }
}
function Hl(e) {
    if (!e)
        return;
    let t = e.value.trim().slice(0, 120);
    t && (W.has(`chat`) ? (Fl({
        type: `chat`,
        text: t
    }),
    e.value = ``) : q(`Chat needs the updated room server.`))
}
function Ul(e) {
    is = e;
    let t = document.getElementById(`chat-entry`)
      , n = document.getElementById(`game-chat-input`);
    t?.classList.toggle(`hidden`, !e),
    e ? (Kl(),
    n?.focus()) : (n && (n.value = ``),
    n?.blur())
}
async function Wl(e, t) {
    if (P.unlock(),
    P.ui(),
    e.startsWith(`outfit:`)) {
        let t = Number(e.slice(7));
        if (!Number.isInteger(t) || !Bc[t])
            return;
        Sl(),
        I.avatar = Vc(t),
        ws(),
        Q(),
        q(`${Bc[t].name} equipped!`)
    } else if (e === `quick-bots`)
        L.bots = Math.max(1, L.bots || 4),
        wl();
    else if (e.startsWith(`page:`)) {
        let t = e.slice(5);
        if (!Co.includes(t))
            return;
        Sl(),
        wo = t,
        Q(),
        t === `online` ? zl() : H || (El(),
        Ol(``),
        kl(``))
    } else if (e === `help` || e === `settings` || e === `pause`)
        R === `menu` && Sl(),
        bl(e);
    else if (e === `match-options`)
        wo = `local`,
        Q();
    else if (e === `close-modal`)
        xl();
    else if (e === `touch-reset`)
        I.controls = er({}),
        bo.enabled = I.controls.haptics,
        ws(),
        bl(`settings`);
    else if (e === `fullscreen`)
        fl();
    else if (e === `install` && sl) {
        let e = sl;
        sl = null,
        await e.prompt().catch( () => void 0),
        R === `menu` && Q()
    } else if (e === `sound`)
        P.toggle(),
        R === `menu` && wo === `home` && Q(),
        q(`Sound ${P.enabled ? `on` : `off`}`);
    else if (e === `deploy`)
        wl();
    else if (e === `training`)
        Tl();
    else if (e === `scoreboard`)
        Mo = !Mo;
    else if (e === `scope`)
        Yl();
    else if (e === `chat-open`)
        Ul(!is);
    else if (e === `chat-send`)
        Hl(document.getElementById(`chat-input`));
    else if (e === `home` || e === `leave`)
        Dl(),
        U = null,
        xl(),
        Bl(),
        wo = `home`,
        Q();
    else if (e === `list-rooms`)
        zl();
    else if (e === `avatar-random`) {
        for (let e of Zn) {
            let t = lr[e].map( (e, t) => t).filter(t => yr(I, e, t).unlocked);
            I.avatar[e] = t[Math.floor(Math.random() * t.length)] ?? 0
        }
        ws(),
        Q()
    } else if (e === `friend-add`) {
        let e = document.getElementById(`friend-name`)
          , t = e ? Fr(I, e.value) : null;
        if (!t) {
            q(`Enter a gamer tag of 1–16 characters.`);
            return
        }
        ws(),
        q(`${t.name} pinned to your friends.`),
        Q()
    } else if (e === `create` || e === `join` || e === `matchmake`) {
        Sl(),
        Es();
        let n = (t?.dataset.joinCode ?? document.getElementById(`room-code`)?.value ?? ``).trim().toUpperCase();
        if (e === `join` && !/^[A-Z0-9]{5}$/.test(n)) {
            q(`Enter the five-character room code.`);
            return
        }
        let r = document.getElementById(`join-password`)?.value ?? ``
          , i = document.getElementById(`room-password`)?.value ?? ``;
        if (e === `join` && t?.dataset.locked && !r) {
            let e = document.getElementById(`room-code`);
            e && (e.value = n),
            document.getElementById(`join-password`)?.focus(),
            q(`Room ${n} is locked. Enter its password, then JOIN ROOM.`);
            return
        }
        q(e === `matchmake` ? `Finding a match…` : `Connecting to room server…`);
        try {
            await Ml(),
            ds.length = 0;
            let t = Rr(I);
            if (e === `matchmake`)
                W.has(`matchmake`) ? Fl({
                    type: `matchmake`,
                    ...t,
                    ...Ko()
                }) : (q(`This server has no quick match. Opened a private room instead.`),
                Fl({
                    type: `create`,
                    ...t,
                    config: {
                        ...L,
                        mode: `ffa`
                    },
                    ...Ko()
                }));
            else if (e === `create`) {
                if (i && !W.has(`password`)) {
                    q(`This room server does not support passwords. Clear the password to create an open room.`);
                    return
                }
                Fl({
                    type: `create`,
                    ...t,
                    config: L,
                    visibility: document.getElementById(`room-public`)?.checked ? `public` : `private`,
                    ...i ? {
                        password: i
                    } : {},
                    ...Ko()
                })
            } else
                Fl({
                    type: `join`,
                    code: n,
                    ...t,
                    ...r ? {
                        password: r
                    } : {},
                    ...Ko()
                })
        } catch (t) {
            q(`${t instanceof Error ? t.message : `Connection failed.`}${e === `matchmake` ? ` PRACTICE (LOCAL) works offline.` : ``}`)
        }
    } else {
        if (e === `ready` && Fl({
            type: `ready`,
            ready: !H?.players.find(e => e.id === B)?.ready
        }),
        e === `team` && Fl({
            type: `team`,
            team: +(H?.players.find(e => e.id === B)?.team === 0)
        }),
        e === `start-room`) {
            let e = Uo.flush();
            e && Fl({
                type: `configure`,
                config: e
            }),
            Fl({
                type: `start`
            })
        }
        if (e === `rematch` && (H?.hostId === B ? Fl({
            type: `rematch`
        }) : q(`Your host can return the squad to the room.`)),
        e === `copy-code` && H) {
            let e = new URL(location.href);
            e.search = ``,
            e.searchParams.set(`room`, H.code);
            try {
                await navigator.clipboard.writeText(e.href),
                q(`Invite link copied.`)
            } catch {
                q(`Room ${H.code} · ${location.origin}`)
            }
        }
    }
}
_o.addEventListener(`click`, e => {
    let t = e.target instanceof Element ? e.target : null;
    if (!t)
        return;
    let n = t.closest(`[data-action]`);
    if (n) {
        e.preventDefault(),
        Wl(n.dataset.action, n);
        return
    }
    let r = t.closest(`[data-join-code]`);
    if (r) {
        Wl(`join`, r);
        return
    }
    let i = t.closest(`[data-map]`)?.dataset.map;
    if (i) {
        Sl(),
        L.map = i,
        Es(),
        Q();
        return
    }
    let a = t.closest(`[data-mode]`)?.dataset.mode;
    if (a && S.some(e => e.id === a)) {
        Sl(),
        L.mode = a,
        Ec(a).includes(L.killLimit) || (L.killLimit = Ec(a)[wc[a] ? 1 : Math.min(2, Ec(a).length - 1)]),
        Es(),
        Q();
        return
    }
    let o = t.closest(`[data-color]`)?.dataset.color;
    if (o !== void 0) {
        Sl(),
        I.color = Number(o),
        ws(),
        Q();
        return
    }
    let s = t.closest(`[data-weapon]`)?.dataset.weapon;
    if (s) {
        os = s,
        Q();
        return
    }
    let c = t.closest(`[data-vote]`)?.dataset.vote;
    if (c) {
        if (!H?.vote?.maps.includes(c))
            return;
        if (!W.has(`vote`)) {
            q(`This room server has no map vote.`);
            return
        }
        P.ui(),
        Fl({
            type: `vote`,
            map: c
        });
        return
    }
    let l = t.closest(`[data-kick]`);
    if (l && H && H.hostId === B) {
        let e = l.dataset.kick
          , t = l.dataset.ban === `1`
          , n = H.players.find(t => t.id === e)?.name ?? `this soldier`;
        if (!confirm(t ? `Remove ${n} and block their current guest session from this room?` : `Kick ${n} from the room? They can rejoin with the code.`))
            return;
        Fl({
            type: `kick`,
            id: e,
            ...t ? {
                ban: !0
            } : {}
        });
        return
    }
    let u = t.closest(`[data-avatar-part]`)?.dataset.avatarPart;
    if (u) {
        as = u,
        Sl(),
        Q();
        return
    }
    let d = t.closest(`[data-step]`);
    if (d) {
        let e = d.dataset.part
          , t = Number(d.dataset.step)
          , n = lr[e]
          , r = I.avatar[e];
        for (let i = 0; i < n.length && (r = (r + t + n.length) % n.length,
        !yr(I, e, r).unlocked); i++)
            ;
        Sl(),
        Sr(I, e, r),
        as = e,
        Q();
        return
    }
    let f = t.closest(`[data-option]`);
    if (f) {
        let e = Number(f.dataset.option)
          , t = yr(I, as, e);
        if (Sl(),
        !t.unlocked && t.reason === `coins`) {
            if (!t.affordable) {
                q(`Needs ${t.price} coins. Earn coins by playing matches.`);
                return
            }
            if (!confirm(`Unlock ${Hs(as, e).label} for ${t.price} coins?`))
                return;
            let n = xr(I, as, e);
            if (!n.ok) {
                q(n.error);
                return
            }
        }
        let n = Sr(I, as, e);
        n.ok || q(n.error),
        Q();
        return
    }
    let p = t.closest(`[data-pose]`);
    if (p) {
        let e = Number(p.dataset.pose)
          , t = Hr(I, e);
        if (!t.unlocked && t.reason === `challenge`) {
            let e = ei(t.challenges[0] ?? ``);
            q(e ? `Complete “${e.title}” when it is a daily challenge.` : `Earned from a daily Oberoi challenge.`);
            return
        }
        let n = Ur(I, e);
        if (!n.ok) {
            q(n.error);
            return
        }
        Q();
        return
    }
    let m = t.closest(`[data-friend-fav]`)?.dataset.friendFav;
    if (m) {
        let e = I.friends.find(e => e.id === m);
        e && (Ir(I, m, !e.favorite),
        ws(),
        Q());
        return
    }
    let h = t.closest(`[data-friend-remove]`)?.dataset.friendRemove;
    if (h) {
        Lr(I, h),
        ws(),
        Q();
        return
    }
    let g = t.closest(`[data-hold]`);
    if (g) {
        rs = !rs,
        g.setAttribute(`aria-pressed`, String(rs)),
        g.classList.toggle(`on`, rs);
        return
    }
    let _ = t.closest(`[data-pulse]`)?.dataset.pulse;
    _ && [`swap`, `reload`, `pickup`, `grenade`, `melee`, `grenadeCycle`].includes(_) && ps.add(_)
}
),
_o.addEventListener(`mousedown`, e => {
    e.target instanceof Element && e.target.closest(`[data-vote]`) && document.activeElement?.id === `chat-input` && e.preventDefault()
}
),
_o.addEventListener(`change`, e => {
    let t = e.target;
    if (!(t instanceof HTMLInputElement || t instanceof HTMLSelectElement))
        return;
    let n = t.id.replace(/^lobby-/, ``)
      , r = t.id.startsWith(`lobby-`);
    t.id === `pilot-name` && Sl();
    let i = {
        map: () => {
            L.map = t.value
        }
        ,
        mode: () => {
            L.mode = t.value,
            Ec(t.value).includes(L.killLimit) || (L.killLimit = Ec(t.value)[wc[t.value] ? 1 : Math.min(2, Ec(t.value).length - 1)])
        }
        ,
        difficulty: () => {
            L.difficulty = t.value
        }
        ,
        "bot-count": () => {
            L.bots = Number(t.value)
        }
        ,
        duration: () => {
            L.duration = Number(t.value)
        }
        ,
        "kill-limit": () => {
            L.killLimit = Number(t.value)
        }
        ,
        "friendly-fire": () => {
            t instanceof HTMLInputElement && (L.friendlyFire = t.checked)
        }
    };
    if (i[n] && (r || wo === `local`) && (r && H && (L = Uo.view(H.config)),
    i[n](),
    Es(),
    r && Vl()),
    t.id === `sound-enabled` && t instanceof HTMLInputElement && (P.enabled = t.checked,
    P.setVolume(I.volume)),
    t.id === `touch-enabled` && t instanceof HTMLInputElement && (I.touch = t.checked,
    ws(),
    document.getElementById(`touch-controls`)?.classList.toggle(`forced`, I.touch)),
    (t.id === `move-sensitivity` || t.id === `aim-speed`) && ws(),
    t instanceof HTMLInputElement && ([`stick-size`, `stick-placement`, `aim-sensitivity`].includes(t.name) || t.id === `aim-assist` || t.id === `haptics`)) {
        let e = {
            ...I.controls
        };
        t.id === `aim-assist` ? e.assist = t.checked : t.id === `haptics` ? (e.haptics = t.checked,
        bo.enabled = t.checked,
        t.checked && bo.play([`kill`], performance.now())) : e[{
            "stick-size": `stickSize`,
            "stick-placement": `placement`,
            "aim-sensitivity": `aim`
        }[t.name]] = t.value,
        I.controls = er(e),
        Kl(),
        ws(),
        eu()
    }
}
),
_o.addEventListener(`input`, e => {
    let t = e.target;
    if (t instanceof HTMLInputElement && (t.id === `move-sensitivity` || t.id === `aim-speed`)) {
        let e = t.id === `move-sensitivity` ? `moveSensitivity` : `aimSensitivity`;
        I.controls = er({
            ...I.controls,
            [e]: Number(t.value) / 100
        });
        let n = document.getElementById(`${t.id}-value`);
        n && (n.textContent = `${Math.round(I.controls[e] * 100)}%`),
        Kl()
    }
    t instanceof HTMLInputElement && t.id === `volume` && (I.volume = Number(t.value) / 100,
    P.setVolume(I.volume),
    ws()),
    t instanceof HTMLInputElement && t.id === `room-code` && (t.value = t.value.toUpperCase().replace(/[^A-Z0-9]/g, ``))
}
),
_o.addEventListener(`keydown`, e => {
    let t = e.target;
    t instanceof HTMLInputElement && (e.key === `Enter` && (t.id === `chat-input` && (e.preventDefault(),
    Hl(t)),
    t.id === `game-chat-input` && (e.preventDefault(),
    Hl(t),
    Ul(!1)),
    t.id === `room-code` && (e.preventDefault(),
    Wl(`join`)),
    t.id === `friend-name` && (e.preventDefault(),
    Wl(`friend-add`))),
    e.key === `Escape` && t.id === `game-chat-input` && (e.preventDefault(),
    e.stopPropagation(),
    Ul(!1)))
}
);
var Gl = {
    KeyQ: `swap`,
    KeyR: `reload`,
    KeyG: `grenade`,
    KeyF: `melee`,
    KeyE: `pickup`,
    KeyB: `grenadeCycle`
};
window.addEventListener(`keydown`, e => {
    e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement || (e.code === `Escape` ? (e.preventDefault(),
    No ? xl() : R === `playing` && bl(`pause`)) : R !== `playing` || No || ([`Space`, `Tab`, `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`].includes(e.code) && e.preventDefault(),
    e.code === `Tab` ? Mo = !0 : e.code === `KeyZ` && !e.repeat ? Yl() : (e.code === `KeyT` || e.code === `Enter`) && V && !e.repeat ? (e.preventDefault(),
    Ul(!0)) : (fs.add(e.code),
    !e.repeat && Gl[e.code] && ps.add(Gl[e.code]))))
}
),
window.addEventListener(`keyup`, e => {
    fs.delete(e.code),
    e.code === `Tab` && (Mo = !1)
}
),
vo.addEventListener(`pointermove`, e => {
    e.pointerType === `mouse` && (Lo = {
        x: e.clientX,
        y: e.clientY,
        active: !0
    })
}
),
vo.addEventListener(`pointerdown`, e => {
    e.pointerType === `mouse` && R === `playing` && !No && (e.button === 0 && (Io.fire = !0,
    zo = null,
    Ro = performance.now() + 150,
    P.unlock()),
    e.button === 2 && Yl())
}
),
window.addEventListener(`pointerup`, e => {
    e.pointerType === `mouse` && e.button === 0 && (Io.fire = !1)
}
),
vo.addEventListener(`contextmenu`, e => e.preventDefault());
function Kl() {
    for (let e of hs)
        e();
    Ro = 0,
    zo = null,
    ms = {
        left: !1,
        right: !1,
        jet: !1,
        down: !1
    },
    fs.clear(),
    Io = ce(),
    G.fire = G.aiming = !1,
    bs = null,
    G.moveX = G.moveY = 0,
    G.jet = !1,
    ps.clear()
}
function ql(e) {
    let t = e?.guns[e.activeGun]
      , n = t ? As(t.id) : void 0;
    return Math.max(1, Math.floor(n?.maxZoom ?? 2))
}
function Jl(e) {
    ts = e;
    let t = document.querySelector(`.zoom-btn`)
      , n = document.getElementById(`zoom-level`);
    n && (n.textContent = `${ts}X`),
    t && (t.setAttribute(`aria-pressed`, String(ts > 1)),
    t.setAttribute(`aria-label`, `Zoom ${ts}X of ${ql(z.players.find(e => e.id === B))}X. Tap to change.`))
}
function Yl() {
    let e = ql(z.players.find(e => e.id === B));
    Jl(ts >= e ? 1 : ts + 1)
}
window.addEventListener(`blur`, () => {
    Kl(),
    R === `playing` && !V && !No && bl(`pause`)
}
),
document.addEventListener(`visibilitychange`, () => {
    document.hidden && Kl()
}
);
var Xl = innerWidth > innerHeight;
window.addEventListener(`resize`, () => {
    let e = innerWidth > innerHeight;
    e !== Xl && Kl(),
    Xl = e
}
);
var Zl = () => `touch-controls ${I.touch ? `forced` : ``} ${I.controls.placement === `floating` ? `floating` : `fixed`}`;
function Ql(e, t, n, r) {
    return `<div class="setting-line choice" role="radiogroup" aria-label="${t}"><span>${t}</span><div class="seg">${n.map( ([t,n]) => `<label><input type="radio" name="${e}" value="${t}" ${t === r ? `checked` : ``}><b>${n}</b></label>`).join(``)}</div></div>`
}
function $l() {
    let e = I.controls
      , t = (e, t, n) => `<label class="setting-line range touch-sensitivity"><span>${t}<output id="${e}-value" for="${e}">${Math.round(n * 100)}%</output></span><input type="range" id="${e}" min="50" max="150" step="5" value="${Math.round(n * 100)}" aria-label="${t}"></label>`;
    return `<div class="touch-settings"><h3 class="setting-head">TOUCH CONTROLS</h3>${t(`move-sensitivity`, `MOVE SENSITIVITY`, e.moveSensitivity)}${t(`aim-speed`, `AIM SPEED`, e.aimSensitivity)}<p class="hint">Lower values make thumb movements more forgiving. Changes apply immediately and save on this phone.</p>${Ql(`stick-size`, `STICK SIZE`, [[`small`, `SMALL`], [`medium`, `MEDIUM`], [`large`, `LARGE`]], e.stickSize)}${Ql(`stick-placement`, `STICK PLACEMENT`, [[`fixed`, `FIXED`], [`floating`, `FLOATING`]], e.placement)}${Ql(`aim-sensitivity`, `AIM SMOOTHING`, [[`steady`, `STEADY`], [`normal`, `NORMAL`], [`quick`, `QUICK`]], e.aim)}<label class="setting-line"><span>AIM ASSIST <small>TOUCH ONLY</small></span><input id="aim-assist" type="checkbox" ${e.assist ? `checked` : ``}><i aria-hidden="true"></i></label>${bo.supported ? `<label class="setting-line"><span>VIBRATION <small>HITS · KILLS · DEATHS</small></span><input id="haptics" type="checkbox" ${e.haptics ? `checked` : ``}><i aria-hidden="true"></i></label>` : ``}<p class="hint">Steady filters hand jitter; Quick turns faster. Pull the right stick to fire. Small thumb adjustments keep it firing at every sensitivity.</p>${Z(`RESET TOUCH CONTROLS`, `data-action="touch-reset"`, `dark`, `cut-all`, `small touch-reset`)}</div>`
}
function eu() {
    let e = document.getElementById(`touch-controls`);
    e && (e.className = Zl(),
    e.style.setProperty(`--stick-scale`, String(gs[I.controls.stickSize])))
}
function tu() {
    for (let e of hs)
        e();
    hs.clear();
    let e = document.getElementById(`touch-controls`);
    if (e)
        for (let t of [`move`, `aim`]) {
            let n = document.getElementById(`${t}-stick`)
              , r = e.querySelector(`.${t}-area`);
            if (!n)
                continue;
            let i = n.querySelector(`.knob`)
              , a = null
              , o = null
              , s = {
                x: 0,
                y: 0
            }
              , c = 44
              , l = e => {
                let r = (e.clientX - s.x) / c
                  , a = (e.clientY - s.y) / c
                  , o = Math.hypot(r, a);
                if (o > 1 && (r /= o,
                a /= o),
                i.style.transform = `translate(${(r * c * .62).toFixed(1)}px,${(a * c * .62).toFixed(1)}px)`,
                t === `move`)
                    G.moveX = r,
                    G.moveY = a;
                else {
                    G.aimX = r,
                    G.aimY = a;
                    let e = G.fire;
                    Object.assign(G, so(o, G)),
                    G.fire && !e && (Ro = performance.now() + 150,
                    zo = Math.atan2(G.aimY, G.aimX))
                }
                n.classList.toggle(`firing`, t === `aim` && G.fire)
            }
              , u = (e, t) => {
                let i = I.controls.placement === `floating`;
                if (a !== null || i !== (t === r))
                    return;
                e.preventDefault(),
                P.unlock(),
                a = e.pointerId,
                o = t,
                t.setPointerCapture(a),
                n.style.transform = ``;
                let u = n.getBoundingClientRect()
                  , d = {
                    x: u.left + u.width / 2,
                    y: u.top + u.height / 2
                };
                s = i ? {
                    x: e.clientX,
                    y: e.clientY
                } : d,
                i && (n.style.transform = `translate(${(s.x - d.x).toFixed(1)}px,${(s.y - d.y).toFixed(1)}px)`),
                c = Math.max(36, u.width * .34),
                n.classList.add(`active`),
                l(e)
            }
              , d = e => {
                e.pointerId === a && (e.preventDefault(),
                l(e))
            }
              , f = () => {
                let e = a
                  , r = o;
                a = null,
                o = null,
                e !== null && r?.hasPointerCapture(e) && r.releasePointerCapture(e),
                i.style.transform = `translate(0,0)`,
                n.style.transform = ``,
                n.classList.remove(`active`, `firing`),
                t === `move` ? (G.moveX = G.moveY = 0,
                ms = {
                    left: !1,
                    right: !1,
                    jet: !1,
                    down: !1
                }) : (G.aimX = G.aimY = 0,
                G.fire = G.aiming = !1,
                bs = null)
            }
            ;
            hs.add(f);
            let p = e => {
                e.pointerId === a && f()
            }
            ;
            for (let e of r ? [n, r] : [n])
                e.addEventListener(`pointerdown`, t => u(t, e)),
                e.addEventListener(`pointermove`, d),
                e.addEventListener(`pointerup`, p),
                e.addEventListener(`pointercancel`, p),
                e.addEventListener(`lostpointercapture`, p)
        }
}
var nu = e => Math.atan2(Math.sin(e), Math.cos(e))
  , ru = (e, t) => nu(t - e);
function iu(e, t, n) {
    let r = Math.atan2(G.aimY, G.aimX);
    return bs = lo(bs, r, n, I.controls.aim, I.controls.aimSensitivity, Math.hypot(G.aimX, G.aimY)),
    I.controls.assist && G.fire ? au(e, t, bs) : bs
}
function au(e, t, n) {
    let r = t.x
      , i = t.y - 5
      , a = z.config.mode === `ffa`
      , o = null;
    for (let t of (vu ?? z).players) {
        if (t.id === e.id || t.hp <= 0 || t.respawnTimer > 0 || !a && t.team === e.team)
            continue;
        let s = t.x - r
          , c = t.y - i
          , l = Math.hypot(s, c);
        if (l < 1 || l > vs)
            continue;
        let u = Math.atan2(c, s)
          , d = Math.abs(ru(n, u));
        d > _s || o && d >= o.diff || !Qt(z, r, i, t.x, t.y) || (o = {
            diff: d,
            angle: u
        })
    }
    return o ? nu(n + ru(n, o.angle) * ys) : n
}
var ou = ``
  , su = 0
  , cu = 0
  , lu = ``
  , uu = ``
  , du = []
  , fu = new Ga;
function pu(e, t) {
    e.className = `kill-callout${t.banner ? ` banner tone-${t.tone}` : ``}`,
    e.innerHTML = `<strong>${F(t.title)}</strong>${t.sub ? `<span>${F(t.sub)}</span>` : ``}`
}
function mu() {
    let e = z.players.find(e => e.id === B);
    if (!e)
        return;
    let t = e.guns[e.activeGun]
      , n = t ? As(t.id) : void 0
      , r = (e, t) => {
        let n = document.querySelector(e);
        n && n.textContent !== t && (n.textContent = t)
    }
    ;
    r(`#timer`, Is(z.time));
    let i = gc();
    r(`#match-mode`, i.label),
    r(`#objective-value`, i.value),
    r(`#objective-detail`, i.detail),
    r(`#health-value`, `${Math.ceil(Math.max(0, e.hp))}`),
    r(`#fuel-value`, `${Math.ceil(Math.max(0, e.fuel))}`),
    go(`#health-fill`).style.width = `${Math.max(0, Math.min(100, e.hp))}%`,
    go(`#fuel-fill`).style.width = `${Math.max(0, Math.min(100, e.fuel))}%`,
    go(`#health-fill`).classList.toggle(`low`, e.hp < 30);
    let a = Math.max(0, e.boostTime ?? 0)
      , o = Math.max(0, e.empTime ?? 0)
      , s = go(`#boost`)
      , c = go(`#emp`);
    s.classList.toggle(`hidden`, a <= 0 || o > 0),
    a > 0 && r(`#boost`, `BOOST ${Math.ceil(a)}s`),
    c.classList.toggle(`hidden`, o <= 0),
    o > 0 && r(`#emp`, `EMP · BOOTS OFF ${Math.ceil(o)}s`),
    go(`#fuel-fill`).classList.toggle(`boosted`, a > 0 && o <= 0),
    go(`#fuel-fill`).classList.toggle(`jammed`, o > 0);
    let l = t?.id === `emp` ? Math.max(0, Math.min(.7, e.empCharge ?? 0)) : 0
      , u = go(`#emp-charge`);
    u.classList.toggle(`hidden`, t?.id !== `emp`),
    u.firstElementChild.style.width = `${Math.round(l / .7 * 100)}%`;
    let d = `${e.activeGun}:${t?.id ?? `none`}`;
    d === ns ? ts > ql(e) && Jl(ql(e)) : (ns = d,
    Jl(1));
    let f = `${t?.id ?? `none`}${t?.dual ? `:dual` : ``}`;
    f !== lu && (lu = f,
    go(`#gun-art`).innerHTML = t ? `${sc(t.id)}${t.dual ? sc(t.id, `gun-art dual`) : ``}` : ``),
    r(`#weapon-name`, n ? `${t.dual ? `DUAL ` : ``}${K(n.name)}` : `UNARMED`),
    r(`#ammo`, n?.melee ? `∞` : e.reloadTimer > 0 ? `RLD` : String(t?.ammo ?? 0).padStart(3, `0`)),
    r(`#reserve`, n?.melee ? `` : String(t?.reserve ?? 0).padStart(3, `0`)),
    document.querySelector(`.hud-weapon`)?.classList.toggle(`empty`, !!t && !n?.melee && t.ammo === 0 && e.reloadTimer <= 0);
    let p = _c(e);
    if (p.kind !== uu) {
        uu = p.kind,
        go(`#nade-art`).innerHTML = lc(p.kind);
        let e = document.getElementById(`touch-nade`);
        e && (e.innerHTML = lc(p.kind)),
        document.querySelector(`.hud-nade`)?.setAttribute(`aria-label`, `Switch grenade type, ${p.name} selected`)
    }
    r(`#grenades`, `${p.count}`),
    r(`#touch-grenades`, `${p.count}`);
    let m = V && performance.now() - Ao > 1600;
    r(`#network-status`, U ? `TUTORIAL` : V ? Jo.age(performance.now()) > 1e3 ? `SYNCING…` : `${ko} MS${m ? ` · LAG` : ``}` : `SOLO`);
    let h = go(`#respawn`);
    if (h.classList.toggle(`hidden`, e.hp > 0),
    e.hp > 0)
        So && (So = null,
        yo.setFocus(null));
    else {
        let t = So ? ho(So, z, B) : null
          , n = z.config.mode === `survival` ? z.players.find(t => t.id !== B && t.team === e.team && t.hp > 0 && t.respawnTimer <= 0) : void 0;
        t?.killerAlive && t.killer ? yo.setFocus(t.killer.id, `killer`) : yo.setFocus(n?.id ?? null, `spectate`),
        tl(h, ol(e, t, n))
    }
    let g = z.pickups.find(t => t.timer <= 0 && As(t.kind) && (!t.lockedFor || t.lockedFor !== e.id) && Math.hypot(t.x - e.x, t.y - e.y) < 85)
      , _ = go(`#pickup-hint`);
    if (_.classList.toggle(`hidden`, !g || e.hp <= 0),
    g) {
        let e = `PICK UP ${K(As(g.kind)?.name ?? `WEAPON`)}`;
        _.dataset.label !== e && (_.dataset.label = e,
        _.innerHTML = `${sc(g.kind)}<span><kbd>E</kbd> ${F(e)}</span>`,
        _.setAttribute(`aria-label`, e))
    }
    document.querySelector(`.t-pickup`)?.classList.toggle(`ready`, !!g);
    let v = z.events.filter(e => e.type === `kill` || e.type === `objective` && e.text).slice(-4)
      , ee = v.map(e => e.id).join(`,`);
    if (ee !== ou) {
        ou = ee;
        let e = e => z.players.find(t => t.id === e)
          , t = e => e ? `<b class="${js(z.config.mode) ? `team-${e.team}` : ``} ${e.id === B ? `you` : ``}">${F(e.name)}</b>` : `<b>ARENA</b>`;
        go(`#kill-feed`).innerHTML = v.map(n => n.type === `objective` ? `<p class="obj">${F(K(n.text ?? ``))}</p>` : `<p>${t(e(n.actor))}<span class="feed-weapon">${n.weapon === `grenade` ? lc(n.grenadeKind ?? `frag`) : n.weapon ? sc(n.weapon) : `✕`}</span>${t(e(n.target))}</p>`).join(``)
    }
    let y = performance.now();
    if (U || fu.observe(z, B, y),
    e.kills > cu) {
        let t = y;
        du = [...du.filter(e => t - e < 4500), t],
        cu = e.kills;
        let n = z.events.filter(t => t.type === `kill` && t.actor === e.id).slice(-1)[0]
          , r = z.players.find(e => e.id === n?.target)?.name;
        fu.push({
            key: `kill`,
            title: [``, `KILL!`, `DOUBLE KILL!`, `TRIPLE KILL!`, `MULTI KILL!`, `RAMPAGE!`][Math.min(5, du.length)],
            sub: r ? K(r) : void 0,
            priority: du.length > 1 ? 2 : 1,
            tone: `good`,
            sting: null,
            hold: 1300,
            banner: !1,
            ttl: 500
        }, t)
    }
    let b = fu.frame(y)
      , x = go(`#kill-callout`);
    b.fresh && b.callout && (pu(x, b.callout),
    b.callout.sting && P.sting(b.callout.sting)),
    x.classList.toggle(`visible`, !!b.callout);
    let S = go(`#scoreboard`);
    if (S.classList.toggle(`hidden`, !Mo),
    Mo && (S.innerHTML = `<h2 class="chrome">SCOREBOARD</h2>${ml()}`),
    V && nl(),
    U) {
        let t = U.step;
        t === 0 && Math.abs(e.x - U.startX) > 60 && U.step++,
        t === 1 && e.fuel < 90 && U.step++,
        t === 2 && z.events.some(t => t.type === `shot` && t.actor === e.id && t.weapon !== `grenade`) && U.step++,
        t === 3 && e.activeGun === 1 && U.step++,
        t === 4 && e.grenades < (te.frag?.spawn ?? 3) && U.step++;
        let n = [[`MOVE`, `A / D to run. On touch, slide the left stick sideways.`], [`FLY`, `Hold SPACE or W to use the jetpack. On touch, push the left stick up.`], [`SHOOT`, `Aim with the mouse and hold click. On touch, drag the right stick past the ring.`], [`SWAP`, `Press Q or tap the weapon panel to switch guns.`], [`GRENADE`, `Press G or tap the grenade button. B switches grenade type.`], [`READY!`, `Release thrust to refuel. E or the hand button picks up guns.`]][U.step]
          , r = document.getElementById(`training-coach`);
        r && r.dataset.step !== String(U.step) && (r.dataset.step = String(U.step),
        r.innerHTML = `<span>TUTORIAL · ${Math.min(5, U.step + 1)}/5</span><strong>${n[0]}</strong><p>${n[1]}</p>${U.step === 5 ? Z(`ENTER THE ARENA`, `data-action="deploy"`, `gold`, `cut-top`, `small`) : ``}`,
        P.ui())
    }
}
var hu = 150
  , gu = .1
  , _u = 90
  , $ = {
    pending: [],
    state: null,
    ack: -1,
    offsetX: 0,
    offsetY: 0,
    error: 0,
    errorAvg: 0,
    corrections: 0,
    snaps: 0
}
  , vu = null
  , yu = ``
  , bu = !1;
function xu() {
    $.pending.length = 0,
    $.state = null,
    $.ack = -1,
    $.offsetX = $.offsetY = 0,
    yu = ``
}
var Su = e => V && R === `playing` && !!e && e.hp > 0 && e.respawnTimer <= 0 && z.phase === `playing`
  , Cu = e => `${+e.left}${+e.right}${+e.jet}${+e.down}${+!!e.crouch}`;
function wu(e) {
    let t = {
        ...e,
        input: {
            ...e.input
        }
    };
    for (let e of $.pending)
        e.duration > 0 && gn(z, t, e.input, e.duration);
    return t
}
var Tu = 0;
function Eu() {
    let e = performance.now()
      , t = Math.exp(-Math.max(0, e - Tu) / 1e3 / gu);
    Tu = e,
    $.offsetX *= t,
    $.offsetY *= t,
    Math.hypot($.offsetX, $.offsetY) < .01 && ($.offsetX = $.offsetY = 0)
}
function Du(e) {
    if (typeof e != `number` || !Number.isFinite(e)) {
        bu = !1,
        xu();
        return
    }
    bu = !0,
    $.ack = e,
    $.pending = $.pending.filter(e => e.seq > $.ack);
    let t = z.players.find(e => e.id === B);
    if (!Su(t)) {
        xu();
        return
    }
    let n = $.state
      , r = wu(t);
    if (Eu(),
    n) {
        let e = Math.hypot(n.x - r.x, n.y - r.y)
          , t = n.x + $.offsetX - r.x
          , i = n.y + $.offsetY - r.y;
        $.error = e,
        $.errorAvg += (e - $.errorAvg) * .1,
        $.corrections++,
        Math.hypot(t, i) > hu ? ($.offsetX = $.offsetY = 0,
        $.snaps++) : ($.offsetX = t,
        $.offsetY = i)
    }
    $.state = r
}
function Ou(e, t) {
    $.pending.push({
        seq: e,
        input: {
            ...t
        },
        duration: 0
    }),
    yu = Cu(t),
    $.pending.length > _u && $.pending.splice(0, $.pending.length - _u)
}
function ku(e) {
    let t = z.players.find(e => e.id === B);
    if (!Jo.canPredict(performance.now())) {
        Eu();
        return
    }
    if (!bu || !Su(t)) {
        $.state && xu();
        return
    }
    $.state ||= wu(t);
    let n = $.pending[$.pending.length - 1];
    n && e > 0 && (n.duration += e,
    gn(z, $.state, n.input, e)),
    Eu()
}
function Au(e) {
    let t = $.state;
    return t ? {
        ...e,
        x: t.x + $.offsetX,
        y: t.y + $.offsetY,
        vx: t.vx,
        vy: t.vy,
        fuel: t.fuel,
        jetting: t.jetting,
        grounded: t.grounded,
        crouching: t.crouching,
        aim: Io.aim
    } : {
        ...e,
        aim: Io.aim
    }
}
var ju = performance.now()
  , Mu = 0
  , Nu = 0;
function Pu(e) {
    let t = Math.min(.25, Math.max(0, e - ju) / 1e3)
      , n = Math.min(.05, t);
    if (ju = e,
    R === `playing`) {
        let r = z.players.find(e => e.id === B);
        if (!No && !is) {
            ms = oo(G.moveX, G.moveY, ms, I.controls.moveSensitivity),
            Io.left = fs.has(`KeyA`) || fs.has(`ArrowLeft`) || ms.left,
            Io.right = fs.has(`KeyD`) || fs.has(`ArrowRight`) || ms.right,
            Io.jet = fs.has(`Space`) || fs.has(`KeyW`) || fs.has(`ArrowUp`) || ms.jet || G.jet,
            Io.down = fs.has(`KeyS`) || fs.has(`ArrowDown`) || ms.down;
            let e = r ? vu?.players.find(e => e.id === B) ?? r : void 0;
            if (G.aiming || (bs = null),
            r && e && G.aiming)
                Io.aim = iu(r, e, n);
            else if (r && e && Lo.active) {
                let t = yo.screenToWorld(Lo.x, Lo.y);
                Io.aim = Math.atan2(t.y - e.y, t.x - e.x)
            }
        }
        let i = {
            ...Io,
            fire: !No && !is && (Io.fire || G.fire || e < Ro),
            crouch: !No && !is && (fs.has(`KeyC`) || rs)
        };
        i.fire && !G.aiming && e < Ro && zo !== null && (i.aim = Io.aim = zo);
        for (let e of ps)
            i[e] = !0;
        if ((No || is) && (i.left = i.right = i.jet = i.fire = !1),
        V && !ls) {
            if (e - Do > 500) {
                ps.clear();
                for (let e of [`swap`, `grenade`, `melee`, `pickup`, `grenadeCycle`])
                    i[e] = !1
            }
            if (Jo.age(e) > 1e3 && Object.assign(i, ce()),
            (e - Do >= 1e3 / 30 || Cu(i) !== yu && e - Do >= 1e3 / 60) && (!W.has(`resilient-v1`) || Yo.ready(e))) {
                let t = Eo
                  , n = W.has(`resilient-v1`) ? {
                    type: `control`,
                    s: t,
                    b: c(i),
                    a: Math.round(i.aim * 1e3) / 1e3,
                    t: z.tick,
                    m: z.matchId ?? ``
                } : {
                    type: `input`,
                    input: i,
                    seq: t
                };
                Fl(n) && (W.has(`resilient-v1`) && Yo.sent(t, JSON.stringify(n).length, e),
                Eo++,
                Ou(t, i),
                Vo++,
                Do = e,
                ps.clear(),
                i.fire && (Ro = 0,
                zo = null))
            }
            Il(),
            ku(t)
        } else if (!jo && !ls && !H) {
            Jt(z, B, i),
            Mu += n;
            let e = !1;
            for (; Mu >= 1 / 60; )
                qn(z, 1 / 60),
                Mu -= 1 / 60,
                e = !0;
            e && (ps.clear(),
            i.fire && (Ro = 0,
            zo = null))
        }
        if (!jo) {
            P.update(z.events, B);
            let t = po(z.events, B, xo);
            xo = t.seen,
            t.death && (So = t.death),
            bo.play(t.cues, e)
        }
        Nu += n,
        Nu > .08 && (mu(),
        Nu = 0),
        z.phase === `finished` && R === `playing` && hl()
    }
    if (R === `playing` || R === `results`) {
        let t = z;
        if (V && R === `playing` && es.length < 2 && (t = {
            ...z,
            players: z.players.map(e => e.id === B ? Au(e) : e)
        }),
        V && R === `playing` && es.length >= 2) {
            let n = e - Jo.delay
              , r = es.findIndex(e => e.at >= n);
            r < 1 && (r = es.length - 1);
            let i = es[r - 1]
              , a = es[r]
              , o = Math.max(0, Math.min(1, (n - i.at) / (a.at - i.at || 50)))
              , s = new Map(i.world.players.map(e => [e.id, e]));
            t = {
                ...z,
                players: z.players.map(e => {
                    if (e.id === B)
                        return Au(e);
                    let t = s.get(e.id)
                      , n = a.world.players.find(t => t.id === e.id);
                    if (!t || !n || Math.hypot(n.x - t.x, n.y - t.y) > 180)
                        return e;
                    let r = Math.atan2(Math.sin(n.aim - t.aim), Math.cos(n.aim - t.aim));
                    return {
                        ...e,
                        x: t.x + (n.x - t.x) * o,
                        y: t.y + (n.y - t.y) * o,
                        aim: t.aim + r * o
                    }
                }
                )
            }
        }
        yo.render(t, B, jo || R === `results` ? 0 : n),
        vu = t
    }
    if (Il(),
    V && H && e - Oo > 2e3 && (Fl({
        type: `ping`,
        time: e
    }),
    Oo = e),
    V && H && !ls && e - Zo > 8e3 && W.has(`resilient-v1`)) {
        $o.forcedReconnects++;
        let e = To;
        e && (e.onclose = null,
        e.close()),
        V = !1,
        Pl()
    }
    let r = R === `playing` && !jo ? z.players.find(e => e.id === B) : void 0;
    P.jet(!!r && r.jetting && r.hp > 0, r?.fuel ?? 100),
    yo.setScope(R === `playing` && !No ? ts : 1),
    requestAnimationFrame(Pu)
}
var Fu = (new URLSearchParams(location.search).get(`room`) ?? ``).toUpperCase().replace(/[^A-Z0-9]/g, ``).slice(0, 5);
function Iu() {
    let e = document.getElementById(`room-code`);
    e && Fu && (e.value = Fu)
}
Fu && (wo = `online`),
Q(),
r();
var Lu = ``;
try {
    Lu = sessionStorage.getItem(Al) || ``
} catch {}
cs && (!Fu || !Lu || Lu === Fu) ? (Iu(),
Pl(!0)) : Fu && (Iu(),
zl()),
requestAnimationFrame(Pu),
Object.defineProperty(window, "__JETPACK__", {
    value: () => ({
        screen: R,
        page: wo,
        online: V,
        localId: B,
        room: H,
        world: structuredClone(z),
        snapshotCount: Bo,
        sentInputs: Vo,
        net: {
            ...Wo,
            seconds: Wo.since ? (performance.now() - Wo.since) / 1e3 : 0,
            avgSnapshot: Wo.snapshots ? Math.round(Wo.snapshotBytes / Wo.snapshots) : 0,
            lean: {
                ...Ho.stats,
                events: Ho.ready ? z.events.length : 0
            }
        },
        netError: Fo,
        networkHealth: {
            ping: ko,
            ...Jo.stats,
            age: Jo.age(performance.now()),
            buffered: To?.bufferedAmount ?? 0,
            ...$o,
            inputHz: Yo.hz,
            input: {
                ...Yo.stats
            }
        },
        paused: jo,
        resuming: ls,
        features: [...W],
        chat: ds.length,
        zoom: ts,
        vote: H?.vote ?? null,
        prediction: {
            active: !!$.state,
            x: $.state ? $.state.x + $.offsetX : null,
            y: $.state ? $.state.y + $.offsetY : null,
            pending: $.pending.length,
            ack: $.ack,
            error: $.error,
            errorAvg: $.errorAvg,
            offset: Math.hypot($.offsetX, $.offsetY),
            corrections: $.corrections,
            snaps: $.snaps
        },
        touchInput: {
            ...G
        },
        localInput: {
            ...Io
        },
        touchControls: {
            ...I.controls
        }
    }),
    writable: !1
});

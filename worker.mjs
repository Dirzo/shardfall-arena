const BACKEND = "https://shardfall-online-zrs2.onrender.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      const upgrade = (request.headers.get("Upgrade") || "").toLowerCase();
      if (upgrade !== "websocket") {
        return new Response("Expected WebSocket upgrade", { status: 426 });
      }

      const upstream = new URL(BACKEND + "/ws");
      upstream.search = url.search;
      return fetch(upstream.toString(), request);
    }

    if (url.pathname === "/health") {
      return fetch(BACKEND + "/health", {
        headers: { "User-Agent": "Shardfall-Cloudflare-Worker" },
      });
    }

    return env.ASSETS.fetch(request);
  },
};

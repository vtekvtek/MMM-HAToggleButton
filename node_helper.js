const NodeHelper = require("node_helper");

async function haFetch({ haUrl, token, path, method = "GET", body }) {
  const url = haUrl.replace(/\/$/, "") + path;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {}

  if (!res.ok) {
    const msg =
      data?.message || data?.error || text || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }

  return data;
}

function domainFromEntity(entityId) {
  return String(entityId || "").split(".")[0] || "";
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = NodeHelper.create({
  start() {
    this.haUrl = null;
    this.token = null;
    this.entities = [];
    this.timer = null;

    console.log("[MMM-HAToggleButton] node_helper started");
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "HA_INIT_MULTI") {
      this.haUrl = payload?.haUrl || null;
      this.token = payload?.token || null;
      this.entities = Array.isArray(payload?.entities) ? payload.entities : [];

      console.log(
        "[MMM-HAToggleButton] init entities:",
        this.entities.map((e) => e.entityId).filter(Boolean)
      );

      this._clearTimer();
      this._pollAll();
      this.timer = setInterval(
        () => this._pollAll(),
        payload?.updateInterval || 5000
      );
    }

    if (notification === "HA_TOGGLE_ENTITY") {
      const entityId = payload?.entityId;
      console.log("[MMM-HAToggleButton] toggle requested:", entityId);
      this._toggle(entityId);
    }
  },

  async _pollAll() {
    if (!this.haUrl || !this.token || !this.entities.length) return;

    for (const ent of this.entities) {
      const entityId = ent?.entityId;
      if (!entityId) continue;
      await this._pollOne(entityId);
    }
  },

  async _pollOne(entityId) {
    if (!this.haUrl || !this.token || !entityId) return;

    try {
      const data = await haFetch({
        haUrl: this.haUrl,
        token: this.token,
        path: `/api/states/${entityId}`,
        method: "GET",
      });

      this.sendSocketNotification("HA_MULTI_STATE", {
        entityId,
        state: data?.state || null,
      });

      return data?.state || null;
    } catch (e) {
      this.sendSocketNotification("HA_MULTI_ERROR", {
        entityId,
        message: `State read failed for ${entityId}: ${e.message}`,
      });
      return null;
    }
  },

  // New: after toggle, keep refreshing until the state changes (or timeout)
  async _refreshUntilChanged(entityId, previousState) {
    const tries = 6;     // ~2.1s total
    const delayMs = 350;

    for (let i = 0; i < tries; i++) {
      await sleep(delayMs);
      const newState = await this._pollOne(entityId);

      // If we had a previous state and it changed, we can stop early
      if (previousState && newState && newState !== previousState) return;
    }
  },

  async _toggle(entityId) {
    if (!this.haUrl || !this.token || !entityId) return;

    const domain = domainFromEntity(entityId);
    if (!domain) {
      this.sendSocketNotification("HA_MULTI_ERROR", {
        entityId,
        message: `Bad entityId: ${entityId}`,
      });
      return;
    }

    // Capture current state so we can detect when it flips
    let prevState = null;
    try {
      const cur = await haFetch({
        haUrl: this.haUrl,
        token: this.token,
        path: `/api/states/${entityId}`,
        method: "GET",
      });
      prevState = cur?.state || null;
    } catch (e) {
      // still attempt toggle even if read fails
    }

    try {
      await haFetch({
        haUrl: this.haUrl,
        token: this.token,
        path: `/api/services/${domain}/toggle`,
        method: "POST",
        body: { entity_id: entityId },
      });

      // Instead of a single quick poll, retry until state flips
      this._refreshUntilChanged(entityId, prevState);
    } catch (e) {
      this.sendSocketNotification("HA_MULTI_ERROR", {
        entityId,
        message: `Toggle failed for ${entityId}: ${e.message}`,
      });
    }
  },

  _clearTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  },
});

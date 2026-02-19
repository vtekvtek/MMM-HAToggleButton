const NodeHelper = require("node_helper");

async function haFetch({ haUrl, token, path, method = "GET", body }) {
  const url = haUrl.replace(/\/$/, "") + path;

  const res = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) {}

  if (!res.ok) {
    const msg = data?.message || data?.error || text || `${res.status} ${res.statusText}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  return data;
}

module.exports = NodeHelper.create({
  start() {
    this.haUrl = null;
    this.token = null;
    this.entityId = null;
    this.timer = null;
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "HA_INIT") {
      this.haUrl = payload.haUrl;
      this.token = payload.token;
      this.entityId = payload.entityId;

      this._clearTimer();
      this._pollState();
      this.timer = setInterval(() => this._pollState(), payload.updateInterval || 5000);
    }

    if (notification === "HA_TOGGLE") {
      this._toggle(payload.entityId);
    }
  },

  async _pollState() {
    if (!this.haUrl || !this.token || !this.entityId) return;

    try {
      const data = await haFetch({
        haUrl: this.haUrl,
        token: this.token,
        path: `/api/states/${this.entityId}`,
        method: "GET"
      });

      this.sendSocketNotification("HA_STATE", { state: data?.state || null });
    } catch (e) {
      this.sendSocketNotification("HA_ERROR", {
        message: `State read failed: ${e.message}`,
        state: null
      });
    }
  },

  async _toggle(entityId) {
    if (!this.haUrl || !this.token) return;

    try {
      await haFetch({
        haUrl: this.haUrl,
        token: this.token,
        path: `/api/services/light/toggle`,
        method: "POST",
        body: { entity_id: entityId }
      });

      // after toggling, refresh quickly
      setTimeout(() => this._pollState(), 400);
    } catch (e) {
      this.sendSocketNotification("HA_ERROR", {
        message: `Toggle failed: ${e.message}`,
        state: null
      });
    }
  },

  _clearTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
});

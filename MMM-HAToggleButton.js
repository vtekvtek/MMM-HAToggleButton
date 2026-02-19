/* global Module */

Module.register("MMM-HAToggleButton", {
  defaults: {
    haUrl: "",
    token: "",

    // No entities here, must be provided in config.js
    entities: [],

    // UI
    showStateText: true,
    debounceMs: 400,

    // State refresh
    updateInterval: 5000
  },

  start() {
    this.states = {}; // entityId -> "on"/"off"/etc
    this.busy = {};   // entityId -> boolean
    this.lastTap = 0;

    // Only init if entities exist in config.js
    if (Array.isArray(this.config.entities) && this.config.entities.length > 0) {
      this.sendSocketNotification("HA_INIT_MULTI", {
        haUrl: this.config.haUrl,
        token: this.config.token,
        entities: this.config.entities,
        updateInterval: this.config.updateInterval
      });
    }
  },

  getStyles() {
    return ["MMM-HAToggleButton.css"];
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "haToggleWrap";

    const ents = Array.isArray(this.config.entities) ? this.config.entities : [];

    if (ents.length === 0) {
      // Render nothing if not configured
      wrapper.style.display = "none";
      return wrapper;
    }

    ents.forEach((ent) => {
      const entityId = ent.entityId;
      if (!entityId) return;

      const label = ent.label || entityId;

      const state = this.states[entityId];
      const isBusy = !!this.busy[entityId];

      const btn = document.createElement("div");
      btn.className = "haToggleButton";

      btn.classList.toggle("isOn", state === "on");
      btn.classList.toggle("isOff", state === "off");

      const title = document.createElement("div");
      title.className = "haLabel";
      title.textContent = label;

      const stateLine = document.createElement("div");
      stateLine.className = "haState";

      if (isBusy) {
        stateLine.textContent = "Updating…";
      } else if (state) {
        stateLine.textContent = this.config.showStateText ? `Now: ${state}` : "";
      } else {
        stateLine.textContent = "Loading…";
      }

      btn.appendChild(title);
      btn.appendChild(stateLine);

      btn.addEventListener("click", () => {
        const now = Date.now();
        if (now - this.lastTap < this.config.debounceMs) return;
        this.lastTap = now;

        if (this.busy[entityId]) return;

        this.busy[entityId] = true;
        this.updateDom();

        this.sendSocketNotification("HA_TOGGLE_ENTITY", { entityId });
      });

      wrapper.appendChild(btn);
    });

    return wrapper;
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "HA_MULTI_STATE") {
      const { entityId, state } = payload || {};
      if (entityId) {
        this.states[entityId] = state ?? null;
        this.busy[entityId] = false;
        this.updateDom();
      }
    }

    if (notification === "HA_MULTI_ERROR") {
      const { entityId, message } = payload || {};
      if (entityId) this.busy[entityId] = false;

      this.sendNotification("SHOW_ALERT", {
        title: "Home Assistant",
        message: message || "Unknown error"
      });

      this.updateDom();
    }
  }
});


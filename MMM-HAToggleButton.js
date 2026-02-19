/* global Module */

Module.register("MMM-HAToggleButton", {
  defaults: {
    haUrl: "",
    token: "",

    // Must be provided in config.js
    entities: [],

    // UI
    showStateText: true,
    debounceMs: 400,
    requestTimeoutMs: 5000,

    // State refresh
    updateInterval: 5000
  },

  start() {
    this.states = {}; // entityId -> "on"/"off"/etc
    this.busy = {};   // entityId -> boolean
    this.lastTapAt = 0;

    const ents = Array.isArray(this.config.entities) ? this.config.entities : [];
    const ok = !!this.config.haUrl && !!this.config.token && ents.length > 0;

    if (!ok) return;

    this.sendSocketNotification("HA_INIT_MULTI", {
      haUrl: this.config.haUrl,
      token: this.config.token,
      entities: ents,
      updateInterval: this.config.updateInterval
    });
  },

  getStyles() {
    return ["MMM-HAToggleButton.css"];
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "haToggleWrap";

    const ents = Array.isArray(this.config.entities) ? this.config.entities : [];
    const ok = !!this.config.haUrl && !!this.config.token && ents.length > 0;

    if (!ok) {
      wrapper.style.display = "none";
      return wrapper;
    }

    ents.forEach((ent) => {
      const entityId = ent?.entityId;
      if (!entityId) return;

      const label = ent?.label || entityId;
      const state = this.states[entityId];
      const isBusy = !!this.busy[entityId];

      const row = document.createElement("div");
      row.className = "haToggleRow";
      row.classList.toggle("isOn", String(state).toLowerCase() === "on");
      row.classList.toggle("isBusy", isBusy);

      const btn = document.createElement("div");
      btn.className = "haToggleButton";

      const titleWrap = document.createElement("div");
      titleWrap.className = "haTitleWrap";

      const title = document.createElement("div");
      title.className = "haLabel";
      title.textContent = label;

      if (isBusy) {
      const updating = document.createElement("span");
      updating.className = "haUpdating";
      updating.textContent = " Updating…";
      title.appendChild(updating);
      }

      titleWrap.appendChild(title);

      const meta = document.createElement("div");
      meta.className = "haMeta";

      const sw = document.createElement("div");
      sw.className = "haSwitch";

      const knob = document.createElement("div");
      knob.className = "haKnob";
      sw.appendChild(knob);

      meta.appendChild(sw);

      if (!isBusy && this.config.showStateText) {
      const stateLine = document.createElement("div");
      stateLine.className = "haState";
      stateLine.textContent = state ? `Now: ${state}` : "Loading…";
      meta.appendChild(stateLine);
      }  

      btn.appendChild(titleWrap);
      btn.appendChild(meta);


      btn.addEventListener("click", () => {
        const now = Date.now();
        if (now - this.lastTapAt < this.config.debounceMs) return;
        this.lastTapAt = now;

        if (this.busy[entityId]) return;

        this.busy[entityId] = true;
        this.updateDom();

        this.sendSocketNotification("HA_TOGGLE_ENTITY", { entityId });

        setTimeout(() => {
          if (this.busy[entityId]) {
            this.busy[entityId] = false;
            this.sendNotification("SHOW_ALERT", {
              title: "Home Assistant",
              message: `No response toggling ${label}, check pm2 logs`
            });
            this.updateDom();
          }
        }, this.config.requestTimeoutMs);
      });

      row.appendChild(btn);
      wrapper.appendChild(row);
    });

    return wrapper;
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "HA_MULTI_STATE") {
      const entityId = payload?.entityId;
      if (!entityId) return;

      this.states[entityId] = payload?.state ?? null;
      this.busy[entityId] = false;
      this.updateDom();
    }

    if (notification === "HA_MULTI_ERROR") {
      const entityId = payload?.entityId;
      if (entityId) this.busy[entityId] = false;

      this.sendNotification("SHOW_ALERT", {
        title: "Home Assistant",
        message: payload?.message || "Unknown error"
      });

      this.updateDom();
    }
  }
});



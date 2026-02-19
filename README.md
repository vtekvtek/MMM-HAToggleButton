MMM-HAToggleButton
A clean, minimal Home Assistant toggle module for MagicMirror².
This module allows you to control multiple Home Assistant entities directly from your MagicMirror using a modern, touch-friendly wall panel style interface.
Designed for dark UI layouts, it features:
-  Subtle toggle animation
-  Warm amber accent when ON
-  Inline "Updating…" feedback
-  Multi-entity support
-  Domain-aware toggle handling
-  Lightweight REST-based integration

Features
Toggle multiple Home Assistant entities
Works with:
-  light.*
-  switch.*
-  input_boolean.*
Automatically determines service domain from entity ID
Immediate state refresh after toggle
Background polling to keep state synced
Clean black UI aesthetic
Designed for touch screens

Installation
- Clone into your MagicMirror modules directory:
```js
cd ~/MagicMirror/modules
git clone https://github.com/vtekvtek/MMM-HAToggleButton.git
npm install
```

Configuration
Add the module to your config.js:
```js
{
  module: "MMM-HAToggleButton",
  position: "bottom_right",
  config: {
    haUrl: "http://xxx.xxx.xxx.xxx:8123",
    token: "YOUR_LONG_LIVED_TOKEN",
    entities: [
      { entityId: "light.office", label: "Office" },
      { entityId: "light.kitchen", label: "Kitchen" },
      { entityId: "switch.lamp", label: "Lamp" }
    ],
    updateInterval: 900000,
    showStateText: true
  }
},
```

| Option             | Type    | Default | Description                         |
| ------------------ | ------- | ------- | ----------------------------------- |
| `haUrl`            | string  | `""`    | Home Assistant URL                  |
| `token`            | string  | `""`    | Long-lived access token             |
| `entities`         | array   | `[]`    | List of entities to display         |
| `updateInterval`   | number  | `900000`  | Poll interval in milliseconds, 15 min default      |
| `showStateText`    | boolean | `true`  | Show small state text under toggle, to show ON or OFF  |
| `debounceMs`       | number  | `400`   | Prevent rapid double taps           |
| `requestTimeoutMs` | number  | `5000`  | Safety timeout for backend response |

Supported Entity Domains
This module uses the /api/services/<domain>/toggle endpoint.
Fully supported:
-  light
-  switch
-  input_boolean
Other domains may require customization.



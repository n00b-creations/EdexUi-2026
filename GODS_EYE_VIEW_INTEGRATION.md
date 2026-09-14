# God's Eye View Integration into EdexUi-2026

## Overview

This document outlines the integration of **God's Eye View** (a photorealistic 3D geospatial intelligence globe) into EdexUi-2026 as an operational module accessible via a dedicated terminal tab.

**God's Eye View features:**
- Photorealistic 3D globe with live aircraft, ships, satellites, earthquakes, CCTV cameras, and traffic
- Voice control via OpenAI Realtime API
- Multiple visualization modes (CRT, NVG, FLIR thermal, Noir, Snow)
- Cockpit mode for tracked entities
- Geospatial annotation (drawing routes, measuring distances)
- Real-time tracking of 11,000+ aircraft, thousands of ships, 838+ satellites

---

## Integration Architecture

### Module Structure

```
src/
  classes/
    geospatialGlobe.class.js      # Main God's Eye View integration wrapper
  assets/
    js/
      gevBridge.js                # Communication bridge between EdexUi and GEV
  gev/                            # God's Eye View submodule (git subtree/submodule)
    src/
    package.json
```

### How It Works

1. **Terminal Tab Integration**: A new shell tab (Tab 5 or higher) spawns the GEV iframe in `<pre id="terminal5">` style container
2. **IPC Bridge**: Electron IPC channels (`gev-command`, `gev-response`) relay commands between EdexUi and GEV
3. **Shared Settings**: Voice API key, map preferences flow through EdexUi's settings system
4. **UI Coexistence**: The 3D globe renders in a contained canvas; EdexUi's HUD and terminal remain accessible

---

## Step 1: Add Dependencies

### Update `src/package.json`

Add God's Eye View dependencies to the app's main Node.js context:

```json
{
  "dependencies": {
    "cesium": "^1.124.0",
    "satellite.js": "^6.0.2",
    "@mapbox/vector-tile": "^3.0.0",
    "egm96-universal": "^1.1.1"
  },
  "devDependencies": {
    "vite-plugin-cesium": "^1.2.23"
  }
}
```

### Update root `package.json`

Add build script for God's Eye View:

```json
{
  "scripts": {
    "setup-gev": "cd src && npm install cesium satellite.js @mapbox/vector-tile egm96-universal vite-plugin-cesium"
  }
}
```

---

## Step 2: Create Geospatial Globe Wrapper Class

### File: `src/classes/geospatialGlobe.class.js`

```javascript
// Wrapper for God's Eye View integration into EdexUi-2026
class GeospatialGlobe {
    constructor(opts = {}) {
        this.parentId = opts.parentId || "gev-container";
        this.ipc = require("electron").ipcRenderer;
        this.isReady = false;
        this.viewer = null;
        this.layers = {
            flights: true,
            vessels: false,
            satellites: true,
            earthquakes: true,
            cctv: false,
            traffic: false,
            fires: false
        };

        this.onready = () => {};
        this.oncommand = () => {};
    }

    async init() {
        try {
            // Load God's Eye View HTML
            const gevHtml = await this._loadGevTemplate();
            const parent = document.getElementById(this.parentId);
            if (!parent) {
                console.error(`[GEV] Parent container #${this.parentId} not found`);
                return false;
            }

            parent.innerHTML = gevHtml;
            parent.style.width = "100%";
            parent.style.height = "100%";
            parent.style.overflow = "hidden";
            parent.style.position = "relative";

            // Set up IPC listeners for commands from EdexUi
            this.ipc.on("gev-command", (e, command, ...args) => {
                this._handleCommand(command, args);
            });

            this.isReady = true;
            this.onready();
            return true;
        } catch (error) {
            console.error("[GEV] Initialization failed:", error);
            return false;
        }
    }

    _loadGevTemplate() {
        return Promise.resolve(`
            <div id="gev-root" style="width:100%; height:100%; position:absolute; top:0; left:0;">
                <canvas id="cesium-canvas" style="width:100%; height:100%;"></canvas>
                <div id="gev-hud" style="position:absolute; top:10px; left:10px; color:#00ff00; font-family:monospace; font-size:11px; z-index:100;"></div>
                <div id="gev-voice-button" style="position:absolute; bottom:20px; right:20px; padding:10px 15px; background:#1a1a2e; border:2px solid #00ff00; color:#00ff00; cursor:pointer; z-index:100; font-family:monospace;">🎤 VOICE</div>
                <div id="gev-layer-panel" style="position:absolute; bottom:80px; right:20px; background:#0f0f23; border:2px solid #00ff00; padding:10px; z-index:100; display:none; max-width:250px; max-height:300px; overflow-y:auto;">
                    <div style="color:#00ff00; font-weight:bold; margin-bottom:8px;">LAYERS</div>
                </div>
            </div>
        `);
    }

    _handleCommand(command, args) {
        switch(command) {
            case "toggle-layer":
                this.toggleLayer(args[0]);
                break;
            case "track-entity":
                this.trackEntity(args[0], args[1]); // type, id
                break;
            case "switch-style":
                this.switchStyle(args[0]); // style: normal, nvg, flir, crt
                break;
            case "cockpit-mode":
                this.enterCockpitMode(args[0]); // entity id
                break;
            case "voice-command":
                this.processVoiceCommand(args[0]); // command text
                break;
            case "reset-view":
                this.resetGlobalView();
                break;
            default:
                console.warn(`[GEV] Unknown command: ${command}`);
        }
    }

    toggleLayer(layerName) {
        if (layerName in this.layers) {
            this.layers[layerName] = !this.layers[layerName];
            this.ipc.send("log", "info", `[GEV] Layer '${layerName}' ${this.layers[layerName] ? "enabled" : "disabled"}`);
            // Relay to GEV iframe
            this._sendToGev({ action: "toggleLayer", layer: layerName, enabled: this.layers[layerName] });
        }
    }

    trackEntity(type, id) {
        console.log(`[GEV] Tracking ${type}:${id}`);
        this._sendToGev({ action: "track", type, id });
    }

    switchStyle(styleName) {
        const styles = ["normal", "nvg", "flir", "crt", "noir", "snow"];
        if (styles.includes(styleName)) {
            this._sendToGev({ action: "setStyle", style: styleName });
        }
    }

    enterCockpitMode(entityId) {
        this._sendToGev({ action: "cockpitMode", entityId });
    }

    processVoiceCommand(commandText) {
        this._sendToGev({ action: "voiceCommand", command: commandText });
    }

    resetGlobalView() {
        this._sendToGev({ action: "resetView" });
    }

    _sendToGev(payload) {
        const gevWindow = document.getElementById("gev-root");
        if (gevWindow && gevWindow.contentWindow) {
            gevWindow.contentWindow.postMessage(payload, "*");
        }
    }

    focus() {
        const canvas = document.getElementById("cesium-canvas");
        if (canvas) canvas.focus();
    }

    dispose() {
        const root = document.getElementById("gev-root");
        if (root) root.remove();
        this.isReady = false;
    }
}

module.exports = { GeospatialGlobe };
```

---

## Step 3: Create Integration Bridge

### File: `src/assets/js/gevBridge.js`

```javascript
/**
 * Bridge between EdexUi-2026 and God's Eye View
 * Handles command routing, layer management, and state synchronization
 */

window.gevBridge = {
    iframe: null,
    gevReady: false,

    /**
     * Initialize communication with God's Eye View
     */
    init(parentId = "gev-container") {
        return new Promise((resolve) => {
            // Listen for messages from GEV iframe
            window.addEventListener("message", (event) => {
                if (event.origin !== window.location.origin) return;
                window.gevBridge._handleGevMessage(event.data);
            });

            // Initialize geospatial globe
            window.gevReady = true;
            resolve(true);
        });
    },

    /**
     * Route commands from EdexUi to GEV
     */
    sendCommand(command, ...args) {
        if (!window.gevReady) {
            console.warn("[GEV Bridge] GEV not ready");
            return false;
        }

        const payload = { command, args };
        const gevWindow = document.getElementById("gev-root");
        if (gevWindow && gevWindow.contentWindow) {
            gevWindow.contentWindow.postMessage(payload, "*");
            return true;
        }
        return false;
    },

    /**
     * Handle inbound messages from GEV
     */
    _handleGevMessage(data) {
        const { type, payload } = data;
        switch(type) {
            case "gev-ready":
                console.log("[GEV] Bridge ready");
                window.gevReady = true;
                break;
            case "entity-selected":
                window.gevBridge._handleEntitySelection(payload);
                break;
            case "layer-toggled":
                console.log(`[GEV] Layer toggled: ${payload.layer}`);
                break;
            case "voice-input":
                if (window.voiceAssistant) {
                    window.voiceAssistant.processCommand(payload.text);
                }
                break;
        }
    },

    _handleEntitySelection(entity) {
        // Optionally update EdexUi HUD or status bar
        if (window.mods && window.mods.sysinfo) {
            window.mods.sysinfo.update({
                tracked: `${entity.type}: ${entity.label}`,
                lat: entity.lat,
                lon: entity.lon,
                altitude: entity.altitude
            });
        }
    },

    /**
     * Quick command helpers
     */
    toggleLayer(layer) {
        return this.sendCommand("toggle-layer", layer);
    },

    trackEntity(type, id) {
        return this.sendCommand("track-entity", type, id);
    },

    setStyle(style) {
        return this.sendCommand("switch-style", style);
    },

    enterCockpit(entityId) {
        return this.sendCommand("cockpit-mode", entityId);
    },

    voiceCommand(text) {
        return this.sendCommand("voice-command", text);
    },

    resetView() {
        return this.sendCommand("reset-view");
    }
};
```

---

## Step 4: Integrate into UI

### Update `src/ui.html`

Add God's Eye View to the tab system:

```html
<!-- In the shell tabs section, after the main terminal tabs -->
<ul id="main_shell_tabs">
    <li id="shell_tab0" onclick="window.focusShellTab(0);" class="active"><p>Main</p></li>
    <li id="shell_tab1" onclick="window.focusShellTab(1);"><p>1</p></li>
    <li id="shell_tab2" onclick="window.focusShellTab(2);"><p>2</p></li>
    <li id="shell_tab3" onclick="window.focusShellTab(3);"><p>3</p></li>
    <li id="shell_tab4" onclick="window.focusShellTab(4);"><p>4</p></li>
    <!-- NEW: God's Eye View tab -->
    <li id="shell_tab_gev" onclick="window.focusGeospatialTab();" style="background:#1a3a2e;"><p>🌍 GEV</p></li>
</ul>

<div id="main_shell_innercontainer">
    <pre id="terminal0" class="active"></pre>
    <pre id="terminal1"></pre>
    <pre id="terminal2"></pre>
    <pre id="terminal3"></pre>
    <pre id="terminal4"></pre>
    <!-- NEW: God's Eye View container -->
    <div id="gev-container" style="display:none; width:100%; height:100%;"></div>
</div>
```

---

## Step 5: Add UI Integration Functions

### Update `src/_renderer.js`

Add to the global scope after terminal initialization:

```javascript
// God's Eye View module
window.geospatialGlobe = null;
window.gevTabActive = false;

window.focusGeospatialTab = () => {
    if (!window.geospatialGlobe) {
        window.initGeospatialGlobe();
    }

    // Hide all terminal tabs
    for (let i = 0; i <= 4; i++) {
        const term = document.getElementById(`terminal${i}`);
        if (term) term.style.display = "none";
    }

    // Show GEV container
    const gevContainer = document.getElementById("gev-container");
    if (gevContainer) gevContainer.style.display = "block";

    // Update tab styling
    document.querySelectorAll("#main_shell_tabs li").forEach(el => {
        el.classList.remove("active");
    });
    document.getElementById("shell_tab_gev").classList.add("active");

    window.gevTabActive = true;
    window.audioManager.folder.play();
};

window.initGeospatialGlobe = async () => {
    const { GeospatialGlobe } = require("./classes/geospatialGlobe.class.js");

    if (!window.geospatialGlobe) {
        window.geospatialGlobe = new GeospatialGlobe({
            parentId: "gev-container"
        });

        window.geospatialGlobe.onready = () => {
            window.audioManager.granted.play();
            ipc.send("log", "info", "God's Eye View initialized and ready");
        };

        await window.geospatialGlobe.init();
    }
};

// Keyboard shortcuts for GEV when active
window.gevKeyboardShortcuts = (key) => {
    if (!window.gevTabActive) return;

    const keyMap = {
        "1": () => window.gevBridge.setStyle("normal"),
        "2": () => window.gevBridge.setStyle("nvg"),
        "3": () => window.gevBridge.setStyle("flir"),
        "4": () => window.gevBridge.setStyle("crt"),
        "5": () => window.gevBridge.setStyle("noir"),
        "6": () => window.gevBridge.setStyle("snow"),
        "f": () => window.gevBridge.toggleLayer("flights"),
        "s": () => window.gevBridge.toggleLayer("satellites"),
        "v": () => window.gevBridge.toggleLayer("vessels"),
        "e": () => window.gevBridge.toggleLayer("earthquakes"),
        "c": () => window.gevBridge.toggleLayer("cctv"),
        "r": () => window.gevBridge.resetView(),
        "Escape": () => window.focusShellTab(0)
    };

    if (key in keyMap) {
        keyMap[key]();
    }
};
```

---

## Step 6: Add Installation & Setup Instructions

### File: `GEV_SETUP.md`

```markdown
# God's Eye View Setup for EdexUi-2026

## Prerequisites

- Node.js 24.14.0+ or 26.x
- 4GB+ RAM (for 3D globe rendering)
- Internet connection (for live data feeds)

## Installation

### 1. Clone God's Eye View (as git submodule)

```bash
cd src
git submodule add https://github.com/bilawalsidhu/gods-eye-view.git gev
cd gev
npm ci
cd ../..
```

### 2. Install GEV dependencies in EdexUi

```bash
npm run setup-gev
```

### 3. Start the app

```bash
npm start
```

## Usage

### In EdexUi Terminal

1. **Open God's Eye View Tab**: Click the `🌍 GEV` tab in the terminal shell
2. **Keyboard Controls** (when GEV tab is active):
   - `1`–`6`: Switch visual styles (Normal, NVG, FLIR, CRT, Noir, Snow)
   - `F`: Toggle Flights layer
   - `S`: Toggle Satellites
   - `V`: Toggle Vessels (ships)
   - `E`: Toggle Earthquakes
   - `C`: Toggle CCTV cameras
   - `R`: Reset to global view
   - `Esc`: Return to main terminal

3. **Voice Commands** (requires OpenAI API key):
   - Enable in EdexUi Settings → Voice
   - Click GEV's 🎤 button
   - Say: *"Show me flights over New York"*
   - Or: *"Take me to LAX and enter cockpit mode"*

### Data Layers

- **Flights**: 11,000+ live aircraft (OpenSky, adsb.lol)
- **Vessels**: Thousands of ships worldwide (AISStream)
- **Satellites**: 838+ tracked objects + Starlink shell (CelesTrak)
- **Earthquakes**: Last 24 hours (USGS)
- **CCTV**: 3,400+ public cameras projected into 3D (Austin, London, California, etc.)
- **Fires**: Active NASA FIRMS detections
- **Traffic**: Simulated vehicles on roads (TomTom for live speeds)

## API Keys (Optional)

Add keys in EdexUi Settings → POWER UP:

| Key | Layer | Cost |
|-----|-------|------|
| **Cesium ion** (free) | Google 3D tiles, world terrain | Free tier for personal use |
| **Google Maps** | Direct 3D, place search | $7 per 1000 requests |
| **OpenAI** | Voice control, AI HUD | ~$0.01–0.05/min active |
| **AISStream** (free) | Live vessels | Free signup |
| **NASA FIRMS** (free) | Active fires | Free |
| **TomTom** (free tier) | Live traffic speeds | Free tier available |

## Troubleshooting

### GEV tab doesn't load

```bash
# Rebuild Cesium modules
cd src/gev
npm run build
cd ../..
npm start
```

### "Cesium is not defined"

Make sure `vite-plugin-cesium` is installed:
```bash
cd src && npm install vite-plugin-cesium
```

### Performance issues

- Disable layers you don't need
- Reduce detection density: `D` key → set to 25%
- Use simpler visual style (Normal instead of FLIR)

---

## Reference

- **God's Eye View Repo**: https://github.com/bilawalsidhu/gods-eye-view
- **EdexUi Terminal**: /editor_root/EdexUi-2026
```

---

## Step 7: Configuration

### File: `src/assets/config/gev-defaults.json`

```json
{
  "layers": {
    "flights": {
      "enabled": true,
      "source": "opensky+adsb.lol",
      "updateInterval": 15000,
      "detectionDensity": 50
    },
    "military": {
      "enabled": true,
      "source": "adsb.lol",
      "updateInterval": 15000
    },
    "vessels": {
      "enabled": false,
      "source": "aisstream",
      "updateInterval": 30000
    },
    "satellites": {
      "enabled": true,
      "source": "celestrak",
      "updateInterval": 60000
    },
    "earthquakes": {
      "enabled": true,
      "source": "usgs",
      "updateInterval": 300000
    },
    "cctv": {
      "enabled": false,
      "regions": ["austin", "london", "california"],
      "updateInterval": 5000
    },
    "traffic": {
      "enabled": false,
      "source": "tomtom",
      "updateInterval": 10000
    },
    "fires": {
      "enabled": false,
      "source": "nasa-firms",
      "updateInterval": 600000
    }
  },
  "display": {
    "style": "normal",
    "hudVisible": true,
    "detectionEnabled": true,
    "detectionDensity": 50,
    "terrainExaggeration": 1.0
  },
  "voice": {
    "enabled": false,
    "provider": "openai",
    "continuousListening": false
  },
  "basemap": {
    "primary": "esri-satellite",
    "alternatives": ["osm", "google-3d"],
    "terrain": "cesium-ion"
  }
}
```

---

## Implementation Summary

| File | Purpose |
|------|---------|
| `src/classes/geospatialGlobe.class.js` | Core GEV wrapper class |
| `src/assets/js/gevBridge.js` | IPC command bridge |
| `src/ui.html` | Tab UI & container div |
| `src/_renderer.js` | Tab switching & keyboard shortcuts |
| `GEV_SETUP.md` | Installation guide |
| `src/assets/config/gev-defaults.json` | Default layer & display config |

---

## Next Steps

1. **Clone the submodule** and test baseline functionality
2. **Add Vite configuration** for Cesium bundling
3. **Implement layer toggle UI** in EdexUi's panel system
4. **Connect voice assistant** to GEV commands
5. **Add telemetry display** to EdexUi's HUD when an entity is tracked

---

## Legal & Attribution

- **God's Eye View** is licensed under the MIT License
- Public data sources (OpenSky, USGS, CelesTrak, etc.) maintain their own attribution requirements
- See `SECURITY.md` in the GEV repo for responsible use guidelines


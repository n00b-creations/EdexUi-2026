/**
 * GeospatialGlobe - God's Eye View Integration for EdexUi-2026
 * 
 * Wrapper class that brings a photorealistic 3D geospatial intelligence globe
 * into EdexUi-2026 as an operational module accessible via terminal tabs.
 * 
 * Features:
 * - Live tracking of 11,000+ aircraft, ships, satellites, earthquakes, CCTV
 * - Real-time voice control via OpenAI
 * - Multiple visualization modes (CRT, NVG, FLIR thermal, Noir, Snow)
 * - Cockpit mode for tracked entities
 * - Geospatial annotation (routes, distances, boundaries)
 */

const path = require("path");
const fs = require("fs");

class GeospatialGlobe {
    constructor(opts = {}) {
        this.parentId = opts.parentId || "gev-container";
        this.port = opts.port || 4174; // Separate dev server port for GEV
        this.gevServerUrl = `http://localhost:${this.port}`;
        this.ipc = require("electron").ipcRenderer;
        this.isReady = false;
        this.isVisible = false;
        this.iframe = null;

        // Layer states
        this.layers = {
            flights: true,
            military: true,
            vessels: false,
            satellites: true,
            earthquakes: true,
            cctv: false,
            traffic: false,
            fires: false,
            radio: false,
            bikeshare: false,
            launches: false
        };

        // Display state
        this.displayState = {
            style: "normal", // normal, nvg, flir, crt, noir, snow
            hudVisible: true,
            detectionEnabled: true,
            detectionDensity: 50
        };

        // Callbacks
        this.onready = () => {};
        this.oncommand = () => {};
        this.onentityselected = () => {};

        // Load default configuration
        this._loadConfig();
    }

    /**
     * Initialize the geospatial globe
     */
    async init() {
        try {
            const parent = document.getElementById(this.parentId);
            if (!parent) {
                console.error(`[GEV] Parent container #${this.parentId} not found`);
                return false;
            }

            // Create iframe pointing to GEV dev server
            this.iframe = document.createElement("iframe");
            this.iframe.id = "gev-iframe";
            this.iframe.src = this.gevServerUrl;
            this.iframe.style.cssText = `
                width: 100%;
                height: 100%;
                border: none;
                position: absolute;
                top: 0;
                left: 0;
            `;

            parent.appendChild(this.iframe);
            parent.style.cssText = `
                width: 100%;
                height: 100%;
                overflow: hidden;
                position: relative;
                background: #000;
            `;

            // Wait for iframe to load and be ready
            await new Promise((resolve) => {
                const checkReady = () => {
                    try {
                        if (this.iframe.contentWindow && this.iframe.contentWindow.gevReady) {
                            resolve();
                        } else {
                            setTimeout(checkReady, 100);
                        }
                    } catch (e) {
                        setTimeout(checkReady, 100);
                    }
                };
                checkReady();
            });

            // Set up message communication
            window.addEventListener("message", (event) => {
                if (event.source !== this.iframe.contentWindow) return;
                this._handleIframeMessage(event.data);
            });

            // Set up IPC listeners
            this.ipc.on("gev-command", (e, command, ...args) => {
                this._handleCommand(command, args);
            });

            this.isReady = true;
            this.onready();

            this.ipc.send("log", "info", "[GEV] Geospatial globe initialized and ready");
            return true;
        } catch (error) {
            console.error("[GEV] Initialization failed:", error);
            this.ipc.send("log", "error", `[GEV] Init error: ${error.message}`);
            return false;
        }
    }

    /**
     * Load default configuration from file
     */
    _loadConfig() {
        try {
            const configPath = path.join(__dirname, "../assets/config/gev-defaults.json");
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
                
                if (config.layers) {
                    Object.assign(this.layers, Object.entries(config.layers).reduce((acc, [key, val]) => {
                        acc[key] = val.enabled ?? this.layers[key];
                        return acc;
                    }, {}));
                }

                if (config.display) {
                    Object.assign(this.displayState, config.display);
                }
            }
        } catch (error) {
            console.warn("[GEV] Could not load config:", error.message);
        }
    }

    /**
     * Handle messages from the GEV iframe
     */
    _handleIframeMessage(data) {
        const { type, payload } = data;

        switch (type) {
            case "gev-ready":
                console.log("[GEV] Iframe signaled ready");
                break;

            case "entity-selected":
                this._handleEntitySelection(payload);
                break;

            case "layer-toggled":
                console.log(`[GEV] Layer toggled: ${payload.layer} = ${payload.enabled}`);
                this.layers[payload.layer] = payload.enabled;
                break;

            case "style-changed":
                this.displayState.style = payload.style;
                break;

            case "voice-input":
                this._handleVoiceInput(payload.text);
                break;

            case "coordinates-captured":
                this._handleCoordinates(payload);
                break;

            default:
                console.log(`[GEV] Unknown message type: ${type}`);
        }
    }

    /**
     * Handle entity selection in the globe
     */
    _handleEntitySelection(entity) {
        console.log(`[GEV] Entity selected: ${entity.type}/${entity.id}`);
        this.onentityselected(entity);

        // If EdexUi has a telemetry display, update it
        if (window.mods && window.mods.sysinfo) {
            const telemetry = {
                entity: entity.label || entity.id,
                type: entity.type,
                lat: entity.lat?.toFixed(6),
                lon: entity.lon?.toFixed(6),
                altitude: entity.altitude ? `${entity.altitude.toFixed(0)}m` : "N/A",
                speed: entity.speed ? `${entity.speed.toFixed(1)} kt` : "N/A",
                heading: entity.heading ? `${entity.heading.toFixed(0)}°` : "N/A"
            };

            this.ipc.send("log", "info", `[GEV] Tracked: ${telemetry.entity} @ ${telemetry.lat}, ${telemetry.lon}`);
        }
    }

    /**
     * Handle voice input from the globe
     */
    _handleVoiceInput(text) {
        console.log(`[GEV] Voice input: "${text}"`);

        if (window.voiceAssistant && typeof window.voiceAssistant.processCommand === "function") {
            window.voiceAssistant.processCommand(text);
        }
    }

    /**
     * Handle coordinate capture (for annotations, routes, etc.)
     */
    _handleCoordinates(data) {
        console.log(`[GEV] Coordinates: ${data.type}`, data.coordinates);
    }

    /**
     * Route commands from EdexUi to the GEV iframe
     */
    _handleCommand(command, args) {
        switch (command) {
            case "toggle-layer":
                this.toggleLayer(args[0]);
                break;
            case "track-entity":
                this.trackEntity(args[0], args[1]);
                break;
            case "switch-style":
                this.switchStyle(args[0]);
                break;
            case "cockpit-mode":
                this.enterCockpitMode(args[0]);
                break;
            case "voice-command":
                this.processVoiceCommand(args[0]);
                break;
            case "reset-view":
                this.resetGlobalView();
                break;
            case "set-detection-density":
                this.setDetectionDensity(args[0]);
                break;
            default:
                console.warn(`[GEV] Unknown command: ${command}`);
        }
    }

    /**
     * Toggle a data layer on/off
     */
    toggleLayer(layerName) {
        if (!(layerName in this.layers)) {
            console.warn(`[GEV] Layer not found: ${layerName}`);
            return;
        }

        this.layers[layerName] = !this.layers[layerName];
        this._sendToGev({
            action: "toggleLayer",
            layer: layerName,
            enabled: this.layers[layerName]
        });

        this.ipc.send("log", "info", `[GEV] Layer '${layerName}' ${this.layers[layerName] ? "ON" : "OFF"}`);
    }

    /**
     * Track a specific entity (aircraft, ship, satellite, etc.)
     */
    trackEntity(type, id) {
        this._sendToGev({
            action: "track",
            type,
            id
        });
        this.ipc.send("log", "info", `[GEV] Tracking ${type}:${id}`);
    }

    /**
     * Switch visual style/sensor mode
     */
    switchStyle(styleName) {
        const validStyles = ["normal", "nvg", "flir", "crt", "noir", "snow"];
        if (!validStyles.includes(styleName)) {
            console.warn(`[GEV] Invalid style: ${styleName}`);
            return;
        }

        this.displayState.style = styleName;
        this._sendToGev({
            action: "setStyle",
            style: styleName
        });

        this.ipc.send("log", "info", `[GEV] Style: ${styleName.toUpperCase()}`);
    }

    /**
     * Enter cockpit/first-person mode for tracked entity
     */
    enterCockpitMode(entityId) {
        this._sendToGev({
            action: "cockpitMode",
            entityId
        });
        this.ipc.send("log", "info", `[GEV] Cockpit mode: ${entityId}`);
    }

    /**
     * Process a voice command
     */
    processVoiceCommand(commandText) {
        this._sendToGev({
            action: "voiceCommand",
            command: commandText
        });
    }

    /**
     * Reset view to global
     */
    resetGlobalView() {
        this._sendToGev({
            action: "resetView"
        });
        this.ipc.send("log", "info", "[GEV] Reset to global view");
    }

    /**
     * Set detection overlay density
     */
    setDetectionDensity(percentage) {
        if (percentage < 0 || percentage > 100) {
            console.warn("[GEV] Detection density must be 0-100");
            return;
        }

        this.displayState.detectionDensity = percentage;
        this._sendToGev({
            action: "setDetectionDensity",
            density: percentage
        });

        this.ipc.send("log", "info", `[GEV] Detection density: ${percentage}%`);
    }

    /**
     * Send message to GEV iframe
     */
    _sendToGev(payload) {
        if (!this.iframe || !this.iframe.contentWindow) {
            console.warn("[GEV] Iframe not ready");
            return;
        }

        try {
            this.iframe.contentWindow.postMessage(payload, "*");
        } catch (error) {
            console.error("[GEV] Failed to send message:", error);
        }
    }

    /**
     * Focus the GEV container
     */
    focus() {
        if (this.iframe) {
            this.iframe.focus();
        }
    }

    /**
     * Dispose and cleanup
     */
    dispose() {
        if (this.iframe) {
            this.iframe.remove();
            this.iframe = null;
        }
        this.isReady = false;
        this.isVisible = false;
    }

    /**
     * Get current layer status
     */
    getLayerStatus() {
        return JSON.parse(JSON.stringify(this.layers));
    }

    /**
     * Get current display state
     */
    getDisplayState() {
        return JSON.parse(JSON.stringify(this.displayState));
    }

    /**
     * Set all layers to a preset
     */
    applyPreset(presetName) {
        const presets = {
            "live-contacts": {
                flights: true,
                military: true,
                vessels: false,
                satellites: false,
                earthquakes: true,
                cctv: false
            },
            "space-missions": {
                flights: false,
                satellites: true,
                launches: true,
                vessels: false,
                cctv: false
            },
            "environmental": {
                earthquakes: true,
                fires: true,
                vessels: false,
                flights: false
            },
            "urban-ops": {
                flights: true,
                cctv: true,
                traffic: true,
                vessels: false,
                satellites: false
            }
        };

        if (!(presetName in presets)) {
            console.warn(`[GEV] Preset not found: ${presetName}`);
            return false;
        }

        const preset = presets[presetName];
        Object.assign(this.layers, preset);

        this._sendToGev({
            action: "applyPreset",
            preset: presetName,
            layers: preset
        });

        this.ipc.send("log", "info", `[GEV] Preset applied: ${presetName}`);
        return true;
    }
}

module.exports = { GeospatialGlobe };

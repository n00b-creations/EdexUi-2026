/**
 * GEV Bridge - Communication & Control Interface
 * 
 * Handles high-level routing between EdexUi-2026 and God's Eye View.
 * Provides a clean API for terminal shortcuts, voice commands, and layer control.
 */

window.gevBridge = {
    globe: null,
    isInitialized: false,
    listeners: [],

    /**
     * Initialize the bridge
     */
    async init(geospatialGlobeInstance) {
        this.globe = geospatialGlobeInstance;
        this.isInitialized = true;
        console.log("[GEV Bridge] Initialized");
        return true;
    },

    /**
     * Check if GEV is operational
     */
    isReady() {
        return this.isInitialized && this.globe && this.globe.isReady;
    },

    /**
     * Send a command to GEV
     */
    sendCommand(command, ...args) {
        if (!this.isReady()) {
            console.warn("[GEV Bridge] GEV not ready");
            return false;
        }

        if (typeof this.globe._handleCommand === "function") {
            this.globe._handleCommand(command, args);
            return true;
        }
        return false;
    },

    /**
     * Keyboard shortcut handlers
     */
    keyboard: {
        "1": () => window.gevBridge.setStyle("normal"),
        "2": () => window.gevBridge.setStyle("nvg"),
        "3": () => window.gevBridge.setStyle("flir"),
        "4": () => window.gevBridge.setStyle("crt"),
        "5": () => window.gevBridge.setStyle("noir"),
        "6": () => window.gevBridge.setStyle("snow"),
        "f": () => window.gevBridge.toggleLayer("flights"),
        "F": () => window.gevBridge.toggleLayer("flights"),
        "m": () => window.gevBridge.toggleLayer("military"),
        "M": () => window.gevBridge.toggleLayer("military"),
        "v": () => window.gevBridge.toggleLayer("vessels"),
        "V": () => window.gevBridge.toggleLayer("vessels"),
        "s": () => window.gevBridge.toggleLayer("satellites"),
        "S": () => window.gevBridge.toggleLayer("satellites"),
        "e": () => window.gevBridge.toggleLayer("earthquakes"),
        "E": () => window.gevBridge.toggleLayer("earthquakes"),
        "c": () => window.gevBridge.toggleLayer("cctv"),
        "C": () => window.gevBridge.toggleLayer("cctv"),
        "t": () => window.gevBridge.toggleLayer("traffic"),
        "T": () => window.gevBridge.toggleLayer("traffic"),
        "x": () => window.gevBridge.toggleLayer("fires"),
        "X": () => window.gevBridge.toggleLayer("fires"),
        "r": () => window.gevBridge.resetView(),
        "R": () => window.gevBridge.resetView(),
        "h": () => window.gevBridge.toggleHud(),
        "H": () => window.gevBridge.toggleHud(),
        "d": () => window.gevBridge.cycleDetectionDensity(),
        "D": () => window.gevBridge.cycleDetectionDensity()
    },

    /**
     * Handle keyboard input
     */
    handleKeyboardInput(key) {
        if (key in this.keyboard) {
            this.keyboard[key]();
            return true;
        }
        return false;
    },

    /**
     * Quick command methods
     */

    toggleLayer(layerName) {
        return this.sendCommand("toggle-layer", layerName);
    },

    trackEntity(type, id) {
        return this.sendCommand("track-entity", type, id);
    },

    setStyle(styleName) {
        return this.sendCommand("switch-style", styleName);
    },

    enterCockpit(entityId) {
        return this.sendCommand("cockpit-mode", entityId);
    },

    voiceCommand(text) {
        return this.sendCommand("voice-command", text);
    },

    resetView() {
        return this.sendCommand("reset-view");
    },

    setDetectionDensity(percentage) {
        return this.sendCommand("set-detection-density", percentage);
    },

    cycleDetectionDensity() {
        if (!this.isReady()) return false;
        const current = this.globe.displayState.detectionDensity;
        const next = current >= 75 ? 25 : current + 25;
        this.setDetectionDensity(next);
        return true;
    },

    toggleHud() {
        if (!this.isReady()) return false;
        this.globe.displayState.hudVisible = !this.globe.displayState.hudVisible;
        this.globe._sendToGev({
            action: "toggleHud",
            visible: this.globe.displayState.hudVisible
        });
        return true;
    },

    /**
     * Preset scenarios
     */
    applyPreset(presetName) {
        if (!this.isReady()) return false;
        return this.globe.applyPreset(presetName);
    },

    liveContacts() {
        return this.applyPreset("live-contacts");
    },

    spaceMissions() {
        return this.applyPreset("space-missions");
    },

    environmental() {
        return this.applyPreset("environmental");
    },

    urbanOps() {
        return this.applyPreset("urban-ops");
    },

    /**
     * Get status information
     */
    getStatus() {
        if (!this.isReady()) {
            return { ready: false, message: "GEV not initialized" };
        }

        return {
            ready: true,
            layers: this.globe.getLayerStatus(),
            display: this.globe.getDisplayState(),
            message: "GEV operational"
        };
    },

    /**
     * Register custom listener
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    },

    /**
     * Emit event
     */
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    },

    /**
     * Print help for GEV commands
     */
    printHelp() {
        const help = `
╔══════════════════════════════════════════════════════════════╗
║          God's Eye View - EdexUi Integration Help            ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║ KEYBOARD SHORTCUTS (when GEV tab active):                   ║
║                                                              ║
║   VISUAL STYLES:           LAYERS:                          ║
║   1 = Normal                F = Flights                      ║
║   2 = NVG (night vision)     M = Military                    ║
║   3 = FLIR (thermal)         V = Vessels (ships)             ║
║   4 = CRT                    S = Satellites                  ║
║   5 = Noir                   E = Earthquakes                 ║
║   6 = Snow                   C = CCTV cameras                ║
║                              T = Traffic                    ║
║   CONTROLS:                  X = Fires                       ║
║   R = Reset to global        H = Toggle HUD                 ║
║   D = Cycle detection (25%→50%→75%)                         ║
║   Esc = Return to terminal                                  ║
║                                                              ║
║ PRESETS:                                                     ║
║   gevBridge.liveContacts()   - Flights + military           ║
║   gevBridge.spaceMissions()  - Satellites + launches        ║
║   gevBridge.environmental()  - Earthquakes + fires          ║
║   gevBridge.urbanOps()       - CCTV + traffic + flights     ║
║                                                              ║
║ VOICE COMMANDS (requires OpenAI key):                       ║
║   "Show me flights over New York"                           ║
║   "Take me to LAX"                                          ║
║   "Enter cockpit mode"                                      ║
║   "Track the nearest aircraft"                              ║
║   "Draw a route from here to..."                            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
        `;
        console.log(help);
    }
};

// Auto-print help on first GEV tab access
window.gevBridgeHelpShown = false;

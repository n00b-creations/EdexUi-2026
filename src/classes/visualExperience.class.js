(function (global) {
  const QUALITY_LEVELS = ["off", "minimal", "balanced", "cinematic"];

  function VisualExperience(options) {
    this.options = options || {};
    this.widget = null;
    this.root = document.getElementById(this.options.containerId || "three-widget");
    this.status = document.getElementById(this.options.statusId || "visual-process-status");
    this.qualityControl = document.getElementById(this.options.qualityId || "visual-quality");
    this.motionControl = document.getElementById(this.options.motionId || "visual-reduce-motion");
    this._onVisibility = this._onVisibility.bind(this);
  }

  VisualExperience.prototype._settings = function () { return window.settings || {}; };
  VisualExperience.prototype._save = function () {
    if (window.edex && typeof window.edex.saveVisualPreferences === "function") {
      window.edex.saveVisualPreferences({
        visualQuality: window.settings.visualQuality || "balanced",
        reduceMotion: window.settings.reduceMotion === true
      }).catch(error => console.warn("Failed to save visual settings", error));
    } else if (typeof fs !== "undefined" && window.settingsFile) {
      fs.writeFileSync(window.settingsFile, JSON.stringify(window.settings, null, 4));
    }
  };
  VisualExperience.prototype._setStatus = function (process) {
    if (!this.status) return;
    if (!process) {
      this.status.textContent = "Select a process bar to inspect it.";
      return;
    }
    const cpu = Number(process.cpu ?? process.pcpu ?? 0).toFixed(1);
    const memory = Number(process.mem ?? 0).toFixed(1);
    this.status.textContent = `${process.name || "Unknown process"} · PID ${process.pid || "—"} · CPU ${cpu}% · MEM ${memory}%`;
  };
  VisualExperience.prototype._onSelection = function (process, activate) {
    this._setStatus(process);
    if (activate && process && typeof this.options.onActivate === "function") this.options.onActivate(process);
  };
  VisualExperience.prototype._onVisibility = function () {
    if (this.widget) this.widget.setPaused(document.hidden || this._settings().visualQuality === "off");
  };
  VisualExperience.prototype._onPerformanceFallback = function (quality) {
    if (this.qualityControl) this.qualityControl.value = quality;
    this._setStatus({name: "Visual quality reduced to preserve responsiveness", pid: "—", cpu: 0, mem: 0});
  };
  VisualExperience.prototype.setQuality = function (quality, persist, temporary) {
    const next = QUALITY_LEVELS.includes(quality) ? quality : "balanced";
    if (!temporary) window.settings.visualQuality = next;
    if (this.qualityControl) this.qualityControl.value = temporary ? (window.settings.visualQuality || "balanced") : next;
    if (next === "off") {
      if (this.widget) this.widget.setPaused(true);
      this.root.classList.add("is-hidden");
      this._setStatus(null);
    } else {
      this.root.classList.remove("is-hidden");
      if (!this.widget) this._createWidget(next);
      this.widget.setQuality(next);
      this.widget.setPaused(document.hidden);
    }
    if (persist) this._save();
  };
  VisualExperience.prototype._createWidget = function (quality) {
    this.widget = createThreeWidget(this.root.id, {
      quality,
      onSelection: this._onSelection.bind(this),
      onActivate: this.options.onActivate,
      onPerformanceFallback: this._onPerformanceFallback.bind(this)
    });
  };
  VisualExperience.prototype.start = function () {
    if (!this.root || typeof THREE === "undefined") return false;
    const settings = this._settings();
    const systemReduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reduceMotion = settings.reduceMotion === true || systemReduceMotion;
    const quality = reduceMotion ? "minimal" : (settings.visualQuality || "balanced");
    if (this.motionControl) {
      this.motionControl.checked = reduceMotion;
      this.motionControl.addEventListener("change", event => {
        window.settings.reduceMotion = event.target.checked;
        this.setQuality(event.target.checked ? "minimal" : (window.settings.visualQuality || "balanced"), true, event.target.checked);
      });
    }
    if (this.qualityControl) this.qualityControl.addEventListener("change", event => this.setQuality(event.target.value, true));
    document.addEventListener("visibilitychange", this._onVisibility);
    this.setQuality(quality, false, reduceMotion);
    return true;
  };
  VisualExperience.prototype.destroy = function () {
    document.removeEventListener("visibilitychange", this._onVisibility);
    if (this.widget) this.widget.destroy();
    this.widget = null;
  };

  global.createVisualExperience = function (options) { return new VisualExperience(options); };
})(window);

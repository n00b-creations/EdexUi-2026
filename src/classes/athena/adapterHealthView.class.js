class AthenaAdapterHealthView {
  constructor(root, api) {
    this.root = root;
    this.api = api;
  }

  async mount() {
    this.root.innerHTML = `
      <section class="athena-panel athena-health-panel">
        <header class="athena-panel__header">
          <span>ADAPTER HEALTH</span>
          <button class="athena-text-button" data-action="refresh">Refresh</button>
        </header>
        <div class="athena-health-list" data-role="health-list">
          <span class="athena-muted">Loading adapter status...</span>
        </div>
      </section>
    `;

    this.root.querySelector("[data-action='refresh']")
      .addEventListener("click", () => this.load());

    await this.load();
  }

  async load() {
    const list = this.root.querySelector("[data-role='health-list']");

    try {
      const result = await this.api.getAdapters();
      list.replaceChildren();

      for (const adapter of result.items || []) {
        list.appendChild(this.renderAdapter(adapter));
      }

      if (!result.items?.length) {
        list.innerHTML = `<span class="athena-muted">No adapters registered.</span>`;
      }
    } catch (error) {
      list.innerHTML = `
        <div class="athena-callout athena-callout--error">
          Adapter health unavailable: ${this.escape(error.message)}
        </div>
      `;
    }
  }

  renderAdapter(adapter) {
    const item = document.createElement("div");
    item.className = "athena-health-item";

    const state = adapter.state || "unknown";

    item.innerHTML = `
      <span class="athena-health-dot athena-health-dot--${this.escape(state)}"></span>
      <div class="athena-health-item__body">
        <strong>${this.escape(adapter.name)}</strong>
        <span>${this.escape(this.label(state))}</span>
      </div>
      ${
        adapter.setupHint
          ? `<button class="athena-help-button" title="${this.escape(adapter.setupHint)}">?</button>`
          : ""
      }
    `;

    return item;
  }

  label(state) {
    return {
      ready: "Ready",
      needs_setup: "Needs setup",
      disabled: "Disabled",
      error: "Error"
    }[state] || "Unknown";
  }

  escape(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}

if (typeof module !== "undefined") {
  module.exports = { AthenaAdapterHealthView };
}
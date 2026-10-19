class AthenaActivityFeed {
  constructor(root, api) {
    this.root = root;
    this.api = api;
  }

  async mount() {
    this.root.innerHTML = `
      <section class="athena-panel athena-activity-panel">
        <header class="athena-panel__header">
          <span>ACTIVITY</span>
          <button class="athena-text-button" data-action="refresh">Refresh</button>
        </header>
        <div class="athena-activity-list" data-role="activity-list">
          <span class="athena-muted">Loading activity...</span>
        </div>
      </section>
    `;

    this.root.querySelector("[data-action='refresh']")
      .addEventListener("click", () => this.load());

    await this.load();
  }

  async load() {
    const list = this.root.querySelector("[data-role='activity-list']");

    try {
      const result = await this.api.getEvents(40);
      list.replaceChildren();

      for (const event of result.items || []) {
        list.appendChild(this.renderEvent(event));
      }

      if (!result.items?.length) {
        list.innerHTML = `<span class="athena-muted">No activity recorded.</span>`;
      }
    } catch (error) {
      list.innerHTML = `
        <div class="athena-callout athena-callout--error">
          Activity unavailable: ${this.escape(error.message)}
        </div>
      `;
    }
  }

  renderEvent(event) {
    const item = document.createElement("article");
    item.className = `athena-activity-item athena-activity-item--${event.severity || "info"}`;

    const time = event.occurredAt
      ? new Date(event.occurredAt).toLocaleTimeString()
      : "--:--:--";

    item.innerHTML = `
      <time>${this.escape(time)}</time>
      <div>
        <strong>${this.escape(event.type || "event")}</strong>
        <p>${this.escape(event.message || "No message")}</p>
        <span>${this.escape(event.source || "unknown source")}</span>
      </div>
    `;

    return item;
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
  module.exports = { AthenaActivityFeed };
}
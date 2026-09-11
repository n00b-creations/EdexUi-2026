class AthenaToolDetailDialog {
  constructor(options = {}) {
    this.onClose = options.onClose;
    this.dialog = null;
  }

  open(tool) {
    this.close();

    this.dialog = document.createElement("dialog");
    this.dialog.className = "athena-dialog";

    const configured = tool.configured !== false;
    const setupHint = tool.setupHint || "No setup instructions are currently available.";

    this.dialog.innerHTML = `
      <form method="dialog" class="athena-dialog__panel">
        <header class="athena-dialog__header">
          <div>
            <span class="athena-eyebrow">ATHENA NEXUS / TOOL INSPECTOR</span>
            <h2>${this.escape(tool.name)}</h2>
          </div>
          <button class="athena-icon-button" value="cancel" aria-label="Close">
            ×
          </button>
        </header>

        <div class="athena-dialog__body">
          <div class="athena-detail-row">
            <span>Category</span>
            <strong>${this.escape(tool.category || "Uncategorized")}</strong>
          </div>

          <div class="athena-detail-row">
            <span>Risk class</span>
            <strong>${this.escape(tool.riskClass || "Unclassified")}</strong>
          </div>

          <div class="athena-detail-row">
            <span>Adapter</span>
            <strong>${this.escape(tool.adapter || "None")}</strong>
          </div>

          <div class="athena-detail-row">
            <span>Approval</span>
            <strong>${tool.requiresApproval ? "Required" : "Not required"}</strong>
          </div>

          <p class="athena-dialog__description">
            ${this.escape(tool.description || "No description available.")}
          </p>

          <div class="athena-dialog__section">
            <h3>Capabilities</h3>
            <div class="athena-chip-list">
              ${(tool.capabilities || tool.tags || [])
                .map((item) => `<span class="athena-chip">${this.escape(item)}</span>`)
                .join("") || "<span class='athena-muted'>None listed</span>"}
            </div>
          </div>

          <div class="athena-dialog__section">
            <h3>Status</h3>
            <div class="athena-callout athena-callout--${configured ? "ready" : "warning"}">
              <strong>${configured ? "Configured" : "Setup required"}</strong>
              <span>${this.escape(configured ? "Adapter is available for inspection." : setupHint)}</span>
            </div>
          </div>

          <div class="athena-dialog__section">
            <h3>Expected outputs</h3>
            <div class="athena-chip-list">
              ${(tool.expectedOutputs || [])
                .map((item) => `<span class="athena-chip">${this.escape(item)}</span>`)
                .join("") || "<span class='athena-muted'>Not specified</span>"}
            </div>
          </div>
        </div>

        <footer class="athena-dialog__footer">
          <button class="athena-button" value="cancel">Close</button>
          <button class="athena-button athena-button--primary" value="inspect" disabled>
            Request workflow
          </button>
        </footer>
      </form>
    `;

    this.dialog.addEventListener("close", () => {
      this.onClose?.();
      this.dialog?.remove();
      this.dialog = null;
    });

    document.body.appendChild(this.dialog);
    this.dialog.showModal();
  }

  close() {
    if (this.dialog?.open) {
      this.dialog.close();
    }
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
  module.exports = { AthenaToolDetailDialog };
}
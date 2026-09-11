function registerAthenaEvents() {
  window.addEventListener("athena:tool-selected", (event) => {
    window.dispatchEvent(
      new CustomEvent("athena:open-tool-dialog", {
        detail: event.detail
      })
    );
  });

  window.addEventListener("athena:service-state", (event) => {
    document.documentElement.dataset.athenaState =
      event.detail?.state || "unknown";
  });
}

if (typeof module !== "undefined") {
  module.exports = { registerAthenaEvents };
}
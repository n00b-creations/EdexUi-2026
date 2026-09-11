const { AthenaApiClient } = require("../classes/athena/apiClient.class");
const { AthenaToolCatalogView } = require("../classes/athena/toolCatalogView.class");
const { AthenaToolDetailDialog } = require("../classes/athena/toolDetailDialog.class");
const { AthenaAdapterHealthView } = require("../classes/athena/adapterHealthView.class");
const { AthenaActivityFeed } = require("../classes/athena/activityFeed.class");
const { registerAthenaEvents } = require("./athena.events");

async function mountAthena(root = document) {
  const api = new AthenaApiClient();
  const dialog = new AthenaToolDetailDialog();

  const catalogRoot = root.querySelector("#athena-tools-root");
  const healthRoot = root.querySelector("#athena-adapter-health");
  const activityRoot = root.querySelector("#athena-activity-feed");

  if (!catalogRoot) {
    throw new Error("Missing #athena-tools-root mount point");
  }

  registerAthenaEvents();

  const catalog = new AthenaToolCatalogView(catalogRoot, {
    api,
    onSelect: (tool) => dialog.open(tool)
  });

  await catalog.mount();

  if (healthRoot) {
    await new AthenaAdapterHealthView(healthRoot, api).mount();
  }

  if (activityRoot) {
    await new AthenaActivityFeed(activityRoot, api).mount();
  }

  window.athena = {
    api,
    catalog,
    dialog
  };

  return window.athena;
}

if (typeof module !== "undefined") {
  module.exports = { mountAthena };
}
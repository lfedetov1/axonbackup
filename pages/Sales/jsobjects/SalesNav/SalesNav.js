export default {
  async init() {
    if (!appsmith.store.salesTab) await storeValue("salesTab", "OVERVIEW");
    if (!appsmith.store.salesViewMode) await storeValue("salesViewMode", "LIST");
  },

  async openTab(tab) {
    await storeValue("salesTab", tab);
    await storeValue("salesViewMode", "LIST");
    await storeValue("selectedSalesDocumentId", null);
    await this.refreshOverview();
  },

  async newDocument(tab) {
    await storeValue("salesTab", tab);
    await storeValue("salesViewMode", "ADD");
    await storeValue("selectedSalesDocumentId", null);
  },

  async refreshOverview() {
    if (typeof GetSalesOverviewKpis !== "undefined") await GetSalesOverviewKpis.run();
    if (typeof GetSalesOverviewPipeline !== "undefined") await GetSalesOverviewPipeline.run();
    if (typeof GetSalesOverviewAlerts !== "undefined") await GetSalesOverviewAlerts.run();
  }
};
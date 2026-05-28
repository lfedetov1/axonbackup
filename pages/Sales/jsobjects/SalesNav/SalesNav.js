export default {
  async init() {
    if (!appsmith.store.salesTab) await storeValue("salesTab", "OVERVIEW");
    if (!appsmith.store.salesViewMode) await storeValue("salesViewMode", "LIST");
  },

  async openTab(tab) {
    await storeValue("salesTab", tab);
    await storeValue("salesViewMode", "LIST");
    await storeValue("selectedSalesDocumentId", null);

    await this.refreshForTab(tab);
  },

  async newDocument(tab) {
    await storeValue("salesTab", tab);
    await storeValue("salesViewMode", "ADD");
    await storeValue("selectedSalesDocumentId", null);
  },

  async openList() {
    await storeValue("salesViewMode", "LIST");
    await storeValue("selectedSalesDocumentId", null);
  },

  async runIfExists(action) {
    if (action && action.run) {
      return action.run();
    }

    return null;
  },

  async refreshOverview() {
    return Promise.all([
      this.runIfExists(typeof GetSalesOverviewKpis !== "undefined" ? GetSalesOverviewKpis : null),
      this.runIfExists(typeof GetSalesOverviewPipeline !== "undefined" ? GetSalesOverviewPipeline : null),
      this.runIfExists(typeof GetSalesOverviewAlerts !== "undefined" ? GetSalesOverviewAlerts : null),
      this.runIfExists(typeof GetSalesAnalyticsKpis !== "undefined" ? GetSalesAnalyticsKpis : null),
      this.runIfExists(typeof GetSalesAnalyticsHourly !== "undefined" ? GetSalesAnalyticsHourly : null),
      this.runIfExists(typeof GetSalesAnalyticsTrend !== "undefined" ? GetSalesAnalyticsTrend : null),
      this.runIfExists(typeof GetSalesAnalyticsTopProducts !== "undefined" ? GetSalesAnalyticsTopProducts : null),
      this.runIfExists(typeof GetSalesAnalyticsMix !== "undefined" ? GetSalesAnalyticsMix : null),
      this.runIfExists(typeof GetSalesAnalyticsAlerts !== "undefined" ? GetSalesAnalyticsAlerts : null)
    ]);
  },

  async refreshReports() {
    return Promise.all([
      this.runIfExists(typeof GetSalesReportPrintHeader !== "undefined" ? GetSalesReportPrintHeader : null),
      this.runIfExists(typeof GetSalesReportData !== "undefined" ? GetSalesReportData : null)
    ]);
  },

  async refreshForTab(tab = appsmith.store.salesTab) {
    if (tab === "OVERVIEW") return this.refreshOverview();
    if (tab === "REPORT_CENTER" || tab === "ANALYTICS") return this.refreshReports();

    return null;
  }
};
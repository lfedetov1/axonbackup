export default {
  async init() {
    if (!appsmith.store.salesReportType) await storeValue("salesReportType", "SALES_SUMMARY");
    if (!appsmith.store.salesReportDateFrom) await storeValue("salesReportDateFrom", moment().startOf("month").format("YYYY-MM-DD"));
    if (!appsmith.store.salesReportDateTo) await storeValue("salesReportDateTo", moment().format("YYYY-MM-DD"));

    await this.refresh();
  },

 async refresh() {
  if (typeof GetSalesReportPrintHeader !== "undefined") {
    await GetSalesReportPrintHeader.run();
  }

  if (typeof GetSalesReportData !== "undefined") {
    await GetSalesReportData.run();
  }
},

  async setFilters() {
    await storeValue("salesReportType", SalesReportCenterCustom.model.reportType || "SALES_SUMMARY");
    await storeValue("salesReportDateFrom", SalesReportCenterCustom.model.dateFrom || moment().startOf("month").format("YYYY-MM-DD"));
    await storeValue("salesReportDateTo", SalesReportCenterCustom.model.dateTo || moment().format("YYYY-MM-DD"));
    await this.refresh();
  }
};
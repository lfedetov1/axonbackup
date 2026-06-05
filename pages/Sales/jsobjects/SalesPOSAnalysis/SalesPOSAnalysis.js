export default {
  async load() {
    await GetSalesPOSAnalysisOverview.run();
    await GetSalesPOSAnalysisHourly.run();
    await GetSalesPOSAnalysisPayments.run();
    await GetSalesPOSAnalysisTopItems.run();
    await GetSalesPOSAnalysisCash.run();
  },

  model() {
    return {
      filters: {
        dateFrom: moment(POSAnalysisDateFrom.selectedDate || moment()).format("YYYY-MM-DD"),
        dateTo: moment(POSAnalysisDateTo.selectedDate || moment()).format("YYYY-MM-DD"),
        warehouse:
          POSAnalysisWarehouseSelect.selectedOptionLabel ||
          POSAnalysisWarehouseSelect.selectedOptionValue ||
          "All warehouses",
        register:
          POSAnalysisRegisterSelect.selectedOptionLabel ||
          POSAnalysisRegisterSelect.selectedOptionValue ||
          "All registers"
      },
      overview: GetSalesPOSAnalysisOverview.data?.[0] || {},
      hourly: GetSalesPOSAnalysisHourly.data || [],
      payments: GetSalesPOSAnalysisPayments.data || [],
      topItems: GetSalesPOSAnalysisTopItems.data || [],
      cash: GetSalesPOSAnalysisCash.data || [],
      printedAt: moment().format("DD.MM.YYYY HH:mm:ss"),
      printedBy: appsmith.store.username || ""
    };
  }
};
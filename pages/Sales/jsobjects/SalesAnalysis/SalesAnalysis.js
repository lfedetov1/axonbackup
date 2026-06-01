export default {
  async refresh() {
    await GetSalesAnalysisOverview.run();
    await GetSalesAnalysisDailyTrend.run();
    await GetSalesAnalysisHourlyTrend.run();
    await GetSalesAnalysisTopCustomers.run();
    await GetSalesAnalysisTopItems.run();
    await GetSalesAnalysisByWarehouse.run();
    await GetSalesAnalysisByPaymentMetho.run();
    await GetSalesAnalysisOpenDocuments.run();

    await storeValue("salesAnalysisData", {
      overview: GetSalesAnalysisOverview.data && GetSalesAnalysisOverview.data.length
        ? GetSalesAnalysisOverview.data[0]
        : {},
      dailyTrend: GetSalesAnalysisDailyTrend.data || [],
      hourlyTrend: GetSalesAnalysisHourlyTrend.data || [],
      topCustomers: GetSalesAnalysisTopCustomers.data || [],
      topItems: GetSalesAnalysisTopItems.data || [],
      byWarehouse: GetSalesAnalysisByWarehouse.data || [],
      byPaymentMethod: GetSalesAnalysisByPaymentMetho.data || [],
      openDocuments: GetSalesAnalysisOpenDocuments.data || [],
      dateFrom: moment(SalesAnalysisDateFrom.selectedDate || moment().startOf("month")).format("YYYY-MM-DD"),
      dateTo: moment(SalesAnalysisDateTo.selectedDate || moment()).format("YYYY-MM-DD"),
      warehouse:
        SalesAnalysisWarehouseSelect.selectedOptionLabel ||
        SalesAnalysisWarehouseSelect.selectedOptionValue ||
        "All Warehouses",
      printedAt: moment().format("DD.MM.YYYY HH:mm:ss"),
      printedBy: appsmith.store.username || ""
    });
  }
};
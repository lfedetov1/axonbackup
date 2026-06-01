export default {
  async runIfExists(queryName) {
    if (typeof globalThis[queryName] !== "undefined") {
      return globalThis[queryName].run();
    }

    return [];
  },

  dataOf(queryName) {
    if (typeof globalThis[queryName] !== "undefined") {
      return globalThis[queryName].data || [];
    }

    return [];
  },

  firstOf(queryName) {
    const data = this.dataOf(queryName);
    return data.length ? data[0] : {};
  },

  async refresh() {
    if (typeof GetSalesAnalysisOverview !== "undefined") {
      await GetSalesAnalysisOverview.run();
    }

    if (typeof GetSalesAnalysisDailyTrend !== "undefined") {
      await GetSalesAnalysisDailyTrend.run();
    }

    if (typeof GetSalesAnalysisHourlyTrend !== "undefined") {
      await GetSalesAnalysisHourlyTrend.run();
    }

    if (typeof GetSalesAnalysisTopCustomers !== "undefined") {
      await GetSalesAnalysisTopCustomers.run();
    }

    if (typeof GetSalesAnalysisTopItems !== "undefined") {
      await GetSalesAnalysisTopItems.run();
    }

    if (typeof GetSalesAnalysisByWarehouse !== "undefined") {
      await GetSalesAnalysisByWarehouse.run();
    }

    if (typeof GetSalesAnalysisByPaymentMetho !== "undefined") {
      await GetSalesAnalysisByPaymentMetho.run();
    }

    if (typeof GetSalesAnalysisOpenDocuments !== "undefined") {
      await GetSalesAnalysisOpenDocuments.run();
    }

    await storeValue("salesAnalysisData", {
      overview: this.firstOf("GetSalesAnalysisOverview"),
      dailyTrend: this.dataOf("GetSalesAnalysisDailyTrend"),
      hourlyTrend: this.dataOf("GetSalesAnalysisHourlyTrend"),
      topCustomers: this.dataOf("GetSalesAnalysisTopCustomers"),
      topItems: this.dataOf("GetSalesAnalysisTopItems"),
      byWarehouse: this.dataOf("GetSalesAnalysisByWarehouse"),
      byPaymentMethod: this.dataOf("GetSalesAnalysisByPaymentMethod"),
      openDocuments: this.dataOf("GetSalesAnalysisOpenDocuments"),
      dateFrom: moment(SalesAnalysisDateFrom.selectedDate || moment().startOf("month")).format("YYYY-MM-DD"),
      dateTo: moment(SalesAnalysisDateTo.selectedDate || moment()).format("YYYY-MM-DD"),
      warehouse:
        typeof SalesAnalysisWarehouseSelect !== "undefined"
          ? (
              SalesAnalysisWarehouseSelect.selectedOptionLabel ||
              (
                Number(appsmith.store.salesAnalysisWarehouseId || 0) === 0
                  ? "All Warehouses"
                  : `Warehouse #${appsmith.store.salesAnalysisWarehouseId}`
              )
            )
          : "All Warehouses",
      printedAt: moment().format("DD.MM.YYYY HH:mm:ss"),
      printedBy: appsmith.store.username || ""
    });
  }
};
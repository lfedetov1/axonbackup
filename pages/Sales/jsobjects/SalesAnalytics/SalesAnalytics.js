export default {
  async init() {
    if (!appsmith.store.salesAnalyticsDateFrom) {
      await storeValue("salesAnalyticsDateFrom", moment().format("YYYY-MM-DD"));
    }

    if (!appsmith.store.salesAnalyticsDateTo) {
      await storeValue("salesAnalyticsDateTo", moment().format("YYYY-MM-DD"));
    }

    await this.refresh();
  },

  async refresh() {
    const jobs = [
      GetSalesAnalyticsKpis,
      GetSalesAnalyticsHourly,
      GetSalesAnalyticsTrend,
      GetSalesAnalyticsTopProducts,
      GetSalesAnalyticsMix,
      GetSalesAnalyticsAlerts
    ];

    return Promise.all(jobs.filter(q => q && q.run).map(q => q.run()));
  },

  async setPeriod() {
    await storeValue("salesAnalyticsDateFrom", SalesOverviewCustom.model.dateFrom);
    await storeValue("salesAnalyticsDateTo", SalesOverviewCustom.model.dateTo);
    await this.refresh();
  }
};
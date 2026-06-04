export default {
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

  async runIfExists(queryName) {
    if (typeof globalThis[queryName] !== "undefined") {
      return globalThis[queryName].run();
    }

    return [];
  },

  async load() {
    return this.refresh();
  },

  async applyFromCustom(controls = {}) {
    if (controls.planId !== undefined) {
      await storeValue("businessPlanningPlanId", Number(controls.planId || 0));
    }

    if (controls.dateFrom) {
      await storeValue("businessPlanningDateFrom", controls.dateFrom);
    }

    if (controls.dateTo) {
      await storeValue("businessPlanningDateTo", controls.dateTo);
    }

    if (controls.warehouseId !== undefined) {
      await storeValue("businessPlanningWarehouseId", Number(controls.warehouseId || 0));
    }

    return this.refresh();
  },

  async refresh() {
    await this.runIfExists("ListBusinessPlanningPlans");
    await this.runIfExists("GetBusinessPlanningOverview");
    await this.runIfExists("GetBusinessPlanningDailyTrend");
    await this.runIfExists("GetBusinessPlanningBudgetUsage");
    await this.runIfExists("GetBusinessPlanningWorkforceImpact");
    await this.runIfExists("GetBusinessPlanningAlerts");

    await storeValue("businessPlanningData", {
      plans: this.dataOf("ListBusinessPlanningPlans"),
      overview: this.firstOf("GetBusinessPlanningOverview"),
      dailyTrend: this.dataOf("GetBusinessPlanningDailyTrend"),
      budgetUsage: this.dataOf("GetBusinessPlanningBudgetUsage"),
      workforceImpact: this.dataOf("GetBusinessPlanningWorkforceImpact"),
      alerts: this.dataOf("GetBusinessPlanningAlerts"),
      printedAt: moment().format("DD.MM.YYYY HH:mm:ss"),
      printedBy: appsmith.store.username || ""
    });
  }
};
export default {
  canChangeBranch() {
    return AppAccess.has("admin.access") || AppAccess.canViewAllWarehouses();
  },

  defaultBranchId() {
    const branches = ListDashboardPlanningBranches.data || [];
    if (this.canChangeBranch()) return "0";
    return String(branches[0]?.value || "0");
  },

  async init() {
    await ListDashboardPlanningBranches.run();

    await storeValue(
      "dashboardPlanningDateFrom",
      appsmith.store.dashboardPlanningDateFrom || moment().startOf("month").format("YYYY-MM-DD")
    );

    await storeValue(
      "dashboardPlanningDateTo",
      appsmith.store.dashboardPlanningDateTo || moment().format("YYYY-MM-DD")
    );

    await storeValue(
      "dashboardPlanningBranchId",
      appsmith.store.dashboardPlanningBranchId || this.defaultBranchId()
    );

    return this.refresh();
  },

  async applyFromCustom() {
    const model = PlanningDashboardCustom.model || {};

    await storeValue(
      "dashboardPlanningDateFrom",
      model.dateFrom || moment().startOf("month").format("YYYY-MM-DD")
    );

    await storeValue(
      "dashboardPlanningDateTo",
      model.dateTo || moment().format("YYYY-MM-DD")
    );

    await storeValue(
      "dashboardPlanningBranchId",
      this.canChangeBranch()
        ? String(model.selectedBranchId || "0")
        : this.defaultBranchId()
    );

    return this.refresh();
  },

  async refresh() {
    await GetDashboardPlanningSummary.run();

    if (typeof GetDashboardPlanningDailyTrend !== "undefined") {
      await GetDashboardPlanningDailyTrend.run();
    }
		if (typeof GetDashboardPlanningPreviousSummary !== "undefined") {
  await GetDashboardPlanningPreviousSu.run();
   }

    if (typeof GetDashboardPlanningBranchPerf !== "undefined") {
      await GetDashboardPlanningBranchPerf.run();
    }
  }
};
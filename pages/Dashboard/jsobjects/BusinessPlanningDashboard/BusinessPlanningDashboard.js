export default {
  async setupDefaults() {
    const plans = await ListBusinessPlanningPlans.run();
    const rows = plans || ListBusinessPlanningPlans.data || [];

    if (!appsmith.store.businessPlanningPlanId && rows.length) {
      await storeValue("businessPlanningPlanId", rows[0].planId || rows[0].value);
    }
  },

  async setPlan(planId) {
    await storeValue("businessPlanningPlanId", Number(planId || 0));
  },

  async load() {
    await this.setupDefaults();

    const planId = Number(appsmith.store.businessPlanningPlanId || 0);

    if (!planId) {
      await storeValue("businessPlanningData", {
        controls: { planId: 0 },
        plans: ListBusinessPlanningPlans.data || [],
        overview: {},
        dailyTrend: [],
        budgetUsage: [],
        workforceImpact: [],
        alerts: [],
        generatedAt: moment().format("DD.MM.YYYY HH:mm:ss"),
        generatedBy: appsmith.store.username || ""
      });
      return;
    }

    const overviewRows = await GetBusinessPlanningOverview.run();
    const trendRows = await GetBusinessPlanningDailyTrend.run();
    const budgetRows = await GetBusinessPlanningBudgetUsage.run();
    const workforceRows = await GetBusinessPlanningWorkforceIm.run();
    const alertRows = await GetBusinessPlanningAlerts.run();

    const plans = ListBusinessPlanningPlans.data || [];
    const selectedPlan = plans.find(p => Number(p.planId || p.value) === planId) || {};

    await storeValue("businessPlanningData", {
      controls: { planId },
      plans,
      selectedPlan,

      overview:
        overviewRows?.[0] ||
        GetBusinessPlanningOverview.data?.[0] ||
        {},

      dailyTrend:
        trendRows ||
        GetBusinessPlanningDailyTrend.data ||
        [],

      budgetUsage:
        budgetRows ||
        GetBusinessPlanningBudgetUsage.data ||
        [],

      workforceImpact:
        workforceRows ||
        GetBusinessPlanningWorkforceIm.data ||
        [],

      alerts:
        alertRows ||
        GetBusinessPlanningAlerts.data ||
        [],

      generatedAt: moment().format("DD.MM.YYYY HH:mm:ss"),
      generatedBy: appsmith.store.username || ""
    });
  },

  async applyFromCustom(controls = {}) {
    if (controls.planId !== undefined) {
      await this.setPlan(controls.planId);
    }

    await this.load();
  },

  async loadWithLoader() {
    return AppLoader.run(
      "Loading business planning",
      "Preparing planning dashboard...",
      async () => {
        await this.load();
      }
    );
  },

  async loadSilent() {
    try {
      await this.load();
    } catch (error) {
      showAlert("Error while loading business planning: " + error.message, "error");
      console.log(error);
    }
  }
};
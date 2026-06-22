export default {
  items() {
    return GetDashboardActionCenter.data || [];
  },

  totalCount() {
    return this.items().reduce(
      (sum, row) => sum + Number(row.countValue || 0),
      0
    );
  },

  highCount() {
    return this.items().filter(row => row.severity === "HIGH").length;
  },

  async refresh() {
    if (typeof GetDashboardActionCenter !== "undefined") {
      await GetDashboardActionCenter.run();
    }
  },

  async open() {
    await this.refresh();
    showModal(DashboardActionCenterModal.name);
  },

  async close() {
    closeModal(DashboardActionCenterModal.name);
  },

  async handle(row = {}) {
    await storeValue("dashboardActionType", row.actionType || "");
    await storeValue("dashboardActionKey", row.actionKey || "");

    showAlert(row.title || "Action selected.", "info");
  }
};
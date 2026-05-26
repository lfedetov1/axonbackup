export default {
  async openEvent() {
    const event = DashboardTimelineCustom.model.selectedEvent || {};

    if (event.targetAction === "POS_REPORT") {
      await storeValue("dashboardTargetAction", "POS_REPORT");
      navigateTo("POS");
      return;
    }

    if (event.targetAction === "CASH_CONTROL") {
      await storeValue("dashboardTargetAction", "CASH_CONTROL");
      navigateTo("POS");
      return;
    }

    if (event.targetAction === "SALES_ORDERS") {
      await storeValue("activeTab", "Sales Orders");
      await storeValue("viewMode", "list");
      navigateTo("Sales");
      return;
    }

    if (event.targetAction === "TRANSFERS") {
      await storeValue("activeTab", "Transfer Requests");
      await storeValue("viewMode", "list");
      navigateTo("Inventory");
      return;
    }

    if (event.targetAction === "WAREHOUSE_TASKS") {
      await storeValue("activeTab", "Warehouse Tasks");
      await storeValue("viewMode", "list");
      navigateTo("Inventory");
      return;
    }

    showAlert("Timeline item is not connected yet.", "info");
  }
};
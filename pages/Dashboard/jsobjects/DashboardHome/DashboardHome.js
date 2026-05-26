export default {
  async handleAction() {
    const action = DashboardHomeCustom.model.selectedAction;

    if (action === "POS_REPORT") {
      await storeValue("dashboardTargetAction", "POS_REPORT");
      navigateTo("POS");
      return;
    }

    if (action === "SALES_ORDERS") {
      await storeValue("activeTab", "Sales Orders");
      await storeValue("viewMode", "list");
      navigateTo("Sales");
      return;
    }

    if (action === "INVENTORY_REPORT") {
      await storeValue("activeTab", "Inventory");
      await storeValue("viewMode", "list");
      navigateTo("Inventory");
      return;
    }

    if (action === "CASH_CONTROL") {
      await storeValue("dashboardTargetAction", "CASH_CONTROL");
      navigateTo("POS");
      return;
    }

    if (action === "PURCHASE_FLOW") {
      await storeValue("activeTab", "Purchase");
      await storeValue("viewMode", "list");
      navigateTo("Purchase");
      return;
    }

    if (action === "FISCAL_DOCS") {
      await storeValue("activeTab", "Invoices");
      await storeValue("viewMode", "list");
      navigateTo("Sales");
      return;
    }

    showAlert("This dashboard action is not connected yet.", "info");
  }
};
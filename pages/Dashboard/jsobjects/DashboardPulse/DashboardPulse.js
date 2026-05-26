export default {
  async openAction() {
    const action = DashboardPulseCustom.model.selectedPulseAction || "";

    if (action === "FISCAL_DOCS") {
      await storeValue("activeTab", "Invoices");
      await storeValue("viewMode", "list");
      navigateTo("Sales");
      return;
    }

    if (action === "LOW_STOCK") {
      await storeValue("activeTab", "Stock Overview");
      await storeValue("viewMode", "list");
      navigateTo("Inventory");
      return;
    }

    if (action === "WAREHOUSE_TASKS") {
      await storeValue("activeTab", "Warehouse Tasks");
      await storeValue("viewMode", "list");
      navigateTo("Inventory");
      return;
    }

    if (action === "SALES_ORDERS") {
      await storeValue("activeTab", "Sales Orders");
      await storeValue("viewMode", "list");
      navigateTo("Sales");
      return;
    }

    if (action === "TRANSFERS") {
      await storeValue("activeTab", "Transfer Requests");
      await storeValue("viewMode", "list");
      navigateTo("Inventory");
      return;
    }

    if (action === "CASH_CONTROL") {
      await storeValue("dashboardTargetAction", "CASH_CONTROL");
      navigateTo("POS");
      return;
    }

    showAlert("Action is not connected yet.", "info");
  }
};
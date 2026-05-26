export default {
  async openWarehouse() {
    const warehouse = DashboardWarehouseHeatmapCusto.model.selectedWarehouse || {};

    if (!warehouse.warehouseId) {
      showAlert("Warehouse was not selected.", "warning");
      return;
    }

    await storeValue("warehouseId", warehouse.warehouseId);
    await storeValue("activeTab", "Stock Overview");
    await storeValue("viewMode", "list");

    navigateTo("Inventory");
  }
};
export default {
  async save() {
    if (!WarehouseCodeInput.text.trim()) {
      showAlert("Warehouse code is required.", "warning");
      return;
    }

    if (!WarehouseNameInput.text.trim()) {
      showAlert("Warehouse name is required.", "warning");
      return;
    }

    try {
      const response = await InsertWarehouse.run();

      let warehouseId =
        response?.insertId ||
        response?.[0]?.insertId ||
        InsertWarehouse.data?.insertId ||
        InsertWarehouse.data?.[0]?.insertId;

      if (!warehouseId) {
        const rows = await GetWarehouseIdAfterInsert.run();
        warehouseId = rows?.[0]?.warehouseId || GetWarehouseIdAfterInsert.data?.[0]?.warehouseId;
      }

      if (!warehouseId) {
        showAlert("Warehouse was saved, but ID was not returned.", "error");
        console.log(response, InsertWarehouse.data);
        return;
      }

      await storeValue("newWarehouseId", warehouseId);
      await storeValue("newWarehouseCode", WarehouseCodeInput.text.trim());
      await storeValue("newWarehouseName", WarehouseNameInput.text.trim());

      if (typeof ListWarehouses !== "undefined") {
        await ListWarehouses.run();
      }

      closeModal(WarehouseModal.name);
    } catch (error) {
      showAlert("Error while saving warehouse: " + error.message, "error");
      console.log(error);
    }
  }
};

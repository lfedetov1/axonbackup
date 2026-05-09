export default {
  async startNew() {
    await storeValue("currentStockLocationId", null);

    StockLocationCodeInput.setValue("");
    StockLocationNameInput.setValue("");

    StockLocationWarehouseSelect.setSelectedOption(
      String(InventoryWarehouseSelect.selectedOptionValue || appsmith.store.warehouseId || "")
    );

    StockLocationTypeSelect.setSelectedOption("BIN");
    StockLocationZoneInput.setValue("");
    StockLocationAisleInput.setValue("");
    StockLocationRackInput.setValue("");
    StockLocationShelfInput.setValue("");
    StockLocationBinInput.setValue("");
    StockLocationSortOrderInput.setValue("0");
    StockLocationCapacityInput.setValue("");
    StockLocationCapacityUnitSelec.setSelectedOption("");
    StockLocationPickableSwitch.setValue(true);
    StockLocationReceivingSwitch.setValue(false);
    StockLocationShippingSwitch.setValue(false);
    StockLocationActiveSwitch.setValue(true);
    StockLocationNoteInput.setValue("");

    showModal(StockLocationModal.name);
  },

  async save() {
    if (!StockLocationWarehouseSelect.selectedOptionValue) {
      showAlert("Warehouse is required.", "warning");
      return;
    }

    if (!StockLocationCodeInput.text.trim()) {
      showAlert("Location code is required.", "warning");
      return;
    }

    if (!StockLocationNameInput.text.trim()) {
      showAlert("Location name is required.", "warning");
      return;
    }

    const duplicates = await CheckWarehouseLocationCodeDupl.run({
      locationId: appsmith.store.currentStockLocationId || 0
    });

    if (duplicates?.length || CheckWarehouseLocationCodeDupl.data?.length) {
      showAlert("Location code already exists in this warehouse.", "error");
      return;
    }

    await InsertWarehouseLocation.run();
    await ListWarehouseLocations.run();

    closeModal(StockLocationModal.name);
    showAlert("Warehouse location was created.", "success");
  },

  async cancel() {
    closeModal(StockLocationModal.name);
  }
};

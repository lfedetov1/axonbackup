export default {
  isEditMode() {
    return !!appsmith.store.currentWarehouseId;
  },

  async startNew() {
    await storeValue("currentWarehouseId", null);

    WarehouseCodeInput.setValue("");
    WarehouseNameInput.setValue("");
    WarehouseAddressLine1Input.setValue("");
    WarehouseAddressLine2Input.setValue("");
    WarehouseCityInput.setValue("");
    WarehousePostalCodeInput.setValue("");
    WarehouseCountryCodeSelect.setSelectedOption("HR");
    WarehouseManagerNameInput.setValue("");
    WarehousePhoneInput.setValue("");
    WarehouseEmailInput.setValue("");

    WarehouseDefaultSwitch.setValue(false);
    WarehouseActiveSwitch.setValue(true);

    WarehouseMinimumCapacityInput.setValue("");
    WarehouseMaximumCapacityInput.setValue("");
    WarehouseCapacityUnitSelect.setSelectedOption("");
    WarehouseCapacityNoteInput.setValue("");

    showModal(WarehouseModal.name);
  },

  async loadForEdit(row = null) {
    const selected = row || WarehousesTable.triggeredRow || WarehousesTable.selectedRow;

    if (!selected?.warehouseId) {
      showAlert("Select a warehouse first.", "warning");
      return;
    }

    const rows = await GetWarehouseForEdit.run({
      warehouseId: selected.warehouseId
    });

    const warehouse = rows?.[0] || GetWarehouseForEdit.data?.[0];

    if (!warehouse) {
      showAlert("Warehouse was not found.", "error");
      return;
    }

    await storeValue("currentWarehouseId", warehouse.warehouseId);

    WarehouseCodeInput.setValue(warehouse.warehouseCode || "");
    WarehouseNameInput.setValue(warehouse.warehouseName || "");
    WarehouseAddressLine1Input.setValue(warehouse.addressLine1 || "");
    WarehouseAddressLine2Input.setValue(warehouse.addressLine2 || "");
    WarehouseCityInput.setValue(warehouse.city || "");
    WarehousePostalCodeInput.setValue(warehouse.postalCode || "");
    WarehouseCountryCodeSelect.setSelectedOption(warehouse.countryCode || "HR");
    WarehouseManagerNameInput.setValue(warehouse.managerName || "");
    WarehousePhoneInput.setValue(warehouse.phone || "");
    WarehouseEmailInput.setValue(warehouse.email || "");

    WarehouseDefaultSwitch.setValue(Number(warehouse.isDefault || 0) === 1);
    WarehouseActiveSwitch.setValue(Number(warehouse.isActive || 0) === 1);

    WarehouseMinimumCapacityInput.setValue(warehouse.minimumCapacity == null ? "" : String(warehouse.minimumCapacity));
    WarehouseMaximumCapacityInput.setValue(warehouse.maximumCapacity == null ? "" : String(warehouse.maximumCapacity));
    WarehouseCapacityUnitSelect.setSelectedOption(warehouse.capacityUnitId ? String(warehouse.capacityUnitId) : "");
    WarehouseCapacityNoteInput.setValue(warehouse.capacityNote || "");

    showModal(WarehouseModal.name);
  },

  async save() {
    if (!WarehouseCodeInput.text.trim()) {
      showAlert("Warehouse code is required.", "warning");
      return;
    }

    if (!WarehouseNameInput.text.trim()) {
      showAlert("Warehouse name is required.", "warning");
      return;
    }

    const warehouseId = appsmith.store.currentWarehouseId || 0;

    const duplicateRows = await CheckWarehouseCodeDuplicate.run({
      warehouseCode: WarehouseCodeInput.text.trim(),
      warehouseId
    });

    if (duplicateRows?.length || CheckWarehouseCodeDuplicate.data?.length) {
      showAlert("Warehouse with this code already exists.", "error");
      return;
    }

    try {
      if (this.isEditMode()) {
        await UpdateWarehouse.run({
          warehouseId
        });
      } else {
        await InsertWarehouse.run();
      }

      await ListWarehouses.run();
      await ListInventoryWarehouses.run();

      await storeValue("currentWarehouseId", null);
      closeModal(WarehouseModal.name);
      showAlert(this.isEditMode() ? "Warehouse was updated." : "Warehouse was created.", "success");
    } catch (error) {
      showAlert("Error while saving warehouse: " + error.message, "error");
      console.log(error);
    }
  },

  async disable(row = null) {
    const selected = row || WarehousesTable.triggeredRow || WarehousesTable.selectedRow;

    if (!selected?.warehouseId) {
      showAlert("Select a warehouse first.", "warning");
      return;
    }

    await DisableWarehouse.run({
      warehouseId: selected.warehouseId
    });

    await ListWarehouses.run();
    await ListInventoryWarehouses.run();
    showAlert("Warehouse was disabled.", "success");
  },

  async reactivate(row = null) {
    const selected = row || WarehousesTable.triggeredRow || WarehousesTable.selectedRow;

    if (!selected?.warehouseId) {
      showAlert("Select a warehouse first.", "warning");
      return;
    }

    await ReactivateWarehouse.run({
      warehouseId: selected.warehouseId
    });

    await ListWarehouses.run();
    await ListInventoryWarehouses.run();
    showAlert("Warehouse was reactivated.", "success");
  }
};

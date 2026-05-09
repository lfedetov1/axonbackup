export default {
  isEditMode() {
    return !!appsmith.store.currentStockLocationId;
  },

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

    if (typeof StockLocationCapacityUnitSelect !== "undefined") {
      StockLocationCapacityUnitSelec.setSelectedOption("");
    }

    StockLocationPickableSwitch.setValue(true);
    StockLocationReceivingSwitch.setValue(false);
    StockLocationShippingSwitch.setValue(false);
    StockLocationActiveSwitch.setValue(true);
    StockLocationNoteInput.setValue("");

    showModal(StockLocationModal.name);
  },

  async loadForEdit(locationId) {
    if (!locationId) {
      showAlert("Select location first.", "warning");
      return;
    }

    const rows = await GetWarehouseLocationForEdit.run({ locationId });
    const location = rows?.[0] || GetWarehouseLocationForEdit.data?.[0];

    if (!location) {
      showAlert("Warehouse location was not found.", "error");
      return;
    }

    await storeValue("currentStockLocationId", location.locationId);

    StockLocationWarehouseSelect.setSelectedOption(String(location.warehouseId || ""));
    StockLocationCodeInput.setValue(location.locationCode || "");
    StockLocationNameInput.setValue(location.locationName || "");
    StockLocationTypeSelect.setSelectedOption(location.locationType || "BIN");
    StockLocationZoneInput.setValue(location.zoneCode || "");
    StockLocationAisleInput.setValue(location.aisleCode || "");
    StockLocationRackInput.setValue(location.rackCode || "");
    StockLocationShelfInput.setValue(location.shelfCode || "");
    StockLocationBinInput.setValue(location.binCode || "");
    StockLocationSortOrderInput.setValue(String(location.sortOrder || 0));

    StockLocationCapacityInput.setValue(
      location.capacityQuantity === null || location.capacityQuantity === undefined
        ? ""
        : String(location.capacityQuantity)
    );

    if (typeof StockLocationCapacityUnitSelect !== "undefined") {
      StockLocationCapacityUnitSelec.setSelectedOption(
        location.capacityUnitId ? String(location.capacityUnitId) : ""
      );
    }

    StockLocationPickableSwitch.setValue(Number(location.isPickable || 0) === 1);
    StockLocationReceivingSwitch.setValue(Number(location.isReceivingArea || 0) === 1);
    StockLocationShippingSwitch.setValue(Number(location.isShippingArea || 0) === 1);
    StockLocationActiveSwitch.setValue(Number(location.isActive || 0) === 1);
    StockLocationNoteInput.setValue(location.note || "");

    showModal(StockLocationModal.name);
  },

  auditValues() {
    return {
      warehouse_id: StockLocationWarehouseSelect.selectedOptionValue,
      code: StockLocationCodeInput.text.trim(),
      name: StockLocationNameInput.text.trim(),
      location_type: StockLocationTypeSelect.selectedOptionValue || "BIN",
      zone_code: StockLocationZoneInput.text.trim() || null,
      aisle_code: StockLocationAisleInput.text.trim() || null,
      rack_code: StockLocationRackInput.text.trim() || null,
      shelf_code: StockLocationShelfInput.text.trim() || null,
      bin_code: StockLocationBinInput.text.trim() || null,
      sort_order: StockLocationSortOrderInput.text || 0,
      capacity_quantity: StockLocationCapacityInput.text || null,
      capacity_unit_id:
        typeof StockLocationCapacityUnitSelect !== "undefined"
          ? StockLocationCapacityUnitSelec.selectedOptionValue || null
          : null,
      is_pickable: StockLocationPickableSwitch.isSwitchedOn,
      is_receiving_area: StockLocationReceivingSwitch.isSwitchedOn,
      is_shipping_area: StockLocationShippingSwitch.isSwitchedOn,
      is_active: StockLocationActiveSwitch.isSwitchedOn,
      note: StockLocationNoteInput.text.trim() || null
    };
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

    const wasEditMode = this.isEditMode();
    const locationId = appsmith.store.currentStockLocationId || 0;

    const duplicates = await CheckWarehouseLocationCodeDupl.run({
      locationId
    });

    if (duplicates?.length || CheckWarehouseLocationCodeDupl.data?.length) {
      showAlert("Location code already exists in this warehouse.", "error");
      return;
    }

    if (wasEditMode) {
      await UpdateWarehouseLocation.run({ locationId });
    } else {
      await InsertWarehouseLocation.run();
    }

    if (typeof AuditLog !== "undefined") {
      await AuditLog.insert({
        entityName: "warehouse_locations",
        entityId: wasEditMode ? locationId : StockLocationCodeInput.text.trim(),
        actionType: wasEditMode ? "UPDATE" : "INSERT",
        newValues: this.auditValues()
      });
    }

    await ListWarehouseLocations.run();
    await storeValue("currentStockLocationId", null);

    closeModal(StockLocationModal.name);
    showAlert(
      wasEditMode ? "Warehouse location was updated." : "Warehouse location was created.",
      "success"
    );
  },

  async disable(locationId) {
    if (!locationId) {
      showAlert("Select location first.", "warning");
      return;
    }

    await DisableWarehouseLocation.run({ locationId });

    if (typeof AuditLog !== "undefined") {
      await AuditLog.insert({
        entityName: "warehouse_locations",
        entityId: locationId,
        actionType: "DISABLE",
        newValues: {
          is_active: 0
        }
      });
    }

    await ListWarehouseLocations.run();

    showAlert("Warehouse location was disabled.", "success");
  },

  async enable(locationId) {
    if (!locationId) {
      showAlert("Select location first.", "warning");
      return;
    }

    await EnableWarehouseLocation.run({ locationId });

    if (typeof AuditLog !== "undefined") {
      await AuditLog.insert({
        entityName: "warehouse_locations",
        entityId: locationId,
        actionType: "ENABLE",
        newValues: {
          is_active: 1
        }
      });
    }

    await ListWarehouseLocations.run();

    showAlert("Warehouse location was enabled.", "success");
  },

  async cancel() {
    await storeValue("currentStockLocationId", null);
    closeModal(StockLocationModal.name);
  }
};

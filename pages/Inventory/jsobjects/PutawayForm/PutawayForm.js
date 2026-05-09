export default {
  async open(row) {
    if (!row?.documentItemId) {
      showAlert("Select receipt item first.", "warning");
      return;
    }

    await storeValue("putawayRow", row);

    PutawayLocationSelect.setSelectedOption("");
    PutawayPrimarySwitch.setValue(Number(row["Mapped Locations"] || 0) === 0);
    PutawayMinQuantityInput.setValue("");
    PutawayMaxQuantityInput.setValue(String(row["Received Quantity"] || ""));
    PutawayReorderQuantityInput.setValue("");
    PutawayNoteInput.setValue("");

    await ListWarehouseLocations.run();

    showModal(PutawayLocationModal.name);
  },

  selectedLocation() {
    const locationId = Number(PutawayLocationSelect.selectedOptionValue || 0);

    return (ListWarehouseLocations.data || []).find(
      x => Number(x.locationId) === locationId
    ) || null;
  },

  async confirm() {
    const row = appsmith.store.putawayRow || {};

    if (!row.documentItemId) {
      showAlert("No receipt item selected.", "warning");
      return;
    }

    if (!PutawayLocationSelect.selectedOptionValue) {
      showAlert("Select warehouse location.", "warning");
      return;
    }

    const location = this.selectedLocation();

    if (!location) {
      showAlert("Selected location was not found.", "error");
      return;
    }

    const duplicateRows = await CheckPutawayProductLocationDup.run({
      warehouseId: row.warehouseId,
      productId: row.productId
    });

    if (duplicateRows?.length || CheckPutawayProductLocationDup.data?.length) {
      showAlert("This product is already assigned to selected location.", "warning");
      return;
    }

    await InsertPutawayLocationProduct.run({
      warehouseId: row.warehouseId,
      productId: row.productId
    });

    await UpdatePutawayItemNote.run({
      documentItemId: row.documentItemId,
      locationCode: location.locationCode
    });

    if (typeof AuditLog !== "undefined") {
      await AuditLog.insert({
        entityName: "warehouse_location_products",
        entityId: row.productId,
        actionType: "PUTAWAY",
        newValues: {
          receipt_document_id: row.documentId,
          receipt_number: row["Receipt Number"],
          document_item_id: row.documentItemId,
          product_id: row.productId,
          product_code: row["Product Code"],
          product_name: row["Product Name"],
          warehouse_id: row.warehouseId,
          location_id: location.locationId,
          location_code: location.locationCode,
          location_name: location.locationName,
          received_quantity: row["Received Quantity"],
          note: PutawayNoteInput.text || null
        }
      });
    }

    await ListPutawayReceiptItems.run();
    await ListWarehouseLocations.run();

    await storeValue("putawayRow", null);

    closeModal(PutawayLocationModal.name);
    showAlert("Putaway location was assigned.", "success");
  },

  async cancel() {
    await storeValue("putawayRow", null);
    closeModal(PutawayLocationModal.name);
  }
};

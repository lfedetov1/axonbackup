export default {
  async open(row) {
    if (!row?.documentItemId) {
      showAlert("Select pick item first.", "warning");
      return;
    }

    await storeValue("pickRow", row);

    await ListWarehouseLocations.run();

    PickLocationSelect.setSelectedOption(
      row.suggestedLocationId ? String(row.suggestedLocationId) : ""
    );

    PickQuantityInput.setValue(String(row["Remaining Quantity"] || row["Required Quantity"] || ""));
    PickNoteInput.setValue("");

    showModal(PickConfirmModal.name);
  },

  selectedLocation() {
    const locationId = Number(PickLocationSelect.selectedOptionValue || 0);

    return (ListWarehouseLocations.data || []).find(
      x => Number(x.locationId) === locationId
    ) || null;
  },

  async confirm() {
    const row = appsmith.store.pickRow || {};

    if (!row.documentItemId) {
      showAlert("No pick item selected.", "warning");
      return;
    }

    if (!PickLocationSelect.selectedOptionValue) {
      showAlert("Select pick location.", "warning");
      return;
    }

    const qty = Number(PickQuantityInput.text || 0);
    const remainingQty = Number(row["Remaining Quantity"] || 0);

    if (qty <= 0) {
      showAlert("Pick quantity must be greater than zero.", "warning");
      return;
    }

    if (qty > remainingQty) {
      showAlert("Pick quantity cannot be greater than remaining quantity.", "warning");
      return;
    }

    const location = this.selectedLocation();

    if (!location) {
      showAlert("Selected location was not found.", "error");
      return;
    }

    await InsertWarehousePickItem.run({
      documentId: row.documentId,
      documentItemId: row.documentItemId,
      warehouseId: row.warehouseId,
      locationId: PickLocationSelect.selectedOptionValue,
      productId: row.productId,
      pickedQuantity: qty,
      note: PickNoteInput.text || null

    });
				await UpdateStockIssuePickStatus.run({
  documentId: row.documentId
});

    if (typeof AuditLog !== "undefined") {
      await AuditLog.insert({
        entityName: "warehouse_pick_items",
        entityId: row.documentItemId,
        actionType: "PICK",
        newValues: {
          document_id: row.documentId,
          issue_number: row["Issue Number"],
          document_item_id: row.documentItemId,
          product_id: row.productId,
          product_code: row["Product Code"],
          product_name: row["Product Name"],
          warehouse_id: row.warehouseId,
          location_id: location.locationId,
          location_code: location.locationCode,
          location_name: location.locationName,
          picked_quantity: qty,
          note: PickNoteInput.text || null
        }
      });
    }

    await ListPickItemsForStockIssue.run();

    await storeValue("pickRow", null);

    closeModal(PickConfirmModal.name);
    showAlert("Item was picked.", "success");
  },

  async cancel() {
    await storeValue("pickRow", null);
    closeModal(PickConfirmModal.name);
  }
};

export default {
  async open(row) {
    if (!row?.mappingId) {
      showAlert("Selected row does not contain mapping ID.", "warning");
      return;
    }

    await storeValue("stockMapMoveRow", row);

    StockMapMoveToLocationSelect.setSelectedOption("");
    StockMapMoveNoteInput.setValue("");

    if (typeof ListWarehouseLocations !== "undefined") {
      await ListWarehouseLocations.run();
    }

    showModal(StockMapMoveProductModal.name);
  },

  selectedDestination() {
    const toId = Number(StockMapMoveToLocationSelect.selectedOptionValue || 0);

    return (ListWarehouseLocations.data || []).find(
      x => Number(x.locationId) === toId
    ) || null;
  },

  async confirm() {
    const row = appsmith.store.stockMapMoveRow || {};

    if (!row.mappingId) {
      showAlert("No product mapping selected.", "warning");
      return;
    }

    if (!StockMapMoveToLocationSelect.selectedOptionValue) {
      showAlert("Select destination location.", "warning");
      return;
    }

    const destination = this.selectedDestination();

    if (!destination) {
      showAlert("Destination location was not found.", "error");
      return;
    }

    const duplicateRows = await CheckProductOnDestinationLocat.run({
      productId: row.productId
    });

    if (duplicateRows?.length || CheckProductOnDestinationLocat.data?.length) {
      showAlert("This product is already assigned to selected destination location.", "error");
      return;
    }

    await MoveWarehouseLocationProduct.run({
      mappingId: row.mappingId,
      fromLocationCode: row.locationCode,
      toLocationCode: destination.locationCode
    });

    await ListWarehouseLocationProducts.run({
      locationId: appsmith.store.selectedWarehouseLocationId
    });
		if (typeof AuditLog !== "undefined") {
  await AuditLog.insert({
    entityName: "warehouse_location_products",
    entityId: row.mappingId,
    actionType: "MOVE",
    oldValues: {
      product_id: row.productId,
      product_code: row.productCode,
      product_name: row.productName,
      from_location_id: row.locationId,
      from_location_code: row.locationCode,
      from_location_name: row.locationName
    },
    newValues: {
      product_id: row.productId,
      product_code: row.productCode,
      product_name: row.productName,
      to_location_id: destination.locationId,
      to_location_code: destination.locationCode,
      to_location_name: destination.locationName,
      note: StockMapMoveNoteInput.text || null
    }
  });
}


    await ListWarehouseLocations.run();

    closeModal(StockMapMoveProductModal.name);
    await storeValue("stockMapMoveRow", null);

    showAlert("Product location was moved.", "success");
  },

  async cancel() {
    await storeValue("stockMapMoveRow", null);
    closeModal(StockMapMoveProductModal.name);
  }
};

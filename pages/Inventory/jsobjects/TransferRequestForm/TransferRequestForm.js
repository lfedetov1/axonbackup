export default {
  rows() {
    return appsmith.store.transferRequestItems || [];
  },

  documentId() {
    return appsmith.store.currentTransferRequestId || null;
  },

  status() {
    return appsmith.store.currentTransferRequestStatus || null;
  },

  isEditMode() {
    return !!this.documentId();
  },

  recalcRow(row) {
    const quantity = Number(row.quantity || 0);
    const unitCost = Number(row.unitCost || 0);

    return {
      ...row,
      quantity,
      unitCost,
      lineTotal: Number((quantity * unitCost).toFixed(2))
    };
  },

  recalc(rows) {
    return (rows || []).map((row, index) => ({
      ...this.recalcRow(row),
      lineNo: index + 1
    }));
  },

  async setRows(rows) {
    await storeValue("transferRequestItems", this.recalc(rows));
  },

  totals() {
    return this.rows().reduce(
      (sum, row) => ({
        quantity: sum.quantity + Number(row.quantity || 0),
        value: sum.value + Number(row.lineTotal || 0)
      }),
      { quantity: 0, value: 0 }
    );
  },

  async startNew() {
    await storeValue("currentTransferRequestId", null);
    await storeValue("currentTransferRequestStatus", null);
    await storeValue("transferRequestBeforeEdit", null);
    await storeValue("transferRequestItems", []);

    await GetNextTransferRequestNumber.run();

    TransferRequestNumberInput.setValue(
      GetNextTransferRequestNumber.data?.[0]?.nextTransferRequestNumber || ""
    );

    TransferRequestStatusInput.setValue("DRAFT");
    TransferRequestDateInput.setValue(moment().format("YYYY-MM-DD"));
    TransferRequestNoteInput.setValue("");

    TransferRequestSourceWarehouse.setSelectedOption(
      String(InventoryWarehouseSelect.selectedOptionValue || appsmith.store.warehouseId || "")
    );
    TransferRequestDestinationWare.setSelectedOption("");

    if (typeof TransferRequestBarcodeInput !== "undefined") {
      TransferRequestBarcodeInput.setValue("");
    }

    showModal(TransferRequestModal.name);
  },

  async addBlankRow() {
    await this.setRows([
      ...this.rows(),
      {
        lineNo: this.rows().length + 1,
        barcode: "",
        productId: null,
        productCode: "",
        productName: "",
        sku: "",
        description: "",
        unitId: null,
        unitCode: "",
        availableStock: 0,
        quantity: 1,
        unitCost: 0,
        lineTotal: 0,
        note: ""
      }
    ]);
  },

  async removeSelectedRow() {
    const selectedIndex =
      TransferRequestItemsEditTable.selectedRowIndex ??
      TransferRequestItemsEditTable.triggeredRowIndex ??
      -1;

    if (selectedIndex < 0) {
      showAlert("Select row first.", "warning");
      return;
    }

    await this.setRows(this.rows().filter((_, index) => index !== selectedIndex));
  },

  async updateRows() {
    await this.setRows(TransferRequestItemsEditTable.tableData || this.rows());
  },

  async resolveBarcodeFromTable() {
    const tableRows = TransferRequestItemsEditTable.tableData || this.rows();

    let rowIndex =
      TransferRequestItemsEditTable.updatedRowIndex ??
      TransferRequestItemsEditTable.triggeredRowIndex ??
      -1;

    if (rowIndex < 0) {
      rowIndex = tableRows.findIndex(row =>
        String(row.barcode || row.Barcode || row["Barcode"] || "").trim() &&
        !row.productId
      );
    }

    if (rowIndex < 0) {
      await this.updateRows();
      return;
    }

    const row =
      TransferRequestItemsEditTable.updatedRow ||
      TransferRequestItemsEditTable.triggeredRow ||
      tableRows[rowIndex] ||
      {};

    const existingRow = this.rows()[rowIndex] || {};

    const lookup = String(
      row.barcode ||
      row.Barcode ||
      row["Barcode"] ||
      row.productCode ||
      row["Product Code"] ||
      ""
    ).trim();

    const existingLookup = String(existingRow.barcode || existingRow.productCode || "").trim();

    if (!lookup) {
      await this.updateRows();
      return;
    }

    if (existingRow.productId && lookup === existingLookup) {
      await this.updateRows();
      return;
    }

    await this.resolveProduct(rowIndex, lookup, false);
  },

  async resolveProduct(rowIndex, lookupValue, increment = false) {
    const lookup = String(lookupValue || "").trim();

    if (!lookup) return;

    const sourceWarehouseId = TransferRequestSourceWarehouse.selectedOptionValue;

    if (!sourceWarehouseId) {
      showAlert("Select source warehouse first.", "warning");
      return;
    }

    const result = await FindTransferRequestProduct.run({
      lookup,
      sourceWarehouseId
    });

    const product = result?.[0] || FindTransferRequestProduct.data?.[0];

    if (!product) {
      showAlert("Product was not found.", "warning");
      return;
    }

    if (Number(product.trackStock || 0) !== 1) {
      showAlert("This product does not track stock.", "warning");
      return;
    }

    const rows = [...this.rows()];
    const existingIndex = rows.findIndex(row => Number(row.productId) === Number(product.productId));

    if (increment && existingIndex >= 0) {
      rows[existingIndex] = this.recalcRow({
        ...rows[existingIndex],
        quantity: Number(rows[existingIndex].quantity || 0) + 1
      });
      await this.setRows(rows);
      return;
    }

    const current = rows[rowIndex] || {};
    const quantity = increment ? Number(current.quantity || 0) + 1 : Number(current.quantity || 1);

    rows[rowIndex] = this.recalcRow({
      ...current,
      barcode: product.barcode || lookup,
      productId: product.productId,
      productCode: product.productCode,
      productName: product.productName,
      sku: product.sku || "",
      description: product.productName,
      unitId: product.unitId,
      unitCode: product.unitCode || "",
      availableStock: Number(product.availableStock || 0),
      quantity,
      unitCost: Number(product.unitCost || 0),
      note: current.note || ""
    });

    await this.setRows(rows);
  },

  async scanBarcode(value) {
    const lookup = String(value || "").trim();

    if (!lookup) return;

    if (!this.rows().length) {
      await this.addBlankRow();
    }

    await this.resolveProduct(this.rows().length - 1, lookup, true);

    if (typeof TransferRequestBarcodeInput !== "undefined") {
      TransferRequestBarcodeInput.setValue("");
    }
  },

  async scanBarcodeDebounced(value) {
    const lookup = String(value || "").trim();

    if (!lookup || lookup.length < 3) return;

    await storeValue("transferRequestScanLastValue", lookup);

    setTimeout(() => {
      if (appsmith.store.transferRequestScanLastValue === lookup) {
        this.scanBarcode(lookup);
      }
    }, 300);
  },

  async validate(checkStock = false) {
    if (!TransferRequestNumberInput.text.trim()) {
      showAlert("Transfer number is required.", "warning");
      return false;
    }

    if (!TransferRequestSourceWarehouse.selectedOptionValue) {
      showAlert("Source warehouse is required.", "warning");
      return false;
    }

    if (!TransferRequestDestinationWare.selectedOptionValue) {
      showAlert("Destination warehouse is required.", "warning");
      return false;
    }

    if (Number(TransferRequestSourceWarehouse.selectedOptionValue) === Number(TransferRequestDestinationWare.selectedOptionValue)) {
      showAlert("Source and destination warehouse cannot be the same.", "warning");
      return false;
    }

    const rows = this.rows();

    if (!rows.length) {
      showAlert("Add at least one product.", "warning");
      return false;
    }

    for (const row of rows) {
      if (!row.productId) {
        showAlert("Every row must have a valid product.", "warning");
        return false;
      }

      if (Number(row.quantity || 0) <= 0) {
        showAlert("Quantity must be greater than zero.", "warning");
        return false;
      }

      if (checkStock && Number(row.quantity || 0) > Number(row.availableStock || 0)) {
        showAlert(`Not enough stock for ${row.productCode}. Available: ${row.availableStock}`, "error");
        return false;
      }
    }

    return true;
  },

  async saveDraft() {
    await this.updateRows();

    if (!(await this.validate(false))) return;

    const duplicate = await CheckTransferRequestNumberDupl.run();

    if (duplicate?.length || CheckTransferRequestNumberDupl.data?.length) {
      showAlert("Transfer request number already exists.", "error");
      return;
    }

    try {
      const wasEditMode = this.isEditMode();
      const rows = this.recalc(this.rows());
      const totals = this.totals();

      let documentId = this.documentId();

      if (wasEditMode) {
        await UpdateTransferRequestDocument.run({
          documentId,
          totalAmount: totals.value
        });

        await DeleteTransferRequestItems.run({ documentId });
      } else {
        await InsertTransferRequestDocument.run({
          status: "DRAFT",
          totalAmount: totals.value
        });

        const idRows = await GetTransferRequestIdByNumber.run();
        const found = idRows?.[0] || GetTransferRequestIdByNumber.data?.[0];

        documentId = found?.documentId;

        if (!documentId) {
          showAlert("Transfer request was saved, but ID was not found.", "error");
          return;
        }

        await storeValue("currentTransferRequestId", documentId);
      }

      for (let i = 0; i < rows.length; i += 1) {
        await InsertTransferRequestItem.run({
          documentId,
          lineNo: i + 1,
          productId: rows[i].productId,
          description: rows[i].description || rows[i].productName,
          quantity: rows[i].quantity,
          unitId: rows[i].unitId,
          unitCost: rows[i].unitCost || 0,
          lineTotal: rows[i].lineTotal || 0,
          note: rows[i].note || null
        });
      }

      if (typeof AuditLog !== "undefined") {
        await AuditLog.insert({
          entityName: "documents",
          entityId: documentId,
          actionType: wasEditMode ? "UPDATE" : "INSERT",
          oldValues: wasEditMode ? appsmith.store.transferRequestBeforeEdit || null : null,
          newValues: this.getAuditValues(documentId)
        });
      }

      await this.afterSave();
      showAlert(wasEditMode ? "Transfer request was updated." : "Transfer request was saved.", "success");
    } catch (error) {
      showAlert("Error while saving transfer request: " + error.message, "error");
      console.log(error);
    }
  },

  async loadForEdit(row = null) {
    const selected = row || TransferRequestTable.selectedRow || {};
    const documentId = selected.documentId || selected.id || selected.ID || selected["Transfer ID"];

    if (!documentId) {
      showAlert("Select transfer request first.", "warning");
      return;
    }

    const headerRows = await GetTransferRequestForEdit.run({ documentId });
    const header = headerRows?.[0] || GetTransferRequestForEdit.data?.[0];

    if (!header) {
      showAlert("Transfer request was not found.", "error");
      return;
    }

    if (header.status !== "DRAFT") {
      showAlert("Only draft transfer requests can be edited.", "warning");
      return;
    }

    const itemRows = await GetTransferRequestItemsForEdit.run({ documentId });
    const items = itemRows || GetTransferRequestItemsForEdit.data || [];

    await storeValue("currentTransferRequestId", header.documentId);
    await storeValue("currentTransferRequestStatus", header.status);
    await storeValue("transferRequestBeforeEdit", { header, items });

    TransferRequestNumberInput.setValue(header.documentNumber || "");
    TransferRequestStatusInput.setValue(header.status || "DRAFT");
    TransferRequestDateInput.setValue(header.documentDate || "");
    TransferRequestSourceWarehouse.setSelectedOption(header.sourceWarehouseId ? String(header.sourceWarehouseId) : "");
    TransferRequestDestinationWare.setSelectedOption(header.destinationWarehouseId ? String(header.destinationWarehouseId) : "");
    TransferRequestNoteInput.setValue(header.note || "");

    await this.setRows(items.map(row => ({
      lineNo: row.lineNo,
      barcode: row.barcode || "",
      productId: row.productId,
      productCode: row.productCode,
      productName: row.productName,
      sku: row.sku || "",
      description: row.description || row.productName,
      unitId: row.unitId,
      unitCode: row.unitCode || "",
      availableStock: 0,
      quantity: Number(row.quantity || 0),
      unitCost: Number(row.unitCost || 0),
      lineTotal: Number(row.lineTotal || 0),
      note: row.note || ""
    })));

    showModal(TransferRequestModal.name);
  },

  async pick(row = null) {
    const documentId = this.getDocumentIdFromRow(row);
    if (!documentId) return;

    await PickTransferRequest.run({ documentId });
    await this.writeAuditSimple(documentId, "PICK", "PICKED");
    await this.refreshLists();
    showAlert("Transfer request was picked.", "success");
  },

  async ship(row = null) {
    const documentId = this.getDocumentIdFromRow(row);
    if (!documentId) return;

    const headerRows = await GetTransferRequestForAction.run({ documentId });
    const header = headerRows?.[0] || GetTransferRequestForAction.data?.[0];

    if (!header || !["DRAFT", "REQUESTED", "PICKED"].includes(header.status)) {
      showAlert("Only draft/requested/picked transfers can be shipped.", "warning");
      return;
    }

    const itemRows = await GetTransferRequestItemsForActi.run({ documentId });
    const items = itemRows || GetTransferRequestItemsForActi.data || [];

    for (const item of items) {
      if (Number(item.trackStock || 0) === 1) {
        await InsertTransferShipMovement.run({
          documentId,
          documentItemId: item.documentItemId,
          sourceWarehouseId: header.sourceWarehouseId,
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost || 0,
          lineTotal: item.lineTotal || 0,
          note: `Transfer shipped ${header.documentNumber}`
        });
      }
    }

    await ShipTransferRequest.run({ documentId });
    await this.writeAuditSimple(documentId, "SHIP", "SHIPPED");
    await this.refreshLists();
    showAlert("Transfer request was shipped. Goods are now in transit.", "success");
  },

  async receive(row = null) {
    const documentId = this.getDocumentIdFromRow(row);
    if (!documentId) return;

    const headerRows = await GetTransferRequestForAction.run({ documentId });
    const header = headerRows?.[0] || GetTransferRequestForAction.data?.[0];

    if (!header || header.status !== "SHIPPED") {
      showAlert("Only shipped transfers can be received.", "warning");
      return;
    }

    const itemRows = await GetTransferRequestItemsForActi.run({ documentId });
    const items = itemRows || GetTransferRequestItemsForActi.data || [];

    for (const item of items) {
      if (Number(item.trackStock || 0) === 1) {
        await InsertTransferReceiveMovement.run({
          documentId,
          documentItemId: item.documentItemId,
          destinationWarehouseId: header.destinationWarehouseId,
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost || 0,
          lineTotal: item.lineTotal || 0,
          note: `Transfer received ${header.documentNumber}`
        });
      }
    }

    await ReceiveTransferRequest.run({ documentId });
    await this.writeAuditSimple(documentId, "RECEIVE", "RECEIVED");
    await this.refreshLists();
    showAlert("Transfer request was received.", "success");
  },

  async cancelRequest(row = null) {
    const documentId = this.getDocumentIdFromRow(row);
    if (!documentId) return;

    await CancelTransferRequest.run({ documentId });
    await this.writeAuditSimple(documentId, "CANCEL", "CANCELLED");
    await this.refreshLists();
    showAlert("Transfer request was cancelled.", "success");
  },

  getDocumentIdFromRow(row = null) {
    const selected = row || TransferRequestTable.triggeredRow || TransferRequestTable.selectedRow || {};
    const documentId =
      selected.documentId ||
      selected.id ||
      selected.ID ||
      selected["Transfer ID"];

    if (!documentId) {
      showAlert("Select transfer request first.", "warning");
      return null;
    }

    return documentId;
  },

  getAuditValues(documentId = null) {
    const totals = this.totals();

    return {
      source: "Transfer Request form",
      document_id: documentId,
      document_number: TransferRequestNumberInput.text,
      source_warehouse_id: TransferRequestSourceWarehouse.selectedOptionValue,
      destination_warehouse_id: TransferRequestDestinationWare.selectedOptionValue,
      total_quantity: totals.quantity,
      total_value: totals.value,
      item_count: this.rows().length
    };
  },

  async writeAuditSimple(documentId, actionType, status) {
    if (typeof AuditLog === "undefined") return;

    await AuditLog.insert({
      entityName: "documents",
      entityId: documentId,
      actionType,
      newValues: {
        source: "Transfer Request",
        status
      }
    });
  },

  async refreshLists() {
    if (typeof ListTransferRequests !== "undefined") await ListTransferRequests.run();
    if (typeof ListTransferRequestItems !== "undefined") await ListTransferRequestItems.run();
    if (typeof ListGoodsInTransit !== "undefined") await ListGoodsInTransit.run();
    if (typeof InventoryBalanceQuery !== "undefined") await InventoryBalanceQuery.run();
    if (typeof StockMovementsQuery !== "undefined") await StockMovementsQuery.run();
  },

  async afterSave() {
    await storeValue("currentTransferRequestId", null);
    await storeValue("currentTransferRequestStatus", null);
    await storeValue("transferRequestBeforeEdit", null);
    await storeValue("transferRequestItems", []);

    await this.refreshLists();
    closeModal(TransferRequestModal.name);
  },

  async cancel() {
    await storeValue("currentTransferRequestId", null);
    await storeValue("currentTransferRequestStatus", null);
    await storeValue("transferRequestBeforeEdit", null);
    await storeValue("transferRequestItems", []);
    closeModal(TransferRequestModal.name);
  }
};

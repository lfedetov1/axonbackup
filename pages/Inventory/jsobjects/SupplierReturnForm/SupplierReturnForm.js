export default {
  rows() {
    return appsmith.store.supplierReturnItems || [];
  },

  documentId() {
    return appsmith.store.currentSupplierReturnId || null;
  },

  isEditMode() {
    return !!this.documentId();
  },

  recalc(rows) {
    return (rows || []).map((row, index) => {
      const returnQuantity = Number(row.returnQuantity || 0);
      const unitCost = Number(row.unitCost || 0);

      return {
        ...row,
        lineNo: index + 1,
        returnQuantity,
        unitCost,
        lineTotal: Number((returnQuantity * unitCost).toFixed(2))
      };
    });
  },

  async setRows(rows) {
    await storeValue("supplierReturnItems", this.recalc(rows || []));
  },

  tableRows() {
    if (
      typeof SupplierReturnItemsEditTable !== "undefined" &&
      Array.isArray(SupplierReturnItemsEditTable.tableData) &&
      SupplierReturnItemsEditTable.tableData.length
    ) {
      return SupplierReturnItemsEditTable.tableData;
    }

    return this.rows();
  },

  totals(rows = this.rows()) {
    return (rows || []).reduce(
      (sum, row) => ({
        quantity: sum.quantity + Number(row.returnQuantity || 0),
        value: sum.value + Number(row.lineTotal || 0)
      }),
      { quantity: 0, value: 0 }
    );
  },

  async startNew() {
    await storeValue("currentSupplierReturnId", null);
    await storeValue("supplierReturnEditMode", false);
    await storeValue("supplierReturnBeforeEdit", null);
    await storeValue("supplierReturnSourceDocumentId", null);
    await storeValue("supplierReturnItems", []);

    await GetNextSupplierReturnNumber.run();

    SupplierReturnNumberInput.setValue(GetNextSupplierReturnNumber.data?.[0]?.nextSupplierReturnNumber || "");
    SupplierReturnStatusInput.setValue("DRAFT");
    SupplierReturnDateInput.setValue(moment().format("YYYY-MM-DD"));
    SupplierReturnSourceNumberInpu.setValue("");
    SupplierReturnReasonSelect.setSelectedOption("RETURN_TO_SUPPLIER");
    SupplierReturnNoteInput.setValue("");

    SupplierReturnSupplierSelect.setSelectedOption("");
    SupplierReturnWarehouseSelect.setSelectedOption(
      String(InventoryWarehouseSelect.selectedOptionValue || appsmith.store.warehouseId || "")
    );

    if (typeof SupplierReturnBarcodeInput !== "undefined") {
      SupplierReturnBarcodeInput.setValue("");
    }

    showModal(SupplierReturnModal.name);
  },

  async loadSourceDocument() {
    const pick = (row, keys, fallback = "") => {
      for (const key of keys) {
        if (row?.[key] !== undefined && row?.[key] !== null) return row[key];
      }
      return fallback;
    };

    const num = (row, keys, fallback = 0) => Number(pick(row, keys, fallback) || 0);

    if (!SupplierReturnSourceNumberInpu.text.trim()) {
      showAlert("Source receipt number is required.", "warning");
      return;
    }

    const headerRows = await FindSupplierReturnSourceDocume.run();
    const source = headerRows?.[0] || FindSupplierReturnSourceDocume.data?.[0];

    if (!source) {
      showAlert("Source goods receipt was not found.", "error");
      return;
    }

    const sourceDocumentId = source.sourceDocumentId || source.documentId || source.id || source.ID;

    await storeValue("supplierReturnSourceDocumentId", sourceDocumentId);

    SupplierReturnSupplierSelect.setSelectedOption(source.supplierId ? String(source.supplierId) : "");
    SupplierReturnWarehouseSelect.setSelectedOption(source.warehouseId ? String(source.warehouseId) : "");

    const itemRows = await GetSupplierReturnSourceItems.run({ sourceDocumentId });
    const rawItems = itemRows || GetSupplierReturnSourceItems.data || [];

    const mapped = rawItems.map(row => {
      const receivedQuantity = num(row, ["receivedQuantity", "Received Quantity", "quantity", "Quantity"]);
      const alreadyReturnedQuantity = num(row, ["alreadyReturnedQuantity", "Already Returned Quantity"]);
      const remainingQuantity = num(row, ["remainingQuantity", "Remaining Quantity"], receivedQuantity - alreadyReturnedQuantity);

      return {
        lineNo: num(row, ["lineNo", "Line No"]),
        sourceItemId: pick(row, ["sourceItemId", "Source Item ID", "documentItemId"]),
        barcode: pick(row, ["barcode", "Barcode"]),
        productId: pick(row, ["productId", "Product ID"]),
        productCode: pick(row, ["productCode", "Product Code"]),
        productName: pick(row, ["productName", "Product Name"]),
        sku: pick(row, ["sku", "SKU"]),
        description: pick(row, ["description", "Description", "productName", "Product Name"]),
        unitId: pick(row, ["unitId", "Unit ID"]),
        unitCode: pick(row, ["unitCode", "Unit"]),
        receivedQuantity,
        alreadyReturnedQuantity,
        remainingQuantity,
        returnQuantity: 0,
        unitCost: num(row, ["unitCost", "Unit Cost", "unitPrice", "Unit Price"]),
        lineTotal: 0,
        reason: SupplierReturnReasonSelect.selectedOptionValue || "RETURN_TO_SUPPLIER",
        note: ""
      };
    }).filter(row => Number(row.remainingQuantity || 0) > 0);

    await this.setRows(mapped);
    showAlert(`${mapped.length} source item(s) loaded.`, "success");
  },

  async updateRows() {
    await this.setRows(this.tableRows());
  },

  async removeSelectedRow() {
    const rows = this.rows();
    let selectedIndex = SupplierReturnItemsEditTable.selectedRowIndex ?? SupplierReturnItemsEditTable.triggeredRowIndex ?? -1;

    if (selectedIndex < 0 && SupplierReturnItemsEditTable.selectedRow?.lineNo) {
      selectedIndex = rows.findIndex(row => Number(row.lineNo) === Number(SupplierReturnItemsEditTable.selectedRow.lineNo));
    }

    if (selectedIndex < 0) {
      showAlert("Select row first.", "warning");
      return;
    }

    await this.setRows(rows.filter((_, index) => index !== selectedIndex));
  },

  async scanBarcode(value) {
    const lookup = String(value || "").trim();
    if (!lookup) return;

    const rows = [...this.rows()];
    const index = rows.findIndex(row =>
      String(row.barcode || "").trim() === lookup ||
      String(row.productCode || "").trim() === lookup ||
      String(row.sku || "").trim() === lookup
    );

    if (index < 0) {
      showAlert("Product is not on the loaded source receipt.", "warning");
      SupplierReturnBarcodeInput.setValue("");
      return;
    }

    const row = rows[index];
    const nextQty = Number(row.returnQuantity || 0) + 1;

    if (nextQty > Number(row.remainingQuantity || 0)) {
      showAlert(`Cannot return more than remaining quantity for ${row.productCode}.`, "warning");
      SupplierReturnBarcodeInput.setValue("");
      return;
    }

    rows[index] = { ...row, returnQuantity: nextQty };
    await this.setRows(rows);
    SupplierReturnBarcodeInput.setValue("");
  },

  async scanBarcodeDebounced(value) {
    const lookup = String(value || "").trim();
    if (!lookup || lookup.length < 3) return;

    await storeValue("supplierReturnScanLastValue", lookup);

    setTimeout(() => {
      if (appsmith.store.supplierReturnScanLastValue === lookup) {
        this.scanBarcode(lookup);
      }
    }, 300);
  },

  validate(rows) {
    if (!SupplierReturnNumberInput.text.trim()) {
      showAlert("Return number is required.", "warning");
      return false;
    }

    if (!appsmith.store.supplierReturnSourceDocumentId) {
      showAlert("Load source goods receipt first.", "warning");
      return false;
    }

    if (!SupplierReturnSupplierSelect.selectedOptionValue) {
      showAlert("Supplier is required.", "warning");
      return false;
    }

    if (!SupplierReturnWarehouseSelect.selectedOptionValue || Number(SupplierReturnWarehouseSelect.selectedOptionValue) === 0) {
      showAlert("Warehouse is required.", "warning");
      return false;
    }

    const activeRows = (rows || []).filter(row => Number(row.returnQuantity || 0) > 0);

    if (!activeRows.length) {
      showAlert("Enter return quantity for at least one item.", "warning");
      return false;
    }

    const invalid = activeRows.find(row =>
      !row.productId ||
      Number(row.returnQuantity || 0) <= 0 ||
      Number(row.returnQuantity || 0) > Number(row.remainingQuantity || 0)
    );

    if (invalid) {
      showAlert(`Invalid return quantity for ${invalid.productCode}.`, "error");
      return false;
    }

    return true;
  },

  async saveDraft() {
    try {
      const syncedRows = this.recalc(this.tableRows());
      await storeValue("supplierReturnItems", syncedRows);

      if (!this.validate(syncedRows)) return;

      const wasEditMode = this.isEditMode();
      const documentIdForDuplicate = this.documentId() || 0;

      const duplicate = await CheckSupplierReturnNumberDupli.run({ documentId: documentIdForDuplicate });

      if (duplicate?.length || CheckSupplierReturnNumberDupli.data?.length) {
        showAlert("Supplier return number already exists.", "error");
        return;
      }

      const rows = this.recalc(syncedRows.filter(row => Number(row.returnQuantity || 0) > 0));
      const totals = this.totals(rows);
      let documentId = this.documentId();

      if (wasEditMode) {
        await UpdateSupplierReturnDocument.run({ documentId, totalAmount: totals.value });
        await DeleteSupplierReturnItems.run({ documentId });
      } else {
        await InsertSupplierReturnDocument.run({
          status: "DRAFT",
          totalAmount: totals.value
        });

        const idRows = await GetSupplierReturnIdByNumber.run();
        const found = idRows?.[0] || GetSupplierReturnIdByNumber.data?.[0];
        documentId = found?.documentId;

        if (!documentId) {
          showAlert("Supplier return was saved, but ID was not found.", "error");
          return;
        }
      }

      for (let i = 0; i < rows.length; i += 1) {
        await InsertSupplierReturnItem.run({
          documentId,
          lineNo: i + 1,
          productId: rows[i].productId,
          description: rows[i].description || rows[i].productName,
          quantity: rows[i].returnQuantity,
          unitId: rows[i].unitId,
          unitCost: rows[i].unitCost || 0,
          lineTotal: rows[i].lineTotal || 0,
          note: [
            `Reason: ${rows[i].reason || SupplierReturnReasonSelect.selectedOptionValue || ""}`,
            rows[i].note || ""
          ].filter(Boolean).join(" | ")
        });
      }

      if (typeof AuditLog !== "undefined") {
        await AuditLog.insert({
          entityName: "documents",
          entityId: documentId,
          actionType: wasEditMode ? "UPDATE" : "INSERT",
          oldValues: wasEditMode ? appsmith.store.supplierReturnBeforeEdit || null : null,
          newValues: this.getAuditValues(documentId, rows)
        });
      }

      await this.afterSave(documentId);
      showAlert(wasEditMode ? "Supplier return was updated." : "Supplier return was saved.", "success");
    } catch (error) {
      showAlert("Error while saving supplier return: " + error.message, "error");
      console.log(error);
    }
  },

  async loadForEdit(row = null) {
    const selected = row || SupplierReturnsTable.triggeredRow || SupplierReturnsTable.selectedRow || {};
    const documentId = selected.documentId || selected.id || selected.ID || selected["Return ID"];

    if (!documentId) {
      showAlert("Select supplier return first.", "warning");
      return;
    }

    const headerRows = await GetSupplierReturnForEdit.run({ documentId });
    const header = headerRows?.[0] || GetSupplierReturnForEdit.data?.[0];

    if (!header) {
      showAlert("Supplier return was not found.", "error");
      return;
    }

    if (header.status !== "DRAFT") {
      showAlert("Only draft supplier returns can be edited.", "warning");
      return;
    }

    const itemRows = await GetSupplierReturnItemsForEdit.run({ documentId });
    const items = itemRows || GetSupplierReturnItemsForEdit.data || [];

    await storeValue("currentSupplierReturnId", header.documentId);
    await storeValue("supplierReturnEditMode", true);
    await storeValue("supplierReturnSourceDocumentId", header.sourceDocumentId);
    await storeValue("supplierReturnBeforeEdit", { header, items });

    SupplierReturnNumberInput.setValue(header.documentNumber || "");
    SupplierReturnStatusInput.setValue(header.status || "DRAFT");
    SupplierReturnDateInput.setValue(header.documentDate || "");
    SupplierReturnSourceNumberInpu.setValue(header.sourceDocumentNumber || "");
    SupplierReturnSupplierSelect.setSelectedOption(header.supplierId ? String(header.supplierId) : "");
    SupplierReturnWarehouseSelect.setSelectedOption(header.warehouseId ? String(header.warehouseId) : "");
    SupplierReturnReasonSelect.setSelectedOption("RETURN_TO_SUPPLIER");
    SupplierReturnNoteInput.setValue(header.note || "");

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
      receivedQuantity: Number(row.returnQuantity || 0),
      alreadyReturnedQuantity: 0,
      remainingQuantity: Number(row.remainingQuantity || row.returnQuantity || 0),
      returnQuantity: Number(row.returnQuantity || 0),
      unitCost: Number(row.unitCost || 0),
      lineTotal: Number(row.lineTotal || 0),
      reason: "RETURN_TO_SUPPLIER",
      note: row.note || ""
    })));

    showModal(SupplierReturnModal.name);
  },

  async post(row = null) {
    const documentId = this.getDocumentIdFromRow(row);
    if (!documentId) return;

    try {
      const headerRows = await GetSupplierReturnForPost.run({ documentId });
      const header = headerRows?.[0] || GetSupplierReturnForPost.data?.[0];

      if (!header || header.status !== "DRAFT") {
        showAlert("Only draft supplier returns can be posted.", "warning");
        return;
      }

      const itemRows = await GetSupplierReturnItemsForPost.run({ documentId });
      const items = itemRows || GetSupplierReturnItemsForPost.data || [];

      for (const item of items) {
        if (Number(item.trackStock || 0) === 1) {
          await InsertSupplierReturnStockMovem.run({
            documentId,
            documentItemId: item.documentItemId,
            warehouseId: header.warehouseId,
            productId: item.productId,
            movementDate: moment(header.documentDate).format("YYYY-MM-DD"),
            quantity: item.quantity,
            unitCost: item.unitCost || 0,
            totalCost: item.lineTotal || 0,
            note: `Supplier return ${header.documentNumber}`
          });
        }
      }

      await PostSupplierReturn.run({ documentId });

      if (typeof AuditLog !== "undefined") {
        await AuditLog.insert({
          entityName: "documents",
          entityId: documentId,
          actionType: "POST",
          newValues: {
            source: "Supplier Return",
            document_number: header.documentNumber,
            status: "POSTED"
          }
        });
      }

      await this.refreshLists(documentId);
      showAlert("Supplier return was posted.", "success");
    } catch (error) {
      showAlert("Error while posting supplier return: " + error.message, "error");
      console.log(error);
    }
  },

  async voidReturn(row = null) {
    const documentId = this.getDocumentIdFromRow(row);
    if (!documentId) return;

    try {
      const headerRows = await GetSupplierReturnForPost.run({ documentId });
      const header = headerRows?.[0] || GetSupplierReturnForPost.data?.[0];

      if (!header) {
        showAlert("Supplier return was not found.", "error");
        return;
      }

      if (header.status === "POSTED") {
        const itemRows = await GetSupplierReturnItemsForPost.run({ documentId });
        const items = itemRows || GetSupplierReturnItemsForPost.data || [];

        for (const item of items) {
          if (Number(item.trackStock || 0) === 1) {
            await InsertSupplierReturnVoidMoveme.run({
              documentId,
              documentItemId: item.documentItemId,
              warehouseId: header.warehouseId,
              productId: item.productId,
              quantity: item.quantity,
              unitCost: item.unitCost || 0,
              totalCost: item.lineTotal || 0,
              note: `Void supplier return ${header.documentNumber}`
            });
          }
        }
      }

      await VoidSupplierReturn.run({ documentId });

      if (typeof AuditLog !== "undefined") {
        await AuditLog.insert({
          entityName: "documents",
          entityId: documentId,
          actionType: "VOID",
          newValues: {
            source: "Supplier Return",
            document_number: header.documentNumber,
            status: "CANCELLED"
          }
        });
      }

      await this.refreshLists(documentId);
      showAlert("Supplier return was cancelled.", "success");
    } catch (error) {
      showAlert("Error while voiding supplier return: " + error.message, "error");
      console.log(error);
    }
  },

  getDocumentIdFromRow(row = null) {
    const selected = row || SupplierReturnsTable.triggeredRow || SupplierReturnsTable.selectedRow || {};
    const documentId = selected.documentId || selected.id || selected.ID || selected["Return ID"];

    if (!documentId) {
      showAlert("Select supplier return first.", "warning");
      return null;
    }

    return documentId;
  },

  getAuditValues(documentId, rows = this.rows()) {
    const totals = this.totals(rows);

    return {
      source: "Supplier Return form",
      document_id: documentId,
      document_number: SupplierReturnNumberInput.text,
      source_document_id: appsmith.store.supplierReturnSourceDocumentId,
      supplier_id: SupplierReturnSupplierSelect.selectedOptionValue,
      warehouse_id: SupplierReturnWarehouseSelect.selectedOptionValue,
      reason: SupplierReturnReasonSelect.selectedOptionValue,
      total_quantity: totals.quantity,
      total_value: totals.value,
      item_count: rows.length
    };
  },

  async refreshLists(documentId = 0) {
    if (typeof ListSupplierReturns !== "undefined") await ListSupplierReturns.run();

    if (typeof ListSupplierReturnItems !== "undefined") {
      await ListSupplierReturnItems.run({
        documentId: documentId || SupplierReturnsTable.selectedRow?.documentId || 0
      });
    }

    if (typeof InventoryBalanceQuery !== "undefined") await InventoryBalanceQuery.run();
    if (typeof StockMovementsQuery !== "undefined") await StockMovementsQuery.run();
  },

  async afterSave(documentId = 0) {
    closeModal(SupplierReturnModal.name);

    await this.refreshLists(documentId);

    await storeValue("currentSupplierReturnId", null);
    await storeValue("supplierReturnEditMode", false);
    await storeValue("supplierReturnBeforeEdit", null);
    await storeValue("supplierReturnSourceDocumentId", null);
    await storeValue("supplierReturnItems", []);
  },

  async cancel() {
    closeModal(SupplierReturnModal.name);

    await storeValue("currentSupplierReturnId", null);
    await storeValue("supplierReturnEditMode", false);
    await storeValue("supplierReturnBeforeEdit", null);
    await storeValue("supplierReturnSourceDocumentId", null);
    await storeValue("supplierReturnItems", []);
  }
};

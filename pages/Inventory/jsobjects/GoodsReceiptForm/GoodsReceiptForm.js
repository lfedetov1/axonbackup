export default {
  rows() {
    return appsmith.store.goodsReceiptItems || [];
  },

  receiptId() {
    return appsmith.store.currentGoodsReceiptId || null;
  },

  receiptStatus() {
    return appsmith.store.currentGoodsReceiptStatus || null;
  },

  isEditMode() {
    return !!this.receiptId();
  },

  recalcRow(row) {
    const quantity = Number(row.quantity || 0);
    const unitCost = Number(row.unitCost || 0);

    return {
      ...row,
      quantity: String(row.quantity === "" ? "" : quantity),
      unitCost: String(row.unitCost === "" ? "" : unitCost),
      lineTotal: Number((quantity * unitCost).toFixed(2))
    };
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

  async setRows(rows) {
    await storeValue(
      "goodsReceiptItems",
      rows.map((row, index) => ({
        ...this.recalcRow(row),
        lineNo: index + 1
      }))
    );
  },

  async startNew() {
    await storeValue("goodsReceiptItems", []);
    await storeValue("currentGoodsReceiptId", null);
    await storeValue("currentGoodsReceiptStatus", null);
    await storeValue("goodsReceiptBeforeEdit", null);
    await storeValue("inventoryMode", "NEW_GOODS_RECEIPT");

    GoodsReceiptDateInput.setValue(moment().format("YYYY-MM-DD"));
    GoodsReceiptNoteInput.setValue("");

    if (typeof GoodsReceiptSupplierSelect !== "undefined") {
      GoodsReceiptSupplierSelect.setSelectedOption("");
    }

    if (typeof GoodsReceiptWarehouseSelect !== "undefined") {
      GoodsReceiptWarehouseSelect.setSelectedOption(
        String(InventoryWarehouseSelect.selectedOptionValue || appsmith.store.warehouseId || "")
      );
    }

    await GetNextGoodsReceiptNumber.run();
    GoodsReceiptNumberInput.setValue(GetNextGoodsReceiptNumber.data?.[0]?.nextReceiptNumber || "");
  },

  async addRow() {
    await this.setRows([
      ...this.rows(),
      {
        barcode: "",
        productId: null,
        productCode: "",
        productName: "",
        sku: "",
        unitId: null,
        unitCode: "",
        currentStock: 0,
        quantity: "1",
        unitCost: "0",
        lineTotal: 0,
        batchNumber: "",
        serialNumber: "",
        expiryDate: "",
        note: ""
      }
    ]);
  },

  async removeRow(rowIndex) {
    await this.setRows(this.rows().filter((_, index) => index !== rowIndex));
  },

  async updateRow(rowIndex, patch) {
    const rows = [...this.rows()];
    rows[rowIndex] = this.recalcRow({
      ...(rows[rowIndex] || {}),
      ...patch
    });
    await this.setRows(rows);
  },

  async clearRows() {
    await storeValue("goodsReceiptItems", []);
  },

  async resolveProduct(rowIndex, lookupValue) {
    const lookup = String(lookupValue || "").trim();
    const warehouseId = GoodsReceiptWarehouseSelect.selectedOptionValue;

    if (!lookup) {
      showAlert("Enter barcode, product code, SKU, or product name.", "warning");
      return;
    }

    if (!warehouseId || Number(warehouseId) === 0) {
      showAlert("Select warehouse first.", "warning");
      return;
    }

    const result = await FindGoodsReceiptProduct.run({ lookup, warehouseId });

    const product =
      (Array.isArray(result) ? result[0] : null) ||
      (Array.isArray(FindGoodsReceiptProduct.data) ? FindGoodsReceiptProduct.data[0] : null);

    if (!product) {
      showAlert("Product was not found.", "warning");
      return;
    }

    const rows = [...this.rows()];
    const current = rows[rowIndex] || {};

    rows[rowIndex] = this.recalcRow({
      ...current,
      barcode: product.barcode || lookup,
      productId: product.productId,
      productCode: product.productCode,
      productName: product.productName,
      sku: product.sku || "",
      unitId: product.unitId,
      unitCode: product.unitCode || "",
      currentStock: Number(product.currentStock || 0),
      quantity: current.quantity || "1",
      unitCost: String(product.purchasePrice || current.unitCost || 0),
      batchNumber: current.batchNumber || "",
      serialNumber: current.serialNumber || "",
      expiryDate: current.expiryDate || "",
      note: current.note || ""
    });

    await this.setRows(rows);
  },

  validateBeforeSave() {
    if (!GoodsReceiptNumberInput.text.trim()) {
      showAlert("Receipt number is required.", "warning");
      return false;
    }

    if (!GoodsReceiptDateInput.selectedDate && !GoodsReceiptDateInput.text) {
      showAlert("Receipt date is required.", "warning");
      return false;
    }

    if (!GoodsReceiptWarehouseSelect.selectedOptionValue || Number(GoodsReceiptWarehouseSelect.selectedOptionValue) === 0) {
      showAlert("Warehouse is required.", "warning");
      return false;
    }

    if (!this.rows().length) {
      showAlert("Add at least one product.", "warning");
      return false;
    }

    for (const row of this.rows()) {
      if (!row.productId) {
        showAlert("Every row must have a valid product.", "warning");
        return false;
      }

      if (Number(row.quantity || 0) <= 0) {
        showAlert("Quantity must be greater than zero.", "warning");
        return false;
      }
    }

    return true;
  },

  async insertItems(receiptId, postStock = false) {
    const warehouseId = GoodsReceiptWarehouseSelect.selectedOptionValue;
    const receiptDate = GoodsReceiptDateInput.selectedDate || GoodsReceiptDateInput.selectedDate || moment().format("YYYY-MM-DD");

    for (const row of this.rows()) {
      const quantity = Math.abs(Number(row.quantity || 0));
      const unitCost = Number(row.unitCost || 0);
      const lineTotal = Number((quantity * unitCost).toFixed(2));

      await InsertGoodsReceiptItem.run({
        receiptId,
        lineNo: row.lineNo,
        productId: row.productId,
        description: row.productName,
        unitId: row.unitId,
        warehouseId,
        quantity,
        unitCost,
        lineTotal,
        batchNumber: row.batchNumber || null,
        serialNumber: row.serialNumber || null,
        expiryDate: row.expiryDate || null,
        note: row.note || null
      });

      if (postStock) {
        const itemRows = await GetLastGoodsReceiptItemId.run({
          receiptId,
          lineNo: row.lineNo
        });

        const itemId = itemRows?.[0]?.itemId || GetLastGoodsReceiptItemId.data?.[0]?.itemId;

        await PostGoodsReceiptStockMovement.run({
          receiptId,
          itemId,
          warehouseId,
          productId: row.productId,
          movementDate: receiptDate,
          quantity,
          unitCost,
          lineTotal,
          batchNumber: row.batchNumber || null,
          serialNumber: row.serialNumber || null,
          note: row.note || GoodsReceiptNoteInput.text || null
        });
      }
    }
  },

  async createDocument(status = "DRAFT", postStock = false) {
    if (!this.validateBeforeSave()) return null;

    const duplicate = await CheckGoodsReceiptNumberDuplica.run();

    if (duplicate?.length || CheckGoodsReceiptNumberDuplica.data?.length) {
      showAlert("Receipt number already exists.", "error");
      return null;
    }

    const totals = this.totals();
    const warehouseId = GoodsReceiptWarehouseSelect.selectedOptionValue;
    const receiptDate = GoodsReceiptDateInput.selectedDate || GoodsReceiptDateInput.text || moment().format("YYYY-MM-DD");

    await InsertGoodsReceiptDocument.run({
      warehouseId,
      supplierId: GoodsReceiptSupplierSelect.selectedOptionValue || null,
      status,
      receiptDate,
      note: GoodsReceiptNoteInput.text || null,
      totalAmount: totals.value
    });

    const docRows = await GetGoodsReceiptDocumentIdByNum.run();
    const receiptId = docRows?.[0]?.receiptId || GetGoodsReceiptDocumentIdByNum.data?.[0]?.receiptId;

    if (!receiptId) {
      showAlert("Receipt was saved, but ID was not found.", "error");
      return null;
    }

    await this.insertItems(receiptId, postStock);
    await this.writeAudit("INSERT", receiptId, null, this.getAuditValues(receiptId, status));

    return receiptId;
  },

  async updateDraft(postAfterUpdate = false) {
    if (!this.validateBeforeSave()) return null;

    const receiptId = this.receiptId();

    if (!receiptId) {
      showAlert("Receipt ID is missing.", "error");
      return null;
    }

    if (this.receiptStatus() !== "DRAFT") {
      showAlert("Only draft receipts can be edited.", "warning");
      return null;
    }

    const totals = this.totals();
    const oldValues = appsmith.store.goodsReceiptBeforeEdit || null;

    await UpdateGoodsReceiptDocument.run({
      receiptId,
      warehouseId: GoodsReceiptWarehouseSelect.selectedOptionValue,
      supplierId: GoodsReceiptSupplierSelect.selectedOptionValue || null,
      receiptDate: GoodsReceiptDateInput.selectedDate || GoodsReceiptDateInput.selectedDate || moment().format("YYYY-MM-DD"),
      note: GoodsReceiptNoteInput.text || null,
      totalAmount: totals.value
    });

    await DeleteGoodsReceiptItems.run({ receiptId });
    await this.insertItems(receiptId, postAfterUpdate);

    if (postAfterUpdate) {
      await UpdateGoodsReceiptStatus.run({ receiptId, status: "POSTED" });
      await this.writeAudit("UPDATE", receiptId, oldValues, this.getAuditValues(receiptId, "POSTED"));
    } else {
      await this.writeAudit("UPDATE", receiptId, oldValues, this.getAuditValues(receiptId, "DRAFT"));
    }

    return receiptId;
  },

  async saveDraft() {
    try {
      let receiptId;

      if (this.isEditMode()) {
        receiptId = await this.updateDraft(false);
      } else {
        receiptId = await this.createDocument("DRAFT", false);
      }

      if (!receiptId) return;

      await this.afterSave();
      showAlert("Goods receipt was saved as draft.", "success");
    } catch (error) {
      showAlert("Error while saving goods receipt: " + error.message, "error");
      console.log(error);
    }
  },

  async post() {
    try {
      let receiptId;

      if (this.isEditMode()) {
        receiptId = await this.updateDraft(true);
      } else {
        receiptId = await this.createDocument("POSTED", true);
      }

      if (!receiptId) return;

      await this.afterSave();
      showAlert("Goods receipt was posted.", "success");
    } catch (error) {
      showAlert("Error while posting goods receipt: " + error.message, "error");
      console.log(error);
    }
  },

  async loadForEdit(row = null) {
    const selected = row || GoodsReceiptTable.triggeredRow || GoodsReceiptTable.selectedRow;
    const receiptId =
      selected?.["Receipt ID"] ||
      selected?.receiptId ||
      selected?.id;

    if (!receiptId) {
      showAlert("Select a goods receipt first.", "warning");
      return;
    }

    const docRows = await GetGoodsReceiptForEdit.run({ receiptId });
    const doc = docRows?.[0] || GetGoodsReceiptForEdit.data?.[0];

    if (!doc) {
      showAlert("Goods receipt was not found.", "error");
      return;
    }

    await storeValue("currentGoodsReceiptId", doc.receiptId);
    await storeValue("currentGoodsReceiptStatus", doc.status);
    await storeValue("inventoryMode", "NEW_GOODS_RECEIPT");

    GoodsReceiptNumberInput.setValue(doc.receiptNumber || "");
    GoodsReceiptDateInput.setValue(doc.receiptDate || "");
    GoodsReceiptWarehouseSelect.setSelectedOption(doc.warehouseId ? String(doc.warehouseId) : "");
    GoodsReceiptSupplierSelect.setSelectedOption(doc.supplierId ? String(doc.supplierId) : "");
    GoodsReceiptNoteInput.setValue(doc.note || "");

    const itemRows = await GetGoodsReceiptItemsForEdit.run({ receiptId });

    await this.setRows(
      (itemRows || GetGoodsReceiptItemsForEdit.data || []).map(row => ({
        lineNo: row.lineNo,
        barcode: row.barcode || "",
        productId: row.productId,
        productCode: row.productCode,
        productName: row.productName,
        sku: row.sku || "",
        unitId: row.unitId,
        unitCode: row.unitCode,
        currentStock: Number(row.currentStock || 0),
        quantity: String(row.quantity || "0"),
        unitCost: String(row.unitCost || "0"),
        lineTotal: Number(row.lineTotal || 0),
        batchNumber: row.batchNumber || "",
        serialNumber: row.serialNumber || "",
        expiryDate: row.expiryDate || "",
        note: row.note || ""
      }))
    );

    await storeValue("goodsReceiptBeforeEdit", {
      document: doc,
      items: this.rows()
    });
  },

  async voidReceipt(row = null) {
    const selected = row || GoodsReceiptTable.triggeredRow || GoodsReceiptTable.selectedRow;
    const receiptId =
      selected?.["Receipt ID"] ||
      selected?.receiptId ||
      this.receiptId();

    if (!receiptId) {
      showAlert("Select a goods receipt first.", "warning");
      return;
    }

    const docRows = await GetGoodsReceiptForEdit.run({ receiptId });
    const doc = docRows?.[0] || GetGoodsReceiptForEdit.data?.[0];

    if (!doc) {
      showAlert("Goods receipt was not found.", "error");
      return;
    }

    if (doc.status === "CANCELLED") {
      showAlert("This receipt is already cancelled.", "warning");
      return;
    }

    if (doc.status === "DRAFT") {
      await UpdateGoodsReceiptStatus.run({ receiptId, status: "CANCELLED" });
      await this.writeAudit("UPDATE", receiptId, doc, { ...doc, status: "CANCELLED" });
      await this.afterSave();
      showAlert("Draft goods receipt was cancelled.", "success");
      return;
    }

    const movements = await GetGoodsReceiptStockMovementsF.run({ receiptId });
    const rows = movements || GetGoodsReceiptStockMovementsF.data || [];

    for (const row of rows) {
      const availableRows = await GetCurrentStockForProduct.run({
        productId: row.productId,
        warehouseId: row.warehouseId
      });

      const available = Number(availableRows?.[0]?.currentStock || GetCurrentStockForProduct.data?.[0]?.currentStock || 0);

      if (Number(row.quantity || 0) > available) {
        showAlert(
          `Cannot void receipt because ${row.productCode} does not have enough stock in ${row.warehouseCode}. Available: ${available}`,
          "error"
        );
        return;
      }

      await InsertStockMovement.run({
        warehouseId: row.warehouseId,
        productId: row.productId,
        documentId: receiptId,
        documentItemId: row.itemId || null,
        movementType: "OUT",
        movementDate: moment().format("YYYY-MM-DD HH:mm:ss"),
        quantity: Math.abs(Number(row.quantity || 0)),
        unitCost: Number(row.unitCost || 0),
        totalCost: Math.abs(Number(row.totalCost || 0)),
        batchNumber: row.batchNumber || null,
        serialNumber: row.serialNumber || null,
        note: "Void goods receipt"
      });
    }

    await VoidGoodsReceiptDocument.run({ receiptId });
    await this.writeAudit("UPDATE", receiptId, doc, { ...doc, status: "CANCELLED" });

    await this.afterSave();
    showAlert("Goods receipt was voided and stock was reversed.", "success");
  },

  getAuditValues(receiptId, status) {
    const totals = this.totals();

    return {
      source: "Goods receipt form",
      document_id: receiptId,
      document_type: "PURCHASE_RECEIPT",
      document_number: GoodsReceiptNumberInput.text.trim(),
      status,
      warehouse_id: GoodsReceiptWarehouseSelect.selectedOptionValue,
      supplier_id: GoodsReceiptSupplierSelect.selectedOptionValue || null,
      receipt_date: GoodsReceiptDateInput.selectedDate || GoodsReceiptDateInput.text || null,
      total_quantity: totals.quantity,
      total_value: totals.value,
      item_count: this.rows().length,
      items: this.rows().map(row => ({
        line_no: row.lineNo,
        product_id: row.productId,
        product_code: row.productCode,
        product_name: row.productName,
        quantity: row.quantity,
        unit_cost: row.unitCost,
        line_total: row.lineTotal,
        batch_number: row.batchNumber || null,
        serial_number: row.serialNumber || null,
        expiry_date: row.expiryDate || null
      }))
    };
  },

  async writeAudit(actionType, receiptId, oldValues = null, newValues = null) {
    if (typeof AuditLog === "undefined") return;

    await AuditLog.insert({
      entityName: "documents",
      entityId: receiptId,
      actionType,
      oldValues,
      newValues
    });
  },

  async afterSave() {
    await storeValue("goodsReceiptItems", []);
    await storeValue("currentGoodsReceiptId", null);
    await storeValue("currentGoodsReceiptStatus", null);
    await storeValue("goodsReceiptBeforeEdit", null);
    await storeValue("inventoryMode", "LIST");

    if (typeof ListGoodsReceipts !== "undefined") await ListGoodsReceipts.run();
    if (typeof ListGoodsReceiptItems !== "undefined") await ListGoodsReceiptItems.run();
    if (typeof InventorySummaryQuery !== "undefined") await InventorySummaryQuery.run();
    if (typeof InventoryBalanceQuery !== "undefined") await InventoryBalanceQuery.run();
    if (typeof StockMovementsQuery !== "undefined") await StockMovementsQuery.run();
  },

  async cancel() {
    await storeValue("goodsReceiptItems", []);
    await storeValue("currentGoodsReceiptId", null);
    await storeValue("currentGoodsReceiptStatus", null);
    await storeValue("goodsReceiptBeforeEdit", null);
    await storeValue("inventoryMode", "LIST");
  }
};

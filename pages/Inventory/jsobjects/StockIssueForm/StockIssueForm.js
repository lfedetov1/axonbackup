export default {
  rows() {
    return appsmith.store.stockIssueItems || [];
  },

  issueId() {
    return appsmith.store.currentStockIssueId || null;
  },

  issueStatus() {
    return appsmith.store.currentStockIssueStatus || null;
  },

  isEditMode() {
    return !!this.issueId();
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
      "stockIssueItems",
      rows.map((row, index) => ({
        ...this.recalcRow(row),
        lineNo: index + 1
      }))
    );
  },

  async startNew() {
    await storeValue("stockIssueItems", []);
    await storeValue("currentStockIssueId", null);
    await storeValue("currentStockIssueStatus", null);
    await storeValue("stockIssueBeforeEdit", null);
    await storeValue("inventoryMode", "NEW_STOCK_ISSUE");

    StockIssueDateInput.setValue(moment().format("YYYY-MM-DD"));
    StockIssueNoteInput.setValue("");

    if (typeof StockIssueReasonSelect !== "undefined") {
      StockIssueReasonSelect.setSelectedOption("WRITE_OFF");
    }

    if (typeof StockIssueWarehouseSelect !== "undefined") {
      StockIssueWarehouseSelect.setSelectedOption(
        String(InventoryWarehouseSelect.selectedOptionValue || appsmith.store.warehouseId || "")
      );
    }

    await GetNextStockIssueNumber.run();
    StockIssueNumberInput.setValue(GetNextStockIssueNumber.data?.[0]?.nextIssueNumber || "");
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

  async clearRow(rowIndex) {
    const rows = [...this.rows()];

    rows[rowIndex] = {
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
    };

    await this.setRows(rows);
  },

  async updateRow(rowIndex, patch) {
    const rows = [...this.rows()];
    rows[rowIndex] = this.recalcRow({
      ...(rows[rowIndex] || {}),
      ...patch
    });
    await this.setRows(rows);
  },

  async resolveProduct(rowIndex, lookupValue) {
    const lookup = String(lookupValue || "").trim();
    const warehouseId = StockIssueWarehouseSelect.selectedOptionValue;

    if (!lookup) {
      showAlert("Enter barcode, product code, SKU, or product name.", "warning");
      return;
    }

    if (!warehouseId || Number(warehouseId) === 0) {
      showAlert("Select warehouse first.", "warning");
      return;
    }

    const result = await FindStockIssueProduct.run({ lookup, warehouseId });

    const product =
      (Array.isArray(result) ? result[0] : null) ||
      (Array.isArray(FindStockIssueProduct.data) ? FindStockIssueProduct.data[0] : null) ||
      result?.data?.[0] ||
      null;

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

  async getFreshStock(productId, warehouseId) {
    const result = await GetCurrentStockForProduct.run({ productId, warehouseId });
    return Number(result?.[0]?.currentStock || GetCurrentStockForProduct.data?.[0]?.currentStock || 0);
  },

  async validateStockAvailability() {
    const warehouseId = StockIssueWarehouseSelect.selectedOptionValue;

    for (const row of this.rows()) {
      const available = await this.getFreshStock(row.productId, warehouseId);
      const needed = Number(row.quantity || 0);

      if (needed > available) {
        showAlert(`Not enough stock for ${row.productCode}. Available: ${available}`, "error");
        return false;
      }
    }

    return true;
  },

  async validateBeforeSave(checkStock = false) {
    if (!StockIssueNumberInput.text.trim()) {
      showAlert("Issue number is required.", "warning");
      return false;
    }

    if (!StockIssueDateInput.selectedDate && !StockIssueDateInput.text) {
      showAlert("Issue date is required.", "warning");
      return false;
    }

    if (!StockIssueWarehouseSelect.selectedOptionValue || Number(StockIssueWarehouseSelect.selectedOptionValue) === 0) {
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

    if (checkStock) {
      return this.validateStockAvailability();
    }

    return true;
  },

  getNoteWithReason() {
    const reason = StockIssueReasonSelect.selectedOptionValue || "WRITE_OFF";
    const note = StockIssueNoteInput.text || "";

    return `[${reason}] ${note}`.trim();
  },

  async insertItems(issueId, postStock = false) {
    const warehouseId = StockIssueWarehouseSelect.selectedOptionValue;
    const issueDate = StockIssueDateInput.selectedDate || StockIssueDateInput.selectedDate || moment().format("YYYY-MM-DD");

    for (const row of this.rows()) {
      const quantity = Math.abs(Number(row.quantity || 0));
      const unitCost = Number(row.unitCost || 0);
      const lineTotal = Number((quantity * unitCost).toFixed(2));

      await InsertStockIssueItem.run({
        issueId,
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
        const itemRows = await GetLastStockIssueItemId.run({
          issueId,
          lineNo: row.lineNo
        });

        const itemId = itemRows?.[0]?.itemId || GetLastStockIssueItemId.data?.[0]?.itemId;

        await PostStockIssueMovement.run({
          issueId,
          itemId,
          warehouseId,
          productId: row.productId,
          movementDate: issueDate,
          quantity,
          unitCost,
          lineTotal,
          batchNumber: row.batchNumber || null,
          serialNumber: row.serialNumber || null,
          note: row.note || this.getNoteWithReason()
        });
      }
    }
  },

  async createDocument(status = "DRAFT", postStock = false) {
    if (!(await this.validateBeforeSave(postStock))) return null;

    const duplicate = await CheckStockIssueNumberDuplicate.run();

    if (duplicate?.length || CheckStockIssueNumberDuplicate.data?.length) {
      showAlert("Issue number already exists.", "error");
      return null;
    }

    const totals = this.totals();
    const warehouseId = StockIssueWarehouseSelect.selectedOptionValue;
    const issueDate = StockIssueDateInput.selectedDate || StockIssueDateInput.selectedDate || moment().format("YYYY-MM-DD");

    await InsertStockIssueDocument.run({
      warehouseId,
      status,
      issueDate,
      note: this.getNoteWithReason(),
      totalAmount: totals.value
    });

    const docRows = await GetStockIssueDocumentIdByNumbe.run();
    const issueId = docRows?.[0]?.issueId || GetStockIssueDocumentIdByNumbe.data?.[0]?.issueId;

    if (!issueId) {
      showAlert("Issue was saved, but ID was not found.", "error");
      return null;
    }

    await this.insertItems(issueId, postStock);
    await this.writeAudit("INSERT", issueId, null, this.getAuditValues(issueId, status));

    return issueId;
  },

  async updateDraft(postAfterUpdate = false) {
    if (!(await this.validateBeforeSave(postAfterUpdate))) return null;

    const issueId = this.issueId();

    if (!issueId) {
      showAlert("Issue ID is missing.", "error");
      return null;
    }

    if (this.issueStatus() !== "DRAFT") {
      showAlert("Only draft issues can be edited.", "warning");
      return null;
    }

    const totals = this.totals();
    const oldValues = appsmith.store.stockIssueBeforeEdit || null;

    await UpdateStockIssueDocument.run({
      issueId,
      warehouseId: StockIssueWarehouseSelect.selectedOptionValue,
      issueDate: StockIssueDateInput.selectedDate || StockIssueDateInput.selectedDate || moment().format("YYYY-MM-DD"),
      note: this.getNoteWithReason(),
      totalAmount: totals.value
    });

    await DeleteStockIssueItems.run({ issueId });
    await this.insertItems(issueId, postAfterUpdate);

    if (postAfterUpdate) {
      await UpdateStockIssueStatus.run({ issueId, status: "POSTED" });
      await this.writeAudit("UPDATE", issueId, oldValues, this.getAuditValues(issueId, "POSTED"));
    } else {
      await this.writeAudit("UPDATE", issueId, oldValues, this.getAuditValues(issueId, "DRAFT"));
    }

    return issueId;
  },

  async saveDraft() {
    try {
      const issueId = this.isEditMode()
        ? await this.updateDraft(false)
        : await this.createDocument("DRAFT", false);

      if (!issueId) return;

      await this.afterSave();
      showAlert("Stock issue was saved as draft.", "success");
    } catch (error) {
      showAlert("Error while saving stock issue: " + error.message, "error");
      console.log(error);
    }
  },

  async post() {
    try {
      const issueId = this.isEditMode()
        ? await this.updateDraft(true)
        : await this.createDocument("POSTED", true);

      if (!issueId) return;

      await this.afterSave();
      showAlert("Stock issue was posted.", "success");
    } catch (error) {
      showAlert("Error while posting stock issue: " + error.message, "error");
      console.log(error);
    }
  },

  async loadForEdit(row = null) {
    const selected = row || StockIssueDocumentsTable.triggeredRow || StockIssueDocumentsTable.selectedRow;
    const issueId =
      selected?.["Issue ID"] ||
      selected?.issueId ||
      selected?.id;

    if (!issueId) {
      showAlert("Select a stock issue first.", "warning");
      return;
    }

    const docRows = await GetStockIssueForEdit.run({ issueId });
    const doc = docRows?.[0] || GetStockIssueForEdit.data?.[0];

    if (!doc) {
      showAlert("Stock issue was not found.", "error");
      return;
    }

    await storeValue("currentStockIssueId", doc.issueId);
    await storeValue("currentStockIssueStatus", doc.status);
    await storeValue("inventoryMode", "NEW_STOCK_ISSUE");

    StockIssueNumberInput.setValue(doc.issueNumber || "");
    StockIssueDateInput.setValue(doc.issueDate || "");
    StockIssueWarehouseSelect.setSelectedOption(doc.warehouseId ? String(doc.warehouseId) : "");
    StockIssueNoteInput.setValue((doc.note || "").replace(/^\[[^\]]+\]\s*/, ""));

    const reasonMatch = String(doc.note || "").match(/^\[([^\]]+)\]/);
    StockIssueReasonSelect.setSelectedOption(reasonMatch?.[1] || "WRITE_OFF");

    const itemRows = await GetStockIssueItemsForEdit.run({ issueId });

    await this.setRows(
      (itemRows || GetStockIssueItemsForEdit.data || []).map(row => ({
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

    await storeValue("stockIssueBeforeEdit", {
      document: doc,
      items: this.rows()
    });
  },

  async voidIssue(row = null) {
    const selected = row || StockIssueDocumentsTable.triggeredRow || StockIssueDocumentsTable.selectedRow;
    const issueId =
      selected?.["Issue ID"] ||
      selected?.issueId ||
      this.issueId();

    if (!issueId) {
      showAlert("Select a stock issue first.", "warning");
      return;
    }

    const docRows = await GetStockIssueForEdit.run({ issueId });
    const doc = docRows?.[0] || GetStockIssueForEdit.data?.[0];

    if (!doc) {
      showAlert("Stock issue was not found.", "error");
      return;
    }

    if (doc.status === "CANCELLED") {
      showAlert("This issue is already cancelled.", "warning");
      return;
    }

    if (doc.status === "DRAFT") {
      await UpdateStockIssueStatus.run({ issueId, status: "CANCELLED" });
      await this.writeAudit("UPDATE", issueId, doc, { ...doc, status: "CANCELLED" });
      await this.afterSave();
      showAlert("Draft stock issue was cancelled.", "success");
      return;
    }

    const movements = await GetStockIssueMovementsForVoid.run({ issueId });
    const rows = movements || GetStockIssueMovementsForVoid.data || [];

    for (const row of rows) {
      await InsertStockMovement.run({
        warehouseId: row.warehouseId,
        productId: row.productId,
        documentId: issueId,
        documentItemId: row.itemId || null,
        movementType: "IN",
        movementDate: moment().format("YYYY-MM-DD HH:mm:ss"),
        quantity: Math.abs(Number(row.quantity || 0)),
        unitCost: Number(row.unitCost || 0),
        totalCost: Math.abs(Number(row.totalCost || 0)),
        batchNumber: row.batchNumber || null,
        serialNumber: row.serialNumber || null,
        note: "Void stock issue"
      });
    }

    await VoidStockIssueDocument.run({ issueId });
    await this.writeAudit("UPDATE", issueId, doc, { ...doc, status: "CANCELLED" });

    await this.afterSave();
    showAlert("Stock issue was voided and stock was returned.", "success");
  },

  getAuditValues(issueId, status) {
    const totals = this.totals();

    return {
      source: "Stock issue form",
      document_id: issueId,
      document_type: "STOCK_OUT",
      document_number: StockIssueNumberInput.text.trim(),
      status,
      warehouse_id: StockIssueWarehouseSelect.selectedOptionValue,
      reason: StockIssueReasonSelect.selectedOptionValue || null,
      issue_date: StockIssueDateInput.selectedDate || StockIssueDateInput.text || null,
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

  async writeAudit(actionType, issueId, oldValues = null, newValues = null) {
    if (typeof AuditLog === "undefined") return;

    await AuditLog.insert({
      entityName: "documents",
      entityId: issueId,
      actionType,
      oldValues,
      newValues
    });
  },

  async afterSave() {
    await storeValue("stockIssueItems", []);
    await storeValue("currentStockIssueId", null);
    await storeValue("currentStockIssueStatus", null);
    await storeValue("stockIssueBeforeEdit", null);
    await storeValue("inventoryMode", "LIST");

    if (typeof ListStockIssues !== "undefined") await ListStockIssues.run();
    if (typeof ListStockIssueItems !== "undefined") await ListStockIssueItems.run();
    if (typeof InventorySummaryQuery !== "undefined") await InventorySummaryQuery.run();
    if (typeof InventoryBalanceQuery !== "undefined") await InventoryBalanceQuery.run();
    if (typeof StockMovementsQuery !== "undefined") await StockMovementsQuery.run();
  },

  async cancel() {
    await storeValue("stockIssueItems", []);
    await storeValue("currentStockIssueId", null);
    await storeValue("currentStockIssueStatus", null);
    await storeValue("stockIssueBeforeEdit", null);
    await storeValue("inventoryMode", "LIST");
  }
};

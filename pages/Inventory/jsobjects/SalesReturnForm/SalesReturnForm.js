export default {
  rows() {
    return appsmith.store.salesReturnItems || [];
  },

  isEditMode() {
    return !!appsmith.store.currentSalesReturnId;
  },

  recalc(rows) {
    return (rows || []).map((row, index) => {
      const returnQuantity = Number(row.returnQuantity || 0);
      const unitPrice = Number(row.unitPrice || 0);

      return {
        ...row,
        lineNo: index + 1,
        returnQuantity,
        lineTotal: Number((returnQuantity * unitPrice).toFixed(2))
      };
    });
  },

  totals() {
    return this.rows().reduce(
      (sum, row) => ({
        quantity: sum.quantity + Number(row.returnQuantity || 0),
        value: sum.value + Number(row.lineTotal || 0)
      }),
      { quantity: 0, value: 0 }
    );
  },

  async setRows(rows) {
    await storeValue("salesReturnItems", this.recalc(rows));
  },

  async startNew() {
    await storeValue("currentSalesReturnId", null);
    await storeValue("salesReturnEditMode", false);
    await storeValue("salesReturnBeforeEdit", null);
    await storeValue("salesReturnSourceDocumentId", null);
    await storeValue("salesReturnItems", []);

    await GetNextSalesReturnNumber.run();

    SalesReturnNumberInput.setValue(
      GetNextSalesReturnNumber.data?.[0]?.nextSalesReturnNumber || ""
    );

    SalesReturnStatusInput.setValue("DRAFT");
    SalesReturnDateInput.setValue(moment().format("YYYY-MM-DD"));
    SalesReturnSourceTypeSelect.setSelectedOption("POS_SALE");
    SalesReturnSourceNumberInput.setValue("");
    SalesReturnReasonSelect.setSelectedOption("CUSTOMER_RETURN");
    SalesReturnConditionSelect.setSelectedOption("SELLABLE");
    SalesReturnNoteInput.setValue("");

    SalesReturnCustomerSelect.setSelectedOption("");
    SalesReturnWarehouseSelect.setSelectedOption(
      String(InventoryWarehouseSelect.selectedOptionValue || appsmith.store.warehouseId || "")
    );

    if (typeof SalesReturnBarcodeInput !== "undefined") {
      SalesReturnBarcodeInput.setValue("");
    }

    showModal(NewSalesReturnModal.name);
  },

  async loadSourceDocument() {
    if (!SalesReturnSourceTypeSelect.selectedOptionValue) {
      showAlert("Source type is required.", "warning");
      return;
    }

    if (!SalesReturnSourceNumberInput.text.trim()) {
      showAlert("Source document number is required.", "warning");
      return;
    }

    const headerRows = await FindSalesReturnSourceDocument.run();
    const source = headerRows?.[0] || FindSalesReturnSourceDocument.data?.[0];

    if (!source) {
      showAlert("Source document was not found.", "error");
      return;
    }

    await storeValue("salesReturnSourceDocumentId", source.sourceDocumentId);

    SalesReturnCustomerSelect.setSelectedOption(source.customerId ? String(source.customerId) : "");
    SalesReturnWarehouseSelect.setSelectedOption(source.warehouseId ? String(source.warehouseId) : "");

    const itemRows = await GetSalesReturnSourceItems.run({
      sourceDocumentId: source.sourceDocumentId
    });

    const items = itemRows || GetSalesReturnSourceItems.data || [];

    await this.setRows(
      items
        .filter(row => Number(row.remainingQuantity || 0) > 0)
        .map(row => ({
          lineNo: row.lineNo,
          sourceItemId: row.sourceItemId,
          barcode: row.barcode || "",
          productId: row.productId,
          productCode: row.productCode,
          productName: row.productName,
          sku: row.sku || "",
          description: row.description || row.productName,
          unitId: row.unitId,
          unitCode: row.unitCode || "",
          soldQuantity: Number(row.soldQuantity || 0),
          alreadyReturnedQuantity: Number(row.alreadyReturnedQuantity || 0),
          remainingQuantity: Number(row.remainingQuantity || 0),
          returnQuantity: 0,
          unitPrice: Number(row.unitPrice || 0),
          lineTotal: 0,
          condition: SalesReturnConditionSelect.selectedOptionValue || "SELLABLE",
          reason: SalesReturnReasonSelect.selectedOptionValue || "CUSTOMER_RETURN",
          note: ""
        }))
    );

    showAlert("Source document loaded.", "success");
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
      showAlert("Product is not on the loaded source document.", "warning");
      SalesReturnBarcodeInput.setValue("");
      return;
    }

    const row = rows[index];
    const nextQty = Number(row.returnQuantity || 0) + 1;
    const maxQty = Number(row.remainingQuantity || 0);

    if (nextQty > maxQty) {
      showAlert(`Cannot return more than remaining quantity for ${row.productCode}.`, "warning");
      SalesReturnBarcodeInput.setValue("");
      return;
    }

    rows[index] = {
      ...row,
      returnQuantity: nextQty
    };

    await this.setRows(rows);
    SalesReturnBarcodeInput.setValue("");
  },

  async scanBarcodeDebounced(value) {
    const lookup = String(value || "").trim();

    if (!lookup || lookup.length < 3) return;

    await storeValue("salesReturnScanLastValue", lookup);

    setTimeout(() => {
      if (appsmith.store.salesReturnScanLastValue === lookup) {
        this.scanBarcode(lookup);
      }
    }, 300);
  },

  async updateRows() {
    const tableRows = SalesReturnItemsEditTable.tableData || this.rows();
    await this.setRows(tableRows);
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
        soldQuantity: 0,
        alreadyReturnedQuantity: 0,
        remainingQuantity: 0,
        returnQuantity: 0,
        unitPrice: 0,
        lineTotal: 0,
        condition: SalesReturnConditionSelect.selectedOptionValue || "SELLABLE",
        reason: SalesReturnReasonSelect.selectedOptionValue || "CUSTOMER_RETURN",
        note: ""
      }
    ]);
  },

  async removeSelectedRow() {
    const selectedIndex =
      SalesReturnItemsEditTable.selectedRowIndex ??
      SalesReturnItemsEditTable.triggeredRowIndex ??
      -1;

    if (selectedIndex < 0) {
      showAlert("Select row first.", "warning");
      return;
    }

    await this.setRows(this.rows().filter((_, index) => index !== selectedIndex));
  },

  validate() {
    if (!SalesReturnNumberInput.text.trim()) {
      showAlert("Return number is required.", "warning");
      return false;
    }

    if (!appsmith.store.salesReturnSourceDocumentId) {
      showAlert("Load source document first.", "warning");
      return false;
    }

    if (!SalesReturnCustomerSelect.selectedOptionValue) {
      showAlert("Customer is required.", "warning");
      return false;
    }

    if (!SalesReturnWarehouseSelect.selectedOptionValue) {
      showAlert("Warehouse is required.", "warning");
      return false;
    }

    const rows = this.rows().filter(row => Number(row.returnQuantity || 0) > 0);

    if (!rows.length) {
      showAlert("Enter return quantity for at least one item.", "warning");
      return false;
    }

    const invalid = rows.find(row =>
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
	async post(row = null) {
  const selected = row || SalesReturnsTable.selectedRow || {};
  const documentId = selected.documentId || selected.id || selected["Return ID"];

  if (!documentId) {
    showAlert("Select sales return first.", "warning");
    return;
  }

  const headerRows = await GetSalesReturnForPost.run({ documentId });
  const header = headerRows?.[0] || GetSalesReturnForPost.data?.[0];

  if (!header || header.status !== "DRAFT") {
    showAlert("Only draft sales returns can be posted.", "warning");
    return;
  }

  const itemRows = await GetSalesReturnItemsForPost.run({ documentId });
  const items = itemRows || GetSalesReturnItemsForPost.data || [];

  for (const item of items) {
    if (Number(item.trackStock || 0) === 1 && item.returnCondition === "SELLABLE") {
      await InsertSalesReturnStockMovement.run({
        documentId,
        documentItemId: item.documentItemId,
        warehouseId: header.warehouseId,
        productId: item.productId,
        movementDate: header.documentDate,
        quantity: item.quantity,
        unitCost: item.unitPrice || 0,
        totalCost: item.lineTotal || 0,
        note: `Sales return ${header.documentNumber}`
      });
    }
  }

  await PostSalesReturn.run({ documentId });

  if (typeof AuditLog !== "undefined") {
    await AuditLog.insert({
      entityName: "documents",
      entityId: documentId,
      actionType: "POST",
      newValues: { source: "Sales Return", document_number: header.documentNumber, status: "POSTED" }
    });
  }

  if (typeof ListSalesReturns !== "undefined") await ListSalesReturns.run();
  if (typeof InventoryBalanceQuery !== "undefined") await InventoryBalanceQuery.run();

  showAlert("Sales return was posted.", "success");
},

async voidReturn(row = null) {
  const selected = row || SalesReturnsTable.selectedRow || {};
  const documentId = selected.documentId || selected.id || selected["Return ID"];

  if (!documentId) {
    showAlert("Select sales return first.", "warning");
    return;
  }

  const headerRows = await GetSalesReturnForPost.run({ documentId });
  const header = headerRows?.[0] || GetSalesReturnForPost.data?.[0];

  if (!header) {
    showAlert("Sales return was not found.", "error");
    return;
  }

  if (header.status === "POSTED") {
    const itemRows = await GetSalesReturnItemsForPost.run({ documentId });
    const items = itemRows || GetSalesReturnItemsForPost.data || [];

    for (const item of items) {
      if (Number(item.trackStock || 0) === 1 && item.returnCondition === "SELLABLE") {
        await VoidSalesReturnStockMovement.run({
          documentId,
          documentItemId: item.documentItemId,
          warehouseId: header.warehouseId,
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitPrice || 0,
          totalCost: item.lineTotal || 0,
          note: `Void sales return ${header.documentNumber}`
        });
      }
    }
  }

  await VoidSalesReturn.run({ documentId });

  if (typeof AuditLog !== "undefined") {
    await AuditLog.insert({
      entityName: "documents",
      entityId: documentId,
      actionType: "VOID",
      newValues: { source: "Sales Return", document_number: header.documentNumber, status: "CANCELLED" }
    });
  }

  if (typeof ListSalesReturns !== "undefined") await ListSalesReturns.run();
  if (typeof InventoryBalanceQuery !== "undefined") await InventoryBalanceQuery.run();

  showAlert("Sales return was cancelled.", "success");
},


  async saveDraft() {
    await this.updateRows();

    if (!this.validate()) return;

    const duplicate = await CheckSalesReturnNumberDuplicat.run();

    if (duplicate?.length || CheckSalesReturnNumberDuplicat.data?.length) {
      showAlert("Sales return number already exists.", "error");
      return;
    }

    try {
      const wasEditMode = this.isEditMode();
      const rows = this.recalc(this.rows().filter(row => Number(row.returnQuantity || 0) > 0));
      const totalAmount = rows.reduce((s, r) => s + Number(r.lineTotal || 0), 0);

      let documentId = appsmith.store.currentSalesReturnId || null;

      if (wasEditMode) {
        await UpdateSalesReturnDocument.run({
          documentId,
          totalAmount
        });

        await DeleteSalesReturnItems.run({ documentId });
      } else {
        await InsertSalesReturnDocument.run({
          status: "DRAFT",
          totalAmount
        });

        const idRows = await GetSalesReturnIdByNumber.run();
        const found = idRows?.[0] || GetSalesReturnIdByNumber.data?.[0];

        documentId = found?.documentId;

        if (!documentId) {
          showAlert("Sales return was saved, but ID was not found.", "error");
          return;
        }

        await storeValue("currentSalesReturnId", documentId);
      }

      for (let i = 0; i < rows.length; i += 1) {
        await InsertSalesReturnItem.run({
          documentId,
          lineNo: i + 1,
          productId: rows[i].productId,
          description: rows[i].description || rows[i].productName,
          quantity: rows[i].returnQuantity,
          unitId: rows[i].unitId,
          unitPrice: rows[i].unitPrice || 0,
          lineTotal: rows[i].lineTotal || 0,
          note: [
            `Reason: ${rows[i].reason || SalesReturnReasonSelect.selectedOptionValue || ""}`,
            `Condition: ${rows[i].condition || SalesReturnConditionSelect.selectedOptionValue || ""}`,
            rows[i].note || ""
          ].filter(Boolean).join(" | ")
        });
      }

      if (typeof AuditLog !== "undefined") {
        await AuditLog.insert({
          entityName: "documents",
          entityId: documentId,
          actionType: wasEditMode ? "UPDATE" : "INSERT",
          oldValues: wasEditMode ? appsmith.store.salesReturnBeforeEdit || null : null,
          newValues: {
            source: "Sales Return form",
            document_number: SalesReturnNumberInput.text,
            source_document_id: appsmith.store.salesReturnSourceDocumentId,
            customer_id: SalesReturnCustomerSelect.selectedOptionValue,
            warehouse_id: SalesReturnWarehouseSelect.selectedOptionValue,
            total_quantity: rows.reduce((s, r) => s + Number(r.returnQuantity || 0), 0),
            total_amount: totalAmount,
            item_count: rows.length
          }
        });
      }

      await this.afterSave();
      showAlert("Sales return was saved as draft.", "success");
    } catch (error) {
      showAlert("Error while saving sales return: " + error.message, "error");
      console.log(error);
    }
  },

  async afterSave() {
    await storeValue("currentSalesReturnId", null);
    await storeValue("salesReturnEditMode", false);
    await storeValue("salesReturnBeforeEdit", null);
    await storeValue("salesReturnSourceDocumentId", null);
    await storeValue("salesReturnItems", []);

    if (typeof ListSalesReturns !== "undefined") await ListSalesReturns.run();
    if (typeof ListSalesReturnItems !== "undefined") await ListSalesReturnItems.run();

    closeModal(NewSalesReturnModal.name);
  },

  async cancel() {
    await storeValue("currentSalesReturnId", null);
    await storeValue("salesReturnEditMode", false);
    await storeValue("salesReturnBeforeEdit", null);
    await storeValue("salesReturnSourceDocumentId", null);
    await storeValue("salesReturnItems", []);
    closeModal(NewSalesReturnModal.name);
  }
};

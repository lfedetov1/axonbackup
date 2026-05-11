export default {
  rows() {
    return appsmith.store.openingStockItems || [];
  },

  documentId() {
    return appsmith.store.currentOpeningStockId || null;
  },

  isEditMode() {
    return !!this.documentId();
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

  async setRows(rows) {
    await storeValue(
      "openingStockItems",
      (rows || []).map((row, index) => ({
        ...this.recalcRow(row),
        lineNo: index + 1
      }))
    );
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
    await storeValue("currentOpeningStockId", null);
    await storeValue("currentOpeningStockStatus", null);
    await storeValue("openingStockBeforeEdit", null);
    await storeValue("openingStockItems", []);
    await storeValue("inventoryMode", "OPENING_STOCK_NEW");

    await GetNextOpeningStockNumber.run();

    OpeningStockNumberInput.setValue(GetNextOpeningStockNumber.data?.[0]?.nextNumber || "");
    OpeningStockStatusInput.setValue("DRAFT");
    OpeningStockDateInput.setValue(moment().format("YYYY-MM-DD"));
    OpeningStockNoteInput.setValue("");

    OpeningStockWarehouseSelect.setSelectedOption(
      String(InventoryWarehouseSelect.selectedOptionValue || appsmith.store.warehouseId || "")
    );
  },

  async addBlankRow() {
  const rows = appsmith.store.openingStockItems || [];

  const nextRows = [
    ...rows,
    {
      lineNo: rows.length + 1,
      barcode: "",
      productId: null,
      productCode: "",
      productName: "",
      sku: "",
      unitId: null,
      unitCode: "",
      quantity: "1",
      unitCost: "0",
      lineTotal: 0,
      batchNumber: "",
      serialNumber: "",
      expiryDate: "",
      note: ""
    }
  ];

  await storeValue("openingStockItems", nextRows);
},


  async removeSelectedRow() {
    const selectedIndex =
      OpeningStockItemsEditTable.selectedRowIndex ??
      OpeningStockItemsEditTable.triggeredRowIndex ??
      -1;

    if (selectedIndex < 0) {
      showAlert("Select row first.", "warning");
      return;
    }

    await this.setRows(this.rows().filter((_, index) => index !== selectedIndex));
  },

  async updateRows() {
    const tableRows = OpeningStockItemsEditTable.tableData || this.rows();
    await this.setRows(tableRows);
  },

async resolveBarcodeFromTable() {
  const tableRows = OpeningStockItemsEditTable.tableData || this.rows();

  let rowIndex =
    OpeningStockItemsEditTable.updatedRowIndex ??
    OpeningStockItemsEditTable.triggeredRowIndex ??
    -1;

  if (rowIndex < 0) {
    rowIndex = tableRows.findIndex(row =>
      String(
        row.barcode ||
        row.Barcode ||
        row["Barcode"] ||
        row["Barcode / Code"] ||
        ""
      ).trim() &&
      !row.productId
    );
  }

  if (rowIndex < 0) {
    await this.updateRows();
    return;
  }

  const row =
    OpeningStockItemsEditTable.updatedRow ||
    OpeningStockItemsEditTable.triggeredRow ||
    tableRows[rowIndex] ||
    {};

  const existingRow = this.rows()[rowIndex] || {};

  const lookup = String(
    row.barcode ||
    row.Barcode ||
    row["Barcode"] ||
    row["Barcode / Code"] ||
    ""
  ).trim();

  const existingLookup = String(
    existingRow.barcode ||
    existingRow.Barcode ||
    existingRow["Barcode"] ||
    ""
  ).trim();

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

  if (!OpeningStockWarehouseSelect.selectedOptionValue) {
    showAlert("Warehouse is required.", "warning");
    return;
  }

  const result = await FindOpeningStockProduct.run({ lookup });
  const product =
    result?.[0] ||
    result?.data?.[0] ||
    FindOpeningStockProduct.data?.[0];

  if (!product) {
    showAlert("Product was not found.", "warning");
    return;
  }

  const rows = [...this.rows()];
  const productId = product.productId || product.id || product.ID;

  const existingIndex = rows.findIndex(row =>
    Number(row.productId) === Number(productId)
  );

  if (existingIndex >= 0 && existingIndex !== rowIndex) {
    showAlert("This product already exists in this opening stock document.", "warning");
    return;
  }

  if (existingIndex >= 0 && increment) {
    rows[existingIndex] = this.recalcRow({
      ...rows[existingIndex],
      quantity: String(Number(rows[existingIndex].quantity || 0) + 1)
    });

    await this.setRows(rows);
    return;
  }

  const targetIndex =
    rowIndex !== null &&
    rowIndex !== undefined &&
    rows[rowIndex]
      ? rowIndex
      : rows.length;

  const current = rows[targetIndex] || {};

  rows[targetIndex] = this.recalcRow({
    ...current,
    lineNo: targetIndex + 1,
    barcode: product.barcode || lookup,
    productId,
    productCode: product.productCode || product.code || "",
    productName: product.productName || product.name || "",
    sku: product.sku || "",
    unitId: product.unitId || product.unit_id || null,
    unitCode: product.unitCode || product.unit || "",
    quantity: increment
      ? String(Number(current.quantity || 0) + 1)
      : String(current.quantity || 1),
    unitCost: String(product.unitCost || current.unitCost || 0),
    batchNumber: current.batchNumber || "",
    serialNumber: current.serialNumber || "",
    expiryDate: current.expiryDate || "",
    note: current.note || ""
  });

  await this.setRows(rows);
},


  async scanProduct(value) {
    const lookup = String(value || "").trim();

    if (!lookup) return;

    await this.resolveProduct(null, lookup, true);

    if (typeof OpeningStockBarcodeInput !== "undefined") {
      OpeningStockBarcodeInput.setValue("");
    }
  },

  async scanProductDebounced(value) {
    const lookup = String(value || "").trim();

    if (!lookup || lookup.length < 3) return;

    await storeValue("openingStockScanLastValue", lookup);

    setTimeout(() => {
      if (appsmith.store.openingStockScanLastValue === lookup) {
        this.scanProduct(lookup);
      }
    }, 350);
  },

  validate() {
    if (!OpeningStockNumberInput.text) {
      showAlert("Opening stock number is required.", "warning");
      return false;
    }

    if (!OpeningStockWarehouseSelect.selectedOptionValue) {
      showAlert("Warehouse is required.", "warning");
      return false;
    }

    if (!OpeningStockDateInput.selectedDate && !OpeningStockDateInput.text) {
      showAlert("Date is required.", "warning");
      return false;
    }

    if (!this.rows().length) {
      showAlert("Add at least one item.", "warning");
      return false;
    }

    const invalidRow = this.rows().find(row =>
      !row.productId || !row.unitId || Number(row.quantity || 0) <= 0
    );

    if (invalidRow) {
      showAlert("Every row must have product, unit and quantity greater than zero.", "warning");
      return false;
    }

    return true;
  },

  async insertItems(documentId, postStock = false) {
    const rows = this.rows();

    for (let i = 0; i < rows.length; i += 1) {
      await InsertOpeningStockItem.run({
        documentId,
        lineNo: i + 1,
        productId: rows[i].productId,
        description: rows[i].productName,
        unitId: rows[i].unitId,
        quantity: rows[i].quantity,
        unitCost: rows[i].unitCost,
        lineTotal: rows[i].lineTotal,
        batchNumber: rows[i].batchNumber || null,
        serialNumber: rows[i].serialNumber || null,
        expiryDate: rows[i].expiryDate || null,
        note: rows[i].note || null
      });

      if (postStock) {
        const itemRows = await GetLastOpeningStockItemId.run({
          documentId,
          lineNo: i + 1
        });

        const documentItemId = itemRows?.[0]?.documentItemId || GetLastOpeningStockItemId.data?.[0]?.documentItemId;

        await InsertOpeningStockMovement.run({
          documentId,
          documentItemId,
          productId: rows[i].productId,
          quantity: rows[i].quantity,
          unitCost: rows[i].unitCost,
          lineTotal: rows[i].lineTotal,
          batchNumber: rows[i].batchNumber || null,
          serialNumber: rows[i].serialNumber || null,
          note: rows[i].note || "Opening stock"
        });
      }
    }
  },

  async saveDraft() {
    if (!this.validate()) return;

    try {
      const totals = this.totals();

      if (this.isEditMode()) {
        if (appsmith.store.currentOpeningStockStatus !== "DRAFT") {
          showAlert("Only draft opening stock can be edited.", "warning");
          return;
        }

        await UpdateOpeningStockDocument.run({
          documentId: this.documentId(),
          totalAmount: totals.value
        });

        await DeleteOpeningStockItems.run({
          documentId: this.documentId()
        });

        await this.insertItems(this.documentId(), false);

        if (typeof AuditLog !== "undefined") {
          await AuditLog.insert({
            entityName: "documents",
            entityId: this.documentId(),
            actionType: "UPDATE",
            oldValues: appsmith.store.openingStockBeforeEdit || null,
            newValues: this.getAuditValues(this.documentId(), "DRAFT")
          });
        }

        await this.afterSave();
        showAlert("Opening stock was updated.", "success");
        return;
      }

      const duplicate = await CheckOpeningStockNumberDuplica.run();

      if (duplicate?.length || CheckOpeningStockNumberDuplica.data?.length) {
        showAlert("Opening stock number already exists.", "error");
        return;
      }

      await InsertOpeningStockDocument.run({
        status: "DRAFT",
        totalAmount: totals.value
      });

      const docRows = await GetOpeningStockIdByNumber.run();
      const doc = docRows?.[0] || GetOpeningStockIdByNumber.data?.[0];

      if (!doc?.documentId) {
        showAlert("Opening stock was saved, but ID was not returned.", "error");
        return;
      }

      await storeValue("currentOpeningStockId", doc.documentId);
      await storeValue("currentOpeningStockStatus", "DRAFT");

      await this.insertItems(doc.documentId, false);

      if (typeof AuditLog !== "undefined") {
        await AuditLog.insert({
          entityName: "documents",
          entityId: doc.documentId,
          actionType: "INSERT",
          newValues: this.getAuditValues(doc.documentId, "DRAFT")
        });
      }

      await this.afterSave();
      showAlert("Opening stock was saved as draft.", "success");
    } catch (error) {
      showAlert("Error while saving opening stock: " + error.message, "error");
      console.log(error);
    }
  },

  async post() {
    if (!this.validate()) return;

    try {
      const totals = this.totals();
      let documentId = this.documentId();

      if (this.isEditMode()) {
        if (appsmith.store.currentOpeningStockStatus !== "DRAFT") {
          showAlert("Only draft opening stock can be posted.", "warning");
          return;
        }

        await UpdateOpeningStockDocument.run({
          documentId,
          totalAmount: totals.value
        });

        await DeleteOpeningStockItems.run({ documentId });
        await this.insertItems(documentId, true);
      } else {
        const duplicate = await CheckOpeningStockNumberDuplica.run();

        if (duplicate?.length || CheckOpeningStockNumberDuplica.data?.length) {
          showAlert("Opening stock number already exists.", "error");
          return;
        }

        await InsertOpeningStockDocument.run({
          status: "POSTED",
          totalAmount: totals.value
        });

        const docRows = await GetOpeningStockIdByNumber.run();
        const doc = docRows?.[0] || GetOpeningStockIdByNumber.data?.[0];

        if (!doc?.documentId) {
          showAlert("Opening stock was saved, but ID was not returned.", "error");
          return;
        }

        documentId = doc.documentId;
        await storeValue("currentOpeningStockId", documentId);

        await this.insertItems(documentId, true);
      }

      await UpdateOpeningStockStatus.run({
        documentId,
        status: "POSTED",
        totalAmount: totals.value
      });

      if (typeof AuditLog !== "undefined") {
        await AuditLog.insert({
          entityName: "documents",
          entityId: documentId,
          actionType: "POST",
          newValues: this.getAuditValues(documentId, "POSTED")
        });
      }

      await this.afterSave();
      showAlert("Opening stock was posted.", "success");
    } catch (error) {
      showAlert("Error while posting opening stock: " + error.message, "error");
      console.log(error);
    }
  },

  async loadForEdit(row = null) {
    const selected = row || OpeningStockTable.triggeredRow || OpeningStockTable.selectedRow || {};
    const documentId =
      selected.documentId ||
      selected.id ||
      selected.ID ||
      selected["Opening Stock ID"] ||
      selected["Document ID"];

    if (!documentId) {
      showAlert("Select opening stock first.", "warning");
      return;
    }

    const docRows = await GetOpeningStockForEdit.run({ documentId });
    const doc = docRows?.[0] || GetOpeningStockForEdit.data?.[0];

    if (!doc) {
      showAlert("Opening stock was not found.", "error");
      return;
    }

    if (doc.status !== "DRAFT") {
      showAlert("Only draft opening stock can be edited.", "warning");
      return;
    }

    const itemRows = await GetOpeningStockItemsForEdit.run({ documentId });

    await storeValue("currentOpeningStockId", doc.documentId);
    await storeValue("currentOpeningStockStatus", doc.status);
    await storeValue("openingStockBeforeEdit", {
      document: doc,
      items: itemRows || GetOpeningStockItemsForEdit.data || []
    });
    await storeValue("inventoryMode", "OPENING_STOCK_EDIT");

    OpeningStockNumberInput.setValue(doc.documentNumber || "");
    OpeningStockStatusInput.setValue(doc.status || "DRAFT");
    OpeningStockDateInput.setValue(moment(doc.documentDate || moment()).format("YYYY-MM-DD"));
    OpeningStockWarehouseSelect.setSelectedOption(doc.warehouseId ? String(doc.warehouseId) : "");
    OpeningStockNoteInput.setValue(doc.note || "");

    await this.setRows(itemRows || GetOpeningStockItemsForEdit.data || []);
  },
	async postFromTable(row = null) {
  const selected = row || OpeningStockTable.triggeredRow || OpeningStockTable.selectedRow || {};
  const documentId =
    selected.documentId ||
    selected.id ||
    selected.ID ||
    selected["Opening Stock ID"] ||
    selected["Document ID"];

  if (!documentId) {
    showAlert("Select opening stock first.", "warning");
    return;
  }

  const docRows = await GetOpeningStockForEdit.run({ documentId });
  const doc = docRows?.[0] || GetOpeningStockForEdit.data?.[0];

  if (!doc) {
    showAlert("Opening stock was not found.", "error");
    return;
  }

  if (doc.status !== "DRAFT") {
    showAlert("Only draft opening stock can be posted.", "warning");
    return;
  }

  const itemRows = await GetOpeningStockItemsForEdit.run({ documentId });
  const rows = itemRows || GetOpeningStockItemsForEdit.data || [];

  for (let i = 0; i < rows.length; i += 1) {
    await InsertOpeningStockMovement.run({
      documentId,
      documentItemId: rows[i].documentItemId,
      productId: rows[i].productId,
      quantity: rows[i].quantity,
      unitCost: rows[i].unitCost,
      lineTotal: rows[i].lineTotal,
      batchNumber: rows[i].batchNumber || null,
      serialNumber: rows[i].serialNumber || null,
      note: rows[i].note || "Opening stock"
    });
  }

  await UpdateOpeningStockStatus.run({
    documentId,
    status: "POSTED",
    totalAmount: doc.totalAmount || rows.reduce((s, r) => s + Number(r.lineTotal || 0), 0)
  });

  if (typeof AuditLog !== "undefined") {
    await AuditLog.insert({
      entityName: "documents",
      entityId: documentId,
      actionType: "POST",
      newValues: {
        source: "Opening stock table",
        document_number: doc.documentNumber,
        status: "POSTED"
      }
    });
  }

  await this.afterSave();
  showAlert("Opening stock was posted.", "success");
},


  async voidDocument(row = null) {
    const selected = row || OpeningStockTable.triggeredRow || OpeningStockTable.selectedRow || {};
    const documentId =
      selected.documentId ||
      selected.id ||
      selected.ID ||
      selected["Opening Stock ID"] ||
      selected["Document ID"];

    if (!documentId) {
      showAlert("Select opening stock first.", "warning");
      return;
    }

    const docRows = await GetOpeningStockForEdit.run({ documentId });
    const doc = docRows?.[0] || GetOpeningStockForEdit.data?.[0];

    if (!doc) {
      showAlert("Opening stock was not found.", "error");
      return;
    }

    if (doc.status === "CANCELLED") {
      showAlert("Opening stock is already cancelled.", "warning");
      return;
    }

    if (doc.status === "DRAFT") {
      await CancelOpeningStock.run({ documentId });
      await this.afterSave();
      showAlert("Draft opening stock was cancelled.", "success");
      return;
    }

    const movementRows = await GetOpeningStockMovementsForVoi.run({ documentId });
    const movements = movementRows || GetOpeningStockMovementsForVoi.data || [];

    for (let i = 0; i < movements.length; i += 1) {
      await VoidOpeningStockMovement.run({
        documentId,
        warehouseId: movements[i].warehouseId,
        productId: movements[i].productId,
        documentItemId: movements[i].documentItemId || null,
        quantity: movements[i].quantity,
        unitCost: movements[i].unitCost,
        totalCost: movements[i].totalCost,
        batchNumber: movements[i].batchNumber || null,
        serialNumber: movements[i].serialNumber || null,
        note: "Void opening stock"
      });
    }

    await CancelOpeningStock.run({ documentId });

    if (typeof AuditLog !== "undefined") {
      await AuditLog.insert({
        entityName: "documents",
        entityId: documentId,
        actionType: "UPDATE",
        oldValues: doc,
        newValues: {
          source: "Opening stock",
          status: "CANCELLED"
        }
      });
    }

    await this.afterSave();
    showAlert("Opening stock was cancelled and stock was reversed.", "success");
  },

  getAuditValues(documentId, status) {
    const totals = this.totals();

    return {
      source: "Opening stock form",
      document_id: documentId,
      document_number: OpeningStockNumberInput.text,
      status,
      warehouse_id: OpeningStockWarehouseSelect.selectedOptionValue,
      document_date: OpeningStockDateInput.selectedDate || OpeningStockDateInput.text,
      total_quantity: totals.quantity,
      total_value: totals.value,
      item_count: this.rows().length
    };
  },

  async afterSave() {
    await storeValue("openingStockItems", []);
    await storeValue("currentOpeningStockId", null);
    await storeValue("currentOpeningStockStatus", null);
    await storeValue("openingStockBeforeEdit", null);
    await storeValue("inventoryMode", "LIST");

    if (typeof ListOpeningStock !== "undefined") await ListOpeningStock.run();
    if (typeof ListOpeningStockItems !== "undefined") await ListOpeningStockItems.run();
    if (typeof InventorySummaryQuery !== "undefined") await InventorySummaryQuery.run();
    if (typeof InventoryBalanceQuery !== "undefined") await InventoryBalanceQuery.run();
  },

  async cancel() {
    await storeValue("openingStockItems", []);
    await storeValue("currentOpeningStockId", null);
    await storeValue("currentOpeningStockStatus", null);
    await storeValue("openingStockBeforeEdit", null);
    await storeValue("inventoryMode", "LIST");
  }
};

export default {
  rows() {
    return appsmith.store.stockMovementItems || [];
  },

  isTransfer() {
    return StockMovementIsTransferSwitch.isSwitchedOn === true;
  },

  documentId() {
    return appsmith.store.currentStockMovementDocumentId || null;
  },

  isEditMode() {
    return !!this.documentId();
  },

  getDocumentType() {
    if (this.isTransfer()) return "STOCK_TRANSFER";

    const type = StockMovementTypeSelect.selectedOptionValue;

    if (type === "IN") return "STOCK_IN";
    if (type === "OUT") return "STOCK_OUT";

    return "STOCK_ADJUSTMENT";
  },

  getMainWarehouseId() {
    if (this.isTransfer()) return null;

    const type = StockMovementTypeSelect.selectedOptionValue;

    if (type === "IN") return StockMovementDestinationWareho.selectedOptionValue;
    if (type === "OUT") return StockMovementSourceWarehouseSe.selectedOptionValue;

    return (
      StockMovementSourceWarehouseSe.selectedOptionValue ||
      StockMovementDestinationWareho.selectedOptionValue
    );
  },

  getSourceWarehouseId() {
    if (this.isTransfer()) return StockMovementSourceWarehouseSe.selectedOptionValue;

    return StockMovementTypeSelect.selectedOptionValue === "OUT"
      ? StockMovementSourceWarehouseSe.selectedOptionValue
      : null;
  },

  getDestinationWarehouseId() {
    if (this.isTransfer()) return StockMovementDestinationWareho.selectedOptionValue;

    return StockMovementTypeSelect.selectedOptionValue === "IN"
      ? StockMovementDestinationWareho.selectedOptionValue
      : null;
  },

  getLookupWarehouseId() {
    return this.getSourceWarehouseId() || this.getDestinationWarehouseId() || this.getMainWarehouseId();
  },

  getMovementDate() {
    return moment(
      StockMovementDateInput.selectedDate ||
      StockMovementDateInput.formattedDate ||
      StockMovementDateInput.text ||
      moment()
    ).format("YYYY-MM-DD");
  },

  recalcRow(row) {
    const qty = Number(row.quantity || 0);
    const cost = Number(row.unitCost || 0);

    return {
      ...row,
      quantity: String(row.quantity === "" ? "" : qty),
      unitCost: String(row.unitCost === "" ? "" : cost),
      lineTotal: Number((Math.abs(qty) * cost).toFixed(2))
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
      "stockMovementItems",
      rows.map((row, index) => ({
        ...this.recalcRow(row),
        lineNo: index + 1
      }))
    );
  },

  async startNew() {
    await storeValue("currentStockMovementDocumentId", null);
    await storeValue("currentStockMovementStatus", null);
    await storeValue("stockMovementBeforeVoid", null);
    await storeValue("stockMovementItems", []);
    await storeValue("inventoryMode", "NEW_STOCK_MOVEMENT");

    StockMovementTypeSelect.setSelectedOption("IN");
    StockMovementIsTransferSwitch.setValue(false);
    StockMovementDateInput.setValue(moment().format("YYYY-MM-DD"));
    StockMovementNoteInput.setValue("");

    await GetNextStockMovementNumber.run();
    MovementNumberInput.setValue(GetNextStockMovementNumber.data?.[0]?.nextDocumentNumber || "");
  },

  async refreshNumber() {
    await GetNextStockMovementNumber.run();
    MovementNumberInput.setValue(GetNextStockMovementNumber.data?.[0]?.nextDocumentNumber || "");
  },

  async addRow() {
    await this.setRows([
      ...this.rows(),
      {
        lookup: "",
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
      lookup: "",
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
      note: ""
    };

    await this.setRows(rows);
  },

  async clearRows() {
    await storeValue("stockMovementItems", []);
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
    const warehouseId = this.getLookupWarehouseId();

    if (!lookup) {
      showAlert("Enter barcode, product code, SKU, or product name.", "warning");
      return;
    }

    if (!warehouseId || Number(warehouseId) === 0) {
      showAlert("Select warehouse first.", "warning");
      return;
    }

    const result = await FindStockMovementProduct.run({ lookup, warehouseId });
    const product = result?.[0] || FindStockMovementProduct.data?.[0];

    if (!product) {
      showAlert("Product was not found.", "warning");
      return;
    }

    if (Number(product.trackStock || 0) !== 1) {
      showAlert("This product does not track stock.", "warning");
      return;
    }

    const rows = [...this.rows()];
    const current = rows[rowIndex] || {};

    rows[rowIndex] = this.recalcRow({
      ...current,
      lookup,
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
      note: current.note || ""
    });

    await this.setRows(rows);
  },

  async getFreshStock(productId, warehouseId) {
    const result = await GetCurrentStockForProduct.run({ productId, warehouseId });

    return Number(
      result?.[0]?.currentStock ||
      GetCurrentStockForProduct.data?.[0]?.currentStock ||
      0
    );
  },
	
	async scanProductDebounced(value) {
  const lookup = String(value || "").trim();

  if (!lookup) return;
  if (lookup.length < 3) return;

  await storeValue("stockMovementScanLastValue", lookup);

  setTimeout(() => {
    if (appsmith.store.stockMovementScanLastValue === lookup) {
      StockMovementForm.scanProduct(lookup);
    }
  }, 350);
},

async scanProduct(lookupValue = null) {
  const lookup = String(lookupValue || StockMovementScanInput.text || "").trim();
  const warehouseId = this.getLookupWarehouseId();

  if (!lookup) {
    return;
  }

  if (!warehouseId || Number(warehouseId) === 0) {
    showAlert("Select warehouse first.", "warning");
    StockMovementScanInput.setValue("");
    return;
  }

  const result = await FindStockMovementProduct.run({
    lookup,
    warehouseId
  });

  const product = result?.[0] || FindStockMovementProduct.data?.[0];

  if (!product) {
    showAlert("Product was not found.", "warning");
    StockMovementScanInput.setValue("");
    return;
  }

  if (Number(product.trackStock || 0) !== 1) {
    showAlert("This product does not track stock.", "warning");
    StockMovementScanInput.setValue("");
    return;
  }

  const movementType = StockMovementTypeSelect.selectedOptionValue;
  const isStockDecrease =
    this.isTransfer() ||
    movementType === "OUT" ||
    movementType === "ADJUSTMENT";

  const available = Number(product.currentStock || 0);

  if (isStockDecrease && available <= 0) {
    showAlert("Product has no available stock in selected warehouse.", "warning");
    StockMovementScanInput.setValue("");
    return;
  }

  const rows = [...this.rows()];
  const existingIndex = rows.findIndex(
    row => Number(row.productId) === Number(product.productId)
  );

  if (existingIndex >= 0) {
    const currentQty = Number(rows[existingIndex].quantity || 0);
    const nextQty = currentQty + 1;

    if (isStockDecrease && nextQty > available) {
      showAlert(`Not enough stock for ${product.productCode}. Available: ${available}`, "error");
      StockMovementScanInput.setValue("");
      return;
    }

    rows[existingIndex] = this.recalcRow({
      ...rows[existingIndex],
      quantity: String(nextQty)
    });
  } else {
    rows.push(this.recalcRow({
      lookup,
      barcode: product.barcode || lookup,
      productId: product.productId,
      productCode: product.productCode,
      productName: product.productName,
      sku: product.sku || "",
      unitId: product.unitId,
      unitCode: product.unitCode || "",
      currentStock: available,
      quantity: "1",
      unitCost: String(product.purchasePrice || 0),
      lineTotal: Number(product.purchasePrice || 0),
      batchNumber: "",
      serialNumber: "",
      note: ""
    }));
  }

  await this.setRows(rows);

  await storeValue("stockMovementScanLastValue", "");
  StockMovementScanInput.setValue("");
},


  async validateStockAvailability() {
    const type = StockMovementTypeSelect.selectedOptionValue;

    if (type !== "OUT" && !this.isTransfer() && type !== "ADJUSTMENT") return true;

    const warehouseId = this.isTransfer()
      ? this.getSourceWarehouseId()
      : this.getSourceWarehouseId() || this.getMainWarehouseId();

    for (const row of this.rows()) {
      const qty = Number(row.quantity || 0);

      const needsStockCheck =
        this.isTransfer() ||
        type === "OUT" ||
        (type === "ADJUSTMENT" && qty < 0);

      if (!needsStockCheck) continue;

      const available = await this.getFreshStock(row.productId, warehouseId);
      const needed = Math.abs(qty);

      if (needed > available) {
        showAlert(`Not enough stock for ${row.productCode}. Available: ${available}`, "error");
        return false;
      }
    }

    return true;
  },

  async validateBeforeSave() {
    if (!MovementNumberInput.text.trim()) {
      showAlert("Movement number is required.", "warning");
      return false;
    }

    if (!appsmith.store.userId) {
      showAlert("User is missing.", "error");
      return false;
    }

    if (this.isTransfer()) {
      if (!this.getSourceWarehouseId() || !this.getDestinationWarehouseId()) {
        showAlert("Source and destination warehouse are required.", "warning");
        return false;
      }

      if (Number(this.getSourceWarehouseId()) === Number(this.getDestinationWarehouseId())) {
        showAlert("Source and destination warehouse cannot be the same.", "warning");
        return false;
      }
    } else if (!this.getMainWarehouseId()) {
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

      if (Number(row.quantity || 0) === 0) {
        showAlert("Quantity cannot be zero.", "warning");
        return false;
      }

      if (StockMovementTypeSelect.selectedOptionValue !== "ADJUSTMENT" && Number(row.quantity || 0) < 0) {
        showAlert("Only adjustment can have negative quantity.", "warning");
        return false;
      }
    }

    return this.validateStockAvailability();
  },

  getAuditValues(documentId = null) {
    const totals = this.totals();

    return {
      source: "Stock movement form",
      document_id: documentId,
      document_number: MovementNumberInput.text.trim(),
      document_type: this.getDocumentType(),
      movement_type: StockMovementTypeSelect.selectedOptionValue,
      is_transfer: this.isTransfer(),
      warehouse_id: this.getMainWarehouseId(),
      source_warehouse_id: this.getSourceWarehouseId(),
      destination_warehouse_id: this.getDestinationWarehouseId(),
      document_date: this.getMovementDate(),
      note: StockMovementNoteInput.text || null,
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
        note: row.note || null
      }))
    };
  },

  async writeAudit(actionType, documentId, oldValues = null, newValues = null) {
    if (typeof AuditLog === "undefined") return;

    await AuditLog.insert({
      entityName: "documents",
      entityId: documentId,
      actionType,
      oldValues,
      newValues
    });
  },

  async save() {
    if (this.isEditMode()) {
      showAlert("Posted stock movements cannot be edited. Void it and create a new one.", "warning");
      return;
    }

    if (!(await this.validateBeforeSave())) return;

    const duplicate = await CheckStockMovementNumberDuplic.run();

    if (duplicate?.length || CheckStockMovementNumberDuplic.data?.length) {
      showAlert("Movement number already exists.", "error");
      return;
    }

    const totals = this.totals();
    const documentType = this.getDocumentType();

    try {
      await InsertStockMovementDocument.run({
        warehouseId: this.getMainWarehouseId(),
        documentType,
        documentDate: this.getMovementDate(),
        sourceWarehouseId: this.getSourceWarehouseId(),
        destinationWarehouseId: this.getDestinationWarehouseId(),
        note: StockMovementNoteInput.text || null,
        subtotalAmount: totals.value,
        totalAmount: totals.value
      });

      const docRows = await GetStockMovementDocumentIdByNu.run();
      const documentId =
        docRows?.[0]?.documentId ||
        GetStockMovementDocumentIdByNu.data?.[0]?.documentId;

      if (!documentId) {
        showAlert("Document was saved, but document ID was not found.", "error");
        return;
      }

      for (const row of this.rows()) {
        const rawQty = Number(row.quantity || 0);
        const qtyAbs = Math.abs(rawQty);
        const unitCost = Number(row.unitCost || 0);
        const totalCost = Number((qtyAbs * unitCost).toFixed(2));

        await InsertStockMovementDocumentIt.run({
          documentId,
          lineNo: row.lineNo,
          productId: row.productId,
          description: row.productName,
          unitId: row.unitId,
          warehouseId: this.getMainWarehouseId() || this.getSourceWarehouseId() || this.getDestinationWarehouseId(),
          quantity: rawQty,
          unitCost,
          lineTotal: totalCost,
          batchNumber: row.batchNumber || null,
          serialNumber: row.serialNumber || null,
          note: row.note || null
        });

        const itemRows = await GetLastDocumentItemId.run({
          documentId,
          lineNo: row.lineNo
        });

        const documentItemId =
          itemRows?.[0]?.documentItemId ||
          GetLastDocumentItemId.data?.[0]?.documentItemId;

        if (this.isTransfer()) {
          await InsertStockMovement.run({
            warehouseId: this.getSourceWarehouseId(),
            productId: row.productId,
            documentId,
            documentItemId,
            movementType: "TRANSFER_OUT",
            movementDate: this.getMovementDate(),
            quantity: qtyAbs,
            unitCost,
            totalCost,
            batchNumber: row.batchNumber || null,
            serialNumber: row.serialNumber || null,
            note: row.note || StockMovementNoteInput.text || null
          });

          await InsertStockMovement.run({
            warehouseId: this.getDestinationWarehouseId(),
            productId: row.productId,
            documentId,
            documentItemId,
            movementType: "TRANSFER_IN",
            movementDate: this.getMovementDate(),
            quantity: qtyAbs,
            unitCost,
            totalCost,
            batchNumber: row.batchNumber || null,
            serialNumber: row.serialNumber || null,
            note: row.note || StockMovementNoteInput.text || null
          });
        } else {
          const selectedType = StockMovementTypeSelect.selectedOptionValue;
          const movementType = selectedType === "IN" ? "IN" : selectedType === "OUT" ? "OUT" : "ADJUSTMENT";
          const movementQty = movementType === "ADJUSTMENT" ? rawQty : qtyAbs;

          await InsertStockMovement.run({
            warehouseId: this.getMainWarehouseId(),
            productId: row.productId,
            documentId,
            documentItemId,
            movementType,
            movementDate: this.getMovementDate(),
            quantity: movementQty,
            unitCost,
            totalCost,
            batchNumber: row.batchNumber || null,
            serialNumber: row.serialNumber || null,
            note: row.note || StockMovementNoteInput.text || null
          });
        }
      }

      await this.writeAudit("INSERT", documentId, null, this.getAuditValues(documentId));
      await this.afterSave();

      showAlert("Stock movement was saved.", "success");
    } catch (error) {
      showAlert("Error while saving stock movement: " + error.message, "error");
      console.log(error);
    }
  },

  getDocumentNumberFromRow(row) {
    return (
      row?.documentNumber ||
      row?.document_number ||
      row?.DocumentNumber ||
      row?.["Document Number"] ||
      row?.documentNo ||
      row?.["Document No."] ||
      ""
    );
  },

  async loadByNumber() {
    if (!MovementNumberInput.text.trim()) {
      showAlert("Enter movement number.", "warning");
      return;
    }

    const docRows = await GetStockMovementDocumentForEdi.run();
    const doc = docRows?.[0] || GetStockMovementDocumentForEdi.data?.[0];

    if (!doc) {
      showAlert("Stock movement document was not found.", "warning");
      return;
    }

    await storeValue("currentStockMovementDocumentId", doc.documentId);
    await storeValue("currentStockMovementStatus", doc.status);
    await storeValue("inventoryMode", "NEW_STOCK_MOVEMENT");

    StockMovementIsTransferSwitch.setValue(doc.documentType === "STOCK_TRANSFER");

    if (doc.documentType === "STOCK_IN") StockMovementTypeSelect.setSelectedOption("IN");
    if (doc.documentType === "STOCK_OUT") StockMovementTypeSelect.setSelectedOption("OUT");
    if (doc.documentType === "STOCK_ADJUSTMENT") StockMovementTypeSelect.setSelectedOption("ADJUSTMENT");

    StockMovementDateInput.setValue(doc.documentDate || "");
    StockMovementSourceWarehouseSe.setSelectedOption(doc.sourceWarehouseId ? String(doc.sourceWarehouseId) : "");
    StockMovementDestinationWareho.setSelectedOption(doc.destinationWarehouseId ? String(doc.destinationWarehouseId) : "");
    StockMovementNoteInput.setValue(doc.note || "");

    const itemRows = await GetStockMovementItemsForEdit.run();

    await this.setRows(
      (itemRows || GetStockMovementItemsForEdit.data || []).map(row => ({
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
        note: row.note || ""
      }))
    );

    await storeValue("stockMovementBeforeVoid", {
      document: doc,
      items: this.rows()
    });
  },

  reverseMovementType(type) {
    if (type === "IN") return "OUT";
    if (type === "OUT") return "IN";
    if (type === "TRANSFER_IN") return "TRANSFER_OUT";
    if (type === "TRANSFER_OUT") return "TRANSFER_IN";

    return "ADJUSTMENT";
  },

  async voidDocument() {
    const documentId = this.documentId();

    if (!documentId) {
      showAlert("Load a stock movement first.", "warning");
      return;
    }

    if (appsmith.store.currentStockMovementStatus === "CANCELLED") {
      showAlert("This document is already cancelled.", "warning");
      return;
    }

    try {
      const movements = await GetStockMovementsForVoid.run({ documentId });
      const rows = movements || GetStockMovementsForVoid.data || [];

      for (const row of rows) {
        const reverseType = this.reverseMovementType(row.movementType);

        if (reverseType === "OUT" || reverseType === "TRANSFER_OUT") {
          const available = await this.getFreshStock(row.productId, row.warehouseId);

          if (Number(row.quantity || 0) > available) {
            showAlert(
              `Cannot void because ${row.productCode} does not have enough stock in ${row.warehouseCode}. Available: ${available}`,
              "error"
            );
            return;
          }
        }

        await InsertStockMovement.run({
          warehouseId: row.warehouseId,
          productId: row.productId,
          documentId,
          documentItemId: row.documentItemId || null,
          movementType: reverseType,
          movementDate: moment().format("YYYY-MM-DD HH:mm:ss"),
          quantity: Math.abs(Number(row.quantity || 0)),
          unitCost: Number(row.unitCost || 0),
          totalCost: Math.abs(Number(row.totalCost || 0)),
          batchNumber: row.batchNumber || null,
          serialNumber: row.serialNumber || null,
          note: `Void of ${MovementNumberInput.text.trim()}`
        });
      }

      await VoidStockMovementDocument.run({ documentId });

      await this.writeAudit(
        "VOID",
        documentId,
        appsmith.store.stockMovementBeforeVoid || null,
        {
          source: "Stock movement form",
          document_id: documentId,
          document_number: MovementNumberInput.text.trim(),
          status: "CANCELLED",
          voided_at: moment().format("YYYY-MM-DD HH:mm:ss")
        }
      );

      await this.afterSave();

      showAlert("Stock movement was voided and stock was reversed.", "success");
    } catch (error) {
      showAlert("Error while voiding stock movement: " + error.message, "error");
      console.log(error);
    }
  },

  async afterSave() {
    await storeValue("stockMovementItems", []);
    await storeValue("currentStockMovementDocumentId", null);
    await storeValue("currentStockMovementStatus", null);
    await storeValue("stockMovementBeforeVoid", null);
    await storeValue("inventoryMode", "LIST");

    if (typeof InventorySummaryQuery !== "undefined") await InventorySummaryQuery.run();
    if (typeof InventoryBalanceQuery !== "undefined") await InventoryBalanceQuery.run();
    if (typeof StockMovementsQuery !== "undefined") await StockMovementsQuery.run();
    if (typeof RecentStockMovementsQuery !== "undefined") await RecentStockMovementsQuery.run();
  },

  async cancel() {
    await storeValue("stockMovementItems", []);
    await storeValue("currentStockMovementDocumentId", null);
    await storeValue("currentStockMovementStatus", null);
    await storeValue("stockMovementBeforeVoid", null);
    await storeValue("inventoryMode", "LIST");
  }
};

export default {
  rows() {
    return appsmith.store.inboundDeliveryItems || [];
  },

  documentId() {
    return appsmith.store.currentInboundDeliveryId || null;
  },

  status() {
    return appsmith.store.currentInboundDeliveryStatus || null;
  },

  isEditMode() {
    return !!this.documentId();
  },

  getDocumentDate() {
    return moment(
      InboundDeliveryDateInput.selectedDate ||
      InboundDeliveryDateInput.formattedDate ||
      InboundDeliveryDateInput.text ||
      moment()
    ).format("YYYY-MM-DD");
  },

  getExpectedDate() {
    return moment(
      InboundExpectedDateInput.selectedDate ||
      InboundExpectedDateInput.formattedDate ||
      InboundExpectedDateInput.text ||
      moment()
    ).format("YYYY-MM-DD");
  },

  recalc(rows) {
    return (rows || []).map((row, index) => {
      const expectedQty = Number(row["Expected Qty"] || row.expectedQuantity || 0);
      const receivedQty = Number(row["Received Qty"] || row.receivedQuantity || 0);
      const unitCost = Number(row["Unit Cost"] || row.unitCost || 0);

      return {
        ...row,
        lineNo: index + 1,
        "Expected Qty": expectedQty,
        "Received Qty": receivedQty,
        Variance: receivedQty - expectedQty,
        "Unit Cost": unitCost,
        "Line Total": expectedQty * unitCost
      };
    });
  },

  totals() {
    const rows = this.rows();

    return {
      expected: rows.reduce((s, r) => s + Number(r["Expected Qty"] || 0), 0),
      received: rows.reduce((s, r) => s + Number(r["Received Qty"] || 0), 0),
      variance: rows.reduce((s, r) => s + Number(r.Variance || 0), 0),
      value: rows.reduce((s, r) => s + Number(r["Line Total"] || 0), 0)
    };
  },

  auditValues(documentId = null) {
    const totals = this.totals();

    return {
      source: "Inbound Delivery form",
      document_id: documentId,
      document_number: InboundDeliveryNumberInput.text,
      document_date: this.getDocumentDate(),
      expected_date: this.getExpectedDate(),
      supplier_id: InboundSupplierSelect.selectedOptionValue || null,
      warehouse_id: InboundWarehouseSelect.selectedOptionValue,
      reference_number: InboundReferenceInput.text || null,
      status: InboundDeliveryStatusInput.text || this.status() || "DRAFT",
      total_expected_quantity: totals.expected,
      total_received_quantity: totals.received,
      total_variance_quantity: totals.variance,
      total_amount: totals.value,
      item_count: this.rows().length,
      note: InboundNoteInput.text || null
    };
  },

  async startNew() {
    const nextNumber =
      GetNextInboundDeliveryNumber.data?.[0]?.nextInboundNumber ||
      GetNextInboundDeliveryNumber.data?.nextInboundNumber ||
      "";

    await storeValue("currentInboundDeliveryId", null);
    await storeValue("currentInboundDeliveryStatus", null);
    await storeValue("inboundDeliveryEditMode", false);
    await storeValue("inboundDeliveryBeforeEdit", null);
    await storeValue("inboundDeliveryItems", []);
    await storeValue("inventoryMode", "INBOUND_DELIVERY_NEW");

    InboundDeliveryNumberInput.setValue(nextNumber);
    InboundDeliveryDateInput.setValue(moment().format("YYYY-MM-DD"));
    InboundExpectedDateInput.setValue(moment().format("YYYY-MM-DD"));
    InboundDeliveryStatusInput.setValue("DRAFT");
    InboundReferenceInput.setValue("");
    InboundNoteInput.setValue("");

    InboundSupplierSelect.setSelectedOption("");
    InboundWarehouseSelect.setSelectedOption(
      String(InventoryWarehouseSelect.selectedOptionValue || appsmith.store.warehouseId || "")
    );
  },

  async addBlankRow() {
    const rows = this.rows();

    await storeValue("inboundDeliveryItems", [
      ...rows,
      {
        lineNo: rows.length + 1,
        productId: null,
        unitId: null,
        Barcode: "",
        "Product Code": "",
        "Product Name": "",
        Description: "",
        "Expected Qty": 1,
        "Received Qty": 0,
        Variance: -1,
        Unit: "",
        "Unit Cost": 0,
        "Line Total": 0,
        Note: ""
      }
    ]);
  },

  async resolveTableProduct(rowIndex, lookupValue) {
    const lookup = String(lookupValue || "").trim();

    if (!lookup) return;

    const result = await FindInboundProduct.run({ lookup });
    const product = result?.[0] || FindInboundProduct.data?.[0];

    if (!product) {
      showAlert("Product was not found.", "warning");
      return;
    }

    const rows = this.rows();

    const nextRows = rows.map((row, index) => {
      if (index !== rowIndex) return row;

      const expectedQty = Number(row["Expected Qty"] || 1);
      const receivedQty = Number(row["Received Qty"] || 0);
      const unitCost = Number(row["Unit Cost"] || product.purchasePrice || 0);

      return {
        ...row,
        productId: product.productId,
        unitId: product.unitId,
        Barcode: product.barcode || lookup,
        "Product Code": product.productCode,
        "Product Name": product.productName,
        Description: product.description || product.productName,
        "Expected Qty": expectedQty,
        "Received Qty": receivedQty,
        Unit: product.unitCode,
        "Unit Cost": unitCost,
        "Line Total": expectedQty * unitCost
      };
    });

    await storeValue("inboundDeliveryItems", this.recalc(nextRows));
  },

  async scanProductDebounced(value) {
    const lookup = String(value || "").trim();

    if (!lookup) return;
    if (lookup.length < 3) return;

    await storeValue("inboundDeliveryScanLastValue", lookup);

    setTimeout(() => {
      if (appsmith.store.inboundDeliveryScanLastValue === lookup) {
        InboundDeliveryForm.scanProduct(lookup);
      }
    }, 350);
  },

  async scanProduct(lookupValue = null) {
    const lookup = String(lookupValue || InboundDeliveryScanInput.text || "").trim();

    if (!lookup) return;

    const result = await FindInboundProduct.run({ lookup });
    const product = result?.[0] || FindInboundProduct.data?.[0];

    if (!product) {
      showAlert("Product was not found.", "warning");
      InboundDeliveryScanInput.setValue("");
      return;
    }

    const rows = [...this.rows()];
    const existingIndex = rows.findIndex(
      row => Number(row.productId) === Number(product.productId)
    );

    if (existingIndex >= 0) {
      const currentReceived = Number(rows[existingIndex]["Received Qty"] || 0);

      rows[existingIndex] = {
        ...rows[existingIndex],
        "Received Qty": currentReceived + 1
      };
    } else {
      rows.push({
        lineNo: rows.length + 1,
        productId: product.productId,
        unitId: product.unitId,
        Barcode: product.barcode || lookup,
        "Product Code": product.productCode,
        "Product Name": product.productName,
        Description: product.description || product.productName,
        "Expected Qty": 0,
        "Received Qty": 1,
        Variance: 1,
        Unit: product.unitCode,
        "Unit Cost": Number(product.purchasePrice || 0),
        "Line Total": 0,
        Note: "Unexpected item"
      });
    }

    await storeValue("inboundDeliveryItems", this.recalc(rows));
    await storeValue("inboundDeliveryScanLastValue", "");
    InboundDeliveryScanInput.setValue("");
  },

  async updateRows() {
    const tableRows = InboundDeliveryItemsEditTable.tableData || this.rows();
    await storeValue("inboundDeliveryItems", this.recalc(tableRows));
  },

  async removeSelectedRow() {
    const selectedIndex =
      InboundDeliveryItemsEditTable.selectedRowIndex ??
      InboundDeliveryItemsEditTable.triggeredRowIndex ??
      InboundDeliveryItemsEditTable.updatedRowIndex ??
      -1;

    if (selectedIndex < 0) {
      showAlert("Select row first.", "warning");
      return;
    }

    const rows = this.rows().filter((_, index) => index !== selectedIndex);
    await storeValue("inboundDeliveryItems", this.recalc(rows));
  },

  async clearRows() {
    await storeValue("inboundDeliveryItems", []);
  },

  validate() {
    if (!InboundDeliveryNumberInput.text) {
      showAlert("Inbound number is required.", "warning");
      return false;
    }

    if (!InboundWarehouseSelect.selectedOptionValue) {
      showAlert("Warehouse is required.", "warning");
      return false;
    }

    if (!this.rows().length) {
      showAlert("Add at least one item.", "warning");
      return false;
    }

    const invalidRow = this.rows().find(row =>
      !row.productId || Number(row["Expected Qty"] || 0) < 0 || Number(row["Received Qty"] || 0) < 0
    );

    if (invalidRow) {
      showAlert("Every row must have product and non-negative quantities.", "warning");
      return false;
    }

    return true;
  },

  async saveDraft() {
    if (!this.validate()) return;

    const wasEditMode = this.isEditMode();

    try {
      let documentId = this.documentId();

      if (wasEditMode) {
        await UpdateInboundDelivery.run({ documentId });
        await DeleteInboundDeliveryItems.run({ documentId });
      } else {
        await InsertInboundDelivery.run();

        const idRows = await GetInboundDeliveryIdByNumber.run();
        const found = idRows?.[0] || GetInboundDeliveryIdByNumber.data?.[0];

        documentId = found?.documentId;

        if (!documentId) {
          showAlert("Inbound delivery was saved, but ID was not found.", "error");
          return;
        }

        await storeValue("currentInboundDeliveryId", documentId);
      }

      const rows = this.recalc(this.rows());

      for (let i = 0; i < rows.length; i += 1) {
        await InsertInboundDeliveryItem.run({
          documentId,
          lineNo: i + 1,
          productId: rows[i].productId,
          description: rows[i].Description || rows[i]["Product Name"],
          expectedQuantity: rows[i]["Expected Qty"],
          receivedQuantity: rows[i]["Received Qty"],
          varianceQuantity: rows[i].Variance,
          unitId: rows[i].unitId,
          unitCost: rows[i]["Unit Cost"] || 0,
          lineTotal: rows[i]["Line Total"] || 0,
          note: rows[i].Note || null
        });
      }

      if (typeof AuditLog !== "undefined") {
        await AuditLog.insert({
          entityName: "documents",
          entityId: documentId,
          actionType: wasEditMode ? "UPDATE" : "INSERT",
          oldValues: wasEditMode ? appsmith.store.inboundDeliveryBeforeEdit || null : null,
          newValues: this.auditValues(documentId)
        });
      }

      await this.afterSave();
      showAlert(wasEditMode ? "Inbound delivery was updated." : "Inbound delivery was saved.", "success");
    } catch (error) {
      showAlert("Error while saving inbound delivery: " + error.message, "error");
      console.log(error);
    }
  },

  async loadForEdit(row = null) {
    const selected = row || InboundDeliveryTable.selectedRow || {};
    const documentId =
      selected.documentId ||
      selected["Inbound ID"] ||
      selected.id;

    if (!documentId) {
      showAlert("Select inbound delivery first.", "warning");
      return;
    }

    const headerRows = await GetInboundDeliveryForEdit.run({ documentId });
    const header = headerRows?.[0] || GetInboundDeliveryForEdit.data?.[0];

    if (!header) {
      showAlert("Inbound delivery was not found.", "error");
      return;
    }

    if (["RECEIVED", "CANCELLED"].includes(header.status)) {
      showAlert("Received or cancelled inbound deliveries cannot be edited.", "warning");
      return;
    }

    const itemRows = await GetInboundDeliveryItemsForEdit.run({ documentId });
    const items = itemRows || GetInboundDeliveryItemsForEdit.data || [];

    await storeValue("currentInboundDeliveryId", header.documentId);
    await storeValue("currentInboundDeliveryStatus", header.status);
    await storeValue("inboundDeliveryEditMode", true);
    await storeValue("inboundDeliveryBeforeEdit", {
      header,
      items
    });
    await storeValue("inboundDeliveryItems", this.recalc(items));
    await storeValue("inventoryMode", "INBOUND_DELIVERY_EDIT");

    InboundDeliveryNumberInput.setValue(header.documentNumber || "");
    InboundDeliveryDateInput.setValue(header.documentDate || "");
    InboundExpectedDateInput.setValue(header.expectedDate || "");
    InboundDeliveryStatusInput.setValue(header.status || "DRAFT");
    InboundSupplierSelect.setSelectedOption(header.supplierId ? String(header.supplierId) : "");
    InboundWarehouseSelect.setSelectedOption(header.warehouseId ? String(header.warehouseId) : "");
    InboundReferenceInput.setValue(header.referenceNumber || "");
    InboundNoteInput.setValue(header.note || "");
  },

  async setStatus(row, status) {
    const documentId = row?.documentId || row?.id;

    if (!documentId) {
      showAlert("Select inbound delivery first.", "warning");
      return;
    }

    await UpdateInboundDeliveryStatus.run({
      documentId,
      status
    });

    if (typeof AuditLog !== "undefined") {
      await AuditLog.insert({
        entityName: "documents",
        entityId: documentId,
        actionType: "STATUS",
        newValues: {
          source: "Inbound Delivery",
          status
        }
      });
    }

    await this.refreshLists();
    showAlert(`Inbound status changed to ${status}.`, "success");
  },

  async refreshLists() {
    if (typeof ListInboundDeliveries !== "undefined") {
      await ListInboundDeliveries.run();
    }

    if (typeof ListInboundDeliveryItems !== "undefined") {
      await ListInboundDeliveryItems.run({
        documentId: InboundDeliveryTable.selectedRow?.documentId || 0
      });
    }
  },
	async createGoodsReceipt(row = null) {
  const selected = row || InboundDeliveryTable.selectedRow || {};
  const inboundId = selected.documentId || selected.id;
  const status = selected.Status || selected.status;

  if (!inboundId) {
    showAlert("Select inbound delivery first.", "warning");
    return;
  }

  if (!["RECEIVING", "ARRIVED"].includes(status)) {
    showAlert("Inbound delivery must be ARRIVED or RECEIVING before creating goods receipt.", "warning");
    return;
  }

  const itemRows = await GetInboundDeliveryItemsForEdit.run({
    documentId: inboundId
  });

  const items = itemRows || GetInboundDeliveryItemsForEdit.data || [];
  const receivedItems = items.filter(row => Number(row["Received Qty"] || 0) > 0);

  if (!receivedItems.length) {
    showAlert("There are no received quantities to create goods receipt.", "warning");
    return;
  }

  await GetNextGoodsReceiptNumber.run();

  const receiptNumber =
    GetNextGoodsReceiptNumber.data?.[0]?.nextReceiptNumber ||
    GetNextGoodsReceiptNumber.data?.nextReceiptNumber;

  if (!receiptNumber) {
    showAlert("Goods receipt number could not be generated.", "error");
    return;
  }

  await InsertGoodsReceiptFromInbound.run({
    inboundId,
    receiptNumber
  });

  const receiptRows = await GetGoodsReceiptIdByNumberForIn.run({
    receiptNumber
  });

  const receipt = receiptRows?.[0] || GetGoodsReceiptIdByNumberForIn.data?.[0];

  if (!receipt?.receiptId) {
    showAlert("Goods receipt was created, but ID was not found.", "error");
    return;
  }

  await InsertGoodsReceiptItemsFromInb.run({
    inboundId,
    receiptId: receipt.receiptId
  });

  await UpdateInboundDeliveryStatus.run({
    documentId: inboundId,
    status: "RECEIVED"
  });

  if (typeof AuditLog !== "undefined") {
    await AuditLog.insert({
      entityName: "documents",
      entityId: receipt.receiptId,
      actionType: "INSERT",
      newValues: {
        source: "Inbound Delivery",
        inbound_delivery_id: inboundId,
        goods_receipt_id: receipt.receiptId,
        receipt_number: receiptNumber,
        document_type: "PURCHASE_RECEIPT"
      }
    });

    await AuditLog.insert({
      entityName: "documents",
      entityId: inboundId,
      actionType: "STATUS",
      newValues: {
        source: "Inbound Delivery",
        status: "RECEIVED",
        created_goods_receipt_id: receipt.receiptId,
        created_goods_receipt_number: receiptNumber
      }
    });
  }

  await this.refreshLists();

  if (typeof ListGoodsReceipts !== "undefined") {
    await ListGoodsReceipts.run();
  }

  showAlert(`Goods receipt ${receiptNumber} was created from inbound delivery.`, "success");
},


  async afterSave() {
    await storeValue("currentInboundDeliveryId", null);
    await storeValue("currentInboundDeliveryStatus", null);
    await storeValue("inboundDeliveryEditMode", false);
    await storeValue("inboundDeliveryBeforeEdit", null);
    await storeValue("inboundDeliveryItems", []);
    await storeValue("inventoryMode", "LIST");

    await this.refreshLists();
  },

  async cancel() {
    await storeValue("currentInboundDeliveryId", null);
    await storeValue("currentInboundDeliveryStatus", null);
    await storeValue("inboundDeliveryEditMode", false);
    await storeValue("inboundDeliveryBeforeEdit", null);
    await storeValue("inboundDeliveryItems", []);
    await storeValue("inventoryMode", "LIST");
  }
};

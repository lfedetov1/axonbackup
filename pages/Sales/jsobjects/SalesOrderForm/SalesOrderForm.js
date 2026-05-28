export default {
  rows() {
    return appsmith.store.salesOrderItems || [];
  },

  documentId() {
    return appsmith.store.currentSalesOrderId || null;
  },

  isEditMode() {
    return !!this.documentId();
  },

  warehouseId() {
    return Number(
      SalesOrderWarehouseSelect.selectedOptionValue ||
      appsmith.store.warehouseId ||
      0
    );
  },

  firstResultRow(result, queryObject) {
    if (Array.isArray(result) && result.length) return result[0];
    if (Array.isArray(result?.data) && result.data.length) return result.data[0];
    if (Array.isArray(queryObject?.data) && queryObject.data.length) return queryObject.data[0];
    return null;
  },

  async audit(actionType, entityId, newValues = {}, oldValues = null) {
    try {
      if (typeof AuditLog !== "undefined" && AuditLog.insert) {
        await AuditLog.insert({
          entityName: "documents",
          entityId,
          actionType,
          oldValues,
          newValues: {
            source: "Sales Order",
            ...newValues
          }
        });
      }
    } catch (error) {
      console.log("Audit log skipped:", error);
    }
  },

  recalcRow(row = {}) {
    const quantity = Number(row.quantity || 0);
    const unitPrice = Number(row.unitPrice || 0);
    const discountPercent = Number(row.discountPercent || 0);
    const taxRate = Number(row.taxRate || 0);

    const gross = quantity * unitPrice;
    const discountAmount = gross * discountPercent / 100;
    const lineSubtotal = gross - discountAmount;
    const taxAmount = lineSubtotal * taxRate / 100;
    const lineTotal = lineSubtotal + taxAmount;

    return {
      ...row,
      quantity,
      unitPrice,
      discountPercent,
      taxRate,
      discountAmount: Number(discountAmount.toFixed(2)),
      lineSubtotal: Number(lineSubtotal.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      lineTotal: Number(lineTotal.toFixed(2))
    };
  },

  recalc(rows = []) {
    return rows.map((row, index) => ({
      ...this.recalcRow(row),
      lineNo: index + 1
    }));
  },

  async setRows(rows) {
    await storeValue("salesOrderItems", this.recalc(rows || []));
  },

  totals() {
    return this.rows().reduce(
      (sum, row) => ({
        quantity: sum.quantity + Number(row.quantity || 0),
        subtotal: sum.subtotal + Number(row.lineSubtotal || 0),
        discount: sum.discount + Number(row.discountAmount || 0),
        tax: sum.tax + Number(row.taxAmount || 0),
        total: sum.total + Number(row.lineTotal || 0)
      }),
      { quantity: 0, subtotal: 0, discount: 0, tax: 0, total: 0 }
    );
  },

  normalizeProduct(product = {}, lookup = "") {
    const pick = (keys, fallback = "") => {
      for (const key of keys) {
        if (product[key] !== undefined && product[key] !== null) return product[key];
      }
      return fallback;
    };

    return {
      productId: pick(["productId", "ProductID", "Product ID", "id", "ID"], null),
      productCode: pick(["productCode", "ProductCode", "Product Code", "code", "Code"], ""),
      productName: pick(["productName", "ProductName", "Product Name", "name", "Name"], ""),
      barcode: pick(["barcode", "Barcode"], lookup),
      sku: pick(["sku", "SKU"], ""),

      unitId: pick(["unitId", "UnitID", "Unit ID", "unit_id"], null),
      unitCode: pick(["unitCode", "UnitCode", "Unit Code", "unit", "Unit"], ""),

      taxRateId: pick(["taxRateId", "taxrateid", "TaxRateID", "Tax Rate ID", "tax_rate_id"], null),
      taxRate: Number(pick(["taxRate", "taxrate", "TaxRate", "Tax Rate", "rate", "Rate", "VAT", "vat"], 0)),

      unitPrice: Number(pick(["unitPrice", "UnitPrice", "Unit Price", "salesPrice", "Sales Price", "price", "Price"], 0)),
      availableStock: Number(pick(["availableStock", "AvailableStock", "Available Stock"], 0)),
      trackStock: String(pick(["trackStock", "TrackStock", "track_stock"], "0"))
    };
  },

  async startNew() {
    await storeValue("currentSalesOrderId", null);
    await storeValue("salesOrderItems", []);
    await storeValue("salesOrderFormVisible", true);

    await GetNextSalesOrderNumber.run();

    SalesOrderNumberInput.setValue(GetNextSalesOrderNumber.data?.[0]?.nextSalesOrderNumber || "");
    SalesOrderStatusInput.setValue("DRAFT");
    SalesOrderDateInput.setValue(moment().format("YYYY-MM-DD"));
    SalesOrderDueDateInput.setValue(moment().add(7, "days").format("YYYY-MM-DD"));
    SalesOrderNoteInput.setValue("");

    SalesOrderCustomerSelect.setSelectedOption("");
    SalesOrderWarehouseSelect.setSelectedOption(String(appsmith.store.warehouseId || ""));
    SalesOrderChannelSelect.setSelectedOption("STORE");
    SalesOrderFulfillmentSelect.setSelectedOption("PICKUP");

    if (typeof SalesOrderBarcodeInput !== "undefined") {
      SalesOrderBarcodeInput.setValue("");
    }

    showModal(SalesOrderFormModal.name);
  },

  async resolveProduct(lookupValue, increment = true) {
    const lookup = String(lookupValue || "").trim();

    if (!lookup) {
      showAlert("Barcode / product code is empty.", "warning");
      return;
    }

    try {
      const result = await FindSalesProduct.run({
        lookup,
        warehouseId: this.warehouseId()
      });

      const raw = this.firstResultRow(result, FindSalesProduct);

      if (!raw) {
        showAlert(`Product was not found: ${lookup}`, "warning");
        return;
      }

      const product = this.normalizeProduct(raw, lookup);

      if (!product.productId) {
        showAlert("Product was found, but productId is missing.", "error");
        return;
      }

      const rows = [...this.rows()];
      const existingIndex = rows.findIndex(row =>
        String(row.productId || "") === String(product.productId || "")
      );

      if (existingIndex >= 0 && increment) {
        rows[existingIndex] = this.recalcRow({
          ...rows[existingIndex],
          quantity: Number(rows[existingIndex].quantity || 0) + 1,
          taxRateId: product.taxRateId,
          taxRate: product.taxRate,
          unitPrice: Number(rows[existingIndex].unitPrice || product.unitPrice || 0)
        });

        await this.setRows(rows);
        return;
      }

      rows.push(this.recalcRow({
        lineNo: rows.length + 1,
        barcode: product.barcode,
        productId: product.productId,
        productCode: product.productCode,
        productName: product.productName,
        sku: product.sku,
        description: product.productName,
        unitId: product.unitId,
        unitCode: product.unitCode,
        taxRateId: product.taxRateId,
        taxRate: product.taxRate,
        quantity: 1,
        unitPrice: product.unitPrice,
        discountPercent: 0,
        availableStock: product.availableStock,
        trackStock: product.trackStock,
        note: ""
      }));

      await this.setRows(rows);
    } catch (error) {
      showAlert("Error while loading product: " + error.message, "error");
      console.log(error);
    }
  },

  async resolveProductIntoRow(rowIndex, lookupValue) {
    const lookup = String(lookupValue || "").trim();
    if (!lookup) return;

    const result = await FindSalesProduct.run({
      lookup,
      warehouseId: this.warehouseId()
    });

    const raw = this.firstResultRow(result, FindSalesProduct);

    if (!raw) {
      showAlert("Product was not found.", "warning");
      return;
    }

    const product = this.normalizeProduct(raw, lookup);
    const rows = [...this.rows()];
    const index = rowIndex >= 0 ? rowIndex : rows.length;
    const existingRow = rows[index] || {};

    rows[index] = this.recalcRow({
      ...existingRow,
      lineNo: index + 1,
      barcode: product.barcode,
      productId: product.productId,
      productCode: product.productCode,
      productName: product.productName,
      sku: product.sku,
      description: existingRow.description || product.productName,
      unitId: product.unitId,
      unitCode: product.unitCode,
      taxRateId: product.taxRateId,
      taxRate: product.taxRate,
      quantity: Number(existingRow.quantity || 1),
      unitPrice: Number(existingRow.unitPrice || product.unitPrice || 0),
      discountPercent: Number(existingRow.discountPercent || 0),
      availableStock: product.availableStock,
      trackStock: product.trackStock,
      note: existingRow.note || ""
    });

    await this.setRows(rows);
  },

  async resolveProductFromEditedRow(editedRow = {}) {
    await this.updateRows();

    const lookup = String(
      editedRow.barcode ||
      editedRow.productCode ||
      editedRow.sku ||
      ""
    ).trim();

    if (!lookup) return;

    const rows = [...this.rows()];
    let rowIndex = rows.findIndex(row =>
      Number(row.lineNo || 0) === Number(editedRow.lineNo || 0)
    );

    if (rowIndex < 0 && SalesOrderItemsEditTable.selectedRowIndex !== undefined) {
      rowIndex = SalesOrderItemsEditTable.selectedRowIndex;
    }

    await this.resolveProductIntoRow(rowIndex, lookup);
  },

  async scanBarcode(value) {
    const lookup = String(
      value ||
      SalesOrderBarcodeInput.text ||
      SalesOrderBarcodeInput.value ||
      ""
    ).trim();

    if (!lookup) return;

    await this.resolveProduct(lookup, true);

    if (typeof SalesOrderBarcodeInput !== "undefined") {
      SalesOrderBarcodeInput.setValue("");
    }
  },

  async updateRows() {
    const tableRows = SalesOrderItemsEditTable.tableData || this.rows();
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
        taxRateId: null,
        taxRate: 0,
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        discountAmount: 0,
        lineSubtotal: 0,
        taxAmount: 0,
        lineTotal: 0,
        availableStock: 0,
        trackStock: "0",
        note: ""
      }
    ]);
  },

  async removeSelectedRow() {
    const index =
      SalesOrderItemsEditTable.selectedRowIndex ??
      SalesOrderItemsEditTable.triggeredRowIndex ??
      -1;

    if (index < 0) {
      showAlert("Select row first.", "warning");
      return;
    }

    await this.setRows(this.rows().filter((_, i) => i !== index));
  },

  validate() {
    if (!SalesOrderNumberInput.text.trim()) {
      showAlert("Sales order number is required.", "warning");
      return false;
    }

    if (!SalesOrderCustomerSelect.selectedOptionValue) {
      showAlert("Customer is required.", "warning");
      return false;
    }

    if (!SalesOrderWarehouseSelect.selectedOptionValue) {
      showAlert("Warehouse is required.", "warning");
      return false;
    }

    if (!this.rows().length) {
      showAlert("Add at least one item.", "warning");
      return false;
    }

    const invalid = this.rows().find(row =>
      !row.productId ||
      !row.unitId ||
      Number(row.quantity || 0) <= 0
    );

    if (invalid) {
      showAlert("Every row must have product, unit and quantity.", "warning");
      return false;
    }

    return true;
  },

  async save(status = "DRAFT") {
    await this.updateRows();

    if (!this.validate()) return null;

    const wasEditMode = this.isEditMode();
    const rows = this.recalc(this.rows());
    const totals = this.totals();
    let documentId = this.documentId();

    if (wasEditMode) {
      await UpdateSalesOrderDocument.run({
        documentId,
        subtotalAmount: totals.subtotal,
        discountAmount: totals.discount,
        taxAmount: totals.tax,
        totalAmount: totals.total
      });

      await DeleteSalesOrderItems.run({ documentId });
    } else {
      await InsertSalesOrderDocument.run({
        status,
        subtotalAmount: totals.subtotal,
        discountAmount: totals.discount,
        taxAmount: totals.tax,
        totalAmount: totals.total
      });

      const idRows = await GetSalesOrderIdByNumber.run();
      const found = idRows?.[0] || GetSalesOrderIdByNumber.data?.[0];

      documentId = found?.salesOrderId || found?.documentId;

      if (!documentId) {
        showAlert("Sales order was saved, but ID was not found.", "error");
        return null;
      }

      await storeValue("currentSalesOrderId", documentId);
    }

    for (let i = 0; i < rows.length; i += 1) {
      await InsertSalesOrderItem.run({
        documentId,
        lineNo: i + 1,
        productId: rows[i].productId,
        description: rows[i].description || rows[i].productName,
        quantity: rows[i].quantity,
        unitId: rows[i].unitId,
        unitPrice: rows[i].unitPrice,
        discountAmount: rows[i].discountAmount,
        taxRateId: rows[i].taxRateId,
        taxAmount: rows[i].taxAmount,
        lineSubtotal: rows[i].lineSubtotal,
        lineTotal: rows[i].lineTotal,
        note: rows[i].note || null
      });
    }

    await this.audit(wasEditMode ? "UPDATE" : "INSERT", documentId, {
      document_type: "SALES_ORDER",
      document_number: SalesOrderNumberInput.text,
      status,
      customer_id: SalesOrderCustomerSelect.selectedOptionValue,
      warehouse_id: SalesOrderWarehouseSelect.selectedOptionValue,
      sales_channel: SalesOrderChannelSelect.selectedOptionValue,
      fulfillment_type: SalesOrderFulfillmentSelect.selectedOptionValue,
      total_amount: totals.total,
      item_count: rows.length
    });

    await this.afterSave();
    return documentId;
  },

  async saveDraft() {
    try {
      const documentId = await this.save("DRAFT");
      if (!documentId) return;
      showAlert("Sales order was saved.", "success");
    } catch (error) {
      showAlert("Error while saving sales order: " + error.message, "error");
      console.log(error);
    }
  },

  async afterSave() {
    await storeValue("currentSalesOrderId", null);
    await storeValue("salesOrderItems", []);
    await storeValue("salesOrderFormVisible", false);

    await this.refreshLists();

    closeModal(SalesOrderFormModal.name);
  },

  async loadForEdit(row = null) {
    const selected = row || SalesOrdersTable.triggeredRow || SalesOrdersTable.selectedRow || {};
    const documentId = selected.documentId || selected.id || selected.ID || selected["Document ID"];

    if (!documentId) {
      showAlert("Select sales order first.", "warning");
      return;
    }

    const headerRows = await GetSalesOrderForEdit.run({ documentId });
    const header = headerRows?.[0] || GetSalesOrderForEdit.data?.[0];

    if (!header) {
      showAlert("Sales order was not found.", "error");
      return;
    }

    if (!["DRAFT", "CONFIRMED"].includes(header.status)) {
      showAlert("Only draft/confirmed sales orders can be edited.", "warning");
      return;
    }

    const itemRows = await GetSalesOrderItemsForEdit.run({ documentId });
    const items = itemRows || GetSalesOrderItemsForEdit.data || [];

    await storeValue("currentSalesOrderId", header.documentId || documentId);
    await storeValue("salesOrderFormVisible", true);

    SalesOrderNumberInput.setValue(header.documentNumber || "");
    SalesOrderStatusInput.setValue(header.status || "DRAFT");
    SalesOrderDateInput.setValue(header.documentDate || "");
    SalesOrderDueDateInput.setValue(header.dueDate || "");
    SalesOrderCustomerSelect.setSelectedOption(header.partnerId ? String(header.partnerId) : "");
    SalesOrderWarehouseSelect.setSelectedOption(header.warehouseId ? String(header.warehouseId) : "");
    SalesOrderChannelSelect.setSelectedOption(header.salesChannel || "STORE");
    SalesOrderFulfillmentSelect.setSelectedOption(header.fulfillmentType || "PICKUP");
    SalesOrderNoteInput.setValue(header.note || "");

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
      taxRateId: row.taxRateId,
      taxRate: Number(row.taxRate || 0),
      quantity: Number(row.quantity || 0),
      unitPrice: Number(row.unitPrice || 0),
      discountPercent: Number(row.discountPercent || 0),
      discountAmount: Number(row.discountAmount || 0),
      taxAmount: Number(row.taxAmount || 0),
      lineSubtotal: Number(row.lineSubtotal || 0),
      lineTotal: Number(row.lineTotal || 0),
      note: row.note || ""
    })));

    showModal(SalesOrderFormModal.name);
  },

  async cancelDocument(row = null) {
    const selected = row || SalesOrdersTable.triggeredRow || SalesOrdersTable.selectedRow || {};
    const documentId = selected.documentId || selected.id || selected.ID;

    if (!documentId) {
      showAlert("Select sales order first.", "warning");
      return;
    }

    await CancelSalesOrder.run({ documentId });

    await this.audit("CANCEL", documentId, {
      document_type: "SALES_ORDER",
      status: "CANCELLED"
    });

    await this.refreshLists();
    showAlert("Sales order was cancelled.", "success");
  },

  async confirm(row = null) {
    const selected = row || SalesOrdersTable.triggeredRow || SalesOrdersTable.selectedRow || {};
    const documentId = selected.documentId || selected.id || selected.ID;

    if (!documentId) {
      showAlert("Select sales order first.", "warning");
      return;
    }

    await ConfirmSalesOrder.run({ documentId });

    await this.audit("CONFIRM", documentId, {
      document_type: "SALES_ORDER",
      status: "CONFIRMED"
    });

    await this.refreshLists();
    showAlert("Sales order was confirmed.", "success");
  },

  async markPacked(row = null) {
    const selected = row || SalesOrdersTable.triggeredRow || SalesOrdersTable.selectedRow || {};
    const documentId = selected.documentId || selected.id || selected.ID;

    if (!documentId) {
      showAlert("Select sales order first.", "warning");
      return;
    }

    await MarkSalesOrderPacked.run({ documentId });

    await this.audit("PACK", documentId, {
      document_type: "SALES_ORDER",
      status: "PACKED"
    });

    await this.refreshLists();
    showAlert("Sales order was marked as packed.", "success");
  },

  async convertToInvoice(row = null) {
    const selected = row || SalesOrdersTable.triggeredRow || SalesOrdersTable.selectedRow || {};
    const salesOrderId = selected.documentId || selected.id || selected.ID;
    const status = selected.Status || selected.status || "";

    if (!salesOrderId) {
      showAlert("Select sales order first.", "warning");
      return;
    }

    if (["CANCELLED", "INVOICED"].includes(status)) {
      showAlert("This sales order cannot be converted.", "warning");
      return;
    }

    const numberRows = await GetNextInvoiceNumberFromSalesO.run();
    const nextNumber =
      numberRows?.[0]?.nextInvoiceNumber ||
      GetNextInvoiceNumberFromSalesO.data?.[0]?.nextInvoiceNumber;

    if (!nextNumber) {
      showAlert("Invoice number could not be generated.", "error");
      return;
    }

    await InsertInvoiceFromSalesOrder.run({
      salesOrderId,
      invoiceNumber: nextNumber
    });

    const invoiceRows = await GetInvoiceIdByNumberFromSalesO.run({
      invoiceNumber: nextNumber
    });

    const invoice = invoiceRows?.[0] || GetInvoiceIdByNumberFromSalesO.data?.[0];

    if (!invoice?.invoiceId) {
      showAlert("Invoice was created, but ID was not found.", "error");
      return;
    }

    await InsertInvoiceItemsFromSalesOrd.run({
      salesOrderId,
      invoiceId: invoice.invoiceId
    });

    await MarkSalesOrderInvoiced.run({ salesOrderId });

    await this.audit("CONVERT", salesOrderId, {
      document_type: "SALES_ORDER",
      status: "INVOICED",
      invoice_id: invoice.invoiceId,
      invoice_number: invoice.invoiceNumber || nextNumber
    });

    await storeValue("currentInvoiceId", invoice.invoiceId);
    await storeValue("currentInvoiceNumber", invoice.invoiceNumber || nextNumber);

    await this.refreshLists();
    showAlert(`Sales order converted to invoice ${nextNumber}.`, "success");
  },

  async print(row = null) {
    const selected = row || SalesOrdersTable.triggeredRow || SalesOrdersTable.selectedRow || {};
    const documentId = selected.documentId || selected.id || selected.ID;

    if (!documentId) {
      showAlert("Select sales order first.", "warning");
      return;
    }

    await storeValue("selectedSalesOrderPrintId", documentId);
    await GetSalesOrderPrintHeader.run();
    await GetSalesOrderPrintItems.run();
    await GetSalesOrderPrintTaxSummary.run();

    showModal(SalesOrderPrintModal.name);
  },

  async refreshLists() {
    if (typeof ListSalesOrders !== "undefined") await ListSalesOrders.run();
    if (typeof ListSalesOrderItems !== "undefined") await ListSalesOrderItems.run();
    if (typeof ListSalesOrderPackages !== "undefined") await ListSalesOrderPackages.run();
  },

  refreshListDebounced() {
    setTimeout(() => {
      if (typeof ListSalesOrders !== "undefined") ListSalesOrders.run();
    }, 300);
  },

  async cancel() {
    await storeValue("currentSalesOrderId", null);
    await storeValue("salesOrderItems", []);
    await storeValue("salesOrderFormVisible", false);
    closeModal(SalesOrderFormModal.name);
  }
};
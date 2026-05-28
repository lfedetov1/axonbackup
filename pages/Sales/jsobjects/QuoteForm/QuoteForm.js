export default {
  rows() {
    return appsmith.store.quoteItems || [];
  },

  documentId() {
    return appsmith.store.currentQuoteId || null;
  },

  isEditMode() {
    return !!this.documentId();
  },

  warehouseId() {
    return Number(
      QuoteWarehouseSelect.selectedOptionValue ||
      appsmith.store.warehouseId ||
      0
    );
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
    await storeValue("quoteItems", this.recalc(rows || []));
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

      taxRateId: pick(["taxRateId", "TaxRateID", "Tax Rate ID", "tax_rate_id"], null),
      taxRate: Number(pick(["taxRate", "TaxRate", "Tax Rate", "rate", "Rate"], 0)),

      unitPrice: Number(pick(["unitPrice", "UnitPrice", "Unit Price", "salesPrice", "Sales Price", "price", "Price"], 0)),
      availableStock: Number(pick(["availableStock", "AvailableStock", "Available Stock"], 0)),
      trackStock: String(pick(["trackStock", "TrackStock", "track_stock"], "0"))
    };
  },

  async startNew() {
    await storeValue("currentQuoteId", null);
    await storeValue("quoteItems", []);

    await GetNextQuoteNumber.run();

    QuoteNumberInput.setValue(GetNextQuoteNumber.data?.[0]?.nextQuoteNumber || "");
    QuoteStatusInput.setValue("DRAFT");
    QuoteDateInput.setValue(moment().format("YYYY-MM-DD"));
    QuoteValidUntilInput.setValue(moment().add(14, "days").format("YYYY-MM-DD"));
    QuoteNoteInput.setValue("");

    QuoteCustomerSelect.setSelectedOption("");
    QuoteWarehouseSelect.setSelectedOption(String(appsmith.store.warehouseId || ""));
    QuoteSalesChannelSelect.setSelectedOption("STORE");

    if (typeof QuoteBarcodeInput !== "undefined") {
      QuoteBarcodeInput.setValue("");
    }

    showModal(QuoteFormModal.name);
  },

  async resolveProduct(lookupValue, increment = true) {
    const lookup = String(lookupValue || "").trim();

    if (!lookup) return;

    const result = await FindSalesProduct.run({
      lookup,
      warehouseId: this.warehouseId()
    });

    const raw = result?.[0] || FindSalesProduct.data?.[0];

    if (!raw) {
      showAlert("Product was not found.", "warning");
      return;
    }

    const product = this.normalizeProduct(raw, lookup);
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
  },

  async resolveProductIntoRow(rowIndex, lookupValue) {
    const lookup = String(lookupValue || "").trim();

    if (!lookup) return;

    const result = await FindSalesProduct.run({
      lookup,
      warehouseId: this.warehouseId()
    });

    const raw = result?.[0] || FindSalesProduct.data?.[0];

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

    if (rowIndex < 0 && QuoteItemsEditTable.selectedRowIndex !== undefined) {
      rowIndex = QuoteItemsEditTable.selectedRowIndex;
    }

    await this.resolveProductIntoRow(rowIndex, lookup);
  },

  async scanBarcode(value) {
    const lookup = String(value || "").trim();

    if (!lookup) return;

    await this.resolveProduct(lookup, true);

    if (typeof QuoteBarcodeInput !== "undefined") {
      QuoteBarcodeInput.setValue("");
    }
  },

  async scanBarcodeDebounced(value) {
    const lookup = String(value || "").trim();

    if (!lookup || lookup.length < 3) return;

    await storeValue("quoteScanLastValue", lookup);

    setTimeout(() => {
      if (appsmith.store.quoteScanLastValue === lookup) {
        this.scanBarcode(lookup);
      }
    }, 350);
  },

  async updateRows() {
    const tableRows = QuoteItemsEditTable.tableData || this.rows();
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
      QuoteItemsEditTable.selectedRowIndex ??
      QuoteItemsEditTable.triggeredRowIndex ??
      -1;

    if (index < 0) {
      showAlert("Select row first.", "warning");
      return;
    }

    await this.setRows(this.rows().filter((_, i) => i !== index));
  },

  validate() {
    if (!QuoteNumberInput.text.trim()) {
      showAlert("Quote number is required.", "warning");
      return false;
    }

    if (!QuoteCustomerSelect.selectedOptionValue) {
      showAlert("Customer is required.", "warning");
      return false;
    }

    if (!QuoteWarehouseSelect.selectedOptionValue) {
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

  async saveDraft() {
    await this.updateRows();

    if (!this.validate()) return;

    const rows = this.recalc(this.rows());
    const totals = this.totals();
    let documentId = this.documentId();

    try {
      if (this.isEditMode()) {
        await UpdateQuoteDocument.run({
          documentId,
          subtotalAmount: totals.subtotal,
          discountAmount: totals.discount,
          taxAmount: totals.tax,
          totalAmount: totals.total
        });

        await DeleteQuoteItems.run({ documentId });
      } else {
        await InsertQuoteDocument.run({
          status: "DRAFT",
          currencyCode: "EUR",
          subtotalAmount: totals.subtotal,
          discountAmount: totals.discount,
          taxAmount: totals.tax,
          totalAmount: totals.total
        });

        const idRows = await GetQuoteIdByNumber.run();
        const found = idRows?.[0] || GetQuoteIdByNumber.data?.[0];

        documentId = found?.quoteId || found?.documentId;

        if (!documentId) {
          showAlert("Quote was saved, but ID was not found.", "error");
          return;
        }

        await storeValue("currentQuoteId", documentId);
      }

      for (let i = 0; i < rows.length; i += 1) {
        await InsertQuoteItem.run({
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

      await this.afterSave();
      showAlert("Quote was saved.", "success");
    } catch (error) {
      showAlert("Error while saving quote: " + error.message, "error");
      console.log(error);
    }
  },

  async afterSave() {
    await storeValue("currentQuoteId", null);
    await storeValue("quoteItems", []);

    if (typeof ListQuotes !== "undefined") {
      await ListQuotes.run();
    }

    closeModal(QuoteFormModal.name);
  },

  async loadForEdit(row = null) {
    const selected = row || QuotesTable.triggeredRow || QuotesTable.selectedRow || {};
    const documentId =
      selected.documentId ||
      selected.id ||
      selected.ID ||
      selected["Document ID"];

    if (!documentId) {
      showAlert("Select quote first.", "warning");
      return;
    }

    const headerRows = await GetQuoteForEdit.run({ documentId });
    const header = headerRows?.[0] || GetQuoteForEdit.data?.[0];

    if (!header) {
      showAlert("Quote was not found.", "error");
      return;
    }

    if (header.status !== "DRAFT") {
      showAlert("Only draft quotes can be edited.", "warning");
      return;
    }

    const itemRows = await GetQuoteItemsForEdit.run({ documentId });
    const items = itemRows || GetQuoteItemsForEdit.data || [];

    await storeValue("currentQuoteId", header.documentId || documentId);

    QuoteNumberInput.setValue(header.documentNumber || "");
    QuoteStatusInput.setValue(header.status || "DRAFT");
    QuoteDateInput.setValue(header.documentDate || "");
    QuoteValidUntilInput.setValue(header.validUntil || "");
    QuoteCustomerSelect.setSelectedOption(header.partnerId ? String(header.partnerId) : "");
    QuoteWarehouseSelect.setSelectedOption(header.warehouseId ? String(header.warehouseId) : "");
    QuoteSalesChannelSelect.setSelectedOption(header.salesChannel || "STORE");
    QuoteNoteInput.setValue(header.note || header.documentNote || "");

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

    showModal(QuoteFormModal.name);
  },

  async cancelDocument(row = null) {
    const selected = row || QuotesTable.triggeredRow || QuotesTable.selectedRow || {};
    const documentId =
      selected.documentId ||
      selected.id ||
      selected.ID ||
      selected["Document ID"];

    if (!documentId) {
      showAlert("Select quote first.", "warning");
      return;
    }

    await CancelQuote.run({ documentId });

    if (typeof ListQuotes !== "undefined") {
      await ListQuotes.run();
    }

    showAlert("Quote was cancelled.", "success");
  },
	async convertToInvoice(row = null) {
  const selected = row || QuotesTable.triggeredRow || QuotesTable.selectedRow || {};
  const quoteId =
    selected.documentId ||
    selected.id ||
    selected.ID ||
    selected["Document ID"];

  const status = selected.Status || selected.status || "";

  if (!quoteId) {
    showAlert("Select quote first.", "warning");
    return;
  }

  if (["CANCELLED", "CONVERTED"].includes(status)) {
    showAlert("This quote cannot be converted.", "warning");
    return;
  }

  try {
    const numberRows = await GetNextInvoiceNumberFromQuote.run();
    const nextNumber =
      numberRows?.[0]?.nextInvoiceNumber ||
      GetNextInvoiceNumberFromQuote.data?.[0]?.nextInvoiceNumber;

    if (!nextNumber) {
      showAlert("Invoice number could not be generated.", "error");
      return;
    }

    await InsertInvoiceFromQuote.run({
      quoteId,
      invoiceNumber: nextNumber
    });

    const invoiceRows = await GetInvoiceIdByNumberFromQuote.run({
      invoiceNumber: nextNumber
    });

    const invoice =
      invoiceRows?.[0] ||
      GetInvoiceIdByNumberFromQuote.data?.[0];

    if (!invoice?.invoiceId) {
      showAlert("Invoice was created, but ID was not found.", "error");
      return;
    }

    await InsertInvoiceItemsFromQuote.run({
      quoteId,
      invoiceId: invoice.invoiceId
    });

    await MarkQuoteConverted.run({ quoteId });

    if (typeof ListQuotes !== "undefined") {
      await ListQuotes.run();
    }

    await storeValue("currentInvoiceId", invoice.invoiceId);
    await storeValue("currentInvoiceNumber", invoice.invoiceNumber || nextNumber);

    showAlert(`Quote converted to invoice ${nextNumber}.`, "success");
  } catch (error) {
    showAlert("Error while converting quote: " + error.message, "error");
    console.log(error);
  }
},

  async cancel() {
    await storeValue("currentQuoteId", null);
    await storeValue("quoteItems", []);

    closeModal(QuoteFormModal.name);
  }
};
export default {
  rows() {
    return appsmith.store.salesInvoiceItems || [];
  },

  documentId() {
    return appsmith.store.currentSalesInvoiceId || null;
  },

  isEditMode() {
    return !!this.documentId();
  },

  cleanValue(value, fallback = "") {
    if (value === undefined || value === null) return fallback;
    if (String(value) === "undefined" || String(value) === "null") return fallback;
    return value;
  },

  selectValue(widget, fallback = "") {
    return this.cleanValue(
      widget.selectedOptionValue ||
      widget.value ||
      widget.text,
      fallback
    );
  },

  customerId() {
    return Number(appsmith.store.selectedInvoiceCustomerId || 0);
  },

  documentType() {
    return this.selectValue(InvoiceDocumentTypeSelect, "SALES_INVOICE");
  },

  warehouseId() {
    return Number(this.selectValue(InvoiceWarehouseSelect, appsmith.store.warehouseId || 0) || 0);
  },

  paymentMethod() {
    return this.selectValue(InvoicePaymentMethodSelect, "");
  },

  currencyCode() {
    return this.selectValue(InvoiceCurrencySelect, "EUR");
  },

  firstRow(result, queryObject) {
    if (Array.isArray(result) && result.length) return result[0];
    if (Array.isArray(result?.data) && result.data.length) return result.data[0];
    if (Array.isArray(queryObject?.data) && queryObject.data.length) return queryObject.data[0];
    return null;
  },

  dateValue(widget, fallback = moment()) {
    return moment(widget.selectedDate || widget.text || fallback).format("YYYY-MM-DD");
  },

  getRow(row = null) {
    return row || InvoicesTable.triggeredRow || InvoicesTable.selectedRow || {};
  },

  getDocumentIdFromRow(row = null) {
    const selected = this.getRow(row);

    return (
      selected.documentId ||
      selected.invoiceId ||
      selected.id ||
      selected.ID ||
      selected["Document ID"] ||
      selected["Invoice ID"] ||
      null
    );
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
            source: "Sales Invoice",
            ...newValues
          }
        });
      }
    } catch (error) {
      console.log("Audit log skipped:", error);
    }
  },

  async syncCustomer() {
    const rows = ListInvoiceCustomers.data || [];

    const rawValue =
      InvoiceCustomerSelect1.selectedOptionValue ||
      InvoiceCustomerSelect1.value ||
      "";

    let customerId = Number(rawValue || 0);

    if (!customerId) {
      const label = String(
        InvoiceCustomerSelect1.selectedOptionLabel ||
        InvoiceCustomerSelect1.text ||
        ""
      ).trim();

      const found = rows.find(row =>
        String(row.label || "").trim() === label ||
        String(row.name || "").trim() === label ||
        String(row.value || "") === label
      );

      customerId = Number(found?.value || found?.partnerId || found?.id || 0);
    }

    await storeValue("selectedInvoiceCustomerId", customerId);
    return customerId;
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
    return (rows || []).map((row, index) => ({
      ...this.recalcRow(row),
      lineNo: index + 1
    }));
  },

  totals(rows = this.rows()) {
    return this.recalc(rows).reduce(
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

  async setRows(rows) {
    const recalculated = this.recalc(rows || []);
    await storeValue("salesInvoiceItems", recalculated);
    await storeValue("salesInvoiceTotals", this.totals(recalculated));
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
      productCode: pick(["productCode", "Product Code", "code", "Code"], ""),
      productName: pick(["productName", "Product Name", "name", "Name"], ""),
      barcode: pick(["barcode", "Barcode"], lookup),
      sku: pick(["sku", "SKU"], ""),
      unitId: pick(["unitId", "Unit ID", "unit_id"], null),
      unitCode: pick(["unitCode", "Unit", "unit"], ""),
      taxRateId: pick(["taxRateId", "Tax Rate ID", "tax_rate_id"], null),
      taxRate: Number(pick(["taxRate", "Tax Rate", "rate", "Rate"], 0)),
      unitPrice: Number(pick(["unitPrice", "Unit Price", "salesPrice", "price", "Price"], 0)),
      availableStock: Number(pick(["availableStock", "Available Stock"], 0)),
      trackStock: String(pick(["trackStock", "track_stock"], "0"))
    };
  },

  async startNew(documentType = "SALES_INVOICE") {
    await storeValue("currentSalesInvoiceId", null);
    await storeValue("salesInvoiceItems", []);
    await storeValue("salesInvoiceTotals", { quantity: 0, subtotal: 0, discount: 0, tax: 0, total: 0 });
    await storeValue("selectedInvoiceCustomerId", 0);
    await storeValue("selectedInvoiceCustomer", {});
    await storeValue("salesInvoiceFormVisible", true);

    if (typeof ListInvoiceDocumentTypes !== "undefined") await ListInvoiceDocumentTypes.run();
    if (typeof ListPaymentMethods !== "undefined") await ListPaymentMethods.run();
    if (typeof ListCurrencies !== "undefined") await ListCurrencies.run();
    if (typeof ListInvoiceCustomers !== "undefined") await ListInvoiceCustomers.run();

    const numberRows = await GetNextDocumentNumberByType.run({ documentType });
    const nextNumber =
      numberRows?.[0]?.nextDocumentNumber ||
      GetNextDocumentNumberByType.data?.[0]?.nextDocumentNumber ||
      "";

    InvoiceDocumentTypeSelect.setSelectedOption(documentType);
    InvoiceNumberInput.setValue(nextNumber);
    InvoiceStatusInput.setValue("DRAFT");
    InvoiceDateInput.setValue(moment().format("YYYY-MM-DD"));
    InvoiceDueDateInput.setValue(moment().format("YYYY-MM-DD"));
    InvoiceCustomerSelect1.setSelectedOption("");
    InvoiceWarehouseSelect.setSelectedOption(String(appsmith.store.warehouseId || ""));
    InvoicePaymentMethodSelect.setSelectedOption("CASH");
    InvoiceCurrencySelect.setSelectedOption("EUR");
    InvoiceExchangeRateInput.setValue("1");
    InvoiceNoteInput.setValue("");

    if (typeof InvoiceBarcodeInput !== "undefined") {
      InvoiceBarcodeInput.setValue("");
    }

    if (typeof SalesInvoiceFormModal !== "undefined") {
      showModal(SalesInvoiceFormModal.name);
    }
  },

  async resolveProduct(lookupValue, increment = true) {
    const lookup = String(lookupValue || "").trim();
    if (!lookup) return;

    try {
      const result = await FindSalesProduct.run({
        lookup,
        warehouseId: this.warehouseId()
      });

      const raw = this.firstRow(result, FindSalesProduct);

      if (!raw) {
        showAlert(`Product was not found: ${lookup}`, "warning");
        return;
      }

      const product = this.normalizeProduct(raw, lookup);

      if (!product.productId) {
        showAlert("Product was found, but product ID is missing.", "error");
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
          unitPrice: Number(rows[existingIndex].unitPrice || product.unitPrice || 0),
          taxRateId: product.taxRateId,
          taxRate: product.taxRate
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

    const raw = this.firstRow(result, FindSalesProduct);

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

    if (rowIndex < 0 && InvoiceItemsEditTable.selectedRowIndex !== undefined) {
      rowIndex = InvoiceItemsEditTable.selectedRowIndex;
    }

    await this.resolveProductIntoRow(rowIndex, lookup);
  },

  async scanBarcode(value) {
    const lookup = String(value || InvoiceBarcodeInput.text || "").trim();
    if (!lookup) return;

    await this.resolveProduct(lookup, true);

    if (typeof InvoiceBarcodeInput !== "undefined") {
      InvoiceBarcodeInput.setValue("");
    }
  },

  async scanBarcodeDebounced(value) {
    const lookup = String(value || "").trim();
    if (!lookup || lookup.length < 3) return;

    await storeValue("salesInvoiceScanLastValue", lookup);

    setTimeout(() => {
      if (appsmith.store.salesInvoiceScanLastValue === lookup) {
        this.scanBarcode(lookup);
      }
    }, 350);
  },

  async updateRows() {
    const tableRows = InvoiceItemsEditTable.tableData || this.rows();
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
        note: ""
      }
    ]);
  },

  async removeSelectedRow() {
    const index =
      InvoiceItemsEditTable.selectedRowIndex ??
      InvoiceItemsEditTable.triggeredRowIndex ??
      -1;

    if (index < 0) {
      showAlert("Select row first.", "warning");
      return;
    }

    await this.setRows(this.rows().filter((_, i) => i !== index));
  },

  validate() {
    if (!InvoiceNumberInput.text.trim()) {
      showAlert("Invoice number is required.", "warning");
      return false;
    }

    if (!this.customerId()) {
      showAlert("Customer is required.", "warning");
      return false;
    }

    if (!this.warehouseId()) {
      showAlert("Warehouse is required.", "warning");
      return false;
    }

    if (!this.paymentMethod()) {
      showAlert("Payment method is required.", "warning");
      return false;
    }

    if (!this.currencyCode()) {
      showAlert("Currency is required.", "warning");
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

  async refreshLists() {
    if (typeof ListInvoicesAndCreditNotes !== "undefined") await ListInvoicesAndCreditNotes.run();
    if (typeof GetInvoiceOverviewHeader !== "undefined") await GetInvoiceOverviewHeader.run();
    if (typeof GetInvoiceOverviewItems !== "undefined") await GetInvoiceOverviewItems.run();
    if (typeof GetInvoiceOverviewTaxSummary !== "undefined") await GetInvoiceOverviewTaxSummary.run();
  },

  async afterSave() {
    await storeValue("currentSalesInvoiceId", null);
    await storeValue("salesInvoiceItems", []);
    await storeValue("salesInvoiceTotals", { quantity: 0, subtotal: 0, discount: 0, tax: 0, total: 0 });
    await storeValue("selectedInvoiceCustomerId", 0);
    await storeValue("selectedInvoiceCustomer", {});
    await storeValue("salesInvoiceFormVisible", false);

    await this.refreshLists();

    if (typeof SalesInvoiceFormModal !== "undefined") {
      closeModal(SalesInvoiceFormModal.name);
    }
  },

  async saveDraft() {
    await this.syncCustomer();
    await this.updateRows();

    if (!this.validate()) return;

    const wasEditMode = this.isEditMode();
    const rows = this.recalc(this.rows());
    const totals = this.totals(rows);
    let documentId = this.documentId();

    try {
      if (wasEditMode) {
        await UpdateInvoiceDocument.run({
          documentId,
          documentType: this.documentType(),
          documentNumber: InvoiceNumberInput.text,
          documentDate: this.dateValue(InvoiceDateInput),
          dueDate: this.dateValue(InvoiceDueDateInput),
          customerId: this.customerId(),
          warehouseId: this.warehouseId(),
          paymentMethod: this.paymentMethod() || null,
          currencyCode: this.currencyCode(),
          exchangeRate: Number(InvoiceExchangeRateInput.text || 1),
          subtotalAmount: totals.subtotal,
          discountAmount: totals.discount,
          taxAmount: totals.tax,
          totalAmount: totals.total,
          note: InvoiceNoteInput.text || null
        });

        await DeleteInvoiceItems.run({ documentId });
      } else {
        await InsertInvoiceDocument.run({
          documentType: this.documentType(),
          documentNumber: InvoiceNumberInput.text,
          documentDate: this.dateValue(InvoiceDateInput),
          dueDate: this.dateValue(InvoiceDueDateInput),
          customerId: this.customerId(),
          warehouseId: this.warehouseId(),
          paymentMethod: this.paymentMethod() || null,
          currencyCode: this.currencyCode(),
          exchangeRate: Number(InvoiceExchangeRateInput.text || 1),
          subtotalAmount: totals.subtotal,
          discountAmount: totals.discount,
          taxAmount: totals.tax,
          totalAmount: totals.total,
          note: InvoiceNoteInput.text || null,
          status: "DRAFT"
        });

        const idRows = await GetInvoiceIdByNumber.run({
          documentNumber: InvoiceNumberInput.text,
          documentType: this.documentType()
        });

        const found = idRows?.[0] || GetInvoiceIdByNumber.data?.[0];
        documentId = found?.documentId || found?.invoiceId || found?.id;

        if (!documentId) {
          showAlert("Invoice was saved, but ID was not found.", "error");
          return;
        }

        await storeValue("currentSalesInvoiceId", documentId);
      }

      for (let i = 0; i < rows.length; i += 1) {
        await InsertInvoiceItem.run({
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
        document_type: this.documentType(),
        document_number: InvoiceNumberInput.text,
        total_amount: totals.total,
        item_count: rows.length
      });

      await this.afterSave();
      showAlert(wasEditMode ? "Invoice was updated." : "Invoice was saved.", "success");
    } catch (error) {
      showAlert("Error while saving invoice: " + error.message, "error");
      console.log(error);
    }
  },

  async loadForEdit(row = null) {
    const documentId = this.getDocumentIdFromRow(row);

    if (!documentId) {
      showAlert("Select invoice first.", "warning");
      return;
    }

    const headerRows = await GetInvoiceForEdit.run({ documentId });
    const header = headerRows?.[0] || GetInvoiceForEdit.data?.[0];

    if (!header) {
      showAlert("Invoice was not found.", "error");
      return;
    }

    if (String(header.status || "").toUpperCase() !== "DRAFT") {
      showAlert("Only draft invoices can be edited.", "warning");
      return;
    }

    const itemRows = await GetInvoiceItemsForEdit.run({ documentId });
    const items = itemRows || GetInvoiceItemsForEdit.data || [];

    await storeValue("currentSalesInvoiceId", header.documentId || documentId);
    await storeValue("selectedInvoiceCustomerId", Number(header.partnerId || 0));
    await storeValue("selectedInvoiceCustomer", { value: header.partnerId, label: header.partnerName || "" });
    await storeValue("salesInvoiceFormVisible", true);

    InvoiceDocumentTypeSelect.setSelectedOption(header.documentType || "SALES_INVOICE");
    InvoiceNumberInput.setValue(header.documentNumber || "");
    InvoiceStatusInput.setValue(header.status || "DRAFT");
    InvoiceDateInput.setValue(moment(header.documentDate).format("YYYY-MM-DD"));
    InvoiceDueDateInput.setValue(moment(header.dueDate || header.documentDate).format("YYYY-MM-DD"));
    InvoiceCustomerSelect1.setSelectedOption(header.partnerId ? String(header.partnerId) : "");
    InvoiceWarehouseSelect.setSelectedOption(header.warehouseId ? String(header.warehouseId) : "");
    InvoicePaymentMethodSelect.setSelectedOption(header.paymentMethod || "CASH");
    InvoiceCurrencySelect.setSelectedOption(header.currencyCode || "EUR");
    InvoiceExchangeRateInput.setValue(String(header.exchangeRate || 1));
    InvoiceNoteInput.setValue(header.note || header.documentNote || "");

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

    if (typeof SalesInvoiceFormModal !== "undefined") {
      showModal(SalesInvoiceFormModal.name);
    }
  },

  accountingLines(header = {}) {
    const total = Math.abs(Number(header.totalAmount || 0));
    const subtotal = Math.abs(Number(header.subtotalAmount || 0));
    const tax = Math.abs(Number(header.taxAmount || 0));

    const arAccount = "1200";
    const revenueAccount = "7600";
    const vatAccount = "2400";

    if (header.documentType === "CREDIT_NOTE") {
      return [
        { accountCode: revenueAccount, debit: subtotal, credit: 0, description: "Sales return / credit note revenue reversal" },
        { accountCode: vatAccount, debit: tax, credit: 0, description: "VAT reversal" },
        { accountCode: arAccount, debit: 0, credit: total, description: "Customer receivable reversal" }
      ];
    }

    return [
      { accountCode: arAccount, debit: total, credit: 0, description: "Customer receivable" },
      { accountCode: revenueAccount, debit: 0, credit: subtotal, description: "Sales revenue" },
      { accountCode: vatAccount, debit: 0, credit: tax, description: "VAT payable" }
    ];
  },

  async postAccounting(header = {}) {
    const existingRows = await GetSalesInvoiceExistingJournal.run({
      documentNumber: header.documentNumber
    });

    const existing = existingRows?.[0] || GetSalesInvoiceExistingJournal.data?.[0];

    if (existing?.journalEntryId) {
      return existing.journalEntryId;
    }

    const entryNumber = `JE-SALES-${moment().format("YYYYMMDDHHmmss")}`;
    const lines = this.accountingLines(header);

    await InsertSalesInvoiceJournal.run({
      entryNumber,
      entryDate: moment().format("YYYY-MM-DD"),
      documentNumber: header.documentNumber,
      description: `${header.documentType} ${header.documentNumber}`
    });

    const entryRows = await GetSalesInvoiceJournalId.run({ entryNumber });
    const entry = entryRows?.[0] || GetSalesInvoiceJournalId.data?.[0];

    if (!entry?.journalEntryId) {
      showAlert("Journal entry was not found after insert.", "error");
      return null;
    }

    for (let i = 0; i < lines.length; i += 1) {
      await InsertSalesInvoiceJournalLine.run({
        journalEntryId: entry.journalEntryId,
        lineNo: i + 1,
        accountCode: lines[i].accountCode,
        debit: lines[i].debit,
        credit: lines[i].credit,
        description: lines[i].description
      });
    }

    return entry.journalEntryId;
  },

  async postDocument(row = null) {
    const documentId = this.getDocumentIdFromRow(row);

    if (!documentId) {
      showAlert("Select invoice first.", "warning");
      return;
    }

    const headerRows = await GetSalesInvoiceForPost.run({ documentId });
    const header = headerRows?.[0] || GetSalesInvoiceForPost.data?.[0];

    if (!header) {
      showAlert("Invoice was not found.", "error");
      return;
    }

    if (String(header.status || "").toUpperCase() !== "DRAFT") {
      showAlert("Only draft invoices can be posted.", "warning");
      return;
    }

    const journalEntryId = await this.postAccounting(header);

    if (!journalEntryId) {
      return;
    }

    await PostSalesInvoiceDocument.run({ documentId });

    await this.audit("POST", documentId, {
      document_type: header.documentType,
      document_number: header.documentNumber,
      status: "POSTED",
      posting_status: "POSTED",
      journal_entry_id: journalEntryId
    });

    await this.refreshLists();
    showAlert("Invoice was posted and booked.", "success");
  },

  async postAllDraftInvoicesForDay(postingDate = moment().format("YYYY-MM-DD")) {
    const rows = await GetDraftSalesInvoicesForPostin.run({ postingDate });
    const documents = rows || GetDraftSalesInvoicesForPostin.data || [];

    if (!documents.length) {
      showAlert("No draft invoices found for selected day.", "info");
      return;
    }

    let postedCount = 0;

    for (const doc of documents) {
      const journalEntryId = await this.postAccounting(doc);

      if (!journalEntryId) {
        showAlert(`Posting stopped. Journal was not created for ${doc.documentNumber}.`, "error");
        return;
      }

      await PostSalesInvoiceDocument.run({ documentId: doc.documentId });

      await this.audit("POST", doc.documentId, {
        document_type: doc.documentType,
        document_number: doc.documentNumber,
        status: "POSTED",
        posting_status: "POSTED",
        journal_entry_id: journalEntryId,
        batch_posting_date: postingDate
      });

      postedCount += 1;
    }

    await this.refreshLists();
    showAlert(`${postedCount} invoice(s) posted and booked.`, "success");
  },

  async print(row = null) {
    const documentId = this.getDocumentIdFromRow(row);

    if (!documentId) {
      showAlert("Select invoice first.", "warning");
      return;
    }

    await storeValue("currentInvoiceId", documentId);

    await GetSalesInvoicePrintHeader.run({ documentId });
    await GetSalesInvoicePrintItems.run({ documentId });
    await GetSalesInvoicePrintTaxSummary.run({ documentId });

    showModal(SalesInvoicePrintModal.name);
  },

  async voidDocument(row = null) {
    const documentId = this.getDocumentIdFromRow(row);

    if (!documentId) {
      showAlert("Select invoice first.", "warning");
      return;
    }

    const headerRows = await GetSalesDocumentForVoid.run({ documentId });
    const header = headerRows?.[0] || GetSalesDocumentForVoid.data?.[0];

    if (!header) {
      showAlert("Document was not found.", "error");
      return;
    }

    if (String(header.status || "").toUpperCase() !== "DRAFT") {
      showAlert("Only draft documents can be voided. Posted/fiscalized invoices must be reversed with credit note.", "warning");
      return;
    }

    await VoidDraftSalesDocument.run({ documentId });

    await this.audit("VOID", documentId, {
      status: "CANCELLED"
    });

    await this.refreshLists();
    showAlert("Document was voided.", "success");
  },

  async createCreditNote(row = null) {
    const invoiceId = this.getDocumentIdFromRow(row);

    if (!invoiceId) {
      showAlert("Select invoice first.", "warning");
      return;
    }

    const invoiceRows = await GetSalesInvoiceForStorno.run({ invoiceId });
    const invoice = invoiceRows?.[0] || GetSalesInvoiceForStorno.data?.[0];

    if (!invoice) {
      showAlert("Invoice was not found.", "error");
      return;
    }

    if (String(invoice.status || "").toUpperCase() === "CANCELLED") {
      showAlert("Cancelled invoice cannot be reversed.", "warning");
      return;
    }

    const numberRows = await GetNextDocumentNumberByType.run({
      documentType: "CREDIT_NOTE"
    });

    const creditNoteNumber =
      numberRows?.[0]?.nextDocumentNumber ||
      GetNextDocumentNumberByType.data?.[0]?.nextDocumentNumber;

    if (!creditNoteNumber) {
      showAlert("Credit note number could not be generated.", "error");
      return;
    }

    await InsertCreditNoteFromInvoice.run({
      invoiceId,
      creditNoteNumber
    });

    const creditRows = await GetCreditNoteIdByNumber.run({
      creditNoteNumber
    });

    const creditNote = creditRows?.[0] || GetCreditNoteIdByNumber.data?.[0];

    if (!creditNote?.creditNoteId) {
      showAlert("Credit note was created, but ID was not found.", "error");
      return;
    }

    await InsertCreditNoteItemsFromInvoi.run({
      invoiceId,
      creditNoteId: creditNote.creditNoteId
    });

    await MarkInvoiceStornoLinked.run({
      invoiceId,
      creditNoteNumber
    });

    await this.audit("INSERT", creditNote.creditNoteId, {
      source: "Sales Invoice Storno",
      document_type: "CREDIT_NOTE",
      document_number: creditNoteNumber,
      source_document_id: invoiceId
    });

    await this.refreshLists();
    await storeValue("currentInvoiceId", creditNote.creditNoteId);

    showAlert(`Credit note ${creditNoteNumber} was created.`, "success");
  },

  async cancel() {
    await storeValue("currentSalesInvoiceId", null);
    await storeValue("salesInvoiceItems", []);
    await storeValue("salesInvoiceTotals", { quantity: 0, subtotal: 0, discount: 0, tax: 0, total: 0 });
    await storeValue("selectedInvoiceCustomerId", 0);
    await storeValue("selectedInvoiceCustomer", {});
    await storeValue("salesInvoiceFormVisible", false);

    if (typeof SalesInvoiceFormModal !== "undefined") {
      closeModal(SalesInvoiceFormModal.name);
    }
  }
};
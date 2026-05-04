export default {
  emptyRow(lineNo = 1) {
    return {
      lineNo: String(lineNo),
      itemLookup: "",
      productId: "",
      productCode: "",
      barcode: "",
      description: "",
      productType: "",
      trackStock: "0",
      availableStock: "0",
      unitId: "",
      unitName: "",
      taxRateId: "",
      taxRate: "0",
      quantity: "1",
      unitPrice: "0",
      discountPercent: "0",
      discountAmount: "0",
      discountReason: "",
      lineSubtotal: "0",
      taxAmount: "0",
      lineTotal: "0",
      note: ""
    };
  },

  getWarehouseId() {
    return Number(appsmith.store.warehouseId1 || 1);
  },

  tableData() {
    const rows = appsmith.store.quotationItems || [];
    return rows.length ? rows : [this.emptyRow(1)];
  },

  isEditMode() {
    return appsmith.store.quotationEditMode === true && !!appsmith.store.currentQuotationId;
  },

  formTitle() {
    return this.isEditMode() ? "Edit Quotation" : "New Quotation";
  },

  saveButtonLabel() {
    return this.isEditMode() ? "Update Quotation" : "Save Quotation";
  },

  recalculateRow(row) {
    const quantity = Number(row.quantity || 0);
    const unitPrice = Number(row.unitPrice || 0);
    const taxRate = Number(row.taxRate || 0);
    const discountPercent = Number(row.discountPercent || 0);

    const gross = quantity * unitPrice;
    const discountAmount = gross * (discountPercent / 100);
    const lineSubtotal = gross - discountAmount;
    const taxAmount = lineSubtotal * (taxRate / 100);
    const lineTotal = lineSubtotal + taxAmount;

    return {
      ...row,
      quantity: String(quantity),
      unitPrice: Number(unitPrice).toFixed(2),
      discountPercent: Number(discountPercent).toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      lineSubtotal: lineSubtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      lineTotal: lineTotal.toFixed(2)
    };
  },

  getTotals(rows = appsmith.store.quotationItems || []) {
    return rows.map(row => this.recalculateRow(row)).reduce(
      (sum, row) => ({
        subtotal: sum.subtotal + Number(row.lineSubtotal || 0),
        tax: sum.tax + Number(row.taxAmount || 0),
        discount: sum.discount + Number(row.discountAmount || 0),
        total: sum.total + Number(row.lineTotal || 0)
      }),
      { subtotal: 0, tax: 0, discount: 0, total: 0 }
    );
  },

  async recalculateAllRows() {
    const rows = [...(appsmith.store.quotationItems || [])].map(row =>
      this.recalculateRow(row)
    );

    await storeValue("quotationItems", rows);
  },

  async initRows() {
    const rows = appsmith.store.quotationItems || [];

    if (!rows.length) {
      await storeValue("quotationItems", [this.emptyRow(1)]);
    }
  },

  async resetRows() {
    await storeValue("quotationItems", [this.emptyRow(1)]);
  },

  async addRow() {
    const rows = [...(appsmith.store.quotationItems || [])];

    rows.push(this.emptyRow(rows.length + 1));

    await storeValue("quotationItems", rows);
  },

  async removeRow(rowIndex) {
    const rows = [...(appsmith.store.quotationItems || [])];

    if (rowIndex < 0 || rowIndex >= rows.length) {
      return;
    }

    rows.splice(rowIndex, 1);

    const renumbered = rows.map((row, index) => ({
      ...row,
      lineNo: String(index + 1)
    }));

    await storeValue("quotationItems", renumbered.length ? renumbered : [this.emptyRow(1)]);
  },

  async updateRowField(rowIndex, fieldName, value) {
    const rows = [...(appsmith.store.quotationItems || [])];

    if (rowIndex < 0 || rowIndex >= rows.length) {
      return;
    }

    rows[rowIndex] = this.recalculateRow({
      ...rows[rowIndex],
      [fieldName]: String(value || "0")
    });

    await storeValue("quotationItems", rows);
  },

  async updateTextField(rowIndex, fieldName, value) {
    const rows = [...(appsmith.store.quotationItems || [])];

    if (rowIndex < 0 || rowIndex >= rows.length) {
      return;
    }

    rows[rowIndex] = {
      ...rows[rowIndex],
      [fieldName]: String(value || "")
    };

    await storeValue("quotationItems", rows);
  },

  async updateQuantity(rowIndex, value) {
    return this.updateRowField(rowIndex, "quantity", value);
  },

  async updateDiscount(rowIndex, value) {
    return this.updateRowField(rowIndex, "discountPercent", value);
  },

  async updateUnitPrice(rowIndex, value) {
    return this.updateRowField(rowIndex, "unitPrice", value);
  },

  getRowIndex(row = {}) {
    if (row.lineNo) {
      return Number(row.lineNo) - 1;
    }

    const rows = appsmith.store.quotationItems || [];

    return rows.findIndex(item =>
      String(item.productId || "") === String(row.productId || "") &&
      String(item.productCode || "") === String(row.productCode || "") &&
      String(item.description || "") === String(row.description || "")
    );
  },

  async updateQuantityFromRow(row = {}) {
    const rowIndex = this.getRowIndex(row);

    if (rowIndex < 0) {
      showAlert("Row index was not found.", "error");
      return;
    }

    return this.updateRowField(rowIndex, "quantity", row.quantity || row["Quantity"] || 0);
  },

  async updateUnitPriceFromRow(row = {}) {
    const rowIndex = this.getRowIndex(row);

    if (rowIndex < 0) {
      showAlert("Row index was not found.", "error");
      return;
    }

    return this.updateRowField(rowIndex, "unitPrice", row.unitPrice || row["Unit Price"] || 0);
  },

  async updateDiscountFromRow(row = {}) {
    const rowIndex = this.getRowIndex(row);

    if (rowIndex < 0) {
      showAlert("Row index was not found.", "error");
      return;
    }

    return this.updateRowField(rowIndex, "discountPercent", row.discountPercent || row["Discount %"] || 0);
  },

  async updateItemLookupFromRow(row = {}) {
    const rowIndex = this.getRowIndex(row);

    if (rowIndex < 0) {
      showAlert("Row index was not found.", "error");
      return;
    }

    return this.updateItemLookup(rowIndex, row.itemLookup || row["Item Lookup"] || "");
  },

  async updateItemLookup(rowIndex, value) {
    const rows = [...(appsmith.store.quotationItems || [])];

    if (rowIndex === undefined || rowIndex === null || rowIndex < 0) {
      showAlert("Row index was not found.", "error");
      return;
    }

    if (!rows[rowIndex]) {
      rows[rowIndex] = this.emptyRow(rowIndex + 1);
    }

    rows[rowIndex] = {
      ...rows[rowIndex],
      lineNo: String(rowIndex + 1),
      itemLookup: String(value || "")
    };

    await storeValue("quotationItems", rows);

    const lookup = String(value || "").trim();

    if (!lookup) {
      return;
    }

    try {
      const result = await GetProductByInput1.run({ lookup });
      const product = result?.[0] || GetProductByInput1.data?.[0];

      if (!product) {
        showAlert("Product not found.", "warning");
        return;
      }

      await this.fillRowFromProduct(rowIndex, product);
    } catch (error) {
      showAlert("Error while loading product: " + error.message, "error");
      console.log(error);
    }
  },

  async fillRowFromProduct(rowIndex, product = null) {
    const rows = [...(appsmith.store.quotationItems || [])];
    const selectedProduct = product || TableProduct1.selectedRow;

    if (!selectedProduct) {
      showAlert("Product was not found.", "warning");
      return;
    }

    if (rowIndex === undefined || rowIndex === null || rowIndex < 0) {
      showAlert("Row index was not found.", "error");
      return;
    }

    if (!rows[rowIndex]) {
      rows[rowIndex] = this.emptyRow(rowIndex + 1);
    }

    rows[rowIndex] = this.recalculateRow({
      ...rows[rowIndex],
      lineNo: String(rowIndex + 1),
      itemLookup: String(selectedProduct.productCode || selectedProduct.ProductCode || selectedProduct.Code || selectedProduct.code || ""),
      productId: String(selectedProduct.productId || selectedProduct.ProductID || selectedProduct.id || selectedProduct.ID || ""),
      productCode: String(selectedProduct.productCode || selectedProduct.ProductCode || selectedProduct.Code || selectedProduct.code || ""),
      barcode: String(selectedProduct.barcode || selectedProduct.Barcode || ""),
      description: String(selectedProduct.description || selectedProduct.productName || selectedProduct.product || selectedProduct.Description || selectedProduct.Name || selectedProduct.name || ""),
      productType: String(selectedProduct.productType || selectedProduct.ProductType || ""),
      trackStock: String(selectedProduct.trackStock || selectedProduct.TrackStock || "0"),
      availableStock: String(selectedProduct.availableStock || selectedProduct.AvailableStock || "0"),
      unitId: String(selectedProduct.unitId || selectedProduct.UnitID || ""),
      unitName: String(selectedProduct.unitName || selectedProduct.UnitName || selectedProduct.Unit || ""),
      taxRateId: String(selectedProduct.taxRateId || selectedProduct.TaxRateID || ""),
      taxRate: String(selectedProduct.taxRate || selectedProduct.TaxRate || "0"),
      unitPrice: String(selectedProduct.unitPrice || selectedProduct.UnitPrice || selectedProduct.Price || selectedProduct.salePrice || selectedProduct.sale_price || "0"),
      quantity: String(rows[rowIndex].quantity || "1"),
      discountPercent: String(rows[rowIndex].discountPercent || "0"),
      discountReason: String(rows[rowIndex].discountReason || ""),
      note: String(rows[rowIndex].note || "")
    });

    await storeValue("quotationItems", rows);
  },

  async resolveQuotationId(quotationResponse) {
    let quotationId =
      quotationResponse?.insertId ||
      quotationResponse?.[0]?.insertId ||
      quotationResponse?.[0]?.id ||
      quotationResponse?.[0]?.quotationId ||
      quotationResponse?.[1]?.[0]?.quotationId ||
      InsertQuotation.data?.insertId ||
      InsertQuotation.data?.[0]?.insertId ||
      InsertQuotation.data?.[0]?.id ||
      InsertQuotation.data?.[0]?.quotationId ||
      InsertQuotation.data?.[1]?.[0]?.quotationId;

    if (quotationId) {
      return quotationId;
    }

    const savedRows = await GetSavedQuotationByNumber.run();

    return savedRows?.[0]?.id || GetSavedQuotationByNumber.data?.[0]?.id;
  },

  async refreshQuotationNumber() {
    if (typeof GetNewQuotationNumber === "undefined") {
      return;
    }

    const rows = await GetNewQuotationNumber.run();

    const nextNumber =
      rows?.[0]?.document_number ||
      rows?.[0]?.quotationNumber ||
      rows?.[0]?.number ||
      GetNewQuotationNumber.data?.[0]?.document_number ||
      GetNewQuotationNumber.data?.[0]?.quotationNumber ||
      GetNewQuotationNumber.data?.[0]?.number;

    if (nextNumber && typeof Quotations_no !== "undefined") {
      Quotations_no.setValue(String(nextNumber));
    }
  },

  async startNewQuotation() {
    await storeValue("activeTab", "Quotations");
    await storeValue("viewMode", "add");
    await storeValue("currentQuotationId", null);
    await storeValue("quotationEditMode", false);
    await storeValue("quotationItems", [this.emptyRow(1)]);

    await this.refreshQuotationNumber();

    if (typeof SelectWarehouse1 !== "undefined") {
      SelectWarehouse1.setSelectedOption(String(this.getWarehouseId()));
    }

    if (typeof InoiceDateInput1 !== "undefined") {
      InoiceDateInput1.setValue(new Date().toISOString().slice(0, 10));
    }

    if (typeof dutedate1 !== "undefined") {
      dutedate1.setValue("");
    }

    if (typeof QuotationValidUntilInput !== "undefined") {
      QuotationValidUntilInput.setValue("");
    }

    if (typeof SelectPartner1 !== "undefined") {
      SelectPartner1.setSelectedOption("");
    }

    if (typeof QuotationStatusSelect !== "undefined") {
      QuotationStatusSelect.setSelectedOption("DRAFT");
    }

    if (typeof QuotationSalesChannelSelect !== "undefined") {
      QuotationSalesChannelSelect.setSelectedOption("BACKOFFICE");
    }

    if (typeof QuotationCurrencySelect !== "undefined") {
      QuotationCurrencySelect.setSelectedOption("EUR");
    }

    if (typeof QuotationCustomerReferenceInpu !== "undefined") {
      QuotationCustomerReferenceInpu.setValue("");
    }

    if (typeof QuotationInternalReferenceInpu !== "undefined") {
      QuotationInternalReferenceInpu.setValue("");
    }

    if (typeof InvoiceNoteInput1 !== "undefined") {
      InvoiceNoteInput1.setValue("");
    }
  },

  async loadQuotationForEdit(quotationId) {
    if (!quotationId) {
      showAlert("Select quotation first.", "warning");
      return;
    }

    try {
      await storeValue("activeTab", "Quotations");
      await storeValue("viewMode", "add");

      const headerRows = await GetQuotationForEdit.run({ quotationId });
      const header = headerRows?.[0] || GetQuotationForEdit.data?.[0];

      if (!header) {
        showAlert("Quotation was not found.", "error");
        return;
      }

      const itemRows = await GetQuotationItemsForEdit.run({ quotationId });
      const items = (itemRows || GetQuotationItemsForEdit.data || []).map((row, index) =>
        this.recalculateRow({
          lineNo: String(index + 1),
          itemLookup: String(row.productCode || row.description || ""),
          productId: String(row.productId || ""),
          productCode: String(row.productCode || ""),
          barcode: String(row.barcode || ""),
          description: String(row.description || ""),
          productType: String(row.productType || ""),
          trackStock: String(row.trackStock || "0"),
          availableStock: String(row.availableStock || "0"),
          unitId: String(row.unitId || ""),
          unitName: String(row.unitName || ""),
          taxRateId: String(row.taxRateId || ""),
          taxRate: String(row.taxRate || "0"),
          quantity: String(row.quantity || "1"),
          unitPrice: String(row.unitPrice || "0"),
          discountPercent: String(row.discountPercent || "0"),
          discountAmount: String(row.discountAmount || "0"),
          discountReason: String(row.discountReason || ""),
          lineSubtotal: String(row.lineSubtotal || "0"),
          taxAmount: String(row.taxAmount || "0"),
          lineTotal: String(row.lineTotal || "0"),
          note: String(row.note || "")
        })
      );

      await storeValue("currentQuotationId", header.quotationId);
      await storeValue("quotationEditMode", true);
      await storeValue("quotationItems", items.length ? items : [this.emptyRow(1)]);

      if (typeof Quotations_no !== "undefined") {
        Quotations_no.setValue(header.documentNumber || "");
      }

      if (typeof SelectWarehouse1 !== "undefined") {
        SelectWarehouse1.setSelectedOption(String(header.warehouseId || this.getWarehouseId()));
      }

      if (typeof InoiceDateInput1 !== "undefined") {
        InoiceDateInput1.setValue(header.documentDate || "");
      }

      if (typeof dutedate1 !== "undefined") {
        dutedate1.setValue(header.dueDate || "");
      }

      if (typeof QuotationValidUntilInput !== "undefined") {
        QuotationValidUntilInput.setValue(header.validUntil || "");
      }

      if (typeof SelectPartner1 !== "undefined") {
        SelectPartner1.setSelectedOption(String(header.partnerId || ""));
      }

      if (typeof QuotationStatusSelect !== "undefined") {
        QuotationStatusSelect.setSelectedOption(header.status || "DRAFT");
      }

      if (typeof QuotationSalesChannelSelect !== "undefined") {
        QuotationSalesChannelSelect.setSelectedOption(header.salesChannel || "BACKOFFICE");
      }

      if (typeof QuotationCurrencySelect !== "undefined") {
        QuotationCurrencySelect.setSelectedOption(header.currencyCode || "EUR");
      }

      if (typeof QuotationCustomerReferenceInpu !== "undefined") {
        QuotationCustomerReferenceInpu.setValue(header.customerReference || "");
      }

      if (typeof QuotationInternalReferenceInpu !== "undefined") {
        QuotationInternalReferenceInpu.setValue(header.internalReference || "");
      }

      if (typeof InvoiceNoteInput1 !== "undefined") {
        InvoiceNoteInput1.setValue(header.note || "");
      }

      showAlert("Quotation loaded for editing.", "success");
    } catch (error) {
      showAlert("Error while loading quotation: " + error.message, "error");
      console.log(error);
    }
  },

 async confirmConvertQuoteToInvoice() {
  const quotationId =
    appsmith.store.pendingQuotationId ||
    tblQuotations.triggeredRow?.ID ||
    tblQuotations.selectedRow?.ID ||
    appsmith.store.currentQuotationId;

  if (!quotationId) {
    showAlert("Quotation ID is missing.", "warning");
    return;
  }

  try {
    const result = await ConvertQuoteToInvoice.run({ quotationId });

    let newInvoiceId =
      result?.[0]?.newInvoiceId ||
      result?.[1]?.[0]?.newInvoiceId ||
      ConvertQuoteToInvoice.data?.[0]?.newInvoiceId ||
      ConvertQuoteToInvoice.data?.[1]?.[0]?.newInvoiceId;

    if (!newInvoiceId && typeof GetConvertedInvoiceByQuoteId !== "undefined") {
      const invoiceRows = await GetConvertedInvoiceByQuoteId.run({ quotationId });
      newInvoiceId =
        invoiceRows?.[0]?.id ||
        invoiceRows?.[0]?.invoiceId ||
        GetConvertedInvoiceByQuoteId.data?.[0]?.id ||
        GetConvertedInvoiceByQuoteId.data?.[0]?.invoiceId;
    }

    await AuditLog1.insert({
      entityName: "documents",
      entityId: quotationId,
      actionType: "POST",
      newValues: {
        document_type: "QUOTE",
        converted_to: "SALES_INVOICE",
        new_invoice_id: newInvoiceId || null,
        note: "Quotation converted to invoice"
      }
    });

    if (newInvoiceId) {
      await AuditLog1.insert({
        entityName: "documents",
        entityId: newInvoiceId,
        actionType: "INSERT",
        newValues: {
          document_type: "SALES_INVOICE",
          source_document_id: quotationId,
          note: "Invoice created from quotation"
        }
      });
    }

    if (typeof InsertQuotationChangeLog !== "undefined") {
      await InsertQuotationChangeLog.run({
        quotationId,
        changeType: "UPDATE",
        note: "Quotation converted to invoice"
      });
    }

    closeModal(ConfirmQuoteToInvoiceModal.name);

    if (typeof InsertAuditLog !== "undefined") {
      await InsertAuditLog.run();
    }

    if (newInvoiceId && typeof InvoicePrint !== "undefined") {
      await InvoicePrint.open(newInvoiceId, "A4");
    }

    showAlert("Quotation converted to invoice successfully.", "success");
  } catch (error) {
    showAlert("Error while converting quotation: " + error.message, "error");
    console.log(error);
  }
},


  async clearQuotationAfterSave() {
    await storeValue("quotationItems", [this.emptyRow(1)]);
    await storeValue("quotationEditMode", false);
    await storeValue("currentQuotationId", null);

    if (typeof TableProducts1 !== "undefined") {
      resetWidget("TableProducts1", true);
    }

    if (typeof SelectPartner1 !== "undefined") {
      SelectPartner1.setSelectedOption("");
    }

    if (typeof QuotationCustomerReferenceInpu !== "undefined") {
      QuotationCustomerReferenceInpu.setValue("");
    }

    if (typeof QuotationInternalReferenceInpu !== "undefined") {
      QuotationInternalReferenceInpu.setValue("");
    }

    if (typeof InvoiceNoteInput1 !== "undefined") {
      InvoiceNoteInput1.setValue("");
    }

    if (typeof QuotationStatusSelect !== "undefined") {
      QuotationStatusSelect.setSelectedOption("DRAFT");
    }

    if (typeof QuotationSalesChannelSelect !== "undefined") {
      QuotationSalesChannelSelect.setSelectedOption("BACKOFFICE");
    }

    if (typeof QuotationCurrencySelect !== "undefined") {
      QuotationCurrencySelect.setSelectedOption("EUR");
    }

    await this.refreshQuotationNumber();
  },

  async forceResetQuotationItems() {
    await storeValue("quotationItems", []);
    await storeValue("quotationItemsResetKey", Date.now());

    await new Promise(resolve => setTimeout(resolve, 100));

    await storeValue("quotationItems", [this.emptyRow(1)]);
    await storeValue("quotationItemsResetKey", Date.now());

    if (typeof TableProducts1 !== "undefined") {
      resetWidget("TableProducts1", true);
    }
  },

  async saveQuotationWithItems() {
    const rows = (appsmith.store.quotationItems || []).filter(row =>
      row.productId || row.productCode || row.description
    );

    if (!Quotations_no.text) {
      showAlert("Quotation number is required.", "warning");
      return;
    }

    if (!SelectPartner1.selectedOptionValue) {
      showAlert("Partner is required.", "warning");
      return;
    }

    if (!rows.length) {
      showAlert("Add at least one quotation item.", "warning");
      return;
    }

    const recalculatedRows = rows.map(row => this.recalculateRow(row));
    const totals = this.getTotals(recalculatedRows);
    const warehouseId = this.getWarehouseId();

    try {
      await storeValue("quotationItems", recalculatedRows);

      const quotationResponse = await InsertQuotation.run({
        totals,
        warehouseId
      });

      const quotationId = await this.resolveQuotationId(quotationResponse);

      if (!quotationId) {
        showAlert("Quotation saved, but ID could not be found.", "error");
        console.log(quotationResponse);
        return;
      }

      await storeValue("currentQuotationId", quotationId);

      for (let i = 0; i < recalculatedRows.length; i += 1) {
        await InsertQuotationItem.run({
          quotationId,
          lineNo: i + 1,
          row: recalculatedRows[i],
          warehouseId
        });
      }

      if (typeof AuditLog1 !== "undefined") {
        await AuditLog1.insert({
          entityName: "documents",
          entityId: quotationId,
          actionType: "INSERT",
          newValues: {
            document_type: "QUOTE",
            document_number: Quotations_no.text,
            partner_id: SelectPartner1.selectedOptionValue,
            warehouse_id: warehouseId,
            status: QuotationStatusSelect?.selectedOptionValue || "DRAFT",
            total_amount: totals.total,
            subtotal_amount: totals.subtotal,
            tax_amount: totals.tax,
            discount_amount: totals.discount,
            item_count: recalculatedRows.length
          }
        });
      }

      if (typeof ActivityLogQuery !== "undefined" && typeof InsertAuditLog !== "undefined") {
        await InsertAuditLog.run();
      }

      if (typeof QuotationPrintActions !== "undefined" && QuotationPrintActions.openQuotePrintById) {
        await QuotationPrintActions.openQuotePrintById(quotationId);
      }

      await this.clearQuotationAfterSave();
      await storeValue("viewMode", "list");

      showAlert("Quotation was saved successfully.", "success");
    } catch (error) {
      showAlert("Error while saving quotation: " + error.message, "error");
      console.log(error);
    }
  },

  async updateQuotationWithItems() {
    const quotationId = appsmith.store.currentQuotationId;
    const rows = (appsmith.store.quotationItems || []).filter(row =>
      row.productId || row.productCode || row.description
    );

    if (!quotationId) {
      showAlert("No quotation is loaded for editing.", "warning");
      return;
    }

    if (!rows.length) {
      showAlert("Add at least one quotation item.", "warning");
      return;
    }

    const recalculatedRows = rows.map(row => this.recalculateRow(row));
    const totals = this.getTotals(recalculatedRows);
    const warehouseId = this.getWarehouseId();

    try {
      await storeValue("quotationItems", recalculatedRows);

      if (typeof InsertQuotationChangeLog !== "undefined") {
        await InsertQuotationChangeLog.run({
          quotationId,
          changeType: "UPDATE",
          note: "Quotation header and items updated"
        });
      }

      await UpdateQuotation.run({ totals, quotationId, warehouseId });
      await DeleteQuotationItems.run({ quotationId });

      for (let i = 0; i < recalculatedRows.length; i += 1) {
        await InsertQuotationItem.run({
          quotationId,
          lineNo: i + 1,
          row: recalculatedRows[i],
          warehouseId
        });
      }

      if (typeof AuditLog1 !== "undefined") {
        await AuditLog1.insert({
          entityName: "documents",
          entityId: quotationId,
          actionType: "UPDATE",
          newValues: {
            document_type: "QUOTE",
            document_number: Quotations_no.text,
            partner_id: SelectPartner1.selectedOptionValue,
            warehouse_id: warehouseId,
            status: QuotationStatusSelect?.selectedOptionValue || "DRAFT",
            total_amount: totals.total,
            subtotal_amount: totals.subtotal,
            tax_amount: totals.tax,
            discount_amount: totals.discount,
            item_count: recalculatedRows.length,
            note: "Quotation header and items updated"
          }
        });
      }

      if (typeof ActivityLogQuery !== "undefined" && typeof InsertAuditLog !== "undefined") {
        await InsertAuditLog.run();
      }

      if (typeof QuotationPrintActions !== "undefined" && QuotationPrintActions.openQuotePrintById) {
        await QuotationPrintActions.openQuotePrintById(quotationId);
      }

      await this.clearQuotationAfterSave();
      await storeValue("viewMode", "list");

      showAlert("Quotation was updated successfully.", "success");
    } catch (error) {
      showAlert("Error while updating quotation: " + error.message, "error");
      console.log(error);
    }
  },

  async saveCurrentQuotation() {
    return this.isEditMode()
      ? this.updateQuotationWithItems()
      : this.saveQuotationWithItems();
  },

  async backToList() {
    await storeValue("viewMode", "list");
    await storeValue("quotationEditMode", false);
    await storeValue("currentQuotationId", null);
    await this.resetRows();
  }
};

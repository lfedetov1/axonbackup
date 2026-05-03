export default {
  emptyRow() {
    return {
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

  tableData() {
    const rows = appsmith.store.quotationItems || [];
    return rows.length ? rows : [this.emptyRow()];
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
      unitPrice: String(Number(unitPrice).toFixed(2)),
      discountPercent: String(Number(discountPercent).toFixed(2)),
      discountAmount: String(discountAmount.toFixed(2)),
      lineSubtotal: String(lineSubtotal.toFixed(2)),
      taxAmount: String(taxAmount.toFixed(2)),
      lineTotal: String(lineTotal.toFixed(2))
    };
  },

  getTotals(rows = appsmith.store.quotationItems || []) {
    const recalculatedRows = rows.map(row => this.recalculateRow(row));

    return recalculatedRows.reduce(
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
    const rows = [...(appsmith.store.quotationItems || [])].map(row => this.recalculateRow(row));
    await storeValue("quotationItems", rows);
  },

  async initRows() {
    const rows = appsmith.store.quotationItems || [];
    if (!rows.length) {
      await storeValue("quotationItems", [this.emptyRow()]);
    }
  },

  async resetRows() {
    await storeValue("quotationItems", [this.emptyRow()]);
  },

  async addRow() {
    const rows = [...(appsmith.store.quotationItems || [])];
    rows.push(this.emptyRow());
    await storeValue("quotationItems", rows);
  },

  async removeRow(rowIndex) {
    const rows = [...(appsmith.store.quotationItems || [])];

    if (rowIndex < 0 || rowIndex >= rows.length) return;

    rows.splice(rowIndex, 1);
    await storeValue("quotationItems", rows.length ? rows : [this.emptyRow()]);
  },

  async updateRowField(rowIndex, fieldName, value) {
    const rows = [...(appsmith.store.quotationItems || [])];

    if (rowIndex < 0 || rowIndex >= rows.length) return;

    rows[rowIndex] = {
      ...rows[rowIndex],
      [fieldName]: String(value || "0")
    };

    rows[rowIndex] = this.recalculateRow(rows[rowIndex]);

    await storeValue("quotationItems", rows);
  },

  async updateItemLookup(rowIndex, value) {
    const rows = [...(appsmith.store.quotationItems || [])];

    if (rowIndex < 0 || rowIndex >= rows.length) return;

    rows[rowIndex] = {
      ...rows[rowIndex],
      itemLookup: String(value || "")
    };

    await storeValue("quotationItems", rows);
  },

  async updateQuantity(rowIndex, value) {
    await this.updateRowField(rowIndex, "quantity", value);
  },

  async updateDiscount(rowIndex, value) {
    await this.updateRowField(rowIndex, "discountPercent", value);
  },

  async updateUnitPrice(rowIndex, value) {
    await this.updateRowField(rowIndex, "unitPrice", value);
  },

  async updateTextField(rowIndex, fieldName, value) {
    const rows = [...(appsmith.store.quotationItems || [])];

    if (rowIndex < 0 || rowIndex >= rows.length) return;

    rows[rowIndex] = {
      ...rows[rowIndex],
      [fieldName]: String(value || "")
    };

    await storeValue("quotationItems", rows);
  },

  async fillRowFromProduct(rowIndex) {
    const rows = [...(appsmith.store.quotationItems || [])];
    const product = TableProduct1.selectedRow;

    if (!product || rowIndex < 0 || rowIndex >= rows.length) return;

    rows[rowIndex] = {
      ...rows[rowIndex],
      itemLookup: String(product.productCode || product.ProductCode || product.Code || product.Name || product.name || ""),
      productId: String(product.productId || product.ProductID || product.id || ""),
      productCode: String(product.productCode || product.ProductCode || product.Code || ""),
      barcode: String(product.barcode || product.Barcode || ""),
      description: String(product.description || product.Description || product.Name || product.name || ""),
      productType: String(product.productType || product.ProductType || ""),
      trackStock: String(product.trackStock || product.TrackStock || "0"),
      availableStock: String(product.availableStock || product.AvailableStock || "0"),
      unitId: String(product.unitId || product.UnitID || ""),
      unitName: String(product.unitName || product.UnitName || ""),
      taxRateId: String(product.taxRateId || product.TaxRateID || ""),
      taxRate: String(product.taxRate || product.TaxRate || "0"),
      unitPrice: String(product.unitPrice || product.UnitPrice || product.Price || "0"),
      quantity: String(rows[rowIndex].quantity || "1"),
      discountPercent: String(rows[rowIndex].discountPercent || "0"),
      discountReason: String(rows[rowIndex].discountReason || ""),
      note: String(rows[rowIndex].note || "")
    };

    rows[rowIndex] = this.recalculateRow(rows[rowIndex]);

    await storeValue("quotationItems", rows);
  },

  async startNewQuotation() {
    await storeValue("activeTab", "Quotations");
    await storeValue("viewMode", "add");
    await storeValue("currentQuotationId", null);
    await storeValue("quotationEditMode", false);
    await storeValue("quotationItems", [this.emptyRow()]);

    await GetNewQuotationNumber.run();

    if (typeof Quotations_no !== "undefined") {
      Quotations_no.setValue(GetNewQuotationNumber.data?.[0]?.document_number || "");
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
      const items = (itemRows || GetQuotationItemsForEdit.data || []).map(row =>
        this.recalculateRow({
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
      await storeValue("quotationItems", items.length ? items : [this.emptyRow()]);

      if (typeof Quotations_no !== "undefined") {
        Quotations_no.setValue(header.documentNumber || "");
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

      if (typeof SelectPartner !== "undefined") {
        SelectPartner.setSelectedOption(String(header.partnerId || ""));
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
    const quotationId = appsmith.store.pendingQuotationId;

    if (!quotationId) {
      showAlert("Quotation ID is missing.", "warning");
      return;
    }

    try {
      const result = await ConvertQuoteToInvoice.run({ quotationId });

      const newInvoiceId =
        result?.[0]?.newInvoiceId ||
        result?.[1]?.[0]?.newInvoiceId ||
        ConvertQuoteToInvoice.data?.[0]?.newInvoiceId ||
        ConvertQuoteToInvoice.data?.[1]?.[0]?.newInvoiceId;

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

      closeModal("ConfirmQuoteToInvoiceModal");

      if (typeof InsertAuditLog !== "undefined") {
        await InsertAuditLog.run();
      }

      showAlert("Quotation converted to invoice successfully.", "success");
    } catch (error) {
      showAlert("Error while converting quotation: " + error.message, "error");
      console.log(error);
    }
  },

  async saveQuotationWithItems() {
    const rows = appsmith.store.quotationItems || [];

    if (!Quotations_no.text) {
      showAlert("Quotation number is required.", "warning");
      return;
    }

    if (!SelectPayment1.selectedOptionValue) {
      showAlert("Partner is required.", "warning");
      return;
    }

    if (!rows.length) {
      showAlert("Add at least one quotation item.", "warning");
      return;
    }

    const recalculatedRows = rows.map(row => this.recalculateRow(row));
    const totals = this.getTotals(recalculatedRows);

    try {
      await storeValue("quotationItems", recalculatedRows);

      const quotationResponse = await InsertQuotation.run({ totals });

      const quotationId =
        quotationResponse?.insertId ||
        quotationResponse?.[0]?.insertId ||
        quotationResponse?.[1]?.[0]?.quotationId ||
        InsertQuotation.data?.insertId ||
        InsertQuotation.data?.[0]?.insertId ||
        InsertQuotation.data?.[1]?.[0]?.quotationId;

      if (!quotationId) {
        showAlert("Quotation saved, but ID was not returned.", "error");
        console.log(quotationResponse);
        return;
      }

      await storeValue("currentQuotationId", quotationId);

      for (let i = 0; i < recalculatedRows.length; i += 1) {
        await InsertQuotationItem.run({
          quotationId,
          lineNo: i + 1,
          row: recalculatedRows[i]
        });
      }

      await AuditLog1.insert({
        entityName: "documents",
        entityId: quotationId,
        actionType: "INSERT",
        newValues: {
          document_type: "QUOTE",
          document_number: Quotations_no.text,
          partner_id: SelectPayment1.selectedOptionValue,
          status: QuotationStatusSelect?.selectedOptionValue || "DRAFT",
          total_amount: totals.total,
          subtotal_amount: totals.subtotal,
          tax_amount: totals.tax,
          discount_amount: totals.discount,
          item_count: recalculatedRows.length
        }
      });

      await storeValue("quotationEditMode", true);
      await storeValue("viewMode", "list");

      if (typeof ActivityLogQuery !== "undefined") {
        await InsertAuditLog.run();
      }

      showAlert("Quotation was saved successfully.", "success");

      if (typeof QuotationPrintActions !== "undefined") {
        await QuotationPrintActions.openQuotePrint();
      }
    } catch (error) {
      showAlert("Error while saving quotation: " + error.message, "error");
      console.log(error);
    }
  },

  async updateQuotationWithItems() {
    const quotationId = appsmith.store.currentQuotationId;
    const rows = appsmith.store.quotationItems || [];

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

    try {
      await storeValue("quotationItems", recalculatedRows);

      if (typeof InsertQuotationChangeLog !== "undefined") {
        await InsertQuotationChangeLog.run({
          quotationId,
          changeType: "UPDATE",
          note: "Quotation header and items updated"
        });
      }

      await UpdateQuotation.run({ totals, quotationId });
      await DeleteQuotationItems.run({ quotationId });

      for (let i = 0; i < recalculatedRows.length; i += 1) {
        await InsertQuotationItem.run({
          quotationId,
          lineNo: i + 1,
          row: recalculatedRows[i]
        });
      }

      await AuditLog1.insert({
        entityName: "documents",
        entityId: quotationId,
        actionType: "UPDATE",
        newValues: {
          document_type: "QUOTE",
          document_number: Quotations_no.text,
          partner_id: SelectPayment1.selectedOptionValue,
          status: QuotationStatusSelect?.selectedOptionValue || "DRAFT",
          total_amount: totals.total,
          subtotal_amount: totals.subtotal,
          tax_amount: totals.tax,
          discount_amount: totals.discount,
          item_count: recalculatedRows.length,
          note: "Quotation header and items updated"
        }
      });

      await storeValue("viewMode", "list");

      if (typeof ActivityLogQuery !== "undefined") {
        await InsertAuditLog.run();
      }

      showAlert("Quotation was updated successfully.", "success");

      if (typeof QuotationPrintActions !== "undefined") {
        await QuotationPrintActions.openQuotePrint();
      }
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

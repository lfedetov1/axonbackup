export default {
  emptyRow(lineNo = 1) {
    return {
      lineNo: String(lineNo),
      productLookup: "",
      productId: "",
      productCode: "",
      barcode: "",
      description: "",
      quantity: "1",
      unitName: "",
      unitId: "",
      unitPrice: "0.00",
      discountPercent: "0.00",
      discountAmount: "0.00",
      taxRate: "0",
      taxRateId: "",
      taxAmount: "0.00",
      lineSubtotal: "0.00",
      lineTotal: "0.00",
      availableStock: "0",
      note: ""
    };
  },

  tableData() {
    return appsmith.store.invoiceItems || [this.emptyRow(1)];
  },

  async initRows() {
    const rows = appsmith.store.invoiceItems || [];
    if (!rows.length) {
      await storeValue("invoiceItems", [this.emptyRow(1)]);
    }
  },

  async resetRows() {
    await storeValue("invoiceItems", [this.emptyRow(1)]);
  },

  async addRow() {
    const rows = [...(appsmith.store.invoiceItems || [])];
    rows.push(this.emptyRow(rows.length + 1));
    await storeValue("invoiceItems", rows);
  },

  async removeRow(rowIndex) {
    const rows = [...(appsmith.store.invoiceItems || [])];

    if (rowIndex < 0 || rowIndex >= rows.length) return;

    rows.splice(rowIndex, 1);

    const renumbered = rows.map((row, index) => ({
      ...row,
      lineNo: String(index + 1)
    }));

    await storeValue("invoiceItems", renumbered.length ? renumbered : [this.emptyRow(1)]);
  },
	

  recalculateRow(row, discountMode = "percent") {
    const quantity = Number(row.quantity || 0);
    const unitPrice = Number(row.unitPrice || 0);
    const taxRate = Number(row.taxRate || 0);
    const gross = quantity * unitPrice;

    let discountPercent = Number(row.discountPercent || 0);
    let discountAmount = Number(row.discountAmount || 0);

    if (discountMode === "amount") {
      discountAmount = Math.min(discountAmount, gross);
      discountPercent = gross ? (discountAmount / gross) * 100 : 0;
    } else {
      discountAmount = gross * (discountPercent / 100);
    }

    const lineSubtotal = gross - discountAmount;
    const taxAmount = lineSubtotal * (taxRate / 100);
    const lineTotal = lineSubtotal + taxAmount;

    return {
      ...row,
      quantity: String(quantity),
      unitPrice: unitPrice.toFixed(2),
      discountPercent: discountPercent.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      lineSubtotal: lineSubtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      lineTotal: lineTotal.toFixed(2)
    };
  },

  async updateNumberField(rowIndex, fieldName, value) {
    const rows = [...(appsmith.store.invoiceItems || [])];

    if (rowIndex < 0 || rowIndex >= rows.length) return;

    const discountMode = fieldName === "discountAmount" ? "amount" : "percent";

    rows[rowIndex] = this.recalculateRow(
      {
        ...rows[rowIndex],
        [fieldName]: String(value || "0")
      },
      discountMode
    );

    await storeValue("invoiceItems", rows);
  },
async voidInvoiceWithCreditNote(invoiceId) {
  if (!invoiceId) {
    showAlert("Invoice ID is missing.", "warning");
    return;
  }

  try {
    await CancelInvoiceForVoid.run({ invoiceId });

    const creditNoteResponse = await CreateCreditNoteFromInvoice.run({ invoiceId });

    const creditNoteId =
      creditNoteResponse?.[1]?.[0]?.creditNoteId ||
      creditNoteResponse?.[0]?.creditNoteId ||
      CreateCreditNoteFromInvoice.data?.[1]?.[0]?.creditNoteId ||
      CreateCreditNoteFromInvoice.data?.[0]?.creditNoteId;

    if (!creditNoteId) {
      showAlert("Credit note was not created.", "error");
      return;
    }

    await CreateCreditNoteItemsFromInvoi.run({
      invoiceId,
      creditNoteId
    });

    if (typeof InsertInvoiceVoidLog !== "undefined") {
      await InsertInvoiceVoidLog.run({
        documentId: invoiceId,
        documentType: "SALES_INVOICE",
        oldValue: "POSTED",
        newValue: "CANCELLED",
        note: "Invoice voided and credit note created"
      });

      await InsertInvoiceVoidLog.run({
        documentId: creditNoteId,
        documentType: "CREDIT_NOTE",
        oldValue: null,
        newValue: "DRAFT",
        note: "Credit note created from voided invoice"
      });
    }

    if (typeof GetInvoices !== "undefined") {
      await GetInvoices.run();
    }

    showAlert("Invoice voided and credit note created.", "success");
  } catch (error) {
    showAlert("Error while voiding invoice: " + error.message, "error");
    console.log(error);
  }
},


  async updateProductLookup(rowIndex, value) {
    const rows = [...(appsmith.store.invoiceItems || [])];

    if (rowIndex === undefined || rowIndex === null || rowIndex < 0) return;

    if (!rows[rowIndex]) {
      rows[rowIndex] = this.emptyRow(rowIndex + 1);
    }

    rows[rowIndex] = {
      ...rows[rowIndex],
      productLookup: String(value || "")
    };

    await storeValue("invoiceItems", rows);

    if (!value) return;

    const result = await GetProductByInput1.run({
      lookup: String(value || "")
    });

    const product = result?.[0] || GetProductByInput1.data?.[0];

    if (!product) {
      showAlert("Product not found.", "warning");
      return;
    }

    return this.fillRowFromProduct(rowIndex, product);
  },

  async fillRowFromProduct(rowIndex, product) {
    const rows = [...(appsmith.store.invoiceItems || [])];

    if (rowIndex < 0) return;

    if (!rows[rowIndex]) {
      rows[rowIndex] = this.emptyRow(rowIndex + 1);
    }

    rows[rowIndex] = this.recalculateRow({
      ...rows[rowIndex],
      productLookup: String(product.productCode || ""),
      productId: String(product.productId || ""),
      productCode: String(product.productCode || ""),
      barcode: String(product.barcode || ""),
      description: String(product.description || product.productName || ""),
      unitId: String(product.unitId || ""),
      unitName: String(product.unitName || ""),
      unitPrice: String(product.unitPrice || "0"),
      taxRateId: String(product.taxRateId || ""),
      taxRate: String(product.taxRate || "0"),
      availableStock: String(product.availableStock || "0")
    });

    await storeValue("invoiceItems", rows);
  },

  async updateTextField(rowIndex, fieldName, value) {
    const rows = [...(appsmith.store.invoiceItems || [])];

    if (rowIndex < 0 || rowIndex >= rows.length) return;

    rows[rowIndex] = {
      ...rows[rowIndex],
      [fieldName]: String(value || "")
    };

    await storeValue("invoiceItems", rows);
  },
	 async loadQuotationItemsForEdit() {
    const items = GetQuotationItemsForEdit.data || [];

    if (!items.length) {
      await storeValue("invoiceItems", [this.emptyRow(1)]);
      return;
    }

    const mapped = items.map((item, index) =>
      this.recalculateRow({
        lineNo: String(index + 1),
        productLookup: String(item.productCode || ""),
        productId: String(item.productId || ""),
        productCode: String(item.productCode || ""),
        barcode: String(item.barcode || ""),
        description: String(item.description || ""),
        quantity: String(item.quantity || "1"),
        unitName: String(item.unitName || ""),
        unitId: String(item.unitId || ""),
        unitPrice: String(item.unitPrice || "0.00"),
        discountPercent: String(item.discountPercent || "0.00"),
        discountAmount: String(item.discountAmount || "0.00"),
        taxRate: String(item.taxRate || "0"),
        taxRateId: String(item.taxRateId || ""),
        taxAmount: String(item.taxAmount || "0.00"),
        lineSubtotal: String(item.lineSubtotal || "0.00"),
        lineTotal: String(item.lineTotal || "0.00"),
        availableStock: String(item.availableStock || "0"),
        note: String(item.note || "")
      })
    );

    await storeValue("invoiceItems", mapped);
  },

  getTotals() {
    const rows = (appsmith.store.invoiceItems || []).map(row => this.recalculateRow(row));

    return rows.reduce(
      (sum, row) => ({
        subtotal: sum.subtotal + Number(row.lineSubtotal || 0),
        tax: sum.tax + Number(row.taxAmount || 0),
        discount: sum.discount + Number(row.discountAmount || 0),
        total: sum.total + Number(row.lineTotal || 0)
      }),
      { subtotal: 0, tax: 0, discount: 0, total: 0 }
    );
  }
};

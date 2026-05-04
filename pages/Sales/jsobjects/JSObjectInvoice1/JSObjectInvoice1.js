export default {
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
      discountAmount: String(discountAmount.toFixed(2)),
      lineSubtotal: String(lineSubtotal.toFixed(2)),
      taxAmount: String(taxAmount.toFixed(2)),
      lineTotal: String(lineTotal.toFixed(2))
    };
  },

  recalculateAllRows() {
    const rows = [...(appsmith.store.invoiceItems || [])].map(row => this.recalculateRow(row));
    return storeValue("invoiceItems", rows);
  },

  updateRowField(rowIndex, fieldName, value) {
    const rows = [...(appsmith.store.invoiceItems || [])];

    if (rowIndex < 0 || rowIndex >= rows.length) {
      return;
    }

    rows[rowIndex] = {
      ...rows[rowIndex],
      [fieldName]: String(value || "0")
    };

    rows[rowIndex] = this.recalculateRow(rows[rowIndex]);
    return storeValue("invoiceItems", rows);
  },

  fillRowFromProduct(rowIndex) {
    const rows = [...(appsmith.store.invoiceItems || [])];
    const product = GetProductByInput1.data?.[0];

    if (!product || rowIndex < 0 || rowIndex >= rows.length) {
      return;
    }

    rows[rowIndex] = {
      ...rows[rowIndex],
      productId: String(product.productId || ""),
      productCode: String(product.productCode || ""),
      barcode: String(product.barcode || ""),
      description: String(product.description || ""),
      productType: String(product.productType || ""),
      trackStock: String(product.trackStock || "0"),
      availableStock: String(product.availableStock || "0"),
      unitId: String(product.unitId || ""),
      unitName: String(product.unitName || ""),
      taxRateId: String(product.taxRateId || ""),
      taxRate: String(product.taxRate || "0"),
      unitPrice: String(product.unitPrice || "0")
    };

    rows[rowIndex] = this.recalculateRow(rows[rowIndex]);
    return storeValue("invoiceItems", rows);
  },

  async saveInvoiceWithItems() {
    const rows = appsmith.store.invoiceItems || [];

    if (!invoice_no.text) {
      showAlert("Invoice number is required.", "warning");
      return;
    }

    if (!SelectPartner.selectedOptionValue) {
      showAlert("Partner is required.", "warning");
      return;
    }

    if (!rows.length) {
      showAlert("Please add at least one invoice item.", "warning");
      return;
    }

    const recalculatedRows = rows.map(row => this.recalculateRow(row));

    const totals = recalculatedRows.reduce(
      (sum, row) => ({
        subtotal: sum.subtotal + Number(row.lineSubtotal || 0),
        tax: sum.tax + Number(row.taxAmount || 0),
        discount: sum.discount + Number(row.discountAmount || 0),
        total: sum.total + Number(row.lineTotal || 0)
      }),
      { subtotal: 0, tax: 0, discount: 0, total: 0 }
    );

    try {
      await storeValue("invoiceItems", recalculatedRows);

      const invoiceResponse = await InsertInvoice.run({ totals });

      const invoiceId =
        invoiceResponse?.insertId ||
        invoiceResponse?.[0]?.insertId ||
        InsertInvoice.data?.insertId ||
        InsertInvoice.data?.[0]?.insertId;

      if (!invoiceId) {
        showAlert("Invoice has been saved, but the invoice ID was not returned.", "error");
        console.log(invoiceResponse);
        return;
      }

      await storeValue("currentInvoiceId", invoiceId);

      for (let i = 0; i < recalculatedRows.length; i += 1) {
        await InsertInvoiceItems.run({
          invoiceId,
          lineNo: i + 1,
          row: recalculatedRows[i]
        });
      }


      await InvoicePrint.open(invoiceId, "A4");

      showAlert("Invoice and all items have been successfully saved.", "success");
    } catch (error) {
      showAlert("Error while saving invoice: " + error.message, "error");
      console.log(error);
    }
  }
};
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
      quantity: String(quantity),
      unitPrice: String(unitPrice.toFixed(2)),
      discountPercent: String(discountPercent.toFixed(2)),
      discountAmount: String(discountAmount.toFixed(2)),
      lineSubtotal: String(lineSubtotal.toFixed(2)),
      taxAmount: String(taxAmount.toFixed(2)),
      lineTotal: String(lineTotal.toFixed(2))
    };
  },

  cleanRows(rows) {
    return (rows || []).filter(row =>
      row.productId ||
      row.productCode ||
      row.barcode ||
      row.description ||
      row.itemLookup
    );
  },

  isStockTracked(row) {
    return String(row.trackStock || "0") === "1";
  },

  getAvailableStock(row) {
    return Number(row.availableStock || 0);
  },

  getWarehouseId() {
    return Number(appsmith.store.warehouseId1 || 1);
  },

  calculateNormComponentQuantity(component, soldQuantity) {
    const outputQuantity = Number(component.outputQuantity || 1) || 1;
    const componentQuantity = Number(component.componentQuantity || 0);
    const wastePercent = Number(component.wastePercent || 0);
    const baseQuantity = (Number(soldQuantity || 0) / outputQuantity) * componentQuantity;

    return Number((baseQuantity * (1 + wastePercent / 100)).toFixed(4));
  },

  async deductStockForInvoiceItem(invoiceId, invoiceItemId, row, warehouseId) {
    const quantity = Number(row.quantity || 0);

    if (quantity < 0) {
      if (typeof InsertInvoiceReturnStockMovement !== "undefined") {
        await InsertInvoiceReturnStockMovement.run({
          invoiceId,
          invoiceItemId,
          warehouseId,
          row: {
            ...row,
            quantity: Math.abs(quantity)
          }
        });
      }

      return;
    }

    const normItems = await GetActiveNormItemsForPosLine.run({
      productId: row.productId
    });

    if (normItems && normItems.length) {
      for (const component of normItems) {
        await InsertInvoiceNormStockMovement.run({
          invoiceId,
          invoiceItemId,
          warehouseId,
          componentProductId: component.componentProductId,
          requiredQuantity: this.calculateNormComponentQuantity(component, row.quantity),
          note: "POS norm: " + (row.productCode || row.description || "")
        });
      }

      return;
    }

    if (this.isStockTracked(row)) {
      await InsertInvoiceStockMovement.run({
        invoiceId,
        invoiceItemId,
        warehouseId,
        row
      });
    }
  },

  getRows() {
    return this.cleanRows(appsmith.store.invoiceItems || []);
  },

  tableData() {
    return this.getRows();
  },

  getTotals(rows = this.getRows()) {
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

  async resetTable() {
    await storeValue("invoiceItems", []);
  },

  isReturnRow(row) {
    return Number(row.quantity || 0) < 0;
  },

  hasUnlinkedReturns(rows = this.getRows()) {
    return rows.some(row =>
      this.isReturnRow(row) &&
      String(row.returnApproved || "0") !== "1"
    );
  },

  async openReturnModalForRow(rowIndex, row) {
    await storeValue("posReturnRowIndex", rowIndex);
    await storeValue("posReturnProductId", row.productId || null);
    await storeValue("posReturnProductCode", row.productCode || "");
    await storeValue("posReturnBarcode", row.barcode || "");
    await storeValue("posReturnRequestedQuantity", Math.abs(Number(row.quantity || 0)));
    await storeValue("posReturnSourceDocumentNumber", "");
    await storeValue("posReturnSourceDocumentId", null);
    await storeValue("posReturnSourceItemId", null);
    await storeValue("posReturnReferenceItems", []);

    if (typeof POSReturnReceiptLookupInput !== "undefined") {
      POSReturnReceiptLookupInput.setValue("");
    }

    showAlert("Select original receipt for this return item.", "warning");
    showModal("POSReturnReferenceModal");
  },
	
	async applyReturnReference(sourceRow = {}) {
  const rowIndex = Number(appsmith.store.posReturnRowIndex);

  if (rowIndex < 0 || Number.isNaN(rowIndex)) {
    showAlert("Return row was not found.", "error");
    return;
  }

  const rows = this.getRows();
  const row = rows[rowIndex];

  if (!row) {
    showAlert("Return row was not found.", "error");
    return;
  }

  const sourceDate =
    sourceRow.documentDate ||
    sourceRow.DocumentDate ||
    sourceRow.document_date ||
    sourceRow.invoiceDate ||
    null;

  if (sourceDate) {
    const daysFromPurchase = moment().diff(moment(sourceDate), "days");

    if (daysFromPurchase > 30) {
      showAlert("Return/exchange is not allowed after 30 days from purchase.", "error");
      return;
    }
  }

  const sourceProductId =
    sourceRow.productId ||
    sourceRow.ProductID ||
    sourceRow.product_id ||
    null;

  if (
    sourceProductId &&
    row.productId &&
    Number(sourceProductId) !== Number(row.productId)
  ) {
    showAlert("Selected receipt item does not match return product.", "error");
    return;
  }

  const requestedQty = Math.abs(Number(row.quantity || 0));
  const availableReturnQty = Number(
    sourceRow.availableReturnQuantity ??
    sourceRow.remainingQuantity ??
    sourceRow.AvailableReturnQuantity ??
    sourceRow.RemainingQuantity ??
    Math.abs(Number(sourceRow.quantity || sourceRow.Quantity || 0))
  );

  if (availableReturnQty > 0 && requestedQty > availableReturnQty) {
    showAlert("Return quantity is greater than available quantity from original receipt.", "error");
    return;
  }

  rows[rowIndex] = this.recalculateRow({
    ...row,
    returnSourceDocumentId:
      sourceRow.documentId ||
      sourceRow.DocumentID ||
      sourceRow.document_id ||
      sourceRow.invoiceId ||
      null,
    returnSourceDocumentNumber:
      sourceRow.documentNumber ||
      sourceRow.Number ||
      sourceRow.document_number ||
      sourceRow.invoiceNumber ||
      "",
    returnSourceItemId:
      sourceRow.documentItemId ||
      sourceRow.itemId ||
      sourceRow.id ||
      null,
    returnSourceQuantity: availableReturnQty,
    returnApproved: "1",
    stockError: ""
  });

  await storeValue("invoiceItems", rows);
  await storeValue("posReturnSourceDocumentId", rows[rowIndex].returnSourceDocumentId);
  await storeValue("posReturnSourceDocumentNumber", rows[rowIndex].returnSourceDocumentNumber);
  await storeValue("posReturnSourceItemId", rows[rowIndex].returnSourceItemId);

  closeModal("POSReturnReferenceModal");
  showAlert("Return reference was linked.", "success");
},

  cancelReturnModal() {
    closeModal("POSReturnReferenceModal");
  },

  async scanBarcode() {
    const lookup = String(BarcodeInput.text || "").trim();

    if (!lookup) {
      return;
    }

    try {
      const result = await GetProductByBarcode.run({
        lookup: BarcodeInput.text?.trim() || ""
      });

      const product = result?.[0] || GetProductByBarcode.data?.[0];

      if (!product) {
        showAlert("Product was not found.", "warning");
        BarcodeInput.setValue("");
        return;
      }

      const rows = this.getRows();
      const existingIndex = rows.findIndex(
        row => String(row.productId || "") === String(product.productId || "")
      );

      if (existingIndex >= 0) {
        const currentQuantity = Number(rows[existingIndex].quantity || 0);
        const nextQuantity = currentQuantity + 1;
        const availableStock = this.getAvailableStock(rows[existingIndex]);

        if (this.isStockTracked(rows[existingIndex]) && nextQuantity > availableStock) {
          rows[existingIndex] = {
            ...rows[existingIndex],
            stockError: "Not enough stock"
          };

          await storeValue("invoiceItems", rows);
          showAlert("Not enough stock for this item.", "warning");
          BarcodeInput.setValue("");
          return;
        }

        rows[existingIndex] = this.recalculateRow({
          ...rows[existingIndex],
          quantity: String(nextQuantity),
          returnApproved: Number(nextQuantity) < 0 ? rows[existingIndex].returnApproved || "0" : "0",
          stockError: ""
        });
      } else {
        const availableStock = this.getAvailableStock(product);

        if (this.isStockTracked(product) && availableStock < 1) {
          showAlert("Not enough stock for this item.", "warning");
          BarcodeInput.setValue("");
          return;
        }

        rows.push(
          this.recalculateRow({
            itemLookup: lookup,
            productId: String(product.productId || ""),
            productCode: String(product.productCode || ""),
            barcode: String(product.barcode || ""),
            description: String(product.description || product.productName || ""),
            productType: String(product.productType || ""),
            trackStock: String(product.trackStock || "0"),
            availableStock: String(product.availableStock || "0"),
            unitId: String(product.unitId || ""),
            unitName: String(product.unitName || ""),
            taxRateId: String(product.taxRateId || ""),
            taxRate: String(product.taxRate || "0"),
            quantity: "1",
            unitPrice: String(product.unitPrice || "0"),
            discountPercent: "0",
            returnApproved: "0",
            returnSourceDocumentId: null,
            returnSourceDocumentNumber: "",
            returnSourceItemId: null,
            stockError: ""
          })
        );
      }

      await storeValue("invoiceItems", rows);
      BarcodeInput.setValue("");
    } catch (error) {
      showAlert("Error while loading product: " + error.message, "error");
      console.log(error);
      BarcodeInput.setValue("");
    }
  },

  async updateRowField(rowIndex, fieldName, value) {
    const rows = this.getRows();

    if (rowIndex < 0 || rowIndex >= rows.length) {
      return;
    }

    rows[rowIndex] = {
      ...rows[rowIndex],
      [fieldName]: String(value || "0")
    };

    if (fieldName === "quantity") {
      const quantity = Number(rows[rowIndex].quantity || 0);
      const availableStock = this.getAvailableStock(rows[rowIndex]);

      if (quantity < 0) {
        rows[rowIndex] = this.recalculateRow({
          ...rows[rowIndex],
          stockError: "",
          returnApproved: rows[rowIndex].returnApproved || "0"
        });

        await storeValue("invoiceItems", rows);
        await this.openReturnModalForRow(rowIndex, rows[rowIndex]);
        return;
      }

      rows[rowIndex] = {
        ...rows[rowIndex],
        returnSourceDocumentId: null,
        returnSourceDocumentNumber: "",
        returnSourceItemId: null,
        returnSourceQuantity: null,
        returnApproved: "0"
      };

      if (this.isStockTracked(rows[rowIndex]) && quantity > availableStock) {
        rows[rowIndex].stockError = "Not enough stock";
        showAlert("Not enough stock for this item.", "warning");
      } else {
        rows[rowIndex].stockError = "";
      }
    }

    rows[rowIndex] = this.recalculateRow(rows[rowIndex]);
    await storeValue("invoiceItems", rows);
  },

  updateQuantity(rowIndex, value) {
    return this.updateRowField(rowIndex, "quantity", value);
  },

  updateDiscount(rowIndex, value) {
    return this.updateRowField(rowIndex, "discountPercent", value);
  },

  updateUnitPrice(rowIndex, value) {
    return this.updateRowField(rowIndex, "unitPrice", value);
  },

  async removeRow(rowIndex) {
    const rows = [...this.getRows()];

    if (rowIndex < 0 || rowIndex >= rows.length) {
      return;
    }

    rows.splice(rowIndex, 1);
    await storeValue("invoiceItems", rows);
  },

  async resolveInvoiceId(invoiceResponse) {
    let invoiceId =
      invoiceResponse?.insertId ||
      invoiceResponse?.[0]?.insertId ||
      invoiceResponse?.[0]?.id ||
      invoiceResponse?.[0]?.invoiceId ||
      InsertInvoice.data?.insertId ||
      InsertInvoice.data?.[0]?.insertId ||
      InsertInvoice.data?.[0]?.id ||
      InsertInvoice.data?.[0]?.invoiceId;

    if (invoiceId) {
      return invoiceId;
    }

    if (typeof GetSavedPOSInvoiceByNumber !== "undefined") {
      const savedInvoiceRows = await GetSavedPOSInvoiceByNumber.run();

      invoiceId =
        savedInvoiceRows?.[0]?.id ||
        GetSavedPOSInvoiceByNumber.data?.[0]?.id;

      if (invoiceId) {
        return invoiceId;
      }
    }

    if (typeof GetLastSavedPOSInvoice !== "undefined") {
      const lastInvoiceRows = await GetLastSavedPOSInvoice.run();

      const lastInvoice =
        lastInvoiceRows?.[0] ||
        GetLastSavedPOSInvoice.data?.[0];

      if (lastInvoice?.document_number) {
        await storeValue("posPrintDocumentNumber", lastInvoice.document_number);
      }

      return lastInvoice?.id;
    }

    return null;
  },

  async resolveInvoiceItemId(itemResponse, invoiceId, lineNo) {
    let invoiceItemId =
      itemResponse?.insertId ||
      itemResponse?.[0]?.insertId ||
      itemResponse?.[0]?.id ||
      itemResponse?.[0]?.invoiceItemId ||
      InsertInvoiceItems.data?.insertId ||
      InsertInvoiceItems.data?.[0]?.insertId ||
      InsertInvoiceItems.data?.[0]?.id ||
      InsertInvoiceItems.data?.[0]?.invoiceItemId;

    if (invoiceItemId) {
      return invoiceItemId;
    }

    if (typeof GetSavedPOSInvoiceItemByLine !== "undefined") {
      const savedItemRows = await GetSavedPOSInvoiceItemByLine.run({
        invoiceId,
        lineNo
      });

      invoiceItemId =
        savedItemRows?.[0]?.id ||
        GetSavedPOSInvoiceItemByLine.data?.[0]?.id;

      if (invoiceItemId) {
        return invoiceItemId;
      }
    }

    return null;
  },
	async prepareFiscalData(invoiceId) {
  const fiscalRows = await GetNextPOSFiscalNumber.run();
  const fiscalNumber =
    fiscalRows?.[0]?.nextFiscalNumber ||
    GetNextPOSFiscalNumber.data?.[0]?.nextFiscalNumber;

  if (!fiscalNumber) {
    showAlert("Fiscal number could not be generated.", "error");
    return false;
  }

  await UpdatePOSFiscalData.run({
    documentId: invoiceId,
    fiscalNumber,
    fiscalStatus: "NOT_FISCALIZED",
    jir: null,
    zki: null,
    fiscalQrUrl: null,
    fiscalVerificationUrl: null,
    fiscalizedAt: null,
    fiscalError: "Fiscalization service is not connected yet"
  });

  await storeValue("posFiscalNumber", fiscalNumber);

  return true;
},

  async preparePrintData() {
    if (typeof GetPOSInvoicePrintHeader === "undefined") {
      return;
    }

    const headerRows = await GetPOSInvoicePrintHeader.run();
    const itemRows = await GetPOSInvoicePrintItems.run();
    const taxRows = await GetPOSInvoicePrintTaxSummary.run();

    const header = headerRows?.[0] || GetPOSInvoicePrintHeader.data?.[0];
    const items = itemRows || GetPOSInvoicePrintItems.data || [];
    const taxes = taxRows || GetPOSInvoicePrintTaxSummary.data || [];

    if (header) {
      await storeValue("posReceiptPrintData", {
        header,
        items,
        taxes
      });
    }
  },

  async openPrintModal() {
    await this.preparePrintData();
    showModal(POSReceiptPrintModal.name);
  },

  async refreshNewInvoiceNumber() {
    if (typeof GetNewInvoiceNumber === "undefined") {
      return;
    }

    const rows = await GetNewInvoiceNumber.run();

    const nextNumber =
      rows?.[0]?.invoiceNumber ||
      GetNewInvoiceNumber.data?.[0]?.invoiceNumber;

    if (nextNumber && typeof invoice_no !== "undefined") {
      invoice_no.setValue(String(nextNumber));
    }
  },
	async updateCashReceived(value) {
  const received = Number(value || 0);
  const due = Number(appsmith.store.posCashTotalDue || 0);
  const change = received - due;

  await storeValue("posCashReceived", received);
  await storeValue("posCashChange", change > 0 ? change : 0);
},

confirmCashPayment() {
  const due = Number(appsmith.store.posCashTotalDue || 0);
  const received = Number(appsmith.store.posCashReceived || 0);

  if (received < due) {
    showAlert("Received amount is lower than total amount.", "warning");
    return;
  }

  closeModal(CashPaymentModal.name);
  return this.savePayment("CASH", null);
},
	
	async insertPaymentLines(invoiceId) {
  const lines = appsmith.store.posPaymentLines || [];
  const totalChange = Number(appsmith.store.posPaymentChange || 0);

  if (!lines.length) {
    return;
  }

  for (let i = 0; i < lines.length; i += 1) {
    const isLast = i === lines.length - 1;

    await InsertPOSPaymentLine.run({
      documentId: invoiceId,
      paymentMethodId: lines[i].paymentMethodId || null,
      paymentMethodCode: lines[i].code || "OTHER",
      methodGroup: lines[i].methodGroup || "OTHER",
      amount: Number(lines[i].amount || 0),
      receivedAmount: Number(lines[i].amount || 0),
      changeAmount: isLast ? totalChange : 0,
      referenceNumber: lines[i].referenceNumber || null,
      cardType: lines[i].cardType || null,
      note: lines[i].name || null
    });
  }
},

  async savePayment(paymentMethod, cardType = null) {
    const rows = this.getRows();

    if (this.hasUnlinkedReturns(rows)) {
      showAlert("Every negative quantity must be linked to original receipt.", "warning");
      showModal("POSReturnReferenceModal");
      return;
    }

    if (!rows.length) {
      showAlert("Add at least one item before payment.", "warning");
      return;
    }

    const stockErrorRow = rows.find(row => row.stockError);
    if (stockErrorRow) {
      showAlert("Fix stock errors before payment.", "warning");
      return;
    }

    const documentNumber = String(invoice_no.text || "").trim();

    if (!documentNumber) {
      showAlert("Invoice number is missing.", "warning");
      return;
    }

    const warehouseId = this.getWarehouseId();
    const recalculatedRows = rows.map(row => this.recalculateRow(row));
    const totals = this.getTotals(recalculatedRows);

    try {
      await storeValue("invoiceItems", recalculatedRows);
      await storeValue("posPrintDocumentNumber", documentNumber);

      const invoiceResponse = await InsertInvoice.run({
        totals,
        paymentMethod,
        cardType,
        documentNumber,
        warehouseId
      });

      const invoiceId = await this.resolveInvoiceId(invoiceResponse);

      if (!invoiceId) {
        showAlert("Invoice was saved, but invoice ID could not be found.", "error");
        console.log(invoiceResponse);
        return;
      }

      await storeValue("currentInvoiceId", invoiceId);
			await this.insertPaymentLines(invoiceId);

      for (let i = 0; i < recalculatedRows.length; i += 1) {
        const lineNo = i + 1;

        const itemResponse = await InsertInvoiceItems.run({
          invoiceId,
          lineNo,
          row: recalculatedRows[i],
          warehouseId
        });

        const invoiceItemId = await this.resolveInvoiceItemId(
          itemResponse,
          invoiceId,
          lineNo
        );

        if (!invoiceItemId) {
          showAlert("Invoice item was saved, but item ID could not be found.", "error");
          console.log(itemResponse);
          return;
        }

        await this.deductStockForInvoiceItem(
          invoiceId,
          invoiceItemId,
          recalculatedRows[i],
          warehouseId
        );
      }

      try {
        if (typeof AuditLog !== "undefined" && AuditLog.insert) {
          await AuditLog.insert({
            entity_name: "documents",
            entity_id: invoiceId,
            action_type: "INSERT",
            new_values: {
              source: "POS",
              document_type: "POS_SALE",
              payment_method: paymentMethod,
              card_type: cardType,
              subtotal_amount: totals.subtotal,
              tax_amount: totals.tax,
              discount_amount: totals.discount,
              total_amount: totals.total,
              item_count: recalculatedRows.length,
              warehouse_id: warehouseId
            }
          });

          await AuditLog.insert({
            entity_name: "documents",
            entity_id: invoiceId,
            action_type: "POST",
            new_values: {
              source: "POS",
              document_type: "POS_SALE",
              posting_status: "POSTED",
              payment_method: paymentMethod,
              total_amount: totals.total,
              warehouse_id: warehouseId,
              note: "POS payment completed and stock movement created"
            }
          });
        }
      } catch (auditError) {
        console.log("Audit log skipped:", auditError);
      }

      if (typeof InsertAuditLog !== "undefined") {
        await InsertAuditLog.run();
      }
			const fiscalPrepared = await this.prepareFiscalData(invoiceId);

if (!fiscalPrepared) {
  return;
}

      await this.openPrintModal();

      await this.clearPOS();
      await this.refreshNewInvoiceNumber();

      showAlert(paymentMethod + " payment saved successfully.", "success");
    } catch (error) {
      showAlert("Error while saving payment: " + error.message, "error");
      console.log(error);
    }
  },

async payCash() {
  const rows = this.getRows();

  if (!rows.length) {
    showAlert("Add at least one item before payment.", "warning");
    return;
  }

  if (this.hasUnlinkedReturns(rows)) {
    showAlert("Every negative quantity must be linked to original receipt.", "warning");
    showModal("POSReturnReferenceModal");
    return;
  }

  const totals = this.getTotals(rows);

  await storeValue("posCashTotalDue", totals.total);
  await storeValue("posCashReceived", "");
  await storeValue("posCashChange", 0);

  if (typeof CashReceivedInput !== "undefined") {
    CashReceivedInput.setValue("");
  }

  showModal(CashPaymentModal.name);
},

  payCard() {
    const cardType = CardTypeSelect.selectedOptionValue || null;

    if (!cardType) {
      showAlert("Select card type.", "warning");
      return;
    }

    closeModal(CardPaymentModal.name);
    return this.savePayment("CARD", cardType);
  },

  payOther() {
    return this.savePayment("OTHER", null);
  },

  payMixed() {
    return this.savePayment("MIXED", null);
  },
	
	async openPaymentModal() {
  const rows = this.getRows();

  if (!rows.length) {
    showAlert("Add at least one item before payment.", "warning");
    return;
  }

  if (this.hasUnlinkedReturns(rows)) {
    showAlert("Every negative quantity must be linked to original receipt.", "warning");
    showModal("POSReturnReferenceModal");
    return;
  }

  const totals = this.getTotals(rows);

  await ListPOSPaymentMethods.run();
  await storeValue("posPaymentTotalDue", totals.total);
  await storeValue("posPaymentLines", []);
  await storeValue("posPaymentPaid", 0);
  await storeValue("posPaymentRemaining", totals.total);
  await storeValue("posPaymentChange", 0);

  showModal(POSPaymentModal.name);
},

confirmPOSPayment() {
  const totalDue = Number(appsmith.store.posPaymentTotalDue || 0);
  const paid = Number(appsmith.store.posPaymentPaid || 0);
  const lines = appsmith.store.posPaymentLines || [];

  if (!lines.length) {
    showAlert("Add at least one payment.", "warning");
    return;
  }

  if (paid < totalDue) {
    showAlert("Payment amount is lower than total.", "warning");
    return;
  }

  const hasCash = lines.some(row => row.isCash);
  const hasCard = lines.some(row => row.methodGroup === "CARD");
  const paymentMethod = lines.length > 1 ? "MIXED" : (hasCash ? "CASH" : hasCard ? "CARD" : "OTHER");

  closeModal(POSPaymentModal.name);
  return this.savePayment(paymentMethod, null);
},

  async clearPOS() {
    await storeValue("invoiceItems", []);
    await storeValue("currentInvoiceId", null);

    await storeValue("posReturnRowIndex", null);
    await storeValue("posReturnProductId", null);
    await storeValue("posReturnProductCode", "");
    await storeValue("posReturnBarcode", "");
    await storeValue("posReturnRequestedQuantity", 0);
    await storeValue("posReturnSourceDocumentNumber", "");
    await storeValue("posReturnSourceDocumentId", null);
    await storeValue("posReturnSourceItemId", null);
    await storeValue("posReturnReferenceItems", []);

    if (typeof BarcodeInput !== "undefined") {
      BarcodeInput.setValue("");
    }

    if (typeof CardTypeSelect !== "undefined") {
      CardTypeSelect.setSelectedOption("");
    }
  }
};
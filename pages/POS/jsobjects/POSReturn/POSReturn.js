export default {
  mapSourceItem(row = {}) {
    return this.recalculateReturnRow({
      returnSelected: false,

      sourceDocumentItemId: String(row.sourceDocumentItemId || row["Source Item ID"] || ""),
      sourceDocumentId: String(row.sourceDocumentId || row["Source Document ID"] || ""),
      productId: String(row.productId || row["Product ID"] || ""),
      productCode: String(row.productCode || row["Product Code"] || ""),
      barcode: String(row.barcode || row["Barcode"] || ""),
      description: String(row.description || row["Description"] || ""),
      unitId: String(row.unitId || row["Unit ID"] || ""),
      unitName: String(row.unitName || row["Unit"] || ""),
      taxRateId: String(row.taxRateId || row["Tax Rate ID"] || ""),
      taxRate: String(row.taxRate || row["Tax Rate"] || "0"),
      originalQuantity: String(row.originalQuantity || row["Original Quantity"] || "0"),
      alreadyReturnedQuantity: String(row.alreadyReturnedQuantity || row["Already Returned Quantity"] || "0"),
      availableReturnQuantity: String(row.availableReturnQuantity || row["Available Return Quantity"] || "0"),
      unitPrice: String(row.unitPrice || row["Unit Price"] || "0"),
      discountPercent: String(row.discountPercent || row["Discount %"] || "0"),
      discountAmount: String(row.discountAmount || row["Discount Amount"] || "0"),
      lineSubtotal: String(row.lineSubtotal || row["Subtotal"] || "0"),
      taxAmount: String(row.taxAmount || row["Tax Amount"] || "0"),
      lineTotal: String(row.lineTotal || row["Total"] || "0"),
      trackStock: String(row.trackStock || row["Track Stock"] || "0"),

      returnQuantity: "1",
      note: ""
    });
  },

  displayRow(row = {}) {
    return {
      Return: row.returnSelected === true,
      "Return Action": row.returnSelected === true ? "Selected" : "Select",
      "Product Code": row.productCode || "",
      Barcode: row.barcode || "",
      Description: row.description || "",
      Unit: row.unitName || "",
      "Original Quantity": row.originalQuantity || "0",
      "Already Returned": row.alreadyReturnedQuantity || "0",
      "Available To Return": row.availableReturnQuantity || "0",
      "Return Quantity": row.returnQuantity || "0",
      "Unit Price": row.unitPrice || "0",
      "Discount %": row.discountPercent || "0",
      Subtotal: row.returnSubtotal || "0.00",
      "Tax Amount": row.returnTaxAmount || "0.00",
      Total: row.returnTotal || "0.00",
      Note: row.note || "",

      returnSelected: row.returnSelected === true,
      sourceDocumentItemId: row.sourceDocumentItemId || "",
      sourceDocumentId: row.sourceDocumentId || "",
      productId: row.productId || "",
      productCode: row.productCode || "",
      barcode: row.barcode || "",
      description: row.description || "",
      unitId: row.unitId || "",
      unitName: row.unitName || "",
      taxRateId: row.taxRateId || "",
      taxRate: row.taxRate || "0",
      originalQuantity: row.originalQuantity || "0",
      alreadyReturnedQuantity: row.alreadyReturnedQuantity || "0",
      availableReturnQuantity: row.availableReturnQuantity || "0",
      unitPrice: row.unitPrice || "0",
      discountPercent: row.discountPercent || "0",
      discountAmount: row.discountAmount || "0",
      lineSubtotal: row.lineSubtotal || "0",
      taxAmount: row.taxAmount || "0",
      lineTotal: row.lineTotal || "0",
      trackStock: row.trackStock || "0",
      returnQuantity: row.returnQuantity || "0",
      returnDiscountAmount: row.returnDiscountAmount || "0.00",
      returnSubtotal: row.returnSubtotal || "0.00",
      returnTaxAmount: row.returnTaxAmount || "0.00",
      returnTotal: row.returnTotal || "0.00",
      note: row.note || ""
    };
  },

  getTableRows() {
    return (appsmith.store.posReturnItems || [])
      .filter(row => row && typeof row === "object")
      .map(row => this.displayRow(row));
  },

  recalculateReturnRow(row = {}) {
    const originalQuantity = Number(row.originalQuantity || 0);
    const availableReturnQuantity = Number(row.availableReturnQuantity || 0);
    const requestedQuantity = Number(row.returnQuantity || 0);
    const maxQuantity = availableReturnQuantity || originalQuantity;
    const returnQuantity = Math.min(requestedQuantity, maxQuantity);

    const unitPrice = Number(row.unitPrice || 0);
    const taxRate = Number(row.taxRate || 0);
    const discountPercent = Number(row.discountPercent || 0);

    const gross = returnQuantity * unitPrice;
    const returnDiscountAmount = gross * (discountPercent / 100);
    const returnSubtotal = gross - returnDiscountAmount;
    const returnTaxAmount = returnSubtotal * (taxRate / 100);
    const returnTotal = returnSubtotal + returnTaxAmount;

    return {
      ...row,
      returnQuantity: String(returnQuantity || 0),
      returnDiscountAmount: String(returnDiscountAmount.toFixed(2)),
      returnSubtotal: String(returnSubtotal.toFixed(2)),
      returnTaxAmount: String(returnTaxAmount.toFixed(2)),
      returnTotal: String(returnTotal.toFixed(2))
    };
  },

  toggleReturnSelected(sourceDocumentItemId) {
    const rows = [...(appsmith.store.posReturnItems || [])];

    const index = rows.findIndex(row =>
      String(row.sourceDocumentItemId || "") === String(sourceDocumentItemId || "")
    );

    if (index < 0) {
      showAlert("Return item was not found.", "warning");
      return;
    }

    rows[index] = this.recalculateReturnRow({
      ...rows[index],
      returnSelected: rows[index].returnSelected !== true
    });

    return storeValue("posReturnItems", rows);
  },

  selectAllReturnItems() {
    const rows = [...(appsmith.store.posReturnItems || [])].map(row =>
      this.recalculateReturnRow({
        ...row,
        returnSelected: Number(row.availableReturnQuantity || 0) > 0
      })
    );

    return storeValue("posReturnItems", rows);
  },

  clearSelectedReturnItems() {
    const rows = [...(appsmith.store.posReturnItems || [])].map(row =>
      this.recalculateReturnRow({
        ...row,
        returnSelected: false
      })
    );

    return storeValue("posReturnItems", rows);
  },

  async syncReturnTableEdits() {
    const tableRows = ReturnItemsTable.tableData || [];
    const storedRows = [...(appsmith.store.posReturnItems || [])];

    const nextRows = storedRows.map(storedRow => {
      const editedRow = tableRows.find(row =>
        String(row.sourceDocumentItemId || "") === String(storedRow.sourceDocumentItemId || "")
      );

      if (!editedRow) {
        return storedRow;
      }

      return this.recalculateReturnRow({
        ...storedRow,
        returnSelected: storedRow.returnSelected === true,
        returnQuantity: String(
          editedRow["Return Quantity"] ||
          editedRow.returnQuantity ||
          storedRow.returnQuantity ||
          "0"
        ),
        note: String(editedRow.Note || editedRow.note || storedRow.note || "")
      });
    });

    await storeValue("posReturnItems", nextRows);
    return nextRows;
  },

  getReturnRows() {
    return (appsmith.store.posReturnItems || [])
      .filter(row => row && row.returnSelected === true && Number(row.returnQuantity || 0) > 0)
      .map(row => this.recalculateReturnRow(row));
  },

  getReturnTotals(rows = this.getReturnRows()) {
    return rows.reduce(
      (sum, row) => ({
        subtotal: sum.subtotal - Number(row.returnSubtotal || 0),
        tax: sum.tax - Number(row.returnTaxAmount || 0),
        discount: sum.discount - Number(row.returnDiscountAmount || 0),
        total: sum.total - Number(row.returnTotal || 0)
      }),
      { subtotal: 0, tax: 0, discount: 0, total: 0 }
    );
  },

  async loadInvoiceForReturn() {
    if (!ReturnInvoiceNumberInput.text) {
      showAlert("Enter invoice number.", "warning");
      return;
    }

    const sourceRows = await FindReturnSourceInvoice.run();
    const sourceInvoice = sourceRows?.[0] || FindReturnSourceInvoice.data?.[0];

    if (!sourceInvoice) {
      showAlert("Invoice was not found.", "warning");
      return;
    }

    const itemRows = await ListReturnSourceItems.run({
      sourceDocumentId: sourceInvoice.documentId || sourceInvoice["Document ID"]
    });

    const rawItems = itemRows || ListReturnSourceItems.data || [];
    const items = rawItems.map(row => this.mapSourceItem(row));

    await storeValue("posReturnSourceInvoice", sourceInvoice);
    await storeValue("posReturnItems", items);

    showAlert("Invoice loaded for return.", "success");
  },

  updateReturnSelected(rowIndex, value) {
    const rows = [...(appsmith.store.posReturnItems || [])];

    if (rowIndex < 0 || rowIndex >= rows.length) {
      return;
    }

    rows[rowIndex] = this.recalculateReturnRow({
      ...rows[rowIndex],
      returnSelected: value === true
    });

    return storeValue("posReturnItems", rows);
  },

  updateReturnQuantity(rowIndex, value) {
    const rows = [...(appsmith.store.posReturnItems || [])];

    if (rowIndex < 0 || rowIndex >= rows.length) {
      return;
    }

    const requested = Number(value || 0);
    const available = Number(rows[rowIndex].availableReturnQuantity || 0);

    if (requested > available) {
      showAlert("Return quantity cannot be higher than available quantity.", "warning");
    }

    rows[rowIndex] = this.recalculateReturnRow({
      ...rows[rowIndex],
      returnQuantity: String(Math.min(requested, available))
    });

    return storeValue("posReturnItems", rows);
  },

  updateReturnNote(rowIndex, value) {
    const rows = [...(appsmith.store.posReturnItems || [])];

    if (rowIndex < 0 || rowIndex >= rows.length) {
      return;
    }

    rows[rowIndex] = {
      ...rows[rowIndex],
      note: String(value || "")
    };

    return storeValue("posReturnItems", rows);
  },

  async clearReturnForm() {
    await storeValue("posReturnSourceInvoice", null);
    await storeValue("posReturnItems", []);

    ReturnInvoiceNumberInput.setValue("");
    ReturnManagerCodeInput.setValue("");

    if (typeof ReturnNoteInput !== "undefined") {
      ReturnNoteInput.setValue("");
    }

    if (typeof ReturnReasonSelect !== "undefined") {
      ReturnReasonSelect.setSelectedOption("");
    }

    if (typeof ReturnPaymentMethodSelect !== "undefined") {
      ReturnPaymentMethodSelect.setSelectedOption("");
    }

    if (typeof ReturnCardTypeSelect !== "undefined") {
      ReturnCardTypeSelect.setSelectedOption("");
    }
  },

  async saveReturn() {
    await this.syncReturnTableEdits();

    const sourceInvoice = appsmith.store.posReturnSourceInvoice;
    const rows = this.getReturnRows();

    if (!sourceInvoice?.documentId && !sourceInvoice?.["Document ID"]) {
      showAlert("Load invoice before saving return.", "warning");
      return;
    }

    if (!ReturnReasonSelect.selectedOptionValue) {
      showAlert("Select return reason.", "warning");
      return;
    }

    if (!ReturnManagerCodeInput.text) {
      showAlert("Manager code is required.", "warning");
      return;
    }

    if (!ReturnPaymentMethodSelect.selectedOptionValue) {
      showAlert("Select refund method.", "warning");
      return;
    }

    if (ReturnPaymentMethodSelect.selectedOptionValue === "CARD" && !ReturnCardTypeSelect.selectedOptionValue) {
      showAlert("Select card type.", "warning");
      return;
    }

    if (!rows.length) {
      showAlert("Select at least one item to return.", "warning");
      return;
    }

    const managerRows = await VerifyReturnManagerCode.run();
    const manager = managerRows?.[0] || VerifyReturnManagerCode.data?.[0];

    if (!manager?.managerUserId && !manager?.["Manager User ID"]) {
      showAlert("Manager code is not valid.", "error");
      return;
    }

    const managerUserId = manager.managerUserId || manager["Manager User ID"];
    const sourceDocumentId = sourceInvoice.documentId || sourceInvoice["Document ID"];
    const totals = this.getReturnTotals(rows);

    try {
      const returnResponse = await InsertSalesReturn.run({
        sourceInvoice,
        managerUserId,
        paymentMethod: ReturnPaymentMethodSelect.selectedOptionValue,
        cardType: ReturnPaymentMethodSelect.selectedOptionValue === "CARD"
          ? ReturnCardTypeSelect.selectedOptionValue
          : null,
        totals
      });

      let returnDocumentId =
  returnResponse?.insertId ||
  returnResponse?.[0]?.insertId ||
  returnResponse?.[0]?.id ||
  returnResponse?.[0]?.returnDocumentId ||
  InsertSalesReturn.data?.insertId ||
  InsertSalesReturn.data?.[0]?.insertId ||
  InsertSalesReturn.data?.[0]?.id ||
  InsertSalesReturn.data?.[0]?.returnDocumentId;

if (!returnDocumentId) {
  const savedReturnRows = await GetLastSavedSalesReturn.run();

  returnDocumentId =
    savedReturnRows?.[0]?.id ||
    GetLastSavedSalesReturn.data?.[0]?.id;
}

if (!returnDocumentId) {
  showAlert("Return was saved, but return ID could not be found.", "error");
  console.log(returnResponse);
  return;
}


      for (let i = 0; i < rows.length; i += 1) {
        const itemResponse = await InsertSalesReturnItem.run({
          returnDocumentId,
          lineNo: i + 1,
          sourceInvoice,
          row: rows[i]
        });

        const returnItemId =
          itemResponse?.insertId ||
          itemResponse?.[0]?.insertId ||
          InsertSalesReturnItem.data?.insertId ||
          InsertSalesReturnItem.data?.[0]?.insertId;

        if (String(rows[i].trackStock || "0") === "1" && returnItemId) {
          await InsertReturnStockMovement.run({
            returnDocumentId,
            returnItemId,
            sourceInvoice,
            row: rows[i]
          });
        }
      }

      await InsertReturnApproval.run({
        returnDocumentId,
        sourceDocumentId,
        managerUserId
      });

      if (typeof InsertAuditLog !== "undefined") {
        await InsertAuditLog.run({
          entity_name: "documents",
          entity_id: returnDocumentId,
          action_type: "INSERT",
          new_values: {
            source: "POS Return",
            document_type: "SALES_RETURN",
            source_document_id: sourceDocumentId,
            manager_user_id: managerUserId,
            return_reason_id: ReturnReasonSelect.selectedOptionValue,
            payment_method: ReturnPaymentMethodSelect.selectedOptionValue,
            card_type: ReturnPaymentMethodSelect.selectedOptionValue === "CARD"
              ? ReturnCardTypeSelect.selectedOptionValue
              : null,
            subtotal_amount: totals.subtotal,
            tax_amount: totals.tax,
            discount_amount: totals.discount,
            total_amount: totals.total,
            item_count: rows.length
          }
        });

        await InsertAuditLog.run({
          entity_name: "documents",
          entity_id: sourceDocumentId,
          action_type: "POST",
          new_values: {
            source: "POS Return",
            return_document_id: returnDocumentId,
            manager_user_id: managerUserId,
            note: "POS return created and approved"
          }
        });
      }

      await this.clearReturnForm();
			closeModal(ReturnModal.name);

      showAlert("Return was saved successfully.", "success");
    } catch (error) {
      showAlert("Error while saving return: " + error.message, "error");
      console.log(error);
    }
  }
};

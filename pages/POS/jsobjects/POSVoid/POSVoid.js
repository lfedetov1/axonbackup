export default {
  reverseMovementType(type) {
    if (type === "OUT" || type === "TRANSFER_OUT") {
      return "IN";
    }

    if (type === "IN" || type === "TRANSFER_IN") {
      return "OUT";
    }

    return "ADJUSTMENT";
  },

  async findInvoice() {
    const invoiceNumber = String(VoidInvoiceNumberInput.text || "").trim();

    await storeValue("voidInvoiceFound", false);
    await storeValue("voidInvoice", null);

    if (!invoiceNumber) {
      showAlert("Enter invoice number.", "warning");
      return;
    }

    const invoiceRows = await FindVoidPosInvoice.run();
    const invoice = invoiceRows?.[0] || FindVoidPosInvoice.data?.[0];

    if (!invoice?.invoiceId) {
      showAlert("POS invoice was not found.", "warning");
      return;
    }

    if (invoice.status === "CANCELLED") {
      showAlert("Invoice is already cancelled.", "warning");
      return;
    }

    await storeValue("voidInvoiceFound", true);
    await storeValue("voidInvoice", invoice);

    showAlert("Invoice found.", "success");
  },

  async voidInvoice() {
    const invoice = appsmith.store.voidInvoice;

    if (!appsmith.store.voidInvoiceFound || !invoice?.invoiceId) {
      showAlert("Find invoice before void.", "warning");
      return;
    }

    const movements = await ListVoidInvoiceStockMovements.run({
      invoiceId: invoice.invoiceId
    });

    for (const movement of movements || []) {
      await InsertVoidStockReversal.run({
        invoiceId: invoice.invoiceId,
        warehouseId: movement.warehouseId,
        productId: movement.productId,
        documentItemId: movement.documentItemId,
        reverseMovementType: this.reverseMovementType(movement.movementType),
        quantity: movement.quantity,
        unitCost: movement.unitCost,
        totalCost: movement.totalCost,
        note: "POS VOID reversal for " + invoice.documentNumber
      });
    }

    await VoidPosInvoice.run({
      invoiceId: invoice.invoiceId
    });

    await storeValue("voidInvoiceFound", false);
    await storeValue("voidInvoice", null);

    VoidInvoiceNumberInput.setValue("");

    if (typeof VoidReasonInput !== "undefined") {
      VoidReasonInput.setValue("");
    }

    closeModal(Voidmodal.name);

    showAlert("POS invoice was voided and stock was restored.", "success");
  }
};

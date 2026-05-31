export default {
  async build(documentNumber) {
    const number = String(documentNumber || "").trim();

    if (!number) {
      showAlert("Invoice number is missing.", "error");
      return false;
    }

    await storeValue("posReceiptPrintData", null);
    await storeValue("posPrintDocumentNumber", number);

    const headerRows = await GetPOSInvoicePrintHeader.run();
    const itemRows = await GetPOSInvoicePrintItems.run();
    const taxRows = await GetPOSInvoicePrintTaxSummary.run();

    let paymentRows = [];

    if (typeof GetPOSInvoicePrintPayments !== "undefined") {
      const result = await GetPOSInvoicePrintPayments.run();
      paymentRows = result || GetPOSInvoicePrintPayments.data || [];
    }

    const header = headerRows?.[0] || GetPOSInvoicePrintHeader.data?.[0];
    const items = itemRows || GetPOSInvoicePrintItems.data || [];
    const taxes = taxRows || GetPOSInvoicePrintTaxSummary.data || [];

    if (!header) {
      showAlert("POS receipt print data was not found.", "error");
      return false;
    }

    await storeValue("posReceiptPrintData", {
      header,
      items,
      taxes,
      payments: paymentRows,
      username: appsmith.store.username || ""
    });

    return true;
  },

  async open(documentNumber = null) {
    const number =
      documentNumber ||
      appsmith.store.posSelectedReceiptNumber ||
      appsmith.store.posPrintDocumentNumber ||
      invoice_no.text;

    const ok = await this.build(number);

    if (!ok) return;

    showModal(POSReceiptPrintModal.name);
  },

  async preview(documentNumber = null) {
    const number =
      documentNumber ||
      appsmith.store.posSelectedReceiptNumber ||
      appsmith.store.posPrintDocumentNumber ||
      invoice_no.text;

    return this.build(number);
  }
};
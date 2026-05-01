export default {
  async openInvoicePrint() {
    const row = tblInvoices.selectedRow;

    if (!row || !row.ID) {
      showAlert("Select an invoice first.", "warning");
      return;
    }
		await storeValue("selectedDocumentId", invoice_no.text);
    await storeValue("selectedDocumentId", row.Number);
    await storeValue("documentPrintAction", "");

    await GetInvoicePrintHeader.run();
    await GetInvoicePrintItems.run();
    await GetInvoicePrintTaxSummary.run();

    showModal("InvoicePrintModal1");
  },

  async printInvoice() {
    await storeValue("documentPrintAction", "print_" + Date.now());
  },

  async emailInvoice() {
    await storeValue("documentPrintAction", "sendEmail_" + Date.now());
  }
};

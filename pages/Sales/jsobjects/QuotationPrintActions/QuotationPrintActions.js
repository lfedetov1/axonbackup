export default {
  async openQuotePrint() {
    const row = tblQuotations.selectedRow;

    if (!row || !row.ID) {
      showAlert("Select a quote first.", "warning");
      return;
    }

    await storeValue("selectedDocumentId", Quotations_no.text);
    await storeValue("selectedQuoteId", row.ID);
    await storeValue("quotePrintAction", "");

    await GetQuotationPrintHeader.run();
    await GetQuotationPrintItems.run();
    await GetQuotationPrintTaxSummary.run();

    showModal("QuotePrintModal1");
  },

  async printQuote() {
    await storeValue("quotePrintAction", "print_" + Date.now());
  }
};

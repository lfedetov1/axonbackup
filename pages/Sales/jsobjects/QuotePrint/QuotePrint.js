export default {
  async open(row = null) {
    const selected = row || QuotesTable.selectedRow || {};
    const documentId =
      selected.documentId ||
      selected.id ||
      selected.ID ||
      selected["Document ID"];

    if (!documentId) {
      showAlert("Select quote first.", "warning");
      return;
    }

    await storeValue("selectedQuotePrintId", documentId);

    await GetQuotePrintHeader.run();
    await GetQuotePrintItems.run();
    await GetQuotePrintTaxSummary.run();

    await storeValue("salesPreviousTab", "QUOTES");
    await storeValue("salesViewMode", "PRINT");
    await storeValue("salesTab", "QUOTE_PRINT");
  },

  async back() {
    await storeValue("salesViewMode", "LIST");
    await storeValue("salesTab", "QUOTES");
    await storeValue("salesPreviousTab", "QUOTES");
  }
};
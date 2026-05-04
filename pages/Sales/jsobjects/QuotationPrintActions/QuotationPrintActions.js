export default {
  async openQuotePrintById(quotationId) {
    const quoteId =
      quotationId ||
      appsmith.store.currentQuotationId ||
      appsmith.store.selectedQuoteId ||
      appsmith.store.selectedDocumentId;

    if (!quoteId) {
      showAlert("Quotation ID is missing for print.", "warning");
      return;
    }

    await storeValue("selectedQuoteId", quoteId);
    await storeValue("selectedDocumentId", quoteId);
    await storeValue("quotePrintAction", "");

    const headerRows = await GetQuotationPrintHeader.run({
      quotationId: quoteId,
      documentId: quoteId
    });

    const itemRows = await GetQuotationPrintItems.run({
      quotationId: quoteId,
      documentId: quoteId
    });

    const taxRows = await GetQuotationPrintTaxSummary.run({
      quotationId: quoteId,
      documentId: quoteId
    });

    const header = headerRows?.[0] || GetQuotationPrintHeader.data?.[0];
    const items = itemRows || GetQuotationPrintItems.data || [];
    const taxes = taxRows || GetQuotationPrintTaxSummary.data || [];

    if (!header) {
      showAlert("Quotation print header was not found.", "error");
      return;
    }

    await storeValue("quotePrintData", {
      header,
      items,
      taxes
    });

    showModal("QuotePrintModal1");
  },

  async openQuotePrint() {
    const row = tblQuotations.selectedRow;

    if (!row || !row.ID) {
      return this.openQuotePrintById();
    }

    return this.openQuotePrintById(row.ID);
  },

  async printQuote() {
    await storeValue("quotePrintAction", "print_" + Date.now());
  }
};

export default {
  async open(documentId) {
    if (!documentId) {
      showAlert("Quotation ID is missing.", "error");
      return;
    }

    try {
      const headerRows = await GetQuotationPrintHeader.run({ documentId });
      const itemRows = await GetQuotationPrintItems.run({ documentId });
      const taxRows = await GetQuotationPrintTaxSummary.run({ documentId });

      const header = headerRows?.[0] || GetQuotationPrintHeader.data?.[0];
      const items = itemRows || GetQuotationPrintItems.data || [];
      const taxes = taxRows || GetQuotationPrintTaxSummary.data || [];

      if (!header) {
        showAlert("Quotation print data was not found.", "error");
        return;
      }

      await storeValue("invoicePrintData", {
        format: "A4",
        documentTitle: "QUOTATION / PONUDA",
        documentSubtitle: "Commercial offer / Komercijalna ponuda",
        header,
        items,
        taxes
      });

      showModal(InvoicePrintModal1.name);
    } catch (error) {
      showAlert("Error while preparing quotation print: " + error.message, "error");
      console.log(error);
    }
  }
};

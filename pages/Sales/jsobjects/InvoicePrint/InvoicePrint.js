export default {
  async open(documentId, format = "A4") {
    if (!documentId) {
      showAlert("Invoice ID is missing.", "error");
      return;
    }

    try {
      const headerRows = await GetInvoicePrintHeader.run({ documentId });
      const itemRows = await GetInvoicePrintItems.run({ documentId });
      const taxRows = await GetInvoicePrintTaxSummary.run({ documentId });

      const header = headerRows?.[0] || GetInvoicePrintHeader.data?.[0];
      const items = itemRows || GetInvoicePrintItems.data || [];
      const taxes = taxRows || GetInvoicePrintTaxSummary.data || [];

      if (!header) {
        showAlert("Invoice print data was not found.", "error");
        return;
      }

      await storeValue("invoicePrintData", {
        format,
        header,
        items,
        taxes
      });

      showModal(InvoicePrintModal1.name);
    } catch (error) {
      showAlert("Error while preparing invoice print: " + error.message, "error");
      console.log(error);
    }
  },

  printA4(documentId) {
    return this.open(documentId, "A4");
  },

  printReceipt(documentId) {
    return this.open(documentId, "RECEIPT");
  }
};

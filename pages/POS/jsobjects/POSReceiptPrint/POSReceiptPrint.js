export default {
  async open(documentId) {
    if (!documentId) {
      showAlert("POS invoice ID is missing.", "error");
      return;
    }

    try {
      const headerRows = await GetPOSInvoicePrintHeader.run({ documentId });
      const itemRows = await GetPOSInvoicePrintItems.run({ documentId });
      const taxRows = await GetPOSInvoicePrintTaxSummary.run({ documentId });

      const header = headerRows?.[0] || GetPOSInvoicePrintHeader.data?.[0];
      const items = itemRows || GetPOSInvoicePrintItems.data || [];
      const taxes = taxRows || GetPOSInvoicePrintTaxSummary.data || [];

      if (!header) {
        showAlert("POS invoice print data was not found.", "error");
        return;
      }

      await storeValue("posReceiptPrintData", {
        header,
        items,
        taxes
      });

      showModal(POSReceiptPrintModal.name);
    } catch (error) {
      showAlert("Error while preparing POS receipt print: " + error.message, "error");
      console.log(error);
    }
  }
};

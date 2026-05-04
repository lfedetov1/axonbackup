export default {
  async openFromPOSForm() {
    if (!appsmith.store.posPrintDocumentNumber) {
      showAlert("Invoice number is missing.", "error");
      return;
    }

    try {
      const headerRows = await GetPOSInvoicePrintHeader.run();
      const itemRows = await GetPOSInvoicePrintItems.run();
      const taxRows = await GetPOSInvoicePrintTaxSummary.run();

      const header = headerRows?.[0] || GetPOSInvoicePrintHeader.data?.[0];
      const items = itemRows || GetPOSInvoicePrintItems.data || [];
      const taxes = taxRows || GetPOSInvoicePrintTaxSummary.data || [];

      if (!header) {
        showAlert("POS receipt print data was not found.", "error");
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
  },

  async openFromSelectedRow() {
    if (!tblPOSSales.selectedRow || !tblPOSSales.selectedRow.ID) {
      showAlert("Select a document to print.", "warning");
      return;
    }

    try {
      await storeValue("posPrintDocumentId", tblPOSSales.selectedRow.ID);
      await storeValue("posPrintDocumentNumber", tblPOSSales.selectedRow.Number || "");

      const headerRows = await GetPOSInvoicePrintHeader.run();
      const itemRows = await GetPOSInvoicePrintItems.run();
      const taxRows = await GetPOSInvoicePrintTaxSummary.run();

      const header = headerRows?.[0] || GetPOSInvoicePrintHeader.data?.[0];
      const items = itemRows || GetPOSInvoicePrintItems.data || [];
      const taxes = taxRows || GetPOSInvoicePrintTaxSummary.data || [];

      if (!header) {
        showAlert("Print data was not found.", "error");
        return;
      }

      await storeValue("posReceiptPrintData", {
        header,
        items,
        taxes
      });

      showModal(POSReceiptPrintModal.name);
    } catch (error) {
      showAlert("Error while preparing print: " + error.message, "error");
      console.log(error);
    }
  },

  async openByDocumentId(documentId) {
    if (!documentId) {
      showAlert("Document ID is missing.", "error");
      return;
    }

    try {
      await storeValue("posPrintDocumentId", documentId);

      const headerRows = await GetPOSInvoicePrintHeader.run();
      const itemRows = await GetPOSInvoicePrintItems.run();
      const taxRows = await GetPOSInvoicePrintTaxSummary.run();

      const header = headerRows?.[0] || GetPOSInvoicePrintHeader.data?.[0];
      const items = itemRows || GetPOSInvoicePrintItems.data || [];
      const taxes = taxRows || GetPOSInvoicePrintTaxSummary.data || [];

      if (!header) {
        showAlert("Print data was not found.", "error");
        return;
      }

      await storeValue("posReceiptPrintData", {
        header,
        items,
        taxes
      });

      showModal(POSReceiptPrintModal.name);
    } catch (error) {
      showAlert("Error while preparing print: " + error.message, "error");
      console.log(error);
    }
  }
};

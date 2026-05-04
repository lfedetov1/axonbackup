export default {
  async open(row = tblPOSSales.selectedRow) {
    const documentNumber = row?.Number;

    if (!documentNumber) {
      showAlert("POS invoice number is missing.", "error");
      return;
    }

    try {
      const headerRows = await GetPOSInvoicePrintHeader.run({ documentNumber });
      const itemRows = await GetPOSInvoicePrintItems.run({ documentNumber });
      const taxRows = await GetPOSInvoicePrintTaxSummary.run({ documentNumber });

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

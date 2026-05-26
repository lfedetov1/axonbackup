export default {
  async open() {
    const documentNumber = invoice_no.text;

    if (!documentNumber) {
      showAlert("Invoice number is missing.", "error");
      return;
    }

    try {
      await storeValue("posPrintDocumentNumber", documentNumber);

      const headerRows = await GetPOSInvoicePrintHeader.run();
      const itemRows = await GetPOSInvoicePrintItems.run();
      const taxRows = await GetPOSInvoicePrintTaxSummary.run();
      const paymentRows = await GetPOSInvoicePrintPayments.run();

      const header = headerRows?.[0] || GetPOSInvoicePrintHeader.data?.[0];
      const items = itemRows || GetPOSInvoicePrintItems.data || [];
      const taxes = taxRows || GetPOSInvoicePrintTaxSummary.data || [];
      const payments = paymentRows || GetPOSInvoicePrintPayments.data || [];

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
  }
};

export default {
  async convertToInvoice(quotationId) {
    if (!quotationId) {
      showAlert("Select quotation first.", "warning");
      return;
    }

    try {
      const invoiceNumber = "INV-" + new Date().toISOString().replace(/\D/g, "").slice(0, 14);

      const invoiceResponse = await InsertInvoiceFromQuotation.run({
        quotationId,
        invoiceNumber
      });

      const invoiceId =
        invoiceResponse?.insertId ||
        invoiceResponse?.[0]?.insertId ||
        InsertInvoiceFromQuotation.data?.insertId ||
        InsertInvoiceFromQuotation.data?.[0]?.insertId;

      if (!invoiceId) {
        showAlert("Invoice was created, but invoice ID was not returned.", "error");
        console.log(invoiceResponse);
        return;
      }

      await InsertInvoiceFromQuotation.run({
        quotationId,
        invoiceId
      });

      await MarkQuotationConverted.run({
        quotationId,
        invoiceNumber
      });

      showAlert("Quotation was converted to invoice successfully.", "success");

      await InvoicePrint.open(invoiceId, "A4");
    } catch (error) {
      showAlert("Error while converting quotation: " + error.message, "error");
      console.log(error);
    }
  }
};

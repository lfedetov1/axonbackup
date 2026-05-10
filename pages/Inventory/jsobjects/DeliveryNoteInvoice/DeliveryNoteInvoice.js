export default {
  async createInvoice(row = null) {
    const selected = row || DeliveryNotesTable.selectedRow || {};
    const deliveryNoteId = selected.documentId || selected.id;

    if (!deliveryNoteId) {
      showAlert("Select delivery note first.", "warning");
      return;
    }

    if ((selected.Status || selected.status) !== "POSTED") {
      showAlert("Only posted delivery notes can be converted to invoice.", "warning");
      return;
    }

    await GetNextInvoiceNumber.run();

    const invoiceNumber =
      GetNextInvoiceNumber.data?.[0]?.nextInvoiceNumber ||
      GetNextInvoiceNumber.data?.nextInvoiceNumber;

    if (!invoiceNumber) {
      showAlert("Invoice number could not be generated.", "error");
      return;
    }

    await InsertInvoiceFromDeliveryNote.run({
      deliveryNoteId,
      invoiceNumber
    });

    const invoiceRows = await GetInvoiceIdByNumber.run({ invoiceNumber });
    const invoice = invoiceRows?.[0] || GetInvoiceIdByNumber.data?.[0];

    if (!invoice?.invoiceId) {
      showAlert("Invoice was created, but ID was not found.", "error");
      return;
    }

    await InsertInvoiceItemsFromDelivery.run({
      deliveryNoteId,
      invoiceId: invoice.invoiceId
    });

    if (typeof AuditLog !== "undefined") {
      await AuditLog.insert({
        entityName: "documents",
        entityId: invoice.invoiceId,
        actionType: "INSERT",
        newValues: {
          source: "Delivery Note",
          delivery_note_id: deliveryNoteId,
          invoice_number: invoiceNumber,
          document_type: "SALES_INVOICE"
        }
      });
    }

    showAlert(`Invoice ${invoiceNumber} was created.`, "success");
  }
};

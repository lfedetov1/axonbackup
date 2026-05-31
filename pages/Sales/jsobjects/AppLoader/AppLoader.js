export default {
  async setLoaderText(message = "Processing...") {
    await storeValue("globalLoaderMessage", message || "Processing...");
  },

  invoicePayload(payload = {}) {
    const row = payload || InvoicesTable.triggeredRow || InvoicesTable.selectedRow || {};

    return {
      documentId:
        row.documentId ||
        row.invoiceId ||
        row.ID ||
        row.id ||
        row["Document ID"] ||
        row["Invoice ID"],
      invoiceId:
        row.invoiceId ||
        row.documentId ||
        row.ID ||
        row.id ||
        row["Document ID"] ||
        row["Invoice ID"]
    };
  },

  async run(message = "Processing...", action = "", payload = {}) {
    try {
      await this.setLoaderText(message);

      if (typeof GlobalLoadingModal !== "undefined") {
        showModal(GlobalLoadingModal.name);
      }

      if (action === "salesInvoice.new") {
        return await SalesInvoiceForm.startNew(payload.documentType || "SALES_INVOICE");
      }

      if (action === "salesInvoice.save") {
        return await SalesInvoiceForm.saveDraft();
      }

      if (action === "salesInvoice.cancel") {
        return await SalesInvoiceForm.cancel();
      }

      if (action === "salesInvoice.edit") {
        return await SalesInvoiceForm.loadForEdit(this.invoicePayload(payload));
      }

      if (action === "salesInvoice.post") {
        return await SalesInvoiceForm.postDocument(this.invoicePayload(payload));
      }

      if (action === "salesInvoice.print") {
        return await SalesInvoiceForm.print(this.invoicePayload(payload));
      }

      if (action === "salesInvoice.void") {
        return await SalesInvoiceForm.voidDocument(this.invoicePayload(payload));
      }
			if (action === "salesInvoice.postDay") {
  return await SalesInvoiceForm.postAllDraftInvoicesForDay(
    payload.postingDate || moment().format("YYYY-MM-DD")
  );
}

      if (action === "salesInvoice.creditNote") {
        return await SalesInvoiceForm.createCreditNote(this.invoicePayload(payload));
      }

      showAlert("Unknown loader action: " + action, "error");
      console.log("Unknown AppLoader action:", { message, action, payload });
      return null;
    } catch (error) {
      showAlert(error.message || "Action failed.", "error");
      console.log(error);
      return null;
    } finally {
      if (typeof GlobalLoadingModal !== "undefined") {
        closeModal(GlobalLoadingModal.name);
      }

      await storeValue("globalLoaderMessage", "");
    }
  }
};
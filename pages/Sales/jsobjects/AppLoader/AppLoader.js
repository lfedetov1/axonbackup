export default {
  async setLoaderText(message = "Processing...") {
    await storeValue("globalLoaderMessage", message || "Processing...");
  },

  quoteRow(payload = {}) {
    return (
      payload ||
      QuotesTable.triggeredRow ||
      QuotesTable.selectedRow ||
      {}
    );
  },

  quotePayload(payload = {}) {
    const row = this.quoteRow(payload);

    return {
      quoteId:
        row.quoteId ||
        row.documentId ||
        row.ID ||
        row.id ||
        row["Document ID"],
      documentId:
        row.documentId ||
        row.quoteId ||
        row.ID ||
        row.id ||
        row["Document ID"],
      quoteNumber:
        row.quoteNumber ||
        row["Quote Number"] ||
        row.documentNumber ||
        row["Document Number"]
    };
  },

  invoiceRow(payload = {}) {
    return (
      payload ||
      InvoicesTable.triggeredRow ||
      InvoicesTable.selectedRow ||
      {}
    );
  },

  invoicePayload(payload = {}) {
    const row = this.invoiceRow(payload);

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
        row["Invoice ID"],
      documentNumber:
        row.documentNumber ||
        row["Document Number"] ||
        row["Invoice Number"],
      documentType:
        row.documentType ||
        row["Document Type"] ||
        row.Type
    };
  },

  async run(message = "Processing...", action = "", payload = {}) {
    const actionText = String(action || "");

    if (actionText.includes("QuoteForm.convertToInvoice")) {
      action = "quote.convert";
      payload = this.quotePayload(payload);
    }

    if (actionText.includes("QuoteForm.loadForEdit")) {
      action = "quote.edit";
      payload = this.quotePayload(payload);
    }

    if (actionText.includes("QuoteForm.print")) {
      action = "quote.print";
      payload = this.quotePayload(payload);
    }

    if (actionText.includes("SalesInvoiceForm.loadForEdit")) {
      action = "salesInvoice.edit";
      payload = this.invoicePayload(payload);
    }

    if (actionText.includes("SalesInvoiceForm.print")) {
      action = "salesInvoice.print";
      payload = this.invoicePayload(payload);
    }

    if (actionText.includes("SalesInvoiceForm.voidDocument")) {
      action = "salesInvoice.void";
      payload = this.invoicePayload(payload);
    }

    if (actionText.includes("SalesInvoiceForm.createCreditNote")) {
      action = "salesInvoice.creditNote";
      payload = this.invoicePayload(payload);
    }

    try {
      await this.setLoaderText(message);
      showModal(GlobalLoadingModal.name);

      if (action === "quote.edit") {
        return await QuoteForm.loadForEdit(this.quotePayload(payload));
      }

      if (action === "quote.print") {
        return await QuoteForm.print(this.quotePayload(payload));
      }

      if (action === "quote.convert") {
        return await QuoteForm.convertToInvoice(this.quotePayload(payload));
      }

      if (action === "quote.cancel") {
        return await QuoteForm.cancelQuote(this.quotePayload(payload));
      }

      if (action === "quote.save") {
        return await QuoteForm.saveDraft();
      }

      if (action === "salesInvoice.new") {
        return await SalesInvoiceForm.startNew(payload.documentType || "SALES_INVOICE");
      }

      if (action === "salesInvoice.save") {
        return await SalesInvoiceForm.saveDraft();
      }

      if (action === "salesInvoice.edit") {
        return await SalesInvoiceForm.loadForEdit(this.invoicePayload(payload));
      }

      if (action === "salesInvoice.print") {
        return await SalesInvoiceForm.print(this.invoicePayload(payload));
      }

      if (action === "salesInvoice.void") {
        return await SalesInvoiceForm.voidDocument(this.invoicePayload(payload));
      }

      if (action === "salesInvoice.creditNote") {
        return await SalesInvoiceForm.createCreditNote(this.invoicePayload(payload));
      }

      if (action === "salesInvoice.cancel") {
        return await SalesInvoiceForm.cancel();
      }

      showAlert("Unknown loader action: " + actionText, "error");
      console.log("Unknown AppLoader action:", { message, action, payload });
    } catch (error) {
      showAlert(error.message || "Action failed.", "error");
      console.log(error);
    } finally {
      closeModal(GlobalLoadingModal.name);
      await storeValue("globalLoaderMessage", "");
    }
  }
};
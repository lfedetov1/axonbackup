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
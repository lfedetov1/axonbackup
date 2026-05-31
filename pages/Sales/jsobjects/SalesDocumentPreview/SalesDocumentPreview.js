export default {
  row(row = null) {
    return row || {};
  },

  documentId(row = null) {
    const r = this.row(row);

    return (
      r.documentId ||
      r.quoteId ||
      r.salesOrderId ||
      r.invoiceId ||
      r.deliveryNoteId ||
      r.id ||
      r.ID ||
      r["Document ID"] ||
      null
    );
  },

  documentNumber(row = null) {
    const r = this.row(row);

    return (
      r.documentNumber ||
      r["Document Number"] ||
      r["Quote Number"] ||
      r["Order Number"] ||
      r["Invoice Number"] ||
      r["Delivery Number"] ||
      r["Receipt Number"] ||
      ""
    );
  },

  documentType(row = null) {
    const r = this.row(row);

    return (
      r.documentType ||
      r["Document Type"] ||
      r.Type ||
      r.type ||
      ""
    );
  },

  async clear() {
    await storeValue("salesSelectedDocumentId", null);
    await storeValue("salesSelectedDocumentNumber", "");
    await storeValue("salesSelectedDocumentType", "");
    await storeValue("salesDocumentPreviewData", null);
  },

  async loadFromRow(row = null) {
    const documentId = this.documentId(row);
    const documentNumber = this.documentNumber(row);
    const documentType = this.documentType(row);

    if (!documentId) {
      await this.clear();
      return;
    }

    await storeValue("salesSelectedDocumentId", documentId);
    await storeValue("salesSelectedDocumentNumber", documentNumber);
    await storeValue("salesSelectedDocumentType", documentType);

    const headerRows = await GetSalesDocumentPreviewHeader.run({ documentId });
    const itemRows = await GetSalesDocumentPreviewItems.run({ documentId });
    const taxRows = await GetSalesDocumentPreviewTaxSumm.run({ documentId });

    const header = headerRows?.[0] || GetSalesDocumentPreviewHeader.data?.[0];
    const items = itemRows || GetSalesDocumentPreviewItems.data || [];
    const taxes = taxRows || GetSalesDocumentPreviewTaxSumm.data || [];

    if (!header) {
      await storeValue("salesDocumentPreviewData", null);
      showAlert("Document preview data was not found.", "warning");
      return;
    }

    await storeValue("salesDocumentPreviewData", {
      header,
      items,
      taxes,
      username: appsmith.store.username || ""
    });
  },

  hasPreview() {
    return !!appsmith.store.salesDocumentPreviewData?.header;
  },

  async printSelected() {
    if (!this.hasPreview()) {
      showAlert("Select document first.", "warning");
      return false;
    }

    return true;
  }
};
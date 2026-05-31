export default {
  row(row = null) {
    return row || POSReceiptsTable.triggeredRow || POSReceiptsTable.selectedRow || {};
  },

  documentId(row = null) {
    const r = this.row(row);

    return (
      r.documentId ||
      r.id ||
      r.ID ||
      r["Document ID"] ||
      null
    );
  },

  documentNumber(row = null) {
    const r = this.row(row);

    return (
      r["Receipt Number"] ||
      r.documentNumber ||
      r.DocumentNumber ||
      r.document_number ||
      ""
    );
  },

  async refresh() {
    await storeValue("posSelectedReceiptId", null);
    await storeValue("posSelectedReceiptNumber", "");

    await ListPOSReceipts.run();

    if (typeof GetPOSReceiptOverviewItems !== "undefined") {
      await GetPOSReceiptOverviewItems.run({ documentId: 0 });
    }
  },

  async openReceiptsModal() {
    POSReceiptDateFrom.setValue(moment().format("YYYY-MM-DD"));
    POSReceiptDateTo.setValue(moment().format("YYYY-MM-DD"));

    await this.refresh();

    showModal(InvoicePreviewModal.name);
  },

  async select(row = null) {
  const documentId = this.documentId(row);
  const documentNumber = this.documentNumber(row);

  if (!documentId || !documentNumber) {
    await storeValue("posSelectedReceiptId", null);
    await storeValue("posSelectedReceiptNumber", "");
    await storeValue("posReceiptPrintData", null);

    if (typeof GetPOSReceiptOverviewItems !== "undefined") {
      await GetPOSReceiptOverviewItems.run({ documentId: 0 });
    }

    return;
  }

  await storeValue("posSelectedReceiptId", documentId);
  await storeValue("posSelectedReceiptNumber", documentNumber);

  if (typeof GetPOSReceiptOverviewItems !== "undefined") {
    await GetPOSReceiptOverviewItems.run({ documentId });
  }

  await POSReceiptPrint.preview(documentNumber);
},

  async print(row = null) {
    const documentNumber = this.documentNumber(row);

    if (!documentNumber) {
      showAlert("Select receipt first.", "warning");
      return;
    }

    await storeValue("posReceiptPrintData", null);
    await storeValue("posPrintDocumentNumber", documentNumber);

    const headerRows = await GetPOSInvoicePrintHeader.run();
    const itemRows = await GetPOSInvoicePrintItems.run();
    const taxRows = await GetPOSInvoicePrintTaxSummary.run();

    const header = headerRows?.[0] || GetPOSInvoicePrintHeader.data?.[0];
    const items = itemRows || GetPOSInvoicePrintItems.data || [];
    const taxes = taxRows || GetPOSInvoicePrintTaxSummary.data || [];

    if (!header) {
      showAlert("Receipt print data was not found.", "error");
      return;
    }

    await storeValue("posReceiptPrintData", {
      header,
      items,
      taxes,
      username: appsmith.store.username || ""
    });

    showModal(InvoicePreviewModal.name);
  },

  async printWithLoader(row = null) {
    const payload = { ...this.row(row) };

    return AppLoader.run(
      "Opening receipt preview",
      "Preparing receipt print preview...",
      async () => {
        await this.print(payload);
      }
    );
  }
};
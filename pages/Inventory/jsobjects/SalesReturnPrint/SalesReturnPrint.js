export default {
  getDocumentId(row = null) {
    const selected = row || SalesReturnsTable.selectedRow || {};
    return selected.documentId || selected.id || selected["Return ID"] || null;
  },

  async open(row = null) {
    const documentId = this.getDocumentId(row);

    if (!documentId) {
      showAlert("Select sales return first.", "warning");
      return;
    }

    await GetSalesReturnPrintHeader.run({ documentId });
    await GetSalesReturnPrintItems.run({ documentId });

    showModal(SalesReturnPrintModal.name);
  }
};

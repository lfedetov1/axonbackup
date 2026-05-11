export default {
  getDocumentId(row = null) {
    const selected = row || OpeningStockTable.triggeredRow || OpeningStockTable.selectedRow || {};

    return (
      selected.documentId ||
      selected.id ||
      selected.ID ||
      selected["Opening Stock ID"] ||
      selected["Document ID"] ||
      appsmith.store.currentOpeningStockId ||
      null
    );
  },

  async open(row = null) {
    const documentId = this.getDocumentId(row);

    if (!documentId) {
      showAlert("Select opening stock first.", "warning");
      return;
    }

    await storeValue("currentOpeningStockId", documentId);

    await GetOpeningStockPrintHeader.run({ documentId });
    await GetOpeningStockPrintItems.run({ documentId });

    showModal(OpeningStockPrintModal.name);
  }
};

export default {
  getDocumentId(row = null) {
    const selected = row || TransferRequestTable.triggeredRow || TransferRequestTable.selectedRow || {};

    return (
      selected.documentId ||
      selected.id ||
      selected.ID ||
      selected["Transfer ID"] ||
      null
    );
  },

  async open(row = null) {
    const documentId = this.getDocumentId(row);

    if (!documentId) {
      showAlert("Select transfer request first.", "warning");
      return;
    }

    await GetTransferRequestPrintHeader.run({ documentId });
    await GetTransferRequestPrintItems.run({ documentId });

    showModal(TransferRequestPrintModal.name);
  }
};

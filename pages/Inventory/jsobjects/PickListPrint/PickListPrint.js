export default {
  async open(row = null) {
    const selected = row || StockIssueDocumentsTable.selectedRow || {};
    const documentId =
      selected.documentId ||
      selected["Issue ID"] ||
      selected.id;

    if (!documentId) {
      showAlert("Select stock issue document first.", "warning");
      return;
    }

    await GetPickListPrintHeader.run({ documentId });
    await GetPickListPrintItems.run({ documentId });

    showModal(PickListPrintModal.name);
  }
};

export default {
  async open(row = null) {
    const selected = row || SupplierReturnsTable.triggeredRow || SupplierReturnsTable.selectedRow || {};
    const documentId = selected.documentId || selected.id || selected.ID || selected["Return ID"];

    if (!documentId) {
      showAlert("Select supplier return first.", "warning");
      return;
    }

    await GetSupplierReturnPrintHeader.run({ documentId });
    await GetSupplierReturnPrintItems.run({ documentId });

    showModal(SupplierReturnPrintModal.name);
  }
};

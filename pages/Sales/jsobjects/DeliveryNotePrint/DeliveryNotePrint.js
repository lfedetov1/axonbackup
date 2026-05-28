export default {
  async open(row = null) {
    const selected = row || SalesOrderTable.selectedRow || {};
    const documentId =
      selected.deliveryNoteId ||
      selected.documentId ||
      selected.id ||
      selected.ID ||
      selected["Document ID"];

    if (!documentId) {
      showAlert("Select delivery note first.", "warning");
      return;
    }

    await storeValue("currentDeliveryNotePrintId", documentId);

    await GetDeliveryNotePrintHeader.run({ documentId });
    await GetDeliveryNotePrintItems.run({ documentId });
    await GetDeliveryNotePrintPackages.run({ documentId });

    showModal(DeliveryNotePrintModal.name);
  }
};
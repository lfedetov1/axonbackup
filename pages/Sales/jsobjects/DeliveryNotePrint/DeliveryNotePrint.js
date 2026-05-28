export default {
  async open(row = null) {
    const selected = row || DeliveryNotesTable.triggeredRow || DeliveryNotesTable.selectedRow || {};
    const documentId =
      selected.documentId ||
      selected.id ||
      selected.ID ||
      selected["Document ID"];

    if (!documentId) {
      showAlert("Select delivery note first.", "warning");
      return;
    }

    await storeValue("selectedDeliveryNotePrintId", documentId);
    await GetDeliveryNotePrintHeader.run();
    await GetDeliveryNotePrintItem.run();

    showModal(DeliveryNotePrintModal.name);
  }
};
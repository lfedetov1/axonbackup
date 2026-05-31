export default {
  async open(row = null) {
    const selected = row || DeliveryNotesTable.selectedRow || {};

    const documentId =
      selected.documentId ||
      selected["Delivery Note ID"] ||
      selected.id ||
      selected.ID ||
      selected["Document ID"];

    if (!documentId) {
      showAlert("Select delivery note first.", "warning");
      return;
    }

    await GetDeliveryNotePrintHeader.run({ documentId });
    await GetDeliveryNotePrintItems.run({ documentId });

    showModal(DeliveryNotePrintModal.name);
  }
};
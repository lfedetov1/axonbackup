export default {
  async open(row = null) {
    const selected = row || InboundDeliveryTable.selectedRow || {};
    const documentId = selected.documentId || selected.id;

    if (!documentId) {
      showAlert("Select inbound delivery first.", "warning");
      return;
    }

    await GetInboundPrintHeader.run({ documentId });
    await GetInboundPrintItems.run({ documentId });

    showModal(InboundDeliveryPrintModal.name);
  }
};

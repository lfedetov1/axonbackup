export default {
  async open(row) {
    if (!row?.documentId) {
      showAlert("Select inbound delivery first.", "warning");
      return;
    }

    await storeValue("inboundStatusRow", row);

    InboundStatusSelect.setSelectedOption("");
    InboundStatusNoteInput.setValue("");

    showModal(InboundStatusModal.name);
  },

  async save() {
    const row = appsmith.store.inboundStatusRow || {};
    const status = InboundStatusSelect.selectedOptionValue;

    if (!row.documentId) {
      showAlert("No inbound delivery selected.", "warning");
      return;
    }

    if (!status) {
      showAlert("Select new status.", "warning");
      return;
    }

    await UpdateInboundDeliveryStatus.run({
      documentId: row.documentId,
      status
    });

    if (typeof AuditLog !== "undefined") {
      await AuditLog.insert({
        entityName: "documents",
        entityId: row.documentId,
        actionType: "STATUS",
        oldValues: {
          status: row.Status || row.status || null
        },
        newValues: {
          status,
          note: InboundStatusNoteInput.text || null
        }
      });
    }

    await storeValue("inboundStatusRow", null);

    if (typeof ListInboundDeliveries !== "undefined") {
      await ListInboundDeliveries.run();
    }

    if (typeof ListInboundDeliveryItems !== "undefined") {
      await ListInboundDeliveryItems.run({
        documentId: InboundDeliveryTable.selectedRow?.documentId || 0
      });
    }

    closeModal(InboundStatusModal.name);
    showAlert("Inbound status was updated.", "success");
  },

  async cancel() {
    await storeValue("inboundStatusRow", null);
    closeModal(InboundStatusModal.name);
  }
};

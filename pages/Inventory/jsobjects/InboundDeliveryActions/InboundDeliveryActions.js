export default {
  async run(row, action) {
    if (!row?.documentId) {
      showAlert("Select inbound delivery first.", "warning");
      return;
    }

    if (!action || action === "NONE") {
      return;
    }

    if (action === "EDIT") {
      return InboundDeliveryForm.loadForEdit(row);
    }

    if (["IN_TRANSIT", "ARRIVED", "RECEIVING", "CANCELLED"].includes(action)) {
      return InboundDeliveryForm.setStatus(row, action);
    }

    if (action === "CREATE_GR") {
      return InboundDeliveryForm.createGoodsReceipt(row);
    }
  }
};

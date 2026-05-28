export default {
  async open(row = null) {
    const selected = row || DeliveryManifestsTable.triggeredRow || DeliveryManifestsTable.selectedRow || {};
    const manifestId =
      selected.manifestId ||
      selected.id ||
      selected.ID ||
      selected["Manifest ID"];

    if (!manifestId) {
      showAlert("Select manifest first.", "warning");
      return;
    }

    await storeValue("selectedDeliveryManifestPrintId", manifestId);

    await GetDeliveryManifestPrintHeader.run();
    await GetDeliveryManifestPrintPackag.run();

    showModal(DeliveryManifestPrintModal.name);
  }
};
export default {
  async open(row = null) {
    const selected = row || DeliveryPackagesTable.triggeredRow || DeliveryPackagesTable.selectedRow || {};
    const packageId =
      selected.packageId ||
      selected.id ||
      selected.ID ||
      selected["Package ID"];

    if (!packageId) {
      showAlert("Select package first.", "warning");
      return;
    }

    await storeValue("selectedPackagePrintId", packageId);

    await GetPackageLabelPrint.run();
    await GetPackageLabelItems.run();

    showModal(PackageLabelPrintModal.name);
  }
};
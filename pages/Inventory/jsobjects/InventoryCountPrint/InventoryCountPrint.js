export default {
  getInventoryCountId(row = null) {
    const selected = row || InventoryCountTable.triggeredRow || InventoryCountTable.selectedRow || {};

    return (
      selected.inventoryCountId ||
      selected.documentId ||
      selected.id ||
      selected.ID ||
      selected["Inventory Count ID"] ||
      selected["Document ID"] ||
      appsmith.store.currentInventoryCountId ||
      null
    );
  },

  async open(row = null, printType = "COUNT_SHEET") {
    const inventoryCountId = this.getInventoryCountId(row);

    if (!inventoryCountId) {
      showAlert("Select inventory count first.", "warning");
      return;
    }

    await storeValue("inventoryCountPrintType", printType);
    await storeValue("currentInventoryCountId", inventoryCountId);

    await GetInventoryCountPrintHeader.run({ inventoryCountId });

    if (printType === "VARIANCE_REPORT") {
      await GetInventoryCountVariancePrint.run({ inventoryCountId });
    } else {
      await GetInventoryCountPrintItems.run({ inventoryCountId });
    }

    showModal(InventoryCountPrintModal.name);
  }
};

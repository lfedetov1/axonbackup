export default {
  async searchReceipt() {
    const lookup = String(POSReturnReceiptLookupInput.text || "").trim();

    if (!lookup) {
      showAlert("Enter receipt number or scan receipt barcode.", "warning");
      return;
    }

    await storeValue("posReturnReceiptLookup", lookup);

    const result = await FindPOSReturnReceiptItems.run({
      lookup,
      productId: appsmith.store.posReturnProductId,
      barcode: appsmith.store.posReturnBarcode
    });

    const rows = result || FindPOSReturnReceiptItems.data || [];

    if (!rows.length) {
      await storeValue("posReturnReferenceItems", []);
      showAlert("No matching receipt item was found.", "warning");
      return;
    }

    await storeValue("posReturnReferenceItems", rows);
    showAlert("Receipt items loaded.", "success");
  },

  async searchDebounced(value) {
    const lookup = String(value || "").trim();

    if (!lookup || lookup.length < 3) return;

    await storeValue("posReturnSearchLastValue", lookup);

    setTimeout(() => {
      if (appsmith.store.posReturnSearchLastValue === lookup) {
        this.searchReceipt();
      }
    }, 450);
  },

  clear() {
    storeValue("posReturnReferenceItems", []);
    storeValue("posReturnReceiptLookup", "");

    if (typeof POSReturnReceiptLookupInput !== "undefined") {
      POSReturnReceiptLookupInput.setValue("");
    }
  }
};
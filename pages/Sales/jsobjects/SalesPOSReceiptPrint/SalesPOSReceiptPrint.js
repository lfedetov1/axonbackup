export default {
  async refresh() {
    await ListSalesPOSReceiptsForPrint.run();
  },

  async print(row = null) {
    const selected = row || POSReceiptsPrintTable.triggeredRow || POSReceiptsPrintTable.selectedRow || {};
    const documentId =
      selected.documentId ||
      selected.id ||
      selected.ID ||
      selected["Document ID"];

    if (!documentId) {
      showAlert("Select receipt first.", "warning");
      return;
    }

    await storeValue("selectedPOSReceiptPrintId", documentId);

    await GetSalesPOSReceiptPrintHeader.run({ documentId });
    await GetSalesPOSReceiptPrintItems.run({ documentId });
    await GetSalesPOSReceiptPrintTaxSumm.run({ documentId });

    if (typeof GetSalesPOSReceiptPrintPayments !== "undefined") {
      await GetSalesPOSReceiptPrintPayment.run({ documentId });
    }

    const header = GetSalesPOSReceiptPrintHeader.data?.[0];

    if (!header) {
      showAlert("Receipt print data was not found.", "error");
      return;
    }

    await storeValue("posReceiptPrintData", {
      header,
      items: GetSalesPOSReceiptPrintItems.data || [],
      taxes: GetSalesPOSReceiptPrintTaxSumm.data || [],
      payments: GetSalesPOSReceiptPrintPayment.data || [],
      username: appsmith.store.username || ""
    });

    showModal(POSReceiptPrintModal.name);
  }
};
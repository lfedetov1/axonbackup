export default {
  async open(row = null) {
    const selected = row || SalesOrderTable.triggeredRow || SalesOrderTable.selectedRow || {};
    const documentId =
      selected.documentId ||
      selected.id ||
      selected.ID ||
      appsmith.store.currentSalesOrderId;

    if (!documentId) {
      showAlert("Select sales order first.", "warning");
      return;
    }

    await storeValue("currentSalesOrderId", documentId);

    await GetSalesOrderPrintHeader.run({ documentId });
    await GetSalesOrderPrintItems.run({ documentId });
    await GetSalesOrderPrintTaxSummary.run({ documentId });

    const header = GetSalesOrderPrintHeader.data?.[0];

    if (!header) {
      showAlert("Sales order print data was not found.", "error");
      return;
    }

    await storeValue("salesOrderPrintModel", {
      header,
      items: GetSalesOrderPrintItems.data || [],
      taxes: GetSalesOrderPrintTaxSummary.data || [],
      printedAt: moment().format("DD.MM.YYYY HH:mm:ss"),
      printedBy: appsmith.store.username || ""
    });

    showModal(SalesOrderPrintModal.name);
  }
};
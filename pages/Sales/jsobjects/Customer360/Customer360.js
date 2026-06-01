export default {
  async refresh() {
    if (!Customer360CustomerSelect.selectedOptionValue) {
      await storeValue("customer360Data", {});
      return;
    }

    await GetCustomer360Overview.run();
    await GetCustomer360Documents.run();
    await GetCustomer360TopItems.run();
    await GetCustomer360MonthlyTrend.run();

    await storeValue("customer360Data", {
      overview: GetCustomer360Overview.data && GetCustomer360Overview.data.length
        ? GetCustomer360Overview.data[0]
        : {},
      documents: GetCustomer360Documents.data || [],
      topItems: GetCustomer360TopItems.data || [],
      monthlyTrend: GetCustomer360MonthlyTrend.data || [],
      dateFrom: moment(Customer360DateFrom.selectedDate || moment().startOf("year")).format("YYYY-MM-DD"),
      dateTo: moment(Customer360DateTo.selectedDate || moment()).format("YYYY-MM-DD"),
      printedAt: moment().format("DD.MM.YYYY HH:mm:ss"),
      printedBy: appsmith.store.username || ""
    });
  },

  async selectDocument(row = null) {
    const selected = row || Customer360DocumentsTable.selectedRow || {};

    if (typeof SalesDocumentPreview !== "undefined") {
      await SalesDocumentPreview.loadFromRow(selected);
    }
  }
};
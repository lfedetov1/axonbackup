export default {
  async preview() {
    try {
      await this.load();
      showAlert("POS report preview loaded.", "success");
    } catch (error) {
      showAlert("Error while loading POS report: " + error.message, "error");
      console.log(error);
    }
  },

  async open() {
    try {
      await this.load();
      showModal(PosReportCenterModal.name);
    } catch (error) {
      showAlert("Error while opening POS report: " + error.message, "error");
      console.log(error);
    }
  },

  async load() {
    await GetPosReportOverview.run();
    await GetPosReportPayments.run();
    await GetPosReportCashTransactions.run();
    await GetPosReportClosing.run();
    await GetPosReportTopItems.run();

    await storeValue("posReportPrintModel", {
      type: PosReportTypeSelect.selectedOptionValue || "POS_OVERVIEW",
      cashRegister:
        PosReportCashRegisterSelect.selectedOptionLabel ||
        PosReportCashRegisterSelect.selectedOptionValue ||
        "All Registers",
      dateFrom: moment(PosReportDateFrom.selectedDate || moment()).format("YYYY-MM-DD"),
      dateTo: moment(PosReportDateTo.selectedDate || moment()).format("YYYY-MM-DD"),
      overview: GetPosReportOverview.data?.[0] || {},
      payments: GetPosReportPayments.data || [],
      cashTransactions: GetPosReportCashTransactions.data || [],
      closings: GetPosReportClosing.data || [],
      topItems: GetPosReportTopItems.data || [],
      printedAt: moment().format("DD.MM.YYYY HH:mm:ss"),
      printedBy: appsmith.store.username || ""
    });
  }
};

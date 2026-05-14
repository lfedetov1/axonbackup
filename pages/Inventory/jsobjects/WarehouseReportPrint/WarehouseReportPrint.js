export default {
  async open() {
    try {
      await GetWarehouseReportHeader.run();
      await GetWarehouseReportSummary.run();
      await GetWarehouseReportLowStock.run();
      await GetWarehouseReportTopValue.run();
      await GetWarehouseReportExpiry.run();
      await GetWarehouseReportInTransit.run();
      await GetWarehouseReportTasks.run();
      await GetWarehouseReportSlowStock.run();

      showModal(WarehouseReportPrintModal.name);
    } catch (error) {
      showAlert("Error while opening warehouse report: " + error.message, "error");
      console.log(error);
    }
  }
};

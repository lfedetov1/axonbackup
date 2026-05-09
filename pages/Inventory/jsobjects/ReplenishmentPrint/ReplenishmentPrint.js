export default {
  async open() {
    await GetReplenishmentPrintHeader.run();

    if (typeof ListReplenishmentReport !== "undefined") {
      await ListReplenishmentReport.run();
    }

    showModal(ReplenishmentPrintModal.name);
  }
};

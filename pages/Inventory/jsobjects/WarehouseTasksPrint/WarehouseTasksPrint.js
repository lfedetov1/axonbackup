export default {
  async open() {
    await SyncWarehouseTasksFromDocument.run();
    await GetWarehouseTasksPrintHeader.run();
    await GetWarehouseTasksPrintItems.run();
    showModal(WarehouseTasksPrintModal.name);
  }
};

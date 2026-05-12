export default {
  async open() {
    await GetWarehouseTasksPrintHeader.run();
    await GetWarehouseTasksPrintItems.run();
    showModal(WarehouseTasksPrintModal.name);
  }
};

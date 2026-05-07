export default {
  async showList() {
    await storeValue("inventoryMode", "LIST");
  },

  async showNewStockMovement() {
    await storeValue("inventoryMode", "NEW_STOCK_MOVEMENT");
  },

  async showNewGoodsReceipt() {
    await storeValue("inventoryMode", "NEW_GOODS_RECEIPT");
  },

  async showNewStockIssue() {
    await storeValue("inventoryMode", "NEW_STOCK_ISSUE");
  },

  async showNewStockTransfer() {
    await storeValue("inventoryMode", "NEW_STOCK_TRANSFER");
  },

  async showNewStockAdjustment() {
    await storeValue("inventoryMode", "NEW_STOCK_ADJUSTMENT");
  },

  async showNewInventoryCount() {
    await storeValue("inventoryMode", "NEW_INVENTORY_COUNT");
  }
};

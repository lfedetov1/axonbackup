export default {
  async runSafe(queryName) {
    try {
      if (typeof globalThis[queryName] !== "undefined") {
        await globalThis[queryName].run();
      }
    } catch (error) {
      console.log(`Refresh skipped/failed: ${queryName}`, error);
    }
  },

  async runAll() {
    showAlert("Refreshing inventory data...", "info");

    const queries = [
      "InventorySummaryQuery",
      "InventoryBalanceQuery",
      "StockMovementsQuery",
      "RecentStockMovementsQuery",

      "ListWarehouses",
      "ListInventoryWarehouses",
      "ListWarehouseLocations",
      "ListWarehouseLocationProducts",

      "ListGoodsReceipts",
      "ListGoodsReceiptItems",

      "ListStockIssues",
      "ListStockIssueItems",

      "ListDeliveryNotes",
      "ListDeliveryNoteItems",

      "ListInboundDeliveries",
      "ListInboundDeliveryItems",

      "ListInventoryCounts",
      "ListInventoryCountDocuments",
      "ListInventoryCountVariance",

      "ListOpeningStock",
      "ListOpeningStockItems",

      "ListStockLedger",
      "ListReservedStock",
      "ListBatchExpiry",

      "ListReplenishmentReport",
      "ListPutawayDocuments",
      "ListPutawayItems"
    ];

    for (let i = 0; i < queries.length; i += 1) {
      await this.runSafe(queries[i]);
    }

    showAlert("Inventory data refreshed.", "success");
  }
};

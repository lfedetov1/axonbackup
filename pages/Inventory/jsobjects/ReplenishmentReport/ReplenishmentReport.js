export default {
  async refresh() {
    await ListReplenishmentReport.run();
  },

  async markDone(row) {
    if (!row?.productId) {
      showAlert("Select replenishment row first.", "warning");
      return;
    }

    await MarkReplenishmentDone.run({
      warehouseId: row.warehouseId,
      productId: row.productId,
      locationId: row.locationId,
      note: "Marked as found from replenishment report"
    });

    if (typeof AuditLog !== "undefined") {
      await AuditLog.insert({
        entityName: "warehouse_replenishment_done",
        entityId: row.productId,
        actionType: "REPLENISHMENT_DONE",
        newValues: {
          warehouse_id: row.warehouseId,
          product_id: row.productId,
          product_code: row["Product Code"],
          product_name: row["Product Name"],
          location_id: row.locationId,
          location_code: row["Location Code"],
          current_stock: row["Current Stock"],
          minimum_quantity: row["Minimum Quantity"],
          maximum_quantity: row["Maximum Quantity"],
          suggested_replenishment: row["Suggested Replenishment"],
          period: ReplenishmentPeriodSelect.selectedOptionValue || "TODAY"
        }
      });
    }

    await ListReplenishmentReport.run();
    showAlert("Item removed from replenishment report.", "success");
  }
};

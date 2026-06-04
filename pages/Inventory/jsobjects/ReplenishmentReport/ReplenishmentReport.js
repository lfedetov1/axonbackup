export default {
  rows() {
    return ListReplenishmentReport.data || [];
  },

  summary(rows = this.rows()) {
    return rows.reduce(
      (sum, row) => {
        const qty = Number(row["Suggested Replenishment"] || row.quantity || 0);

        return {
          lines: sum.lines + 1,
          totalQty: sum.totalQty + qty,
          urgent: sum.urgent + (String(row.Priority || "").toUpperCase() === "URGENT" ? 1 : 0),
          low: sum.low + (String(row.Priority || "").toUpperCase() === "LOW" ? 1 : 0),
          salesDemand: sum.salesDemand + (String(row.Priority || "").toUpperCase() === "SALES_DEMAND" ? 1 : 0)
        };
      },
      { lines: 0, totalQty: 0, urgent: 0, low: 0, salesDemand: 0 }
    );
  },

  async refresh() {
    await ListReplenishmentReport.run();

    const rows = this.rows();

    await storeValue("replenishmentReportData", {
      rows,
      summary: this.summary(rows),
      period: ReplenishmentPeriodSelect.selectedOptionValue || "TODAY",
      warehouse:
        InventoryWarehouseSelect.selectedOptionLabel ||
        InventoryWarehouseSelect.selectedOptionValue ||
        "All Warehouses",
      printedAt: moment().format("DD.MM.YYYY HH:mm:ss"),
      printedBy: appsmith.store.username || ""
    });
  },

  async markDone(row) {
    if (!row || !row.productId) {
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

    await this.refresh();
    showAlert("Item removed from replenishment report.", "success");
  },

  async handleAction() {
    const model = ReplenishmentReportCustom.model || {};
    const action = model.action || "";

    if (action === "refresh") {
      return this.refresh();
    }

    if (action === "markPicked" || action === "markDone") {
      return this.markDone(model.row || {});
    }

    if (action === "print") {
      return;
    }
  }
};
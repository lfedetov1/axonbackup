export default {
  async refresh() {
    await GetSalesDeliveryControlOvervie.run();
    await GetSalesDeliveryControlAlerts.run();

    if (typeof SalesDeliveryShipment !== "undefined") {
      await SalesDeliveryShipment.refresh();
    }
  },

  async refreshOnlyPanel() {
    await GetSalesDeliveryControlOvervie.run();
    await GetSalesDeliveryControlAlerts.run();
  },

  async handleAction() {
    const action = SalesDeliveryControlCustom.model?.action || "";

    if (action === "refresh") {
      return this.refresh();
    }

    if (action === "printDelivery") {
      return SalesDeliveryShipment.printDeliveryNote(SalesDeliveryNotesTable.selectedRow);
    }

    if (action === "printLabels") {
      return SalesDeliveryShipment.printLabels(SalesDeliveryNotesTable.selectedRow);
    }

    if (action === "addToManifest") {
      return SalesDeliveryShipment.addToManifest(SalesDeliveryNotesTable.selectedRow);
    }
  }
};
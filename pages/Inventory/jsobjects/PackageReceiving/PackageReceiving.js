export default {
  async scan(value) {
    const lookup = String(value || PackageReceiveBarcodeInput.text || "").trim();

    if (!lookup) return;

    const rows = await FindPackageForReceiving.run({ lookup });
    const header = rows?.[0] || FindPackageForReceiving.data?.[0];

    if (!header) {
      showAlert("Package was not found.", "warning");
      return;
    }

    await storeValue("packageReceivingHeader", header);
    await storeValue("packageReceivingPackageId", header.packageId);

    const itemRows = await GetPackageReceivingItems.run({ packageId: header.packageId });
    await storeValue("packageReceivingItems", itemRows || GetPackageReceivingItems.data || []);

    PackageReceiveBarcodeInput.setValue("");
    showAlert(`Package ${header.packageNumber} loaded.`, "success");
  },

  async receive() {
    const header = appsmith.store.packageReceivingHeader || {};
    const packageId = header.packageId;

    if (!packageId) {
      showAlert("Scan package first.", "warning");
      return;
    }

    if (header.packageStatus === "RECEIVED") {
      showAlert("Package is already received.", "warning");
      return;
    }

    const receivingWarehouseId = Number(
  header.destinationWarehouseId ||
  InventoryWarehouseSelect.selectedOptionValue ||
  appsmith.store.warehouseId ||
  0
);

    if (Number(header.destinationWarehouseId || 0) > 0) {
      await InsertPackageReceiveStockMovem.run({
        packageId,
        receivingWarehouseId
      });
    }

    await ReceivePackage.run({ packageId });

    if (typeof AuditLog !== "undefined" && AuditLog.insert) {
      await AuditLog.insert({
        entityName: "document_packages",
        entityId: packageId,
        actionType: "RECEIVE",
        newValues: {
          source: "Inventory Package Receiving",
          package_number: header.packageNumber,
          package_barcode: header.packageBarcode,
          destination_warehouse_id: receivingWarehouseId,
          status: "RECEIVED"
        }
      });
    }

    await storeValue("packageReceivingHeader", {
      ...header,
      packageStatus: "RECEIVED"
    });

    showAlert(`Package ${header.packageNumber} received.`, "success");
  },

  async clear() {
    await storeValue("packageReceivingHeader", {});
    await storeValue("packageReceivingPackageId", null);
    await storeValue("packageReceivingItems", []);
    PackageReceiveBarcodeInput.setValue("");
  }
};
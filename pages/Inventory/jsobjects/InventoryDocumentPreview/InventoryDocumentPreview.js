export default {
  row(row = null) {
    return row || {};
  },

  documentId(row = null) {
    const r = this.row(row);

    return (
      r.documentId ||
      r.inventoryDocumentId ||
      r.transferRequestId ||
      r.countDocumentId ||
      r.supplierReturnId ||
      r.manifestId ||
      r.id ||
      r.ID ||
      r["Document ID"] ||
      r["ID"] ||
      null
    );
  },

  documentNumber(row = null) {
    const r = this.row(row);

    return (
      r.documentNumber ||
      r["Document Number"] ||
      r["Count Number"] ||
      r["Transfer Number"] ||
      r["Return Number"] ||
      r["Manifest Number"] ||
      r.number ||
      r.Number ||
      ""
    );
  },

  documentType(row = null) {
    const r = this.row(row);

    return (
      r.documentType ||
      r["Document Type"] ||
      r.Type ||
      r.type ||
      ""
    );
  },

  async clear() {
    await storeValue("inventorySelectedDocumentId", null);
    await storeValue("inventorySelectedDocumentNumber", "");
    await storeValue("inventorySelectedDocumentType", "");
    await storeValue("inventoryDocumentPreviewData", null);
  },

  async loadFromRow(row = null) {
    const documentId = this.documentId(row);
    const documentNumber = this.documentNumber(row);
    const documentType = this.documentType(row);

    if (!documentId) {
      await this.clear();
      return;
    }

    await storeValue("inventorySelectedDocumentId", documentId);
    await storeValue("inventorySelectedDocumentNumber", documentNumber);
    await storeValue("inventorySelectedDocumentType", documentType);

    const headerRows = await GetInventoryDocumentPreviewHea.run({ documentId });
    const itemRows = await GetInventoryDocumentPreviewIte.run({ documentId });

    let movementRows = [];
    let packageRows = [];

    if (typeof GetInventoryDocumentPreviewMovements !== "undefined") {
      const result = await GetInventoryDocumentPreviewMov.run({ documentId });
      movementRows = result || GetInventoryDocumentPreviewMov.data || [];
    }

    if (typeof GetInventoryDocumentPreviewPackages !== "undefined") {
      const result = await GetInventoryDocumentPreviewPac.run({ documentId });
      packageRows = result || GetInventoryDocumentPreviewPac.data || [];
    }

    const header = headerRows?.[0] || GetInventoryDocumentPreviewHea.data?.[0];
    const items = itemRows || GetInventoryDocumentPreviewIte.data || [];

    if (!header) {
      await storeValue("inventoryDocumentPreviewData", null);
      showAlert("Inventory document preview data was not found.", "warning");
      return;
    }

    await storeValue("inventoryDocumentPreviewData", {
      header,
      items,
      movements: movementRows,
      packages: packageRows,
      username: appsmith.store.username || ""
    });
  },

  hasPreview() {
    return !!appsmith.store.inventoryDocumentPreviewData?.header;
  },
	
	async loadDeliveryManifestFromRow(row = null) {
  const selected = row || DeliveryManifestsTable.selectedRow || {};

  const manifestId =
    selected.manifestId ||
    selected.documentId ||
    selected.id ||
    selected.ID ||
    0;

  const manifestNumber =
    selected.manifestNumber ||
    selected.documentNumber ||
    selected["Manifest Number"] ||
    selected["Document Number"] ||
    "";

  if (!manifestId) {
    await this.clear();
    return;
  }

  await storeValue("inventorySelectedDocumentId", manifestId);
  await storeValue("inventorySelectedDocumentNumber", manifestNumber);
  await storeValue("inventorySelectedDocumentType", "DELIVERY_MANIFEST");

  const packages = ListDeliveryManifestPackagesOv.data || [];

  await storeValue("inventoryDocumentPreviewData", {
    header: {
      documentId: manifestId,
      documentNumber: manifestNumber,
      documentType: "DELIVERY_MANIFEST",
      documentTitle: "Delivery Manifest",

      documentDate:
        selected.documentDate ||
        selected["Manifest Date"] ||
        selected.manifestDate ||
        selected.date ||
        "",

      issueTime:
        selected.issueTime ||
        selected["Issue Time"] ||
        selected.createdAt ||
        selected.created_at ||
        "",

      status:
        selected.status ||
        selected.Status ||
        "",

      postingStatus:
        selected.postingStatus ||
        selected["Posting Status"] ||
        "",

      warehouseCode:
        selected.warehouseCode ||
        selected["Warehouse Code"] ||
        "",

      warehouseName:
        selected.warehouseName ||
        selected.Warehouse ||
        selected["Warehouse"] ||
        "",

      carrierName:
        selected.carrierName ||
        selected.Carrier ||
        selected["Carrier"] ||
        "",

      driverName:
        selected.driverName ||
        selected.Driver ||
        selected["Driver"] ||
        "",

      vehiclePlate:
        selected.vehiclePlate ||
        selected["Vehicle Plate"] ||
        "",

      totalQuantity:
        selected.totalQuantity ||
        selected["Total Quantity"] ||
        0,

      itemCount:
        selected.itemCount ||
        selected["Package Count"] ||
        packages.length,

      note:
        selected.note ||
        selected.Note ||
        "",

      companyName: appsmith.store.companyName || "Axon",
      createdBy:
        selected.createdBy ||
        selected["Created By"] ||
        appsmith.store.username ||
        ""
    },

    items: [],
    movements: [],
    packages,
    username: appsmith.store.username || ""
  });
}
};
export default {
  selectedDocument() {
    return PickingPackingTable.selectedRow || {};
  },

  selectedDocumentId() {
    const row = this.selectedDocument();

    return (
      row.documentId ||
      row.id ||
      row.ID ||
      row["Document ID"] ||
      null
    );
  },

  items() {
    return ListPickingItems.data || [];
  },

  async refresh() {
    if (typeof ListPickingDocuments !== "undefined") {
      await ListPickingDocuments.run();
    }

    const documentId = this.selectedDocumentId();

    if (documentId && typeof ListPickingItems !== "undefined") {
      await ListPickingItems.run({ documentId });
    }
  },

  async startPicking(row = null) {
    const selected = row || this.selectedDocument();
    const documentId =
      selected.documentId ||
      selected.id ||
      selected.ID ||
      selected["Document ID"];

    if (!documentId) {
      showAlert("Select document first.", "warning");
      return;
    }

    await StartPickingDocument.run({ documentId });

    if (typeof AuditLog !== "undefined") {
      await AuditLog.insert({
        entityName: "documents",
        entityId: documentId,
        actionType: "PICKING_START",
        newValues: {
          source: "Picking / Packing",
          status: "PICKING"
        }
      });
    }

    await this.refresh();
    showAlert("Picking started.", "success");
  },

  findItemByLookup(lookup) {
    const normalized = String(lookup || "").trim().toLowerCase();

    return this.items().find(row =>
      String(row["Barcode"] || "").trim().toLowerCase() === normalized ||
      String(row["Product Code"] || "").trim().toLowerCase() === normalized ||
      String(row["SKU"] || "").trim().toLowerCase() === normalized
    );
  },

  async scanBarcode(value) {
    const lookup = String(value || "").trim();

    if (!lookup) return;

    const documentId = this.selectedDocumentId();

    if (!documentId) {
      showAlert("Select picking document first.", "warning");
      PickingPackingBarcodeInput.setValue("");
      return;
    }

    const document = this.selectedDocument();
    const status = document.Status || document.status || "";

    if (!["PICKING", "DRAFT", "APPROVED", "READY"].includes(status)) {
      showAlert("Document is not open for picking.", "warning");
      PickingPackingBarcodeInput.setValue("");
      return;
    }

    if (status !== "PICKING") {
      await StartPickingDocument.run({ documentId });
    }

    await ListPickingItems.run({ documentId });

    const item = this.findItemByLookup(lookup);

    if (!item) {
      showAlert("Scanned product is not on this picking document.", "warning");
      PickingPackingBarcodeInput.setValue("");
      return;
    }

    const remaining = Number(item["Remaining Quantity"] || 0);

    if (remaining <= 0) {
      showAlert("This item is already fully picked.", "warning");
      PickingPackingBarcodeInput.setValue("");
      return;
    }

    await UpdatePickingItemQuantity.run({
      documentItemId: item.documentItemId,
      quantity: 1
    });

    await ListPickingItems.run({ documentId });

    if (typeof AuditLog !== "undefined") {
      await AuditLog.insert({
        entityName: "document_items",
        entityId: item.documentItemId,
        actionType: "PICK_SCAN",
        newValues: {
          source: "Picking / Packing",
          document_id: documentId,
          lookup,
          product_code: item["Product Code"],
          quantity: 1
        }
      });
    }

    PickingPackingBarcodeInput.setValue("");
  },

  async scanBarcodeDebounced(value) {
    const lookup = String(value || "").trim();

    if (!lookup || lookup.length < 3) return;

    await storeValue("pickingScanLastValue", lookup);

    setTimeout(() => {
      if (appsmith.store.pickingScanLastValue === lookup) {
        this.scanBarcode(lookup);
      }
    }, 300);
  },

  async resetSelectedItem() {
    const row = PickingPackingItemsTable.selectedRow || {};

    const documentItemId =
      row.documentItemId ||
      row.id ||
      row.ID;

    if (!documentItemId) {
      showAlert("Select item first.", "warning");
      return;
    }

    await ResetPickingItemQuantity.run({ documentItemId });

    const documentId = this.selectedDocumentId();
    if (documentId) {
      await ListPickingItems.run({ documentId });
    }

    showAlert("Picked quantity was reset.", "success");
  },

  async markPicked(row = null) {
    const selected = row || this.selectedDocument();
    const documentId =
      selected.documentId ||
      selected.id ||
      selected.ID ||
      selected["Document ID"];

    if (!documentId) {
      showAlert("Select document first.", "warning");
      return;
    }

    await ListPickingItems.run({ documentId });

    const openItem = (ListPickingItems.data || []).find(item =>
      Number(item["Remaining Quantity"] || 0) > 0
    );

    if (openItem) {
      showAlert("Document is not fully picked yet.", "warning");
      return;
    }

    await MarkDocumentPicked.run({ documentId });

    if (typeof AuditLog !== "undefined") {
      await AuditLog.insert({
        entityName: "documents",
        entityId: documentId,
        actionType: "PICKED",
        newValues: {
          source: "Picking / Packing",
          status: "PICKED"
        }
      });
    }

    await this.refresh();
    showAlert("Document was marked as picked.", "success");
  },

  async markPacked(row = null) {
    const selected = row || this.selectedDocument();
    const documentId =
      selected.documentId ||
      selected.id ||
      selected.ID ||
      selected["Document ID"];

    if (!documentId) {
      showAlert("Select document first.", "warning");
      return;
    }

    const status = selected.Status || selected.status || "";

    if (status !== "PICKED") {
      showAlert("Only picked documents can be packed.", "warning");
      return;
    }

    await MarkDocumentPacked.run({ documentId });

    if (typeof AuditLog !== "undefined") {
      await AuditLog.insert({
        entityName: "documents",
        entityId: documentId,
        actionType: "PACKED",
        newValues: {
          source: "Picking / Packing",
          status: "PACKED"
        }
      });
    }

    await this.refresh();
    showAlert("Document was packed.", "success");
  }
};

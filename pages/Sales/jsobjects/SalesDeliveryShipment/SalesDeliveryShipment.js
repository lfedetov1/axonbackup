export default {
  row(row = null) {
    return row || SalesDeliveryNotesTable.selectedRow || {};
  },

  documentId(row = null) {
    const r = this.row(row);

    return (
      r.documentId ||
      r.id ||
      r.ID ||
      r["Delivery Note ID"] ||
      r["Document ID"] ||
      0
    );
  },

  documentNumber(row = null) {
    const r = this.row(row);

    return (
      r.documentNumber ||
      r["Delivery Note Number"] ||
      r["Document Number"] ||
      ""
    );
  },

  status(row = null) {
    const r = this.row(row);
    return String(r.Status || r.status || "").toUpperCase();
  },

  async refresh() {
    await storeValue("selectedSalesDeliveryNoteId", null);
    await storeValue("selectedSalesDeliveryNoteNumber", "");

    await ListSalesDeliveryNotes.run();

    if (typeof ListSalesDeliveryNoteItems !== "undefined") {
      await ListSalesDeliveryNoteItems.run({ documentId: 0 });
    }

    if (typeof ListSalesDeliveryPackages !== "undefined") {
      await ListSalesDeliveryPackages.run({ documentId: 0 });
    }
  },

  async select(row = null) {
    const selected = this.row(row);
    const documentId = this.documentId(selected);
    const documentNumber = this.documentNumber(selected);

    if (!documentId) {
      await storeValue("selectedSalesDeliveryNoteId", null);
      await storeValue("selectedSalesDeliveryNoteNumber", "");
      return;
    }

    await storeValue("selectedSalesDeliveryNoteId", documentId);
    await storeValue("selectedSalesDeliveryNoteNumber", documentNumber);

    await ListSalesDeliveryNoteItems.run({ documentId });
    await ListSalesDeliveryPackages.run({ documentId });

    if (typeof SalesDocumentPreview !== "undefined") {
      await SalesDocumentPreview.loadFromRow({
        ...selected,
        documentId,
        documentNumber,
        documentType: "DELIVERY_NOTE"
      });
    }
  },

  async printDeliveryNote(row = null) {
  const selected = this.row(row);
  await this.select(selected);

  if (!appsmith.store.salesDocumentPreviewData || !appsmith.store.salesDocumentPreviewData.header) {
    showAlert("Select delivery note first.", "warning");
    return;
  }

  showModal(SalesDocumentPreviewModal.name);
},

  async printLabels(row = null) {
    const selected = this.row(row);
    const documentId = this.documentId(selected);

    if (!documentId) {
      showAlert("Select delivery note first.", "warning");
      return;
    }

    await storeValue("selectedSalesDeliveryNoteId", documentId);

    const headerRows = await GetSalesDeliveryLabelHeader.run({ documentId });
    const packageRows = await GetSalesDeliveryLabelPackages.run({ documentId });

    const header = headerRows && headerRows.length ? headerRows[0] : GetSalesDeliveryLabelHeader.data[0];
    const packages = packageRows || GetSalesDeliveryLabelPackages.data || [];

    if (!header) {
      showAlert("Delivery note label header was not found.", "error");
      return;
    }

    if (!packages.length) {
      showAlert("No packages found for this delivery note.", "warning");
      return;
    }

    await storeValue("salesDeliveryLabelPrintData", {
      header,
      packages,
      printedAt: moment().format("DD.MM.YYYY HH:mm:ss"),
      printedBy: appsmith.store.username || ""
    });

    showModal(SalesDeliveryLabelPrintModal.name);
  },


  async markPacked(row = null) {
    const selected = this.row(row);
    const documentId = this.documentId(selected);

    if (!documentId) {
      showAlert("Select delivery note first.", "warning");
      return;
    }

    await MarkSalesDeliveryPacked.run({ documentId });

    if (typeof AuditLog !== "undefined" && AuditLog.insert) {
      await AuditLog.insert({
        entityName: "documents",
        entityId: documentId,
        actionType: "PACKED",
        newValues: {
          source: "Sales Delivery",
          status: "PACKED"
        }
      });
    }

    await this.refresh();
    showAlert("Delivery note marked as packed.", "success");
  },

  async markShipped(row = null) {
    const selected = this.row(row);
    const documentId = this.documentId(selected);

    if (!documentId) {
      showAlert("Select delivery note first.", "warning");
      return;
    }

    await MarkSalesDeliveryShipped.run({ documentId });

    if (typeof AuditLog !== "undefined" && AuditLog.insert) {
      await AuditLog.insert({
        entityName: "documents",
        entityId: documentId,
        actionType: "SHIP",
        newValues: {
          source: "Sales Delivery",
          status: "SHIPPED"
        }
      });
    }

    await this.refresh();
    showAlert("Delivery note marked as shipped.", "success");
  },

  async cancel(row = null) {
    const selected = this.row(row);
    const documentId = this.documentId(selected);
    const status = this.status(selected);

    if (!documentId) {
      showAlert("Select delivery note first.", "warning");
      return;
    }

    if (["SHIPPED", "RECEIVED", "POSTED", "CANCELLED"].includes(status)) {
      showAlert("This delivery note cannot be cancelled.", "warning");
      return;
    }

    await CancelSalesDeliveryNote.run({ documentId });

    if (typeof AuditLog !== "undefined" && AuditLog.insert) {
      await AuditLog.insert({
        entityName: "documents",
        entityId: documentId,
        actionType: "CANCEL",
        newValues: {
          source: "Sales Delivery",
          status: "CANCELLED"
        }
      });
    }

    await this.refresh();
    showAlert("Delivery note was cancelled.", "success");
  },
	
	

  async addToManifest(row = null) {
    const selected = this.row(row);
    const documentId = this.documentId(selected);

    if (!documentId) {
      showAlert("Select delivery note first.", "warning");
      return;
    }

    const manifestId =
      appsmith.store.selectedDeliveryManifestId ||
      appsmith.store.currentDeliveryManifestId ||
      0;

    if (!manifestId) {
      showAlert("Select or create delivery manifest first.", "warning");
      return;
    }

    await AddSalesDeliveryPackagesToMani.run({
      documentId,
      manifestId
    });

    if (typeof AuditLog !== "undefined" && AuditLog.insert) {
      await AuditLog.insert({
        entityName: "documents",
        entityId: documentId,
        actionType: "ADD_TO_MANIFEST",
        newValues: {
          source: "Sales Delivery",
          manifest_id: manifestId
        }
      });
    }

    if (typeof ListSalesDeliveryPackages !== "undefined") {
      await ListSalesDeliveryPackages.run({ documentId });
    }

    await this.select(selected);

    showAlert("Delivery packages were added to manifest.", "success");
  }
};
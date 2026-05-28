export default {
  async audit(actionType, entityId, newValues = {}, oldValues = null) {
    try {
      if (typeof AuditLog !== "undefined" && AuditLog.insert) {
        await AuditLog.insert({
          entityName: "documents",
          entityId,
          actionType,
          oldValues,
          newValues: {
            source: "Delivery Note",
            ...newValues
          }
        });
      }
    } catch (error) {
      console.log("Audit log skipped:", error);
    }
  },

  getSelectedDeliveryNote() {
    return DeliveryNotesTable.selectedRow || {};
  },

  getDocumentId(row = {}) {
    return row.documentId || row.id || row.ID || row["Document ID"] || null;
  },

  async postSelected() {
    return this.post(this.getSelectedDeliveryNote());
  },

  async post(row = null) {
    const selected = row || {};
    const documentId = this.getDocumentId(selected);

    if (!documentId) {
      showAlert("Select delivery note first.", "warning");
      return;
    }

    try {
      const headerRows = await GetDeliveryNoteForPost.run({ documentId });
      const header = headerRows?.[0] || GetDeliveryNoteForPost.data?.[0];

      if (!header) {
        showAlert("Delivery note was not found.", "error");
        return;
      }

      if (header.postingStatus === "POSTED") {
        showAlert("Delivery note is already posted.", "warning");
        return;
      }

      if (!header.warehouseId) {
        showAlert("Warehouse is missing on delivery note.", "error");
        return;
      }

      const itemRows = await GetDeliveryNoteItemsForPost.run({ documentId });
      const items = itemRows || GetDeliveryNoteItemsForPost.data || [];

      if (!items.length) {
        showAlert("Delivery note has no items.", "warning");
        return;
      }

      for (const item of items) {
        if (Number(item.trackStock || 0) === 1) {
          await InsertDeliveryNoteStockMovemen.run({
            documentId,
            documentItemId: item.documentItemId,
            warehouseId: header.warehouseId,
            productId: item.productId,
            movementDate: header.documentDate,
            quantity: item.quantity,
            unitCost: item.unitCost || 0,
            totalCost: item.totalCost || 0,
            note: `Delivery note ${header.documentNumber}`
          });
        }
      }

      await PostDeliveryNote.run({ documentId });
      await MarkSourceSalesOrderShipped.run({ deliveryNoteId: documentId });

      await this.audit("POST", documentId, {
        document_type: "DELIVERY_NOTE",
        document_number: header.documentNumber,
        status: "SHIPPED",
        posting_status: "POSTED",
        item_count: items.length,
        source_document_id: header.sourceDocumentId
      });

      if (typeof ListDeliveryNotes !== "undefined") await ListDeliveryNotes.run();
      if (typeof ListDeliveryNoteItems !== "undefined") await ListDeliveryNoteItems.run();
      if (typeof ListSalesOrders !== "undefined") await ListSalesOrders.run();
      if (typeof InventoryBalanceQuery !== "undefined") await InventoryBalanceQuery.run();
      if (typeof StockMovementsQuery !== "undefined") await StockMovementsQuery.run();

      showAlert("Delivery note was posted and stock was updated.", "success");
    } catch (error) {
      showAlert("Error while posting delivery note: " + error.message, "error");
      console.log(error);
    }
  }
};
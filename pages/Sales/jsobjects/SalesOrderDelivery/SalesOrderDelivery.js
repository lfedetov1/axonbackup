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
            source: "Sales Order Delivery",
            ...newValues
          }
        });
      }
    } catch (error) {
      console.log("Audit log skipped:", error);
    }
  },

  getSelectedSalesOrder() {
    return SalesOrdersTable.selectedRow || {};
  },

  getSalesOrderId(row = {}) {
    return row.documentId || row.id || row.ID || row["Document ID"] || null;
  },

  async createFromSelectedSalesOrder() {
    const selected = this.getSelectedSalesOrder();
    return this.createFromSalesOrder(selected);
  },

  async createFromSalesOrder(row = {}) {
    const salesOrderId = this.getSalesOrderId(row);
    const status = row.Status || row.status || "";

    if (!salesOrderId) {
      showAlert("Select sales order first.", "warning");
      return;
    }

    if (!["CONFIRMED", "PACKED"].includes(status)) {
      showAlert("Delivery note can be created only from confirmed or packed sales order.", "warning");
      return;
    }

    try {
      const numberRows = await GetNextDeliveryNoteNumber.run();
      const nextNumber =
        numberRows?.[0]?.nextDeliveryNoteNumber ||
        GetNextDeliveryNoteNumber.data?.[0]?.nextDeliveryNoteNumber;

      if (!nextNumber) {
        showAlert("Delivery note number could not be generated.", "error");
        return;
      }

      await InsertDeliveryNoteFromSalesOrd.run({
        salesOrderId,
        deliveryNoteNumber: nextNumber
      });

      const deliveryRows = await GetDeliveryNoteIdByNumber.run({
        deliveryNoteNumber: nextNumber
      });

      const delivery =
        deliveryRows?.[0] ||
        GetDeliveryNoteIdByNumber.data?.[0];

      if (!delivery?.deliveryNoteId) {
        showAlert("Delivery note was created, but ID was not found.", "error");
        return;
      }

      await InsertDeliveryNoteItemsFromSal.run({
        salesOrderId,
        deliveryNoteId: delivery.deliveryNoteId
      });

      await MarkSalesOrderDeliveryCreated.run({ salesOrderId });

      await this.audit("CREATE_DELIVERY_NOTE", salesOrderId, {
        document_type: "SALES_ORDER",
        status: "DELIVERY_CREATED",
        delivery_note_id: delivery.deliveryNoteId,
        delivery_note_number: delivery.deliveryNoteNumber || nextNumber
      });

      await this.audit("INSERT", delivery.deliveryNoteId, {
        document_type: "DELIVERY_NOTE",
        document_number: delivery.deliveryNoteNumber || nextNumber,
        source_document_id: salesOrderId,
        status: "DRAFT"
      });

      await storeValue("selectedDeliveryNoteId", delivery.deliveryNoteId);
      await storeValue("selectedDeliveryNoteNumber", delivery.deliveryNoteNumber || nextNumber);

      if (typeof ListSalesOrders !== "undefined") await ListSalesOrders.run();
      if (typeof ListSalesOrderItems !== "undefined") await ListSalesOrderItems.run();

      showAlert(`Delivery note ${nextNumber} was created.`, "success");
    } catch (error) {
      showAlert("Error while creating delivery note: " + error.message, "error");
      console.log(error);
    }
  }
};
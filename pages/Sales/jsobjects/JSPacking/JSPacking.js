export default {
  getOrderedItems() {
    return GetPackingOrderItems.data || [];
  },

  getPackedItems() {
    return appsmith.store.packedItems || [];
  },

  normalizeLookup(value) {
    return String(value || "").trim().toUpperCase();
  },

  async resetPacking() {
    await storeValue("packedItems", []);
    if (typeof PackingScanInput !== "undefined") {
      PackingScanInput.setValue("");
    }
  },

  async openPackingModal(orderId, orderNumber) {
    if (!orderId) {
      showAlert("Order ID is missing.", "warning");
      return;
    }

    await storeValue("packingOrderId", orderId);
    await storeValue("packingOrderNumber", orderNumber || "");
    await storeValue("packedItems", []);

    await GetPackingOrderItems.run({ orderId });

    showModal("packingmodal");
  },

  async scanProduct() {
    const lookup = this.normalizeLookup(PackingScanInput.text);

    if (!lookup) {
      return;
    }

    const orderedItems = this.getOrderedItems();
    const packedItems = [...this.getPackedItems()];

    const orderedRow = orderedItems.find(row =>
      this.normalizeLookup(row.productCode) === lookup ||
      this.normalizeLookup(row.barcode) === lookup
    );

    if (!orderedRow) {
      showAlert("This product is not in the order.", "warning");
      PackingScanInput.setValue("");
      return;
    }

    const packedIndex = packedItems.findIndex(
      row => String(row.productId || "") === String(orderedRow.productId || "")
    );

    if (packedIndex >= 0) {
      const nextQty = Number(packedItems[packedIndex].packedQty || 0) + 1;
      const orderedQty = Number(orderedRow.orderedQty || 0);

      if (nextQty > orderedQty) {
        showAlert("Packed quantity cannot exceed ordered quantity.", "warning");
        PackingScanInput.setValue("");
        return;
      }

      packedItems[packedIndex] = {
        ...packedItems[packedIndex],
        packedQty: String(nextQty)
      };
    } else {
      packedItems.push({
        productId: String(orderedRow.productId || ""),
        productCode: String(orderedRow.productCode || ""),
        barcode: String(orderedRow.barcode || ""),
        description: String(orderedRow.description || ""),
        orderedQty: String(orderedRow.orderedQty || 0),
        packedQty: "1",
        unitId: String(orderedRow.unitId || ""),
        taxRateId: String(orderedRow.taxRateId || ""),
        unitPrice: String(orderedRow.unitPrice || 0),
        discountPercent: String(orderedRow.discountPercent || 0),
        discountAmount: String(orderedRow.discountAmount || 0),
        lineSubtotal: String(orderedRow.lineSubtotal || 0),
        taxAmount: String(orderedRow.taxAmount || 0),
        lineTotal: String(orderedRow.lineTotal || 0)
      });
    }

    await storeValue("packedItems", packedItems);
    PackingScanInput.setValue("");
  },

  tableData() {
    const orderedItems = this.getOrderedItems();
    const packedItems = this.getPackedItems();

    return orderedItems.map(orderRow => {
      const packedRow = packedItems.find(
        p => String(p.productId || "") === String(orderRow.productId || "")
      );

      const orderedQty = Number(orderRow.orderedQty || 0);
      const packedQty = Number(packedRow?.packedQty || 0);

      return {
        productId: orderRow.productId,
        productCode: orderRow.productCode,
        barcode: orderRow.barcode,
        description: orderRow.description,
        orderedQty,
        packedQty,
        remainingQty: orderedQty - packedQty,
        status:
          packedQty === orderedQty
            ? "OK"
            : packedQty > 0
            ? "PARTIAL"
            : "PENDING",
        unitId: orderRow.unitId,
        taxRateId: orderRow.taxRateId,
        unitPrice: orderRow.unitPrice,
        discountPercent: orderRow.discountPercent,
        discountAmount: orderRow.discountAmount,
        lineSubtotal: orderRow.lineSubtotal,
        taxAmount: orderRow.taxAmount,
        lineTotal: orderRow.lineTotal
      };
    });
  },

  canFinish() {
    const rows = this.tableData();
    if (!rows.length) return false;

    return rows.every(
      row => Number(row.packedQty || 0) === Number(row.orderedQty || 0)
    );
  },

  async finishPacking() {
    const deliveryNoteId = appsmith.store.packingOrderId;

    if (!deliveryNoteId) {
      showAlert("Order is missing.", "warning");
      return;
    }

    if (!this.canFinish()) {
      showAlert("All ordered products must be scanned correctly.", "warning");
      return;
    }

    const packedRows = this.tableData();

    try {
      const invoiceResponse = await InsertInvoiceFromPackedOrder.run({
        orderId: deliveryNoteId
      });

      const invoiceId =
        invoiceResponse?.insertId ||
        invoiceResponse?.[0]?.insertId ||
        invoiceResponse?.[1]?.[0]?.invoiceId ||
        InsertInvoiceFromPackedOrder.data?.insertId ||
        InsertInvoiceFromPackedOrder.data?.[0]?.insertId ||
        InsertInvoiceFromPackedOrder.data?.[1]?.[0]?.invoiceId;

      if (!invoiceId) {
        showAlert("Invoice was not created.", "error");
        return;
      }

      for (let i = 0; i < packedRows.length; i += 1) {
        await InsertPackedOrderInvoiceItem.run({
          invoiceId,
          lineNo: i + 1,
          row: packedRows[i]
        });
      }

      await UpdatePackedOrderStatus.run({
        orderId: deliveryNoteId
      });

      await InsertDocumentChangeLog.run({
        documentId: deliveryNoteId,
        documentType: "DELIVERY_NOTE",
        changeType: "STATUS_CHANGE",
        fieldName: "status",
        oldValue: "CONFIRMED",
        newValue: "PACKED",
        note: "Delivery note packed"
      });

      await storeValue("currentInvoiceId", invoiceId);

      closeModal("packingmodal");
      showAlert("Order packed and invoice created successfully.", "success");
    } catch (error) {
      showAlert("Packing failed: " + error.message, "error");
      console.log(error);
    }
  },

  async markDelivered() {
    const deliveryNoteId = appsmith.store.packingOrderId;

    if (!deliveryNoteId) {
      showAlert("Delivery note is missing.", "warning");
      return;
    }

    try {
      await UpdatePackedOrderStatus.run({
        deliveryNoteId
      });

      await InsertDocumentChangeLog.run({
        documentId: deliveryNoteId,
        documentType: "DELIVERY_NOTE",
        changeType: "STATUS_CHANGE",
        fieldName: "status",
        oldValue: "PACKED",
        newValue: "DELIVERED",
        note: "Delivery note delivered"
      });

      showAlert("Delivery note marked as delivered.", "success");
    } catch (error) {
      showAlert("Delivery update failed: " + error.message, "error");
      console.log(error);
    }
  }
};

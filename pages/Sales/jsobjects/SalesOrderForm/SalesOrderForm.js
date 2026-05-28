export default {
  rows() {
    return appsmith.store.salesOrderItems || [];
  },

  documentId() {
    return appsmith.store.currentSalesOrderId || null;
  },
	warehouseId() {
  return Number(
    SalesOrderWarehouseSelect.selectedOptionValue ||
    appsmith.store.warehouseId ||
    appsmith.store.warehouseId1 ||
    0
  );
},

normalizeProduct(product = {}, lookup = "") {
  return {
    productId: product.productId || product.id || product.ID,
    productCode: product.productCode || product.code || product.ProductCode || "",
    productName: product.productName || product.name || product.ProductName || "",
    barcode: product.barcode || product.Barcode || lookup,
    sku: product.sku || product.SKU || "",
    unitId: product.unitId || product.unit_id || product.UnitID || null,
    unitCode: product.unitCode || product.unit || product.Unit || "",
    taxRateId: product.taxRateId || product.tax_rate_id || product.TaxRateID || null,
    taxRate: Number(product.taxRate || product.tax_rate || product.TaxRate || product.rate || 0),
    unitPrice: Number(product.unitPrice || product.price || product.salesPrice || 0),
    availableStock: Number(product.availableStock || product.stockQuantity || 0),
    trackStock: String(product.trackStock || product.track_stock || "0")
  };
},

  isEditMode() {
    return !!this.documentId();
  },

  recalcRow(row) {
    const quantity = Number(row.quantity || 0);
    const unitPrice = Number(row.unitPrice || 0);
    const taxRate = Number(row.taxRate || 0);
    const discountPercent = Number(row.discountPercent || 0);

    const gross = quantity * unitPrice;
    const discountAmount = Number((gross * discountPercent / 100).toFixed(2));
    const lineSubtotal = Number((gross - discountAmount).toFixed(2));
    const taxAmount = Number((lineSubtotal * taxRate / 100).toFixed(2));
    const lineTotal = Number((lineSubtotal + taxAmount).toFixed(2));

    return {
      ...row,
      quantity,
      unitPrice,
      discountPercent,
      discountAmount,
      lineSubtotal,
      taxAmount,
      lineTotal
    };
  },

  async setRows(rows) {
    await storeValue(
      "salesOrderItems",
      (rows || []).map((row, index) => ({
        ...this.recalcRow(row),
        lineNo: index + 1
      }))
    );
  },

  totals() {
    return this.rows().reduce(
      (sum, row) => {
        const item = this.recalcRow(row);

        return {
          quantity: sum.quantity + Number(item.quantity || 0),
          subtotal: sum.subtotal + Number(item.lineSubtotal || 0),
          discount: sum.discount + Number(item.discountAmount || 0),
          tax: sum.tax + Number(item.taxAmount || 0),
          total: sum.total + Number(item.lineTotal || 0)
        };
      },
      { quantity: 0, subtotal: 0, discount: 0, tax: 0, total: 0 }
    );
  },

  async startNew() {
    await storeValue("currentSalesOrderId", null);
    await storeValue("currentSalesOrderStatus", "DRAFT");
    await storeValue("salesOrderBeforeEdit", null);
    await storeValue("salesOrderItems", []);

    await GetNextSalesOrderNumber.run();

    SalesOrderNumberInput.setValue(
      GetNextSalesOrderNumber.data?.[0]?.nextSalesOrderNumber || ""
    );

    SalesOrderDateInput.setValue(moment().format("YYYY-MM-DD"));
    SalesOrderDueDateInput.setValue("");
    SalesOrderCustomerSelect.setSelectedOption("");
    SalesOrderWarehouseSelect.setSelectedOption(
      String(SalesOrderWarehouseSelect.selectedOptionValue || appsmith.store.warehouseId || "")
    );
    SalesOrderFulfillmentTypeSelec.setSelectedOption("PICKUP_IN_STORE");
    SalesOrderSalesChannelSelect.setSelectedOption("IN_STORE");
    SalesOrderNoteInput.setValue("");

    if (typeof SalesOrderBarcodeInput !== "undefined") {
      SalesOrderBarcodeInput.setValue("");
    }
  },

  async addBlankRow() {
    await this.setRows([
      ...this.rows(),
      {
        itemLookup: "",
        productId: null,
        productCode: "",
        productName: "",
        barcode: "",
        sku: "",
        description: "",
        productType: "",
        trackStock: "0",
        availableStock: 0,
        unitId: null,
        unitCode: "",
        taxRateId: null,
        taxRate: 0,
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        reservedQuantity: 0,
        note: ""
      }
    ]);
  },
	
	async refreshLists() {
  if (typeof ListSalesOrders !== "undefined") {
    await ListSalesOrders.run();
  }

  if (typeof ListSalesOrderItems !== "undefined") {
    await ListSalesOrderItems.run({
      documentId: SalesOrderTable.selectedRow?.documentId || 0
    });
  }
},

  async removeSelectedRow() {
    const index =
      SalesOrderItemsEditTable.selectedRowIndex ??
      SalesOrderItemsEditTable.triggeredRowIndex ??
      -1;

    if (index < 0) {
      showAlert("Select row first.", "warning");
      return;
    }

    await this.setRows(this.rows().filter((_, i) => i !== index));
  },

  async updateRows() {
    await this.setRows(SalesOrderItemsEditTable.tableData || this.rows());
  },

  async resolveProduct(rowOrIndex = null, lookupValue = "", increment = true) {
  const lookup = String(lookupValue || "").trim();

  if (!lookup) return;

  const warehouseId = this.warehouseId();

  if (!warehouseId) {
    showAlert("Select warehouse first.", "warning");
    return;
  }

  try {
    const result = await FindSalesOrderProduct.run({
      lookup,
      warehouseId
    });

    const rawProduct =
      result?.[0] ||
      result?.data?.[0] ||
      FindSalesOrderProduct.data?.[0];

    if (!rawProduct) {
      showAlert("Product was not found.", "warning");
      console.log("FindSalesOrderProduct data:", FindSalesOrderProduct.data);
      return;
    }

    const product = this.normalizeProduct(rawProduct, lookup);

    if (!product.productId) {
      showAlert("Product was found, but productId is missing.", "error");
      console.log("Product result:", rawProduct);
      return;
    }

    const rows = [...this.rows()];
    const existingIndex = rows.findIndex(row =>
      String(row.productId || "") === String(product.productId)
    );

    if (existingIndex >= 0 && increment) {
      const nextQty = Number(rows[existingIndex].quantity || 0) + 1;

      rows[existingIndex] = this.recalcRow({
        ...rows[existingIndex],
        quantity: nextQty
      });

      await this.setRows(rows);
      return;
    }

    rows.push(this.recalcRow({
      lineNo: rows.length + 1,
      barcode: product.barcode,
      productId: product.productId,
      productCode: product.productCode,
      productName: product.productName,
      sku: product.sku,
      description: product.productName,
      unitId: product.unitId,
      unitCode: product.unitCode,
      taxRateId: product.taxRateId,
      taxRate: product.taxRate,
      quantity: 1,
      unitPrice: product.unitPrice,
      discountPercent: 0,
      discountAmount: 0,
      lineSubtotal: 0,
      taxAmount: 0,
      lineTotal: 0,
      availableStock: product.availableStock,
      trackStock: product.trackStock,
      note: ""
    }));

    await this.setRows(rows);
  } catch (error) {
    showAlert("Error while loading product: " + error.message, "error");
    console.log(error);
  }
},
	
	async cancelDocument(row = null) {
  const selected = row || SalesOrderTable.triggeredRow || SalesOrderTable.selectedRow || {};
  const documentId =
    selected.documentId ||
    selected.id ||
    selected.ID ||
    selected["Document ID"] ||
    selected["Order ID"];

  if (!documentId) {
    showAlert("Select sales order first.", "warning");
    return;
  }

  const status = String(selected.Status || selected.status || "").toUpperCase();

  if (["INVOICED", "POSTED", "CANCELLED"].includes(status)) {
    showAlert("This sales order cannot be cancelled.", "warning");
    return;
  }

  try {
    if (typeof ClearSalesOrderReservation !== "undefined") {
      await ClearSalesOrderReservation.run({ documentId });
    }

    await CancelSalesOrder.run({ documentId });

    if (typeof AuditLog !== "undefined") {
      await AuditLog1.insert({
        entityName: "documents",
        entityId: documentId,
        actionType: "CANCEL",
        newValues: {
          source: "Sales Order",
          status: "CANCELLED"
        }
      });
    }

    if (typeof ListSalesOrders !== "undefined") {
      await ListSalesOrders.run();
    }

    if (typeof ListSalesOrderItems !== "undefined") {
      await ListSalesOrderItems.run({
        documentId
      });
    }

    showAlert("Sales order was cancelled.", "success");
  } catch (error) {
    showAlert("Error while cancelling sales order: " + error.message, "error");
    console.log(error);
  }
},

async scanBarcode(value) {
  const lookup = String(value || "").trim();

  if (!lookup) return;

  await this.resolveProduct(null, lookup, true);

  if (typeof SalesOrderBarcodeInput !== "undefined") {
    SalesOrderBarcodeInput.setValue("");
  }
},

async scanBarcodeDebounced(value) {
  const lookup = String(value || "").trim();

  if (!lookup || lookup.length < 3) return;

  await storeValue("salesOrderScanLastValue", lookup);

  setTimeout(() => {
    if (appsmith.store.salesOrderScanLastValue === lookup) {
      this.scanBarcode(lookup);
    }
  }, 350);
},
	
  validate() {
    if (!SalesOrderNumberInput.text.trim()) {
      showAlert("Order number is required.", "warning");
      return false;
    }

    if (!SalesOrderCustomerSelect.selectedOptionValue) {
      showAlert("Customer is required.", "warning");
      return false;
    }

    if (!SalesOrderWarehouseSelect.selectedOptionValue) {
      showAlert("Warehouse is required.", "warning");
      return false;
    }

    const rows = this.rows().filter(row => row.productId);

    if (!rows.length) {
      showAlert("Add at least one product.", "warning");
      return false;
    }

    const invalid = rows.find(row =>
      !row.productId ||
      Number(row.quantity || 0) <= 0 ||
      Number(row.unitPrice || 0) < 0
    );

    if (invalid) {
      showAlert(`Invalid row: ${invalid.productCode || invalid.productName}`, "error");
      return false;
    }

    return true;
  },

  async save(status = "DRAFT") {
    await this.updateRows();

    if (!this.validate()) return null;

    const rows = this.rows().filter(row => row.productId).map(row => this.recalcRow(row));
    const totals = this.totals();

    try {
      let documentId = this.documentId();

      if (documentId) {
        await UpdateSalesOrderDocument.run({
          documentId,
          status,
          totals
        });

        await DeleteSalesOrderItems.run({ documentId });
      } else {
        await InsertSalesOrderDocument.run({
          status,
          totals
        });

        const idRows = await GetSalesOrderIdByNumber.run();
        const found = idRows?.[0] || GetSalesOrderIdByNumber.data?.[0];

        documentId = found?.documentId;

        if (!documentId) {
          showAlert("Sales order was saved, but ID was not found.", "error");
          return null;
        }

        await storeValue("currentSalesOrderId", documentId);
      }

      for (let i = 0; i < rows.length; i += 1) {
        await InsertSalesOrderItem.run({
          documentId,
          lineNo: i + 1,
          productId: rows[i].productId,
          description: rows[i].description || rows[i].productName,
          quantity: rows[i].quantity,
          unitId: rows[i].unitId,
          unitPrice: rows[i].unitPrice,
          discountAmount: rows[i].discountAmount,
          lineSubtotal: rows[i].lineSubtotal,
          taxRateId: rows[i].taxRateId,
          taxAmount: rows[i].taxAmount,
          lineTotal: rows[i].lineTotal,
          note: rows[i].note || null
        });
      }

      if (typeof AuditLog1 !== "undefined") {
        await AuditLog1.insert({
          entityName: "documents",
          entityId: documentId,
          actionType: this.isEditMode() ? "UPDATE" : "INSERT",
          oldValues: appsmith.store.salesOrderBeforeEdit || null,
          newValues: {
            source: "Sales Order",
            document_id: documentId,
            document_number: SalesOrderNumberInput.text,
            status,
            customer_id: SalesOrderCustomerSelect.selectedOptionValue,
            warehouse_id: SalesOrderWarehouseSelect.selectedOptionValue,
            fulfillment_type: SalesOrderFulfillmentTypeSelec.selectedOptionValue,
            sales_channel: SalesOrderSalesChannelSelect.selectedOptionValue,
            totals,
            items: rows
          }
        });
      }

      await storeValue("currentSalesOrderStatus", status);
      await ListSalesOrders.run();

      return documentId;
    } catch (error) {
      showAlert("Error while saving sales order: " + error.message, "error");
      console.log(error);
      return null;
    }
  },

 async saveDraft() {
  const wasEditMode = this.isEditMode();

  const documentId = await this.save("DRAFT");

  if (!documentId) return;

  await this.refreshLists();

  showAlert(
    wasEditMode ? "Sales order was updated." : "Sales order was saved as draft.",
    "success"
  );

  await storeValue("viewMode", "list");
  await storeValue("activeTab", "Sales Orders");
  await storeValue("salesOrderItems", []);
  await storeValue("currentSalesOrderId", null);
  await storeValue("salesOrderEditMode", false);
  await storeValue("salesOrderBeforeEdit", null);

  if (typeof ListSalesOrders !== "undefined") {
    await ListSalesOrders.run();
  }
},

  async loadForEdit(row = null) {
    const selected = row || SalesOrderTable.triggeredRow || SalesOrderTable.selectedRow || {};
    const documentId = selected.documentId || selected.id || selected.ID;

    if (!documentId) {
      showAlert("Select sales order first.", "warning");
      return;
    }

    const headerRows = await GetSalesOrderForEdit.run({ documentId });
    const header = headerRows?.[0] || GetSalesOrderForEdit.data?.[0];

    if (!header) {
      showAlert("Sales order was not found.", "error");
      return;
    }

    const itemRows = await GetSalesOrderItemsForEdit.run({ documentId });
    const items = itemRows || GetSalesOrderItemsForEdit.data || [];

    await storeValue("currentSalesOrderId", header.documentId);
    await storeValue("currentSalesOrderStatus", header.status);
    await storeValue("salesOrderBeforeEdit", { header, items });

    SalesOrderNumberInput.setValue(header.documentNumber || "");
    SalesOrderDateInput.setValue(header.documentDate || "");
    SalesOrderDueDateInput.setValue(header.dueDate || "");
    SalesOrderCustomerSelect.setSelectedOption(header.customerId ? String(header.customerId) : "");
    SalesOrderWarehouseSelect.setSelectedOption(header.warehouseId ? String(header.warehouseId) : "");
    SalesOrderFulfillmentTypeSelec.setSelectedOption(header.fulfillmentType || "PICKUP_IN_STORE");
    SalesOrderSalesChannelSelect.setSelectedOption(header.salesChannel || "IN_STORE");
    SalesOrderNoteInput.setValue(header.note || "");

    await this.setRows(items.map(row => ({
      itemLookup: row.barcode || row.productCode || "",
      productId: row.productId,
      productCode: row.productCode || "",
      productName: row.productName || "",
      barcode: row.barcode || "",
      sku: row.sku || "",
      description: row.description || row.productName || "",
      trackStock: String(row.trackStock || "0"),
      availableStock: Number(row.availableStock || 0),
      unitId: row.unitId,
      unitCode: row.unitCode || "",
      taxRateId: row.taxRateId,
      taxRate: Number(row.taxRate || 0),
      quantity: Number(row.quantity || 0),
      unitPrice: Number(row.unitPrice || 0),
      discountPercent: 0,
      discountAmount: Number(row.discountAmount || 0),
      lineSubtotal: Number(row.lineSubtotal || 0),
      taxAmount: Number(row.taxAmount || 0),
      lineTotal: Number(row.lineTotal || 0),
      reservedQuantity: Number(row.reservedQuantity || 0),
      note: row.note || ""
    })));

    await storeValue("activeTab", "Sales Orders");
    await storeValue("viewMode", "edit");
  },

  async confirm() {
    const documentId = await this.save("DRAFT");
    if (!documentId) return;

    await ConfirmSalesOrder.run({ documentId });
    await storeValue("currentSalesOrderStatus", "CONFIRMED");

    await this.allocate(documentId);

    await ListSalesOrders.run();
    showAlert("Sales order was confirmed.", "success");
  },

  async allocate(documentId = this.documentId()) {
    if (!documentId) {
      showAlert("Sales order ID is missing.", "error");
      return false;
    }

    const stockRows = await CheckSalesOrderStock.run({
      documentId,
      warehouseId: SalesOrderWarehouseSelect.selectedOptionValue
    });

    const rows = stockRows || CheckSalesOrderStock.data || [];
    const shortage = rows.find(row => Number(row.shortageQuantity || 0) > 0);

    if (shortage) {
      await MarkSalesOrderTransferNeeded.run({ documentId });
      await storeValue("currentSalesOrderStatus", "TRANSFER_NEEDED");
      showAlert(`Stock missing for ${shortage.productCode}. Transfer needed.`, "warning");
      return false;
    }

    await ReserveSalesOrderItems.run({ documentId });
    await MarkSalesOrderAllocated.run({ documentId });
    await CreateSalesOrderPickingTask.run({ documentId });
    await MarkSalesOrderPicking.run({ documentId });

    await storeValue("currentSalesOrderStatus", "PICKING");
    return true;
  },
	
	async addPackage(row = null) {
  const selected = row || SalesOrderTable.selectedRow || {};
  const salesOrderId =
    selected.documentId ||
    selected.id ||
    selected.ID ||
    appsmith.store.currentSalesOrderShippingId ||
    0;

  if (!salesOrderId) {
    showAlert("Select sales order first.", "warning");
    return;
  }

  await storeValue("currentSalesOrderShippingId", salesOrderId);

  try {
    const dnRows = await GetSelectedSalesOrderDeliveryN.run();
    const dn = dnRows?.[0] || GetSelectedSalesOrderDeliveryN.data?.[0];

    if (!dn?.deliveryNoteId) {
      showAlert("Create delivery note first.", "warning");
      return;
    }

    const noRows = await GetNextPackageNumber.run();
    const packageNumber =
      noRows?.[0]?.nextPackageNumber ||
      GetNextPackageNumber.data?.[0]?.nextPackageNumber;

    if (!packageNumber) {
      showAlert("Package number could not be generated.", "error");
      return;
    }

    const packageBarcode = `${packageNumber}-${dn.deliveryNoteId}`;

    await InsertDocumentPackage.run({
      companyId: dn.companyId,
      deliveryNoteId: dn.deliveryNoteId,
      salesOrderId: dn.salesOrderId,
      packageNumber,
      packageBarcode,
      packageType: "BOX",
      warehouseId: dn.warehouseId,
      partnerId: dn.partnerId,
      grossWeight: 0,
      netWeight: 0,
      lengthCm: 0,
      widthCm: 0,
      heightCm: 0,
      note: `Package for ${dn.deliveryNoteNumber}`,
      createdByUserId: appsmith.store.userId || dn.createdByUserId
    });

    await ListSalesOrderPackages.run();

    showAlert(`Package ${packageNumber} was created.`, "success");
  } catch (error) {
    showAlert("Error while creating package: " + error.message, "error");
    console.log(error);
  }
},

  async cancel() {
    const documentId = this.documentId();

    if (!documentId) {
      showAlert("Select sales order first.", "warning");
      return;
    }

    await ClearSalesOrderReservation.run({ documentId });
    await CancelSalesOrder.run({ documentId });

    await storeValue("currentSalesOrderStatus", "CANCELLED");
    await ListSalesOrders.run();

    showAlert("Sales order was cancelled.", "success");
  },

  async createInvoice() {
    const documentId = this.documentId();

    if (!documentId) {
      showAlert("Select sales order first.", "warning");
      return;
    }

    await GetNextInvoiceFromSalesOrderNu.run();

    const invoiceNumber =
      GetNextInvoiceFromSalesOrderNu.data?.[0]?.nextInvoiceNumber;

    if (!invoiceNumber) {
      showAlert("Invoice number could not be generated.", "error");
      return;
    }

    await CreateInvoiceFromSalesOrder.run({
      documentId,
      invoiceNumber
    });

    const invoiceRows = await GetInvoiceFromSalesOrderId.run({ documentId });
    const invoice = invoiceRows?.[0] || GetInvoiceFromSalesOrderId.data?.[0];

    if (!invoice?.invoiceId) {
      showAlert("Invoice was created, but ID was not found.", "error");
      return;
    }

    await CreateInvoiceItemsFromSalesOrd.run({
      documentId,
      invoiceId: invoice.invoiceId
    });

    await MarkSalesOrderInvoiced.run({ documentId });
    await ListSalesOrders.run();

    showAlert(`Invoice ${invoiceNumber} was created.`, "success");
  },
		async cancelForm() {
  await storeValue("currentSalesOrderId", null);
  await storeValue("salesOrderEditMode", false);
  await storeValue("salesOrderBeforeEdit", null);
  await storeValue("salesOrderItems", []);
  await storeValue("salesOrderSourceDocumentId", null);

  if (typeof SalesOrderNumberInput !== "undefined") SalesOrderNumberInput.setValue("");
  if (typeof SalesOrderDateInput !== "undefined") SalesOrderDateInput.setValue(moment().format("YYYY-MM-DD"));
  if (typeof SalesOrderDueDateInput !== "undefined") SalesOrderDueDateInput.setValue("");
  if (typeof SalesOrderNoteInput !== "undefined") SalesOrderNoteInput.setValue("");
  if (typeof SalesOrderBarcodeInput !== "undefined") SalesOrderBarcodeInput.setValue("");

  if (typeof SalesOrderCustomerSelect !== "undefined") SalesOrderCustomerSelect.setSelectedOption("");
  if (typeof SalesOrderWarehouseSelect !== "undefined") SalesOrderWarehouseSelect.setSelectedOption("");
  if (typeof SalesOrderFulfillmentTypeSelect !== "undefined") SalesOrderFulfillmentTypeSelec.setSelectedOption("");
  if (typeof SalesOrderSalesChannelSelect !== "undefined") SalesOrderSalesChannelSelect.setSelectedOption("");

  await storeValue("viewMode", "list");
  await storeValue("activeTab", "Sales Orders");

  if (typeof ListSalesOrders !== "undefined") {
    await ListSalesOrders.run();
  }
},
	
	async createDeliveryNote(row = null) {
  const selected = row || SalesOrderTable.selectedRow || SalesOrderTable.triggeredRow || {};
  const salesOrderId =
    selected.documentId ||
    selected.id ||
    selected.ID ||
    selected["Document ID"] ||
    selected["Order ID"];

  if (!salesOrderId) {
    showAlert("Select sales order first.", "warning");
    return;
  }

  const status = String(selected.Status || selected.status || "").toUpperCase();

  if (["CANCELLED", "INVOICED"].includes(status)) {
    showAlert("Cannot create delivery note for this sales order.", "warning");
    return;
  }

  try {
    const headerRows = await GetSalesOrderForDeliveryNote.run({ salesOrderId });
    const header = headerRows?.[0] || GetSalesOrderForDeliveryNote.data?.[0];

    if (!header) {
      showAlert("Sales order was not found.", "error");
      return;
    }

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
  deliveryNoteNumber: nextNumber,
  companyId: header.companyId,
  partnerId: header.partnerId,
  warehouseId: header.warehouseId,
  currencyCode: header.currencyCode || "EUR",
  paymentMethod: header.paymentMethod || null,
  salesChannel: header.salesChannel || null,
  fulfillmentType: header.fulfillmentType || null,
  subtotalAmount: header.subtotalAmount || 0,
  discountAmount: header.discountAmount || 0,
  taxAmount: header.taxAmount || 0,
  totalAmount: header.totalAmount || 0,
  note: `Created from sales order ${header.salesOrderNumber || ""}`,
  createdByUserId: appsmith.store.userId || header.createdByUserId || null
});

const deliveryRows = await GetDeliveryNoteByNumber.run({
  deliveryNoteNumber: nextNumber
});
		
    const delivery =
      deliveryRows?.[0] ||
      GetDeliveryNoteByNumber.data?.[0];

    if (!delivery?.deliveryNoteId) {
      showAlert("Delivery note was created, but ID was not found.", "error");
      return;
    }

    const itemRows = await GetSalesOrderItemsForDeliveryN.run({ salesOrderId });
    const items = itemRows || GetSalesOrderItemsForDeliveryN.data || [];

    for (let i = 0; i < items.length; i += 1) {
      await InsertDeliveryNoteItemFromSale.run({
        deliveryNoteId: delivery.deliveryNoteId,
        salesOrderItemId: items[i].salesOrderItemId,
        lineNo: items[i].lineNo || i + 1,
        productId: items[i].productId,
        description: items[i].description,
        quantity: items[i].quantity,
        unitId: items[i].unitId,
        unitPrice: items[i].unitPrice,
        discountAmount: items[i].discountAmount,
        taxRateId: items[i].taxRateId,
        taxAmount: items[i].taxAmount,
        lineSubtotal: items[i].lineSubtotal,
        lineTotal: items[i].lineTotal,
        warehouseLocationId: items[i].warehouseLocationId,
        batchNumber: items[i].batchNumber,
        serialNumber: items[i].serialNumber,
        expiryDate: items[i].expiryDate,
        note: items[i].note
      });
    }

    await MarkSalesOrderDeliveryCreated.run({ salesOrderId });

    if (typeof AuditLog !== "undefined") {
      await AuditLog1.insert({
        entityName: "documents",
        entityId: delivery.deliveryNoteId,
        actionType: "INSERT",
        newValues: {
          source: "Sales Order",
          sales_order_id: salesOrderId,
          delivery_note_number: delivery.deliveryNoteNumber
        }
      });
    }

    if (typeof ListSalesOrders !== "undefined") {
      await ListSalesOrders.run();
    }

    showAlert(`Delivery note ${delivery.deliveryNoteNumber} was created.`, "success");
  } catch (error) {
    showAlert("Error while creating delivery note: " + error.message, "error");
    console.log(error);
  }
},

  async backToList() {
    await storeValue("currentSalesOrderId", null);
    await storeValue("currentSalesOrderStatus", null);
    await storeValue("salesOrderBeforeEdit", null);
    await storeValue("salesOrderItems", []);
    await storeValue("viewMode", "list");

    await ListSalesOrders.run();
  }
};
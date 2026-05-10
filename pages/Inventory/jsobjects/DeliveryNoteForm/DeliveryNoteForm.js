export default {
  rows() {
    return appsmith.store.deliveryNoteItems || [];
  },

  isEditMode() {
    return appsmith.store.deliveryNoteEditMode === true && !!appsmith.store.currentDeliveryNoteId;
  },

  recalc(rows) {
    return (rows || []).map((row, index) => {
      const quantity = Number(row.Quantity || row.quantity || 0);
      const unitPrice = Number(row["Unit Price"] || row.unitPrice || 0);

      return {
        ...row,
        lineNo: index + 1,
        Quantity: quantity,
        "Unit Price": unitPrice,
        "Line Total": quantity * unitPrice
      };
    });
  },

  totals() {
    const rows = this.rows();

    return {
      totalQuantity: rows.reduce((s, r) => s + Number(r.Quantity || 0), 0),
      totalAmount: rows.reduce((s, r) => s + Number(r["Line Total"] || 0), 0)
    };
  },

  documentDate() {
    return moment(DeliveryNoteDateInput.selectedDate || DeliveryNoteDateInput.formattedDate || DeliveryNoteDateInput.text).format("YYYY-MM-DD");
  },

  auditValues(documentId = null) {
    const totals = this.totals();

    return {
      source: "Delivery Note form",
      document_id: documentId,
      document_number: DeliveryNoteNumberInput.text,
      document_date: this.documentDate(),
      customer_id: DeliveryNoteCustomerSelect.selectedOptionValue,
      warehouse_id: DeliveryNoteWarehouseSelectFor.selectedOptionValue,
      reference_number: DeliveryNoteReferenceInput.text || null,
      total_quantity: totals.totalQuantity,
      total_amount: totals.totalAmount,
      item_count: this.rows().length,
      note: DeliveryNoteNoteInput.text || null
    };
  },

  async startNew() {
    const nextNumber =
      GetNextDeliveryNoteNumber.data?.[0]?.nextNumber ||
      GetNextDeliveryNoteNumber.data?.nextNumber ||
      "";

    await storeValue("currentDeliveryNoteId", null);
    await storeValue("deliveryNoteEditMode", false);
    await storeValue("deliveryNoteBeforeEdit", null);
    await storeValue("deliveryNoteItems", []);
    await storeValue("inventoryMode", "DELIVERY_NOTE_NEW");

    DeliveryNoteNumberInput.setValue(nextNumber);
    DeliveryNoteDateInput.setValue(moment().format("YYYY-MM-DD"));
    DeliveryNoteStatusInput.setValue("DRAFT");
    DeliveryNoteReferenceInput.setValue("");
    DeliveryNoteNoteInput.setValue("");

    DeliveryNoteCustomerSelect.setSelectedOption("");

    DeliveryNoteWarehouseSelectFor.setSelectedOption(
      String(InventoryWarehouseSelect.selectedOptionValue || appsmith.store.warehouseId || "")
    );
  },

  async loadForEdit(row = null) {
    const selected = row || DeliveryNotesTable.selectedRow || {};
    const documentId =
      selected.documentId ||
      selected["Delivery Note ID"] ||
      selected.id;

    if (!documentId) {
      showAlert("Select delivery note first.", "warning");
      return;
    }

    const headerRows = await GetDeliveryNoteForEdit.run({ documentId });
    const header = headerRows?.[0] || GetDeliveryNoteForEdit.data?.[0];

    if (!header) {
      showAlert("Delivery note was not found.", "error");
      return;
    }

    if (header.status !== "DRAFT") {
      showAlert("Only draft delivery notes can be edited.", "warning");
      return;
    }

    const itemRows = await GetDeliveryNoteItemsForEdit.run({ documentId });
    const items = itemRows || GetDeliveryNoteItemsForEdit.data || [];

    await storeValue("currentDeliveryNoteId", header.documentId);
    await storeValue("deliveryNoteEditMode", true);
    await storeValue("deliveryNoteBeforeEdit", {
      header,
      items
    });
    await storeValue("deliveryNoteItems", this.recalc(items));
    await storeValue("inventoryMode", "DELIVERY_NOTE_EDIT");

    DeliveryNoteNumberInput.setValue(header.documentNumber || "");
    DeliveryNoteDateInput.setValue(header.documentDate || "");
    DeliveryNoteStatusInput.setValue(header.status || "DRAFT");
    DeliveryNoteCustomerSelect.setSelectedOption(header.customerId ? String(header.customerId) : "");
    DeliveryNoteWarehouseSelectFor.setSelectedOption(header.warehouseId ? String(header.warehouseId) : "");
    DeliveryNoteReferenceInput.setValue(header.referenceNumber || "");
    DeliveryNoteNoteInput.setValue(header.note || "");
  },

  async cancel() {
    await storeValue("currentDeliveryNoteId", null);
    await storeValue("deliveryNoteEditMode", false);
    await storeValue("deliveryNoteBeforeEdit", null);
    await storeValue("deliveryNoteItems", []);
    await storeValue("inventoryMode", "LIST");
  },

  async addBlankRow() {
    const rows = this.rows();

    await storeValue("deliveryNoteItems", [
      ...rows,
      {
        lineNo: rows.length + 1,
        productId: null,
        unitId: null,
        Barcode: "",
        "Product Code": "",
        "Product Name": "",
        Description: "",
        Quantity: 1,
        Unit: "",
        "Unit Price": 0,
        "Line Total": 0,
        availableStock: 0,
        trackStock: 0,
        Note: ""
      }
    ]);
  },

  async resolveTableProduct(rowIndex, lookupValue) {
    const lookup = String(lookupValue || "").trim();

    if (!lookup) return;

    if (!DeliveryNoteWarehouseSelectFor.selectedOptionValue) {
      showAlert("Select warehouse first.", "warning");
      return;
    }

    const rows = await FindDeliveryNoteProduct.run({ lookup });
    const product = rows?.[0] || FindDeliveryNoteProduct.data?.[0];

    if (!product) {
      showAlert("Product was not found.", "warning");
      return;
    }

    if (Number(product.trackStock || 0) === 1 && Number(product.availableStock || 0) <= 0) {
      showAlert("Product has no available stock in selected warehouse.", "warning");
      return;
    }

    const currentRows = this.rows();

    const nextRows = currentRows.map((row, index) => {
      if (index !== rowIndex) return row;

      const quantity = Number(row.Quantity || row.quantity || 1);
      const unitPrice = Number(row["Unit Price"] || product.salePrice || 0);

      return {
        ...row,
        productId: product.productId,
        unitId: product.unitId,
        Barcode: product.barcode || lookup,
        "Product Code": product.productCode,
        "Product Name": product.productName,
        Description: product.description || product.productName,
        Quantity: quantity,
        Unit: product.unitCode,
        "Unit Price": unitPrice,
        "Line Total": quantity * unitPrice,
        availableStock: Number(product.availableStock || 0),
        trackStock: Number(product.trackStock || 0)
      };
    });

    await storeValue("deliveryNoteItems", this.recalc(nextRows));
  },
	
	async scanProductDebounced(value) {
  const lookup = String(value || "").trim();

  if (!lookup) return;
  if (lookup.length < 3) return;

  await storeValue("deliveryNoteScanLastValue", lookup);

  setTimeout(() => {
    if (appsmith.store.deliveryNoteScanLastValue === lookup) {
      DeliveryNoteForm.scanProduct(lookup);
    }
  }, 350);
},

async scanProduct(lookupValue = null) {
  const lookup = String(lookupValue || DeliveryNoteScanInput.text || "").trim();

  if (!lookup) {
    return;
  }

  if (!DeliveryNoteWarehouseSelectFor.selectedOptionValue) {
    showAlert("Select warehouse first.", "warning");
    DeliveryNoteScanInput.setValue("");
    return;
  }

  const result = await FindDeliveryNoteProduct.run({ lookup });
  const product = result?.[0] || FindDeliveryNoteProduct.data?.[0];

  if (!product) {
    showAlert("Product was not found.", "warning");
    DeliveryNoteScanInput.setValue("");
    return;
  }

  const available = Number(product.availableStock || 0);

  if (Number(product.trackStock || 0) === 1 && available <= 0) {
    showAlert("Product has no available stock in selected warehouse.", "warning");
    DeliveryNoteScanInput.setValue("");
    return;
  }

  const rows = [...this.rows()];
  const existingIndex = rows.findIndex(
    row => Number(row.productId) === Number(product.productId)
  );

  if (existingIndex >= 0) {
    const currentQty = Number(rows[existingIndex].Quantity || 0);

    if (Number(product.trackStock || 0) === 1 && currentQty + 1 > available) {
      showAlert(`Not enough stock for ${product.productCode}. Available: ${available}`, "error");
      DeliveryNoteScanInput.setValue("");
      return;
    }

    rows[existingIndex] = {
      ...rows[existingIndex],
      Quantity: currentQty + 1
    };
  } else {
    rows.push({
      lineNo: rows.length + 1,
      productId: product.productId,
      unitId: product.unitId,
      Barcode: product.barcode || lookup,
      "Product Code": product.productCode,
      "Product Name": product.productName,
      Description: product.description || product.productName,
      Quantity: 1,
      Unit: product.unitCode,
      "Unit Price": Number(product.salePrice || 0),
      "Line Total": Number(product.salePrice || 0),
      availableStock: available,
      trackStock: Number(product.trackStock || 0),
      Note: ""
    });
  }

  await storeValue("deliveryNoteItems", this.recalc(rows));

  await storeValue("deliveryNoteScanLastValue", "");
  DeliveryNoteScanInput.setValue("");
},

  async updateRows() {
    const tableRows = DeliveryNoteItemsEditTable.tableData || this.rows();
    await storeValue("deliveryNoteItems", this.recalc(tableRows));
  },

  async removeSelectedRow() {
    const selectedIndex =
      DeliveryNoteItemsEditTable.selectedRowIndex ??
      DeliveryNoteItemsEditTable.triggeredRowIndex ??
      DeliveryNoteItemsEditTable.updatedRowIndex ??
      -1;

    if (selectedIndex < 0) {
      showAlert("Select row first.", "warning");
      return;
    }

    const rows = this.rows().filter((_, index) => index !== selectedIndex);
    await storeValue("deliveryNoteItems", this.recalc(rows));
  },

  async clearRows() {
    await storeValue("deliveryNoteItems", []);
  },

  validate() {
    if (!DeliveryNoteNumberInput.text) {
      showAlert("Delivery note number is required.", "warning");
      return false;
    }

    if (!DeliveryNoteDateInput.selectedDate && !DeliveryNoteDateInput.formattedDate && !DeliveryNoteDateInput.text) {
      showAlert("Delivery note date is required.", "warning");
      return false;
    }

    if (!DeliveryNoteCustomerSelect.selectedOptionValue) {
      showAlert("Customer is required.", "warning");
      return false;
    }

    if (!DeliveryNoteWarehouseSelectFor.selectedOptionValue) {
      showAlert("Warehouse is required.", "warning");
      return false;
    }

    const rows = this.rows();

    if (!rows.length) {
      showAlert("Add at least one item.", "warning");
      return false;
    }

    const invalidRow = rows.find(row => !row.productId || Number(row.Quantity || 0) <= 0);

    if (invalidRow) {
      showAlert("Every row must have product and quantity greater than zero.", "warning");
      return false;
    }

    const stockProblem = rows.find(row =>
      Number(row.trackStock || 0) === 1 &&
      Number(row.Quantity || 0) > Number(row.availableStock || 0)
    );

    if (stockProblem) {
      showAlert(
        `Not enough stock for ${stockProblem["Product Code"]}. Available: ${stockProblem.availableStock}`,
        "error"
      );
      return false;
    }

    return true;
  },

  async getSavedDocumentId(response) {
    let documentId =
      response?.insertId ||
      response?.[0]?.insertId ||
      InsertDeliveryNote.data?.insertId ||
      InsertDeliveryNote.data?.[0]?.insertId;

    if (!documentId) {
      const idRows = await GetDeliveryNoteIdByNumber.run();
      const found = idRows?.[0] || GetDeliveryNoteIdByNumber.data?.[0];
      documentId = found?.documentId;
    }

    return documentId;
  },

  async saveDraft() {
    if (!this.validate()) return;

    const wasEditMode = this.isEditMode();

    try {
      let documentId = appsmith.store.currentDeliveryNoteId || null;

      if (wasEditMode) {
        await UpdateDeliveryNote.run({ documentId });
        await DeleteDeliveryNoteItems.run({ documentId });
      } else {
        const response = await InsertDeliveryNote.run();
        documentId = await this.getSavedDocumentId(response);

        if (!documentId) {
          showAlert("Delivery note was saved, but document ID could not be found.", "error");
          console.log(response);
          return;
        }

        await storeValue("currentDeliveryNoteId", documentId);
      }

      const rows = this.recalc(this.rows());

      for (let i = 0; i < rows.length; i += 1) {
        await InsertDeliveryNoteItem.run({
          documentId,
          lineNo: i + 1,
          productId: rows[i].productId,
          description: rows[i].Description || rows[i]["Product Name"],
          quantity: rows[i].Quantity,
          unitId: rows[i].unitId,
          unitPrice: rows[i]["Unit Price"] || 0,
          lineTotal: rows[i]["Line Total"] || 0,
          note: rows[i].Note || null
        });
      }

      if (typeof AuditLog !== "undefined") {
        await AuditLog.insert({
          entityName: "documents",
          entityId: documentId,
          actionType: wasEditMode ? "UPDATE" : "INSERT",
          oldValues: wasEditMode ? appsmith.store.deliveryNoteBeforeEdit || null : null,
          newValues: this.auditValues(documentId)
        });
      }

      await this.afterSave();
      showAlert(wasEditMode ? "Delivery note was updated." : "Delivery note was saved.", "success");
    } catch (error) {
      showAlert("Error while saving delivery note: " + error.message, "error");
      console.log(error);
    }
  },

  async post(row = null) {
    try {
      let documentId = appsmith.store.currentDeliveryNoteId || null;

      if (!documentId && row) {
        documentId = row.documentId || row["Delivery Note ID"] || row.id;
      }

      if (!documentId) {
        showAlert("Save or select delivery note first.", "warning");
        return;
      }

      const headerRows = await GetDeliveryNoteForEdit.run({ documentId });
      const header = headerRows?.[0] || GetDeliveryNoteForEdit.data?.[0];

      if (!header) {
        showAlert("Delivery note was not found.", "error");
        return;
      }

      if (header.status !== "DRAFT") {
        showAlert("Only draft delivery notes can be posted.", "warning");
        return;
      }

      const itemRows = await GetDeliveryNoteItemsForEdit.run({ documentId });
      const items = itemRows || GetDeliveryNoteItemsForEdit.data || [];

      const stockProblem = items.find(row =>
        Number(row.trackStock || 0) === 1 &&
        Number(row.Quantity || 0) > Number(row.availableStock || 0)
      );

      if (stockProblem) {
        showAlert(
          `Not enough stock for ${stockProblem["Product Code"]}. Available: ${stockProblem.availableStock}`,
          "error"
        );
        return;
      }

      for (let i = 0; i < items.length; i += 1) {
        if (Number(items[i].trackStock || 0) === 1) {
          await InsertDeliveryNoteStockMovemen.run({
            documentId,
            warehouseId: header.warehouseId,
            productId: items[i].productId,
            movementDate: header.documentDate,
            quantity: items[i].Quantity,
            unitId: items[i].unitId,
            documentNumber: header.documentNumber,
            note: `Delivery note ${header.documentNumber}`
          });
        }
      }

      await PostDeliveryNote.run({ documentId });

      if (typeof AuditLog !== "undefined") {
        await AuditLog.insert({
          entityName: "documents",
          entityId: documentId,
          actionType: "POST",
          newValues: {
            source: "Delivery Note form",
            document_number: header.documentNumber,
            document_type: "DELIVERY_NOTE",
            status: "POSTED"
          }
        });
      }

      await this.afterSave();
      showAlert("Delivery note was posted.", "success");
    } catch (error) {
      showAlert("Error while posting delivery note: " + error.message, "error");
      console.log(error);
    }
  },

  async void(row = null) {
    const selected = row || DeliveryNotesTable.selectedRow || {};
    const documentId =
      selected.documentId ||
      selected["Delivery Note ID"] ||
      selected.id;

    if (!documentId) {
      showAlert("Select delivery note first.", "warning");
      return;
    }

    try {
      const headerRows = await GetDeliveryNoteForEdit.run({ documentId });
      const header = headerRows?.[0] || GetDeliveryNoteForEdit.data?.[0];

      if (!header) {
        showAlert("Delivery note was not found.", "error");
        return;
      }

      if (header.status !== "POSTED") {
        showAlert("Only posted delivery notes can be voided.", "warning");
        return;
      }

      const itemRows = await GetDeliveryNoteItemsForEdit.run({ documentId });
      const items = itemRows || GetDeliveryNoteItemsForEdit.data || [];

      for (let i = 0; i < items.length; i += 1) {
        if (Number(items[i].trackStock || 0) === 1) {
          await InsertDeliveryNoteVoidStockMov.run({
            documentId,
            warehouseId: header.warehouseId,
            productId: items[i].productId,
            quantity: items[i].Quantity,
            unitId: items[i].unitId,
            documentNumber: header.documentNumber,
            note: `Void delivery note ${header.documentNumber}`
          });
        }
      }

      await VoidDeliveryNote.run({ documentId });

      if (typeof AuditLog !== "undefined") {
        await AuditLog.insert({
          entityName: "documents",
          entityId: documentId,
          actionType: "VOID",
          newValues: {
            source: "Delivery Note form",
            document_number: header.documentNumber,
            document_type: "DELIVERY_NOTE",
            status: "VOID"
          }
        });
      }

      await this.afterSave();
      showAlert("Delivery note was voided.", "success");
    } catch (error) {
      showAlert("Error while voiding delivery note: " + error.message, "error");
      console.log(error);
    }
  },

  async afterSave() {
    await storeValue("currentDeliveryNoteId", null);
    await storeValue("deliveryNoteEditMode", false);
    await storeValue("deliveryNoteBeforeEdit", null);
    await storeValue("deliveryNoteItems", []);
    await storeValue("inventoryMode", "LIST");

    if (typeof ListDeliveryNotes !== "undefined") {
      await ListDeliveryNotes.run();
    }

    if (typeof ListDeliveryNoteItems !== "undefined") {
      await ListDeliveryNoteItems.run();
    }
  }
};

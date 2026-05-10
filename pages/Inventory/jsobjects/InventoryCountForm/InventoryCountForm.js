export default {
  rows() {
    return appsmith.store.inventoryCountDocumentItems || [];
  },

  inventoryCountId() {
    return appsmith.store.currentInventoryCountId || null;
  },

  warehouseId() {
    return appsmith.store.currentInventoryCountWarehouseId || null;
  },

  recalcRow(row) {
    const systemQuantity = Number(row.systemQuantity || 0);
    const countedQuantity = Number(row.countedQuantity || 0);
    const unitCost = Number(row.unitCost || 0);
    const varianceQuantity = countedQuantity - systemQuantity;
    const varianceValue = Number((varianceQuantity * unitCost).toFixed(2));

    return {
      ...row,
      systemQuantity,
      countedQuantity,
      varianceQuantity,
      unitCost,
      varianceValue
    };
  },

  recalc(rows) {
    return (rows || []).map((row, index) => ({
      ...this.recalcRow(row),
      lineNo: index + 1
    }));
  },

  async setRows(rows) {
    await storeValue("inventoryCountDocumentItems", this.recalc(rows));
  },

  totals() {
    return this.rows().reduce(
      (sum, row) => ({
        systemQuantity: sum.systemQuantity + Number(row.systemQuantity || 0),
        countedQuantity: sum.countedQuantity + Number(row.countedQuantity || 0),
        varianceQuantity: sum.varianceQuantity + Number(row.varianceQuantity || 0),
        varianceValue: sum.varianceValue + Number(row.varianceValue || 0)
      }),
      {
        systemQuantity: 0,
        countedQuantity: 0,
        varianceQuantity: 0,
        varianceValue: 0
      }
    );
  },

  async setWarehouseText(doc = {}) {
    await storeValue(
      "currentInventoryCountWarehouseText",
      `${doc.warehouseCode || ""} - ${doc.warehouseName || ""}`
    );
  },

  async createInventoryCount() {
    if (!NewCountWarehouseSelect.selectedOptionValue) {
      showAlert("Warehouse is required.", "warning");
      return;
    }

    try {
      await InsertInventoryCountHeader.run();

      const headerRows = await GetLastInventoryCountHeader.run();
      const header = headerRows?.[0] || GetLastInventoryCountHeader.data?.[0];

      if (!header?.inventoryCountId) {
        showAlert("Inventory count was created, but ID was not returned.", "error");
        return;
      }

      await storeValue("currentInventoryCountId", header.inventoryCountId);
      await storeValue("currentInventoryCountNumber", header.inventoryCountNumber);
      await storeValue("currentInventoryCountWarehouseId", header.warehouseId);
      await storeValue("currentInventoryCountStatus", header.status);
      await this.setWarehouseText(header);

      if (NewCountLoadStockSwitch.isSwitchedOn) {
        await InsertInventoryCountSnapshotIt.run({
          inventoryCountId: header.inventoryCountId,
          warehouseId: header.warehouseId
        });
      }

      await this.resetCountDocumentForm();
      await storeValue("inventoryMode", "INVENTORY_COUNT_DOCUMENT");

      InventoryCountHeaderNumberInp.setValue(header.inventoryCountNumber || "");
      InventoryCountHeaderStat.setValue(header.status || "COUNTING");
      InventoryCountHeaderNumberInp.setValue("");
      InventoryCountHeaderStat.setValue("NEW");
      InventoryCountDocumentDateInpu.setValue(moment().format("YYYY-MM-DD"));
      InventoryCountDocumentNoteInpu.setValue("");

      closeModal(NewInventoryCountModal.name);

      await this.refreshLists();

      showAlert("Inventory count was opened.", "success");
    } catch (error) {
      showAlert("Error while creating inventory count: " + error.message, "error");
      console.log(error);
    }
  },

  async openInventoryCount(row = null) {
    const selected = row || InventoryCountTable.triggeredRow || InventoryCountTable.selectedRow || {};
    const inventoryCountId =
      selected.inventoryCountId ||
      selected.documentId ||
      selected.id ||
      selected.ID ||
      selected["Inventory Count ID"] ||
      selected["Document ID"];

    if (!inventoryCountId) {
      showAlert("Select inventory count first.", "warning");
      return;
    }

    try {
      const headerRows = await GetInventoryCountForEdit.run({
        documentId: inventoryCountId
      });
      const header = headerRows?.[0] || GetInventoryCountForEdit.data?.[0];

      if (!header) {
        showAlert("Inventory count was not found.", "error");
        return;
      }

      await storeValue("currentInventoryCountId", header.documentId);
      await storeValue("currentInventoryCountNumber", header.documentNumber);
      await storeValue("currentInventoryCountWarehouseId", header.warehouseId);
      await storeValue("currentInventoryCountStatus", header.status);
      await this.setWarehouseText(header);

      await this.resetCountDocumentForm();
      await storeValue("inventoryMode", "INVENTORY_COUNT_DOCUMENT");

      InventoryCountHeaderNumberInp.setValue(header.documentNumber || "");
      InventoryCountHeaderStat.setValue(header.status || "");
      InventoryCountHeaderNumberInp.setValue("");
      InventoryCountHeaderStat.setValue("NEW");
      InventoryCountDocumentDateInpu.setValue(moment().format("YYYY-MM-DD"));
      InventoryCountDocumentNoteInpu.setValue("");

      await this.refreshLists();
    } catch (error) {
      showAlert("Error while opening inventory count: " + error.message, "error");
      console.log(error);
    }
  },

  async resetCountDocumentForm() {
    await storeValue("inventoryCountDocumentItems", []);
    await storeValue("currentInventoryCountDocumentId", null);
    await storeValue("currentInventoryCountDocumentNumber", null);

    if (typeof InventoryCountHeaderNumberInp !== "undefined") {
      InventoryCountHeaderNumberInp.setValue("");
    }

    if (typeof InventoryCountHeaderStat !== "undefined") {
      InventoryCountHeaderStat.setValue("NEW");
    }

    if (typeof InventoryCountDocumentDateInpu !== "undefined") {
      InventoryCountDocumentDateInpu.setValue(moment().format("YYYY-MM-DD"));
    }

    if (typeof InventoryCountDocumentNoteInpu !== "undefined") {
      InventoryCountDocumentNoteInpu.setValue("");
    }
  },

  async addBlankRow() {
    await this.setRows([
      ...this.rows(),
      {
        barcode: "",
        productId: null,
        productCode: "",
        productName: "",
        sku: "",
        unitId: null,
        unitCode: "",
        systemQuantity: 0,
        countedQuantity: 1,
        varianceQuantity: 1,
        unitCost: 0,
        varianceValue: 0,
        warehouseLocationId: null,
        locationCode: "",
        note: ""
      }
    ]);
  },

  async removeSelectedRow() {
    const selectedIndex =
      InventoryCountItemsEditTable.selectedRowIndex ??
      InventoryCountItemsEditTable.triggeredRowIndex ??
      -1;

    if (selectedIndex < 0) {
      showAlert("Select row first.", "warning");
      return;
    }

    await this.setRows(this.rows().filter((_, index) => index !== selectedIndex));
  },

  async updateRows() {
    const tableRows = InventoryCountItemsEditTable.tableData || this.rows();
    await this.setRows(tableRows);
  },

 async resolveProduct(rowIndex, lookupValue, increment = false) {
  const lookup = String(lookupValue || "").trim();

  if (!lookup) return;

  if (!this.inventoryCountId()) {
    showAlert("Open inventory count first.", "warning");
    return;
  }

  const result = await FindInventoryCountProduct.run({
    lookup,
    warehouseId: this.warehouseId()
  });

  const product =
    result?.[0] ||
    result?.data?.[0] ||
    FindInventoryCountProduct.data?.[0];

  if (!product) {
    showAlert("Product was not found.", "warning");
    console.log("FindInventoryCountProduct result:", result);
    console.log("FindInventoryCountProduct data:", FindInventoryCountProduct.data);
    return;
  }

  const currentRows = this.rows();
  const rows = [...currentRows];

  const productId = product.productId || product.id || product.ID;
  const existingIndex = rows.findIndex(row => Number(row.productId) === Number(productId));

  if (existingIndex >= 0) {
    rows[existingIndex] = this.recalcRow({
      ...rows[existingIndex],
      countedQuantity: Number(rows[existingIndex].countedQuantity || 0) + (increment ? 1 : 0)
    });

    await this.setRows(rows);
    return;
  }

  const newRow = this.recalcRow({
    lineNo: rows.length + 1,
    barcode: product.barcode || product.Barcode || lookup,
    productId,
    productCode: product.productCode || product["Product Code"] || product.code || "",
    productName: product.productName || product["Product Name"] || product.name || "",
    sku: product.sku || product.SKU || "",
    unitId: product.unitId || product.unit_id || null,
    unitCode: product.unitCode || product.Unit || product.unit || "",
    systemQuantity: Number(product.systemQuantity || product["System Quantity"] || 0),
    countedQuantity: increment ? 1 : 1,
    unitCost: Number(product.unitCost || product["Unit Cost"] || 0),
    warehouseLocationId: product.warehouseLocationId || null,
    locationCode: product.locationCode || product.Location || "",
    note: ""
  });

  rows.push(newRow);

  await this.setRows(rows);

  console.log("Added inventory count row:", newRow);
},


  async scanProduct(value) {
    const lookup = String(value || "").trim();

    if (!lookup) return;

    await this.resolveProduct(this.rows().length, lookup, true);

    if (typeof InventoryCountBarcodeInput !== "undefined") {
      InventoryCountBarcodeInput.setValue("");
    }
  },

  async scanProductDebounced(value) {
    const lookup = String(value || "").trim();

    if (!lookup || lookup.length < 3) return;

    await storeValue("inventoryCountScanLastValue", lookup);

    setTimeout(() => {
      if (appsmith.store.inventoryCountScanLastValue === lookup) {
        this.scanProduct(lookup);
      }
    }, 350);
  },

  validateRows() {
    if (!this.inventoryCountId()) {
      showAlert("Open inventory count first.", "warning");
      return false;
    }

    if (!this.rows().length) {
      showAlert("Add at least one item.", "warning");
      return false;
    }

    const invalidRow = this.rows().find(row => !row.productId || !row.unitId);

    if (invalidRow) {
      showAlert("Every row must have a valid product and unit.", "warning");
      return false;
    }

    const duplicateInForm = this.rows().find((row, index, arr) =>
      row.productId &&
      arr.findIndex(other => Number(other.productId) === Number(row.productId)) !== index
    );

    if (duplicateInForm) {
      showAlert(`Duplicate product in this document: ${duplicateInForm.productCode}`, "error");
      return false;
    }

    return true;
  },

  async checkDuplicateAgainstSavedDocuments() {
    const rows = this.rows();

    for (let i = 0; i < rows.length; i += 1) {
      const duplicateRows = await CheckInventoryCountDuplicateIt.run({
        productId: rows[i].productId
      });

      const duplicate = duplicateRows?.[0] || CheckInventoryCountDuplicateIt.data?.[0];

      if (duplicate) {
        showAlert(
          `Product ${duplicate.productCode} was already counted in ${duplicate.countDocumentNumber}. Please review before saving.`,
          "error"
        );
        return false;
      }
    }

    return true;
  },

  async saveCountDocument() {
    if (!this.validateRows()) return;

    try {
      if (!(await this.checkDuplicateAgainstSavedDocuments())) return;

      await InsertInventoryCountDocument.run();

      const docRows = await GetLastInventoryCountDocument.run();
      const doc = docRows?.[0] || GetLastInventoryCountDocument.data?.[0];

      if (!doc?.countDocumentId) {
        showAlert("Count document was saved, but ID was not returned.", "error");
        return;
      }

      const rows = this.recalc(this.rows());

      for (let i = 0; i < rows.length; i += 1) {
        await InsertInventoryCountDocumentIt.run({
          countDocumentId: doc.countDocumentId,
          lineNo: i + 1,
          productId: rows[i].productId,
          description: rows[i].productName,
          unitId: rows[i].unitId,
          countedQuantity: rows[i].countedQuantity,
          systemQuantity: rows[i].systemQuantity,
          varianceQuantity: rows[i].varianceQuantity,
          varianceValue: rows[i].varianceValue,
          unitCost: rows[i].unitCost,
          warehouseLocationId: rows[i].warehouseLocationId || null,
          note: rows[i].note || null
        });
      }

      if (typeof AuditLog !== "undefined") {
        await AuditLog.insert({
          entityName: "documents",
          entityId: doc.countDocumentId,
          actionType: "INSERT",
          newValues: {
            source: "Inventory count document",
            inventory_count_id: this.inventoryCountId(),
            count_document_number: doc.countDocumentNumber,
            warehouse_id: this.warehouseId(),
            item_count: rows.length,
            total_counted_quantity: this.totals().countedQuantity,
            total_variance_quantity: this.totals().varianceQuantity,
            total_variance_value: this.totals().varianceValue
          }
        });
      }

      InventoryCountHeaderNumberInp.setValue(doc.countDocumentNumber || "");
      InventoryCountHeaderStat.setValue(doc.status || "COUNTED");

      await this.refreshLists();

      showAlert(`Count document ${doc.countDocumentNumber} was saved. Ready for next document.`, "success");

      await this.resetCountDocumentForm();
    } catch (error) {
      showAlert("Error while saving count document: " + error.message, "error");
      console.log(error);
    }
  },

  async refreshLists() {
    if (typeof ListInventoryCounts !== "undefined") {
      await ListInventoryCounts.run();
    }

    if (typeof ListInventoryCountDocuments !== "undefined") {
      await ListInventoryCountDocuments.run();
    }

    if (typeof ListInventoryCountVariance !== "undefined") {
      await ListInventoryCountVariance.run();
    }
  },
	  getInventoryCountIdFromRow(row = null) {
    const selected = row || InventoryCountTable.triggeredRow || InventoryCountTable.selectedRow || {};

    return (
      selected.inventoryCountId ||
      selected.documentId ||
      selected.id ||
      selected.ID ||
      selected["Inventory Count ID"] ||
      selected["Document ID"] ||
      appsmith.store.currentInventoryCountId ||
      null
    );
  },

  async markCounted(row = null) {
    const inventoryCountId = this.getInventoryCountIdFromRow(row);

    if (!inventoryCountId) {
      showAlert("Select inventory count first.", "warning");
      return;
    }

    const statusRows = await CheckInventoryCountStatus.run({ inventoryCountId });
    const status = statusRows?.[0]?.status || CheckInventoryCountStatus.data?.[0]?.status;

    if (status !== "COUNTING") {
      showAlert("Only COUNTING inventory counts can be marked as counted.", "warning");
      return;
    }

    await MarkInventoryCountCounted.run({ inventoryCountId });

    if (typeof AuditLog !== "undefined") {
      await AuditLog.insert({
        entityName: "documents",
        entityId: inventoryCountId,
        actionType: "UPDATE",
        newValues: {
          source: "Inventory count",
          status: "COUNTED"
        }
      });
    }

    await storeValue("currentInventoryCountStatus", "COUNTED");
    await this.refreshLists();

    showAlert("Inventory count was marked as counted.", "success");
  },

  async cancelInventoryCount(row = null) {
    const inventoryCountId = this.getInventoryCountIdFromRow(row);

    if (!inventoryCountId) {
      showAlert("Select inventory count first.", "warning");
      return;
    }

    const statusRows = await CheckInventoryCountStatus.run({ inventoryCountId });
    const status = statusRows?.[0]?.status || CheckInventoryCountStatus.data?.[0]?.status;

    if (["POSTED", "CANCELLED"].includes(status)) {
      showAlert("This inventory count cannot be cancelled.", "warning");
      return;
    }

    await CancelInventoryCount.run({ inventoryCountId });

    if (typeof AuditLog !== "undefined") {
      await AuditLog.insert({
        entityName: "documents",
        entityId: inventoryCountId,
        actionType: "UPDATE",
        oldValues: { status },
        newValues: {
          source: "Inventory count",
          status: "CANCELLED"
        }
      });
    }

    await storeValue("currentInventoryCountStatus", "CANCELLED");
    await this.refreshLists();

    showAlert("Inventory count was cancelled.", "success");
  },

  async postInventoryAdjustment(row = null) {
    const inventoryCountId = this.getInventoryCountIdFromRow(row);

    if (!inventoryCountId) {
      showAlert("Select inventory count first.", "warning");
      return;
    }

    const statusRows = await CheckInventoryCountStatus.run({ inventoryCountId });
    const status = statusRows?.[0]?.status || CheckInventoryCountStatus.data?.[0]?.status;

    if (!["COUNTED", "APPROVED"].includes(status)) {
      showAlert("Inventory count must be COUNTED before posting adjustment.", "warning");
      return;
    }

    const varianceRows = await GetInventoryCountVarianceForPo.run({ inventoryCountId });
    const rows = varianceRows || GetInventoryCountVarianceForPo.data || [];

    for (let i = 0; i < rows.length; i += 1) {
      await InsertInventoryCountAdjustment.run({
        inventoryCountId,
        warehouseId: rows[i].warehouseId || appsmith.store.currentInventoryCountWarehouseId,
        productId: rows[i].productId,
        documentItemId: rows[i].snapshotItemId,
        varianceQuantity: rows[i].varianceQuantity,
        unitCost: rows[i].unitCost,
        totalCost: rows[i].totalCost,
        note: `Inventory count adjustment ${appsmith.store.currentInventoryCountNumber || ""}`
      });
    }

    await PostInventoryCount.run({ inventoryCountId });

    if (typeof AuditLog !== "undefined") {
      await AuditLog.insert({
        entityName: "documents",
        entityId: inventoryCountId,
        actionType: "POST",
        newValues: {
          source: "Inventory count",
          status: "POSTED",
          movement_count: rows.length
        }
      });
    }

    await storeValue("currentInventoryCountStatus", "POSTED");
    await this.refreshLists();

    showAlert("Inventory adjustment was posted.", "success");
  },

  async cancel() {
    await storeValue("inventoryCountDocumentItems", []);
    await storeValue("currentInventoryCountId", null);
    await storeValue("currentInventoryCountNumber", null);
    await storeValue("currentInventoryCountWarehouseId", null);
    await storeValue("currentInventoryCountWarehouseText", "");
    await storeValue("currentInventoryCountStatus", null);
    await storeValue("currentInventoryCountDocumentId", null);
    await storeValue("currentInventoryCountDocumentNumber", null);
    await storeValue("inventoryMode", "LIST");
  }
};

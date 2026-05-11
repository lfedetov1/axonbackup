export default {
  fileRows() {
    return OpeningStockImportFilePicker.files?.[0]?.data || [];
  },

  normalizedRows() {
    return this.fileRows().map((row, index) => ({
      rowNo: index + 1,
      barcode: String(row.barcode || row.Barcode || row.BARCODE || "").trim(),
      productCode: String(row.product_code || row.productCode || row["Product Code"] || row.Code || row.code || "").trim(),
      quantity: Number(row.quantity || row.Quantity || row.qty || row.Qty || 0),
      unitCost: Number(row.unit_cost || row.unitCost || row["Unit Cost"] || row.Price || row.price || 0),
      batchNumber: String(row.batch_number || row.batchNumber || row["Batch Number"] || "").trim(),
      serialNumber: String(row.serial_number || row.serialNumber || row["Serial Number"] || "").trim(),
      expiryDate: row.expiry_date || row.expiryDate || row["Expiry Date"] || null,
      note: row.note || row.Note || null
    }));
  },

  async clear() {
    resetWidget("OpeningStockImportFilePicker", true);
    await storeValue("openingStockImportResult", []);
    showAlert("Import was cleared.", "success");
  },

  validateRows(rows) {
    if (!OpeningStockImportWarehouseSel.selectedOptionValue) {
      showAlert("Warehouse is required.", "warning");
      return false;
    }

    if (!rows.length) {
      showAlert("Upload Excel or CSV file first.", "warning");
      return false;
    }

    const missingLookup = rows.find(row => !row.barcode && !row.productCode);
    if (missingLookup) {
      showAlert(`Row ${missingLookup.rowNo}: barcode or product code is required.`, "error");
      return false;
    }

    const invalidQty = rows.find(row => Number(row.quantity || 0) <= 0);
    if (invalidQty) {
      showAlert(`Row ${invalidQty.rowNo}: quantity must be greater than zero.`, "error");
      return false;
    }

    return true;
  },

  async import() {
    const rows = this.normalizedRows();

    if (!this.validateRows(rows)) return;

    try {
      await GetNextOpeningStockNumber.run();

      const openingStockNumber =
        GetNextOpeningStockNumber.data?.[0]?.nextOpeningStockNumber ||
        GetNextOpeningStockNumber.data?.[0]?.nextDocumentNumber ||
        GetNextOpeningStockNumber.data?.[0]?.nextNumber;

      if (!openingStockNumber) {
        showAlert("Opening stock number was not generated.", "error");
        return;
      }

      await storeValue("openingStockImportNumber", openingStockNumber);

      const resolvedRows = [];

      for (let i = 0; i < rows.length; i += 1) {
        const lookup = rows[i].barcode || rows[i].productCode;

        const productRows = await FindOpeningStockImportProduct.run({ lookup });
        const product = productRows?.[0] || FindOpeningStockImportProduct.data?.[0];

        if (!product) {
          showAlert(`Row ${rows[i].rowNo}: product was not found (${lookup}).`, "error");
          return;
        }

        resolvedRows.push({
          ...rows[i],
          productId: product.productId,
          productCode: product.productCode,
          productName: product.productName,
          barcode: product.barcode || rows[i].barcode || lookup,
          unitId: product.unitId,
          unitCode: product.unitCode,
          unitCost: rows[i].unitCost || product.purchasePrice || 0
        });
      }

      await InsertOpeningStockDocument.run({
        openingStockNumber,
        warehouseId: OpeningStockImportWarehouseSel.selectedOptionValue,
        documentDate: moment().format("YYYY-MM-DD"),
        note: "Opening stock imported from Excel",
        totalAmount: resolvedRows.reduce((s, r) => s + Number(r.quantity || 0) * Number(r.unitCost || 0), 0)
      });

      const docRows = await GetOpeningStockIdByNumber.run({
        openingStockNumber
      });

      const documentId =
        docRows?.[0]?.documentId ||
        docRows?.[0]?.openingStockId ||
        GetOpeningStockIdByNumber.data?.[0]?.documentId ||
        GetOpeningStockIdByNumber.data?.[0]?.openingStockId;

      if (!documentId) {
        showAlert("Opening stock was created, but document ID was not found.", "error");
        return;
      }

      for (let i = 0; i < resolvedRows.length; i += 1) {
        const row = resolvedRows[i];
        const quantity = Number(row.quantity || 0);
        const unitCost = Number(row.unitCost || 0);
        const lineTotal = Number((quantity * unitCost).toFixed(2));

        await InsertOpeningStockItem.run({
          documentId,
          lineNo: i + 1,
          productId: row.productId,
          description: row.productName,
          unitId: row.unitId,
          warehouseId: OpeningStockImportWarehouseSel.selectedOptionValue,
          quantity,
          unitCost,
          lineTotal,
          batchNumber: row.batchNumber || null,
          serialNumber: row.serialNumber || null,
          expiryDate: row.expiryDate || null,
          note: row.note || null
        });

        const itemRows = await GetLastOpeningStockItemId.run({
          documentId,
          lineNo: i + 1
        });

        const documentItemId =
          itemRows?.[0]?.documentItemId ||
          itemRows?.[0]?.itemId ||
          GetLastOpeningStockItemId.data?.[0]?.documentItemId ||
          GetLastOpeningStockItemId.data?.[0]?.itemId;

        await InsertOpeningStockMovement.run({
          documentId,
          documentItemId,
          warehouseId: OpeningStockImportWarehouseSel.selectedOptionValue,
          productId: row.productId,
          movementDate: moment().format("YYYY-MM-DD"),
          quantity,
          unitCost,
          totalCost: lineTotal,
          batchNumber: row.batchNumber || null,
          serialNumber: row.serialNumber || null,
          note: row.note || "Opening stock import"
        });
      }

      await UpdateOpeningStockStatus.run({
        documentId,
        status: "POSTED"
      });

      if (typeof AuditLog !== "undefined") {
        await AuditLog.insert({
          entityName: "documents",
          entityId: documentId,
          actionType: "IMPORT",
          newValues: {
            source: "Opening Stock Excel Import",
            document_number: openingStockNumber,
            warehouse_id: OpeningStockImportWarehouseSel.selectedOptionValue,
            item_count: resolvedRows.length,
            total_quantity: resolvedRows.reduce((s, r) => s + Number(r.quantity || 0), 0),
            total_value: resolvedRows.reduce((s, r) => s + Number(r.quantity || 0) * Number(r.unitCost || 0), 0)
          }
        });
      }

      await storeValue("openingStockImportResult", resolvedRows);

      if (typeof ListOpeningStock !== "undefined") await ListOpeningStock.run();
      if (typeof InventorySummaryQuery !== "undefined") await InventorySummaryQuery.run();
      if (typeof InventoryBalanceQuery !== "undefined") await InventoryBalanceQuery.run();
      if (typeof StockMovementsQuery !== "undefined") await StockMovementsQuery.run();

      showAlert(`Opening stock ${openingStockNumber} was imported and posted.`, "success");

      await this.clear();
    } catch (error) {
      showAlert("Error while importing opening stock: " + error.message, "error");
      console.log(error);
    }
  }
};

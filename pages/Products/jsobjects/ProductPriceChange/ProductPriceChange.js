export default {
  rows() {
    return appsmith.store.productPriceChangeItems || [];
  },

  documentId() {
    return Number(appsmith.store.currentPriceChangeId || 0);
  },

  isEditMode() {
    return this.documentId() > 0;
  },

  changeType() {
    return PriceChangeTypeSelect.selectedOptionValue || "PERMANENT";
  },

  effectiveDate() {
    return moment(
      PriceChangeEffectiveDateInput.selectedDate || moment()
    ).format("YYYY-MM-DD");
  },

  normalizeProduct(product = {}) {
    return {
      priceChangeItemId: product.priceChangeItemId || null,
      productId: Number(product.productId || product.id || 0),
      productCode: product.productCode || product.code || "",
      productName: product.productName || product.name || "",
      barcode: product.barcode || "",
      sku: product.sku || "",

      currencyCode: product.currencyCode || "EUR",
      sourcePriceId: product.sourcePriceId || null,

      oldPrice: Number(product.oldPrice || 0),
      newPrice: Number(product.newPrice ?? product.oldPrice ?? 0),
      lowestPrice30Days: Number(
        product.lowestPrice30Days ?? product.oldPrice ?? 0
      ),

      promotionEndDate: product.promotionEndDate || null,
      restorePrice: product.restorePrice ?? product.oldPrice ?? null,
      note: product.note || ""
    };
  },

  async setRows(rows = []) {
    await storeValue(
      "productPriceChangeItems",
      rows.map(row => this.normalizeProduct(row))
    );
  },
	async addSelectedProduct() {
  const productId = Number(
    PriceChangeProductSelect.selectedOptionValue || 0
  );

  if (!productId) {
    showAlert("Select product first.", "warning");
    return;
  }

  const result = await FindProductForPriceChange.run({
    productId,
    effectiveDate: this.effectiveDate()
  });

  const product = result?.[0] || FindProductForPriceChange.data?.[0];

  if (!product) {
    showAlert("Product was not found.", "warning");
    return;
  }

  await this.addProduct(product);
},

  async startNew() {
    await storeValue("currentPriceChangeId", null);
    await storeValue("productPriceChangeItems", []);

    await GetNextPriceChangeNumber.run();

    PriceChangeNumberInput.setValue(
      GetNextPriceChangeNumber.data?.[0]?.nextPriceChangeNumber || ""
    );

    PriceChangeStatusInput.setValue("DRAFT");
    PriceChangeRecordDateInput.setValue(moment().format("YYYY-MM-DD"));
    PriceChangeEffectiveDateInput.setValue(moment().format("YYYY-MM-DD"));
    PriceChangeTypeSelect.setSelectedOption("PERMANENT");
    PriceChangeReasonInput.setValue("");
    PriceChangeNoteInput.setValue("");
    PriceChangePromotionEndDateInp.setValue("");

    if (typeof PriceChangeBarcodeInput !== "undefined") {
      PriceChangeBarcodeInput.setValue("");
    }

    showModal(ProductPriceChangeModal.name);
  },

  async scan(value = null) {
    const lookup = String(
      value || PriceChangeBarcodeInput.text || ""
    ).trim();

    if (!lookup) return;

    try {
      const result = await FindProductForPriceChange.run({
        lookup,
        effectiveDate: this.effectiveDate()
      });

      const product =
        result?.[0] ||
        FindProductForPriceChange.data?.[0];

      if (!product) {
        showAlert("Product was not found.", "warning");
        return;
      }

      await this.addProduct(product);
      PriceChangeBarcodeInput.setValue("");
    } catch (error) {
      showAlert("Error while loading product: " + error.message, "error");
      console.log(error);
    }
  },

  async scanDebounced(value) {
    const lookup = String(value || "").trim();

    if (!lookup || lookup.length < 3) return;

    await storeValue("priceChangeScanLastValue", lookup);

    setTimeout(() => {
      if (appsmith.store.priceChangeScanLastValue === lookup) {
        this.scan(lookup);
      }
    }, 350);
  },

  async addProduct(product = {}) {
    const normalized = this.normalizeProduct(product);

    if (!normalized.productId) {
      showAlert("Product ID is missing.", "error");
      return;
    }

    if (
      this.rows().some(row =>
        Number(row.productId) === normalized.productId
      )
    ) {
      showAlert("Product is already in the price change record.", "warning");
      return;
    }

    await this.setRows([...this.rows(), normalized]);
  },

 async submitItemUpdate() {
  const updated = PriceChangeItemsTable.updatedRow || {};

  const productId = Number(
    updated.productId ||
    updated.product_id ||
    updated["Product ID"] ||
    0
  );

  if (!productId) {
    showAlert(
      "Product ID is missing: " + JSON.stringify(updated),
      "error"
    );
    return;
  }

  const rows = this.rows().map(row => {
    if (Number(row.productId) !== productId) {
      return row;
    }

    return {
      ...row,
      newPrice: Number(updated.newPrice ?? row.newPrice ?? 0),
      promotionEndDate:
        updated.promotionEndDate ??
        row.promotionEndDate ??
        null,
      note: updated.note ?? row.note ?? ""
    };
  });

  await this.setRows(rows);
  showAlert("Price change item updated.", "success");
},

  async removeItem(row = null) {
    const selected =
      row ||
      PriceChangeItemsTable.triggeredRow ||
      PriceChangeItemsTable.selectedRow ||
      {};

    const productId = Number(selected.productId || 0);

    if (!productId) {
      showAlert("Select price change item first.", "warning");
      return;
    }

    await this.setRows(
      this.rows().filter(row =>
        Number(row.productId) !== productId
      )
    );
  },

  reviewRows() {
    const changeType = this.changeType();
    const defaultEndDate =
      PriceChangePromotionEndDateInp.selectedDate || "";

    return this.rows().map(row => {
      const oldPrice = Number(row.oldPrice || 0);
      const newPrice = Number(row.newPrice || 0);
      const lowest = Number(row.lowestPrice30Days || oldPrice || 0);

      const difference = newPrice - oldPrice;

      const changePercent = oldPrice > 0
        ? difference / oldPrice * 100
        : 0;

      const discountVsLowest = lowest > 0 && newPrice < lowest
        ? (1 - newPrice / lowest) * 100
        : 0;

      let validation = "OK";

      if (newPrice <= 0) {
        validation = "NEW PRICE REQUIRED";
      } else if (newPrice === oldPrice) {
        validation = "PRICE NOT CHANGED";
      } else if (
        changeType === "PROMOTION" &&
        newPrice >= lowest
      ) {
        validation = "PROMOTION PRICE MUST BE LOWER";
      } else if (
        changeType === "PROMOTION" &&
        !(row.promotionEndDate || defaultEndDate)
      ) {
        validation = "PROMOTION END DATE REQUIRED";
      }

      return {
        ...row,
        oldPrice: Number(oldPrice.toFixed(2)),
        newPrice: Number(newPrice.toFixed(2)),
        difference: Number(difference.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        lowestPrice30Days: Number(lowest.toFixed(2)),
        discountVsLowest: Number(discountVsLowest.toFixed(2)),

        changeDirection:
          difference < 0
            ? "PRICE DECREASE"
            : difference > 0
              ? "PRICE INCREASE"
              : "NO CHANGE",

        promotionPeriod:
          changeType === "PROMOTION"
            ? `${this.effectiveDate()} - ${
                row.promotionEndDate || defaultEndDate || "-"
              }`
            : "PERMANENT",

        validation
      };
    });
  },

  summary() {
    const rows = this.reviewRows();

    return {
      itemCount: rows.length,

      reducedCount: rows.filter(row =>
        row.changeDirection === "PRICE DECREASE"
      ).length,

      increasedCount: rows.filter(row =>
        row.changeDirection === "PRICE INCREASE"
      ).length,

      invalidCount: rows.filter(row =>
        row.validation !== "OK"
      ).length,

      averageChangePercent: rows.length
        ? Number(
            (
              rows.reduce(
                (sum, row) => sum + Number(row.changePercent || 0),
                0
              ) / rows.length
            ).toFixed(2)
          )
        : 0
    };
  },

  validate() {
    if (!PriceChangeNumberInput.text.trim()) {
      showAlert("Price change number is required.", "warning");
      return false;
    }

    if (!this.rows().length) {
      showAlert("Add at least one product.", "warning");
      return false;
    }

    const invalid = this.reviewRows().find(row =>
      row.validation !== "OK"
    );

    if (invalid) {
      showAlert(
        `${invalid.productCode}: ${invalid.validation}`,
        "warning"
      );
      return false;
    }

    return true;
  },

  async saveDraft() {
    if (!this.validate()) return;

    const wasEditMode = this.isEditMode();
    let priceChangeId = this.documentId();

    const payload = {
      priceChangeId,
      recordNumber: PriceChangeNumberInput.text.trim(),
      recordDate: moment(
        PriceChangeRecordDateInput.selectedDate || moment()
      ).format("YYYY-MM-DD"),
      effectiveDate: this.effectiveDate(),
      changeType: this.changeType(),
      reason: PriceChangeReasonInput.text || null,
      note: PriceChangeNoteInput.text || null
    };

    try {
      if (wasEditMode) {
        await UpdatePriceChangeRecord.run(payload);
        await DeletePriceChangeItems.run({ priceChangeId });
      } else {
        await InsertPriceChangeRecord.run(payload);

        const idRows = await GetPriceChangeIdByNumber.run({
          recordNumber: payload.recordNumber
        });

        const found =
          idRows?.[0] ||
          GetPriceChangeIdByNumber.data?.[0];

        priceChangeId = Number(found?.priceChangeId || 0);

        if (!priceChangeId) {
          showAlert(
            "Price change was saved, but ID was not found.",
            "error"
          );
          return;
        }
      }

      const promotionEndDate =
        PriceChangePromotionEndDateInp.selectedDate
          ? moment(
              PriceChangePromotionEndDateInp.selectedDate
            ).format("YYYY-MM-DD")
          : null;

      for (const row of this.reviewRows()) {
        await InsertPriceChangeItem.run({
          priceChangeId,
          productId: row.productId,
          currencyCode: row.currencyCode,
          sourcePriceId: row.sourcePriceId,
          oldPrice: row.oldPrice,
          newPrice: row.newPrice,
          lowestPrice30Days: row.lowestPrice30Days,
          discountPercent: row.discountVsLowest,
          promotionEndDate:
            row.promotionEndDate || promotionEndDate,
          restorePrice:
            this.changeType() === "PROMOTION"
              ? row.oldPrice
              : null,
          note: row.note || null
        });
      }

      if (typeof AuditLog !== "undefined") {
        await AuditLog.insert({
          entityName: "product_price_change_records",
          entityId: priceChangeId,
          actionType: wasEditMode ? "UPDATE" : "INSERT",
          newValues: {
            record_number: payload.recordNumber,
            effective_date: payload.effectiveDate,
            change_type: payload.changeType,
            item_count: this.rows().length
          }
        });
      }

      await storeValue("currentPriceChangeId", null);
      await storeValue("productPriceChangeItems", []);

      if (typeof ListProductPriceChanges !== "undefined") {
        await ListProductPriceChanges.run();
      }

      closeModal(ProductPriceChangeModal.name);

      showAlert(
        wasEditMode
          ? "Price change record was updated."
          : "Price change record was saved.",
        "success"
      );
    } catch (error) {
      showAlert(
        "Error while saving price change: " + error.message,
        "error"
      );
      console.log(error);
    }
  },

  async loadForEdit(row = null) {
    const selected =
      row ||
      ProductPriceChangesTable.triggeredRow ||
      ProductPriceChangesTable.selectedRow ||
      {};

    const priceChangeId = Number(
      selected.priceChangeId ||
      selected.id ||
      selected.ID ||
      0
    );

    if (!priceChangeId) {
      showAlert("Select price change record first.", "warning");
      return;
    }

    const headerRows = await GetPriceChangeForEdit.run({
      priceChangeId
    });

    const header =
      headerRows?.[0] ||
      GetPriceChangeForEdit.data?.[0];

    if (!header) {
      showAlert("Price change record was not found.", "error");
      return;
    }

    if (header.status !== "DRAFT") {
      showAlert("Only draft records can be edited.", "warning");
      return;
    }

    const itemRows = await GetPriceChangeItemsForEdit.run({
      priceChangeId
    });

    const items =
      itemRows ||
      GetPriceChangeItemsForEdit.data ||
      [];

    await storeValue("currentPriceChangeId", priceChangeId);
    await this.setRows(items);

    PriceChangeNumberInput.setValue(header.recordNumber || "");
    PriceChangeStatusInput.setValue(header.status || "DRAFT");
    PriceChangeRecordDateInput.setValue(header.recordDate || "");
    PriceChangeEffectiveDateInput.setValue(header.effectiveDate || "");
    PriceChangeTypeSelect.setSelectedOption(
      header.changeType || "PERMANENT"
    );
    PriceChangeReasonInput.setValue(header.reason || "");
    PriceChangeNoteInput.setValue(header.note || "");

    showModal(ProductPriceChangeModal.name);
  },
	selectedId(row = null) {
  const selected =
    row ||
    ProductPriceChangesTable.triggeredRow ||
    ProductPriceChangesTable.selectedRow ||
    {};

  return Number(
    selected.priceChangeId ||
    selected.id ||
    selected.ID ||
    0
  );
},

async approve(row = null) {
  const priceChangeId = this.selectedId(row);

  if (!priceChangeId) {
    showAlert("Select price change record first.", "warning");
    return;
  }

  await ApprovePriceChange.run({ priceChangeId });
  await ListProductPriceChanges.run();

  showAlert("Price change record was approved.", "success");
},

async cancelDocument(row = null) {
  const priceChangeId = this.selectedId(row);

  if (!priceChangeId) {
    showAlert("Select price change record first.", "warning");
    return;
  }

  await CancelPriceChange.run({ priceChangeId });
  await ListProductPriceChanges.run();

  showAlert("Price change record was cancelled.", "success");
},

async post(row = null) {
  const priceChangeId = this.selectedId(row);

  if (!priceChangeId) {
    showAlert("Select price change record first.", "warning");
    return;
  }

  try {
    const headerRows = await GetPriceChangeForPost.run({ priceChangeId });
    const header = headerRows?.[0] || GetPriceChangeForPost.data?.[0];

    if (!header || header.status !== "APPROVED") {
      showAlert("Only approved price changes can be posted.", "warning");
      return;
    }

    const itemRows = await GetPriceChangeItemsForPost.run({ priceChangeId });
    const items = itemRows || GetPriceChangeItemsForPost.data || [];

    for (const item of items) {
      const validTo =
        header.changeType === "PROMOTION"
          ? item.promotionEndDate
          : null;

      let newPriceId = null;
      let restorePriceId = null;

      const sameDay =
        item.sourcePriceValidFrom &&
        moment(item.sourcePriceValidFrom).format("YYYY-MM-DD") ===
        moment(header.effectiveDate).format("YYYY-MM-DD");

      if (sameDay) {
        await UpdateSameDaySalePriceForPost.run({
          sourcePriceId: item.sourcePriceId,
          currencyCode: item.currencyCode,
          newPrice: item.newPrice,
          validTo
        });

        newPriceId = item.sourcePriceId;
      } else {
        if (item.sourcePriceId) {
          await CloseCurrentSalePriceForPost.run({
            sourcePriceId: item.sourcePriceId,
            effectiveDate: header.effectiveDate
          });
        }

        await InsertPostedSalePrice.run({
          productId: item.productId,
          currencyCode: item.currencyCode,
          newPrice: item.newPrice,
          effectiveDate: header.effectiveDate,
          validTo
        });

        const newPriceRows = await GetPostedSalePriceId.run({
          productId: item.productId,
          effectiveDate: header.effectiveDate
        });

        newPriceId =
          newPriceRows?.[0]?.priceId ||
          GetPostedSalePriceId.data?.[0]?.priceId ||
          null;
      }

      if (header.changeType === "PROMOTION") {
        await InsertPromotionRestorePrice.run({
          productId: item.productId,
          currencyCode: item.currencyCode,
          restorePrice: item.restorePrice || item.oldPrice,
          promotionEndDate: item.promotionEndDate
        });

        const restoreRows = await GetRestorePriceId.run({
          productId: item.productId,
          promotionEndDate: item.promotionEndDate
        });

        restorePriceId =
          restoreRows?.[0]?.restorePriceId ||
          GetRestorePriceId.data?.[0]?.restorePriceId ||
          null;
      }

      await UpdatePostedPriceChangeItem.run({
        priceChangeItemId: item.priceChangeItemId,
        newPriceId,
        restorePriceId
      });
    }

    await MarkPriceChangePosted.run({ priceChangeId });

    if (typeof AuditLog !== "undefined") {
      await AuditLog.insert({
        entityName: "product_price_change_records",
        entityId: priceChangeId,
        actionType: "POST",
        newValues: {
          source: "Product Price Change",
          status: "POSTED",
          item_count: items.length
        }
      });
    }

    await ListProductPriceChanges.run();
    showAlert("Product prices were successfully posted.", "success");
  } catch (error) {
    showAlert("Error while posting prices: " + error.message, "error");
    console.log(error);
  }
},
	
	async print(row = null) {
  const priceChangeId = this.selectedId(row);

  if (!priceChangeId) {
    showAlert("Select price change record first.", "warning");
    return;
  }

  try {
    await storeValue("selectedPriceChangePrintId", priceChangeId);

    const headerRows = await GetPriceChangePrintHeader.run({
      priceChangeId
    });

    const itemRows = await GetPriceChangePrintItems.run({
      priceChangeId
    });

    const header =
      headerRows?.[0] ||
      GetPriceChangePrintHeader.data?.[0];

    const items =
      itemRows ||
      GetPriceChangePrintItems.data ||
      [];

    if (!header) {
      showAlert("Price change print data was not found.", "error");
      return;
    }

    await storeValue("productPriceChangePrintData", {
      header,
      items,
      printedAt: moment().format("DD.MM.YYYY HH:mm:ss"),
      printedBy: appsmith.store.username || ""
    });

    showModal(ProductPriceChangePrintModal.name);
  } catch (error) {
    showAlert(
      "Error while preparing price change print: " + error.message,
      "error"
    );

    console.log(error);
  }
},

  async cancel() {
    await storeValue("currentPriceChangeId", null);
    await storeValue("productPriceChangeItems", []);
    closeModal(ProductPriceChangeModal.name);
  }
};
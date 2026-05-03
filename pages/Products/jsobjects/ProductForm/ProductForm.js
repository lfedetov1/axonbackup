export default {
  normRows() {
    return appsmith.store.productNormItems || [];
  },

  isEditMode() {
    return appsmith.store.productEditMode === true && !!appsmith.store.currentProductId;
  },

  async startNewProduct() {
    await storeValue("currentProductId", null);
    await storeValue("currentProductNormId", null);
    await storeValue("productEditMode", false);
    await storeValue("productBeforeEdit", null);
    await storeValue("productNormItems", []);

    ProductCodeInput.setValue("");
    ProductNameInput.setValue("");
    ProductShortNameInput.setValue("");
    ProductDescriptionInput.setValue("");
    ProductBarcodeInput.setValue("");
    ProductSkuInput.setValue("");

    if (typeof ProductHsCodeInput !== "undefined") {
      ProductHsCodeInput.setValue("");
    }

    if (typeof ProductCustomsDescriptionInput !== "undefined") {
      ProductCustomsDescriptionInput.setValue("");
    }

    if (typeof ProductIntrastatCodeInput !== "undefined") {
      ProductIntrastatCodeInput.setValue("");
    }

    ProductMinimumStockInput.setValue("0");
    ProductMaximumStockInput.setValue("");
    ProductReorderLevelInput.setValue("");
    ProductPurchasePriceInput.setValue("0");
    ProductSalePriceInput.setValue("0");
    ProductWeightKgInput.setValue("");

    if (typeof ProductNetWeightKgInput !== "undefined") {
      ProductNetWeightKgInput.setValue("");
    }

    if (typeof ProductGrossWeightKgInput !== "undefined") {
      ProductGrossWeightKgInput.setValue("");
    }

    ProductNoteInput.setValue("");

    if (typeof ProductCategorySelect !== "undefined") {
      ProductCategorySelect.setSelectedOption("");
    }

    if (typeof ProductUnitSelect !== "undefined") {
      ProductUnitSelect.setSelectedOption("");
    }

    if (typeof ProductTaxRateSelect !== "undefined") {
      ProductTaxRateSelect.setSelectedOption("");
    }

    if (typeof ProductCountryOfOriginSelect !== "undefined") {
      ProductCountryOfOriginSelect.setSelectedOption("");
    }

    if (typeof ProductCurrencySelect !== "undefined") {
      ProductCurrencySelect.setSelectedOption("EUR");
    }

    if (typeof ProductTypeSelect !== "undefined") {
      ProductTypeSelect.setSelectedOption("GOODS");
    }

    ProductTrackStockSwitch.setValue(true);
    ProductUsedItemSwitch.setValue(false);
    ProductSerialRequiredSwitch.setValue(false);
    ProductActiveSwitch.setValue(true);

    ProductHasNormSwitch.setValue(false);
    ProductNormCodeInput.setValue("");
    ProductNormNameInput.setValue("");
    ProductNormVersionInput.setValue("1.0");
    ProductNormOutputQuantityInput.setValue("1");
    ProductNormActiveSwitch.setValue(true);
    ProductNormNoteInput.setValue("");

    if (typeof ProductNormValidFromInput !== "undefined") {
      ProductNormValidFromInput.setValue("");
    }

    if (typeof ProductNormValidToInput !== "undefined") {
      ProductNormValidToInput.setValue("");
    }

    showModal(addnewproduct.name);
  },
	async loadSelectedProductForEdit() {
  const row = appsmith.store.selectedProductRow || {};

  const productId =
    row.productId ||
    row.product_id ||
    row.id ||
    row.ID ||
    row.ProductID ||
    row["Product ID"];

  const productCode =
    row.productCode ||
    row.product_code ||
    row.code ||
    row.Code ||
    row.ProductCode ||
    row["Product Code"];

  if (!productId && !productCode) {
    showAlert("Selected row does not contain product ID or code.", "error");
    console.log(row);
    return;
  }

  return this.loadProductForEdit(productId || null, productCode || null);
},


  async loadProductForEdit(productId = null, productCode = null) {
    if (!productId && !productCode) {
      showAlert("Select product first.", "warning");
      return;
    }

    try {
      const productRows = await GetProductForEdit.run({
        productId,
        productCode
      });

      const product = productRows?.[0] || GetProductForEdit.data?.[0];

      if (!product) {
        showAlert("Product was not found.", "error");
        return;
      }

      const loadedProductId = product.productId;

      await storeValue("currentProductId", loadedProductId);
      await storeValue("productEditMode", true);
      await storeValue("productBeforeEdit", product);

      ProductCodeInput.setValue(product.productCode || "");
      ProductNameInput.setValue(product.productName || "");
      ProductShortNameInput.setValue(product.shortName || "");
      ProductDescriptionInput.setValue(product.description || "");
      ProductBarcodeInput.setValue(product.barcode || "");
      ProductSkuInput.setValue(product.sku || "");

      if (typeof ProductHsCodeInput !== "undefined") {
        ProductHsCodeInput.setValue(product.hsCode || "");
      }

      if (typeof ProductCustomsDescriptionInput !== "undefined") {
        ProductCustomsDescriptionInput.setValue(product.customsDescription || "");
      }

      if (typeof ProductIntrastatCodeInput !== "undefined") {
        ProductIntrastatCodeInput.setValue(product.intrastatCode || "");
      }

      ProductMinimumStockInput.setValue(String(product.minimumStock || 0));
      ProductMaximumStockInput.setValue(product.maximumStock === null || product.maximumStock === undefined ? "" : String(product.maximumStock));
      ProductReorderLevelInput.setValue(product.reorderLevel === null || product.reorderLevel === undefined ? "" : String(product.reorderLevel));
      ProductPurchasePriceInput.setValue(String(product.purchasePrice || 0));
      ProductSalePriceInput.setValue(String(product.salePrice || 0));
      ProductWeightKgInput.setValue(product.weightKg === null || product.weightKg === undefined ? "" : String(product.weightKg));

      if (typeof ProductNetWeightKgInput !== "undefined") {
        ProductNetWeightKgInput.setValue(product.netWeightKg === null || product.netWeightKg === undefined ? "" : String(product.netWeightKg));
      }

      if (typeof ProductGrossWeightKgInput !== "undefined") {
        ProductGrossWeightKgInput.setValue(product.grossWeightKg === null || product.grossWeightKg === undefined ? "" : String(product.grossWeightKg));
      }

      ProductNoteInput.setValue(product.note || "");

      if (typeof ProductCategorySelect !== "undefined") {
        ProductCategorySelect.setSelectedOption(product.categoryId ? String(product.categoryId) : "");
      }

      if (typeof ProductUnitSelect !== "undefined") {
        ProductUnitSelect.setSelectedOption(product.unitId ? String(product.unitId) : "");
      }

      if (typeof ProductTaxRateSelect !== "undefined") {
        ProductTaxRateSelect.setSelectedOption(product.taxRateId ? String(product.taxRateId) : "");
      }

      if (typeof ProductCountryOfOriginSelect !== "undefined") {
        ProductCountryOfOriginSelect.setSelectedOption(product.countryOfOriginId ? String(product.countryOfOriginId) : "");
      }

      if (typeof ProductCurrencySelect !== "undefined") {
        ProductCurrencySelect.setSelectedOption("EUR");
      }

      if (typeof ProductTypeSelect !== "undefined") {
        ProductTypeSelect.setSelectedOption(product.productType || "GOODS");
      }

      ProductTrackStockSwitch.setValue(Number(product.trackStock || 0) === 1);
      ProductUsedItemSwitch.setValue(Number(product.isUsedItem || 0) === 1);
      ProductSerialRequiredSwitch.setValue(Number(product.serialNumberRequired || 0) === 1);
      ProductActiveSwitch.setValue(Number(product.isActive || 0) === 1);

      const normRows = await GetProductNormForEdit.run({
        productId: loadedProductId
      });
      const norm = normRows?.[0] || GetProductNormForEdit.data?.[0];

      if (norm?.productNormId) {
        await storeValue("currentProductNormId", norm.productNormId);
        ProductHasNormSwitch.setValue(true);

        ProductNormCodeInput.setValue(norm.normCode || "");
        ProductNormNameInput.setValue(norm.normName || product.productName || "");
        ProductNormVersionInput.setValue(norm.versionNo || "1.0");
        ProductNormOutputQuantityInput.setValue(String(norm.outputQuantity || 1));

        if (typeof ProductNormValidFromInput !== "undefined") {
          ProductNormValidFromInput.setValue(norm.validFrom || "");
        }

        if (typeof ProductNormValidToInput !== "undefined") {
          ProductNormValidToInput.setValue(norm.validTo || "");
        }

        ProductNormActiveSwitch.setValue(Number(norm.isActive || 0) === 1);
        ProductNormNoteInput.setValue(norm.normNote || "");

        const itemRows = await GetProductNormItemsForEdit.run({
          productNormId: norm.productNormId
        });

        await storeValue(
          "productNormItems",
          (itemRows || GetProductNormItemsForEdit.data || []).map((row, index) => ({
            lineNo: index + 1,
            componentProductId: row.componentProductId,
            componentCode: row.componentCode,
            componentName: row.componentName,
            quantity: String(row.quantity || "0"),
            unitId: row.unitId,
            unitCode: row.unitCode,
            unitName: row.unitName,
            wastePercent: String(row.wastePercent || "0"),
            note: row.note || ""
          }))
        );
      } else {
        await storeValue("currentProductNormId", null);
        await storeValue("productNormItems", []);
        ProductHasNormSwitch.setValue(false);

        ProductNormCodeInput.setValue("");
        ProductNormNameInput.setValue("");
        ProductNormVersionInput.setValue("1.0");
        ProductNormOutputQuantityInput.setValue("1");
        ProductNormActiveSwitch.setValue(true);
        ProductNormNoteInput.setValue("");
      }

      showModal(addnewproduct.name);
      showAlert("Product loaded for editing.", "success");
    } catch (error) {
      showAlert("Error while loading product: " + error.message, "error");
      console.log(error);
    }
  },

  getAuditValues(productId = null, productNormId = null) {
    return {
      source: "Product form",
      product_id: productId,
      code: ProductCodeInput.text,
      name: ProductNameInput.text,
      unit_id: ProductUnitSelect.selectedOptionValue,
      category_id: typeof ProductCategorySelect !== "undefined" ? ProductCategorySelect.selectedOptionValue : null,
      tax_rate_id: typeof ProductTaxRateSelect !== "undefined" ? ProductTaxRateSelect.selectedOptionValue : null,
      product_type: typeof ProductTypeSelect !== "undefined" ? ProductTypeSelect.selectedOptionValue : null,
      track_stock: typeof ProductTrackStockSwitch !== "undefined" ? ProductTrackStockSwitch.isSwitchedOn : null,
      sale_price: ProductSalePriceInput.text,
      purchase_price: ProductPurchasePriceInput.text,
      has_norm: ProductHasNormSwitch.isSwitchedOn,
      norm_id: productNormId,
      norm_item_count: ProductHasNormSwitch.isSwitchedOn ? this.normRows().length : 0
    };
  },

  async save() {
    if (!ProductCodeInput.text) {
      showAlert("Product code is required.", "warning");
      return;
    }

    if (!ProductNameInput.text) {
      showAlert("Product name is required.", "warning");
      return;
    }

    if (!ProductUnitSelect.selectedOptionValue) {
      showAlert("Unit is required.", "warning");
      return;
    }

    if (ProductHasNormSwitch.isSwitchedOn && !this.normRows().length) {
      showAlert("Add at least one norm component.", "warning");
      return;
    }

    const wasEditMode = this.isEditMode();

    try {
      let productId = appsmith.store.currentProductId || null;
      let productNormId = appsmith.store.currentProductNormId || null;
      const rows = this.normRows();

      if (wasEditMode) {
        await UpdateProduct.run({ productId });

        if (Number(ProductSalePriceInput.text || 0) > 0 || Number(ProductPurchasePriceInput.text || 0) > 0) {
          await ExpireProductPrices.run({ productId });
        }
      } else {
        const productResponse = await InsertProduct.run();

        productId =
          productResponse?.insertId ||
          productResponse?.[0]?.insertId ||
          InsertProduct.data?.insertId ||
          InsertProduct.data?.[0]?.insertId;

        if (!productId) {
          showAlert("Product was saved, but product ID was not returned.", "error");
          console.log(productResponse);
          return;
        }

        await storeValue("currentProductId", productId);
      }

      if (Number(ProductSalePriceInput.text || 0) > 0) {
        await InsertProductSalePrice.run({ productId });
      }

      if (Number(ProductPurchasePriceInput.text || 0) > 0) {
        await InsertProductPurchasePrice.run({ productId });
      }

      if (ProductHasNormSwitch.isSwitchedOn) {
        if (productNormId) {
          await UpdateProductNorm.run({ productNormId, productId });
          await DeleteProductNormItems.run({ productNormId });
        } else {
          const normResponse = await InsertProductNorm.run({ productId });

          productNormId =
            normResponse?.insertId ||
            normResponse?.[0]?.insertId ||
            InsertProductNorm.data?.insertId ||
            InsertProductNorm.data?.[0]?.insertId;

          if (!productNormId) {
            showAlert("Product was saved, but norm ID was not returned.", "error");
            console.log(normResponse);
            return;
          }

          await storeValue("currentProductNormId", productNormId);
        }

        for (let i = 0; i < rows.length; i += 1) {
          await InsertProductNormItem.run({
            productNormId,
            lineNo: i + 1,
            componentProductId: rows[i].componentProductId,
            quantity: rows[i].quantity,
            unitId: rows[i].unitId,
            wastePercent: rows[i].wastePercent || 0,
            note: rows[i].note || null
          });
        }
      }

      await AuditLog.insert({
        entityName: "products",
        entityId: productId,
        actionType: wasEditMode ? "UPDATE" : "INSERT",
        oldValues: wasEditMode ? appsmith.store.productBeforeEdit || null : null,
        newValues: this.getAuditValues(productId, productNormId)
      });

      if (productNormId) {
        await AuditLog.insert({
          entityName: "product_norms",
          entityId: productNormId,
          actionType: wasEditMode ? "UPDATE" : "INSERT",
          newValues: {
            source: "Product form",
            product_id: productId,
            product_code: ProductCodeInput.text,
            product_name: ProductNameInput.text,
            norm_item_count: rows.length
          }
        });
      }

      await storeValue("productNormItems", []);
      await storeValue("productEditMode", false);
      await storeValue("currentProductId", null);
      await storeValue("currentProductNormId", null);
      await storeValue("productBeforeEdit", null);

      if (typeof SearchProducts !== "undefined") {
        await SearchProducts.run();
      }

      if (typeof InsertAuditLog !== "undefined") {
        await InsertAuditLog.run();
      }

      closeModal(addnewproduct.name);
      showAlert(wasEditMode ? "Product was updated." : "Product was saved.", "success");
    } catch (error) {
      showAlert("Error while saving product: " + error.message, "error");
      console.log(error);
    }
  }
};

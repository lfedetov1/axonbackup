export default {
  async openFromRow(row) {
    const productCode = row?.Code || row?.code || row?.productCode || row?.["Product Code"];

    if (!productCode) {
      showAlert("Select product first.", "warning");
      return;
    }

    await storeValue("reportProductCode", productCode);

    return this.open();
  },

  async open() {
    if (!appsmith.store.reportProductCode) {
      showAlert("Select product first.", "warning");
      return;
    }

    try {
      await GetProductForEdit.run({
        productId: null,
        productCode: appsmith.store.reportProductCode
      });

      const product = GetProductForEdit.data?.[0];

      if (!product?.productId) {
        showAlert("Product was not found.", "error");
        return;
      }

      await storeValue("reportProductId", product.productId);

      await Promise.all([
        GetProductAvailability.run(),
        GetProductPricingHistory.run(),
        GetProductInventoryMovements.run(),
        GetProductSalesLines.run(),
        GetProductPurchaseLines.run(),
        GetProductNormForEdit.run({ productId: product.productId }),
        GetProductImportHistory.run()
      ]);

      const norm = GetProductNormForEdit.data?.[0];

      if (norm?.productNormId) {
        await GetProductNormItemsForEdit.run({
          productNormId: norm.productNormId
        });
      }

      showModal("ProductReportModal");
    } catch (error) {
      showAlert("Error while opening product report: " + error.message, "error");
      console.log(error);
    }
  }
};

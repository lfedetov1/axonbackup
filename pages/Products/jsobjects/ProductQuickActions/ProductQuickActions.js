export default {
  selectedProduct() {
    return ProductsTable.selectedRow || ProductsTable.triggeredRow || {};
  },

  async prepare(action) {
    const product = this.selectedProduct();

    const productId =
      product.productId ||
      product["Product ID"] ||
      product.id ||
      product.ID;

    if (!productId) {
      showAlert("Select product first.", "warning");
      return false;
    }

    await storeValue("quickActionProduct", {
      productId,
      productCode: product.Code || product.code || product.productCode || "",
      productName: product.Name || product.name || product.productName || "",
      barcode: product.Barcode || product.barcode || ""
    });

    await storeValue("productQuickAction", action);
    return true;
  }
};
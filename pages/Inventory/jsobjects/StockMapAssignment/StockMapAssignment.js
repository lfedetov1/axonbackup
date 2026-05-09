export default {
  selectedLocation() {
    return (ListWarehouseLocations.data || []).find(
      x => Number(x.locationId) === Number(appsmith.store.selectedWarehouseLocationId)
    ) || null;
  },

  async findProduct() {
    const lookup = String(StockMapProductLookupInput.text || "").trim();

    if (!lookup) {
      showAlert("Enter product code, barcode, SKU, or name.", "warning");
      return null;
    }

    const rows = await FindStockMapProduct.run({ lookup });
    const product = rows?.[0] || FindStockMapProduct.data?.[0];

    if (!product) {
      showAlert("Product was not found.", "warning");
      return null;
    }

    await storeValue("stockMapSelectedProduct", product);
    StockMapProductLabelInput.setValue(`${product.productCode} - ${product.productName}`);

    return product;
  },

  async save() {
    const location = this.selectedLocation();

    if (!location && !appsmith.store.selectedWarehouseLocationId) {
      showAlert("Select warehouse location first.", "warning");
      return;
    }

    let product = appsmith.store.stockMapSelectedProduct;

    if (!product?.productId) {
      product = await this.findProduct();
    }

    if (!product?.productId) return;

    await InsertWarehouseLocationProduct.run({
      productId: product.productId
    });

    await ListWarehouseLocations.run();
    await ListWarehouseLocationProducts.run({
      locationId: appsmith.store.selectedWarehouseLocationId
    });

    await storeValue("stockMapSelectedProduct", null);
    closeModal(StockMapProductModal.name);
    showAlert("Product location was saved.", "success");
  },

  async cancel() {
    await storeValue("stockMapSelectedProduct", null);
    closeModal(StockMapProductModal.name);
  }
};

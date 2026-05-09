export default {
  async searchAndNavigate() {
    const lookup = String(StockMapFindProductInput.text || "").trim();

    if (!lookup) {
      showAlert("Enter product code, barcode, SKU, or name.", "warning");
      return;
    }

    await ListWarehouseLocations.run();

    const rows = await FindProductWarehouseLocations.run();
    const foundRows = rows || FindProductWarehouseLocations.data || [];

    if (!foundRows.length) {
      await storeValue("stockMapFoundLocations", []);
      await storeValue("stockMapFoundProduct", null);
      await storeValue("stockMapTargetLocationId", null);

      showAlert("Product was not found on warehouse locations.", "warning");
      return;
    }

    const primary =
      foundRows.find(x => Number(x.isPrimaryLocation || 0) === 1) ||
      foundRows[0];

    await storeValue("stockMapFoundLocations", foundRows);

    await storeValue("stockMapFoundProduct", {
      productId: primary.productId,
      productCode: primary.productCode,
      productName: primary.productName,
      barcode: primary.barcode,
      warehouseStock: primary.warehouseStock,
      locationCode: primary.locationCode,
      locationName: primary.locationName
    });

    await storeValue("stockMapTargetLocationId", primary.locationId);
    await storeValue("selectedWarehouseLocationId", primary.locationId);

    if (typeof ListWarehouseLocationProducts !== "undefined") {
      await ListWarehouseLocationProducts.run({
        locationId: primary.locationId
      });
    }

    showAlert(`Location found: ${primary.locationCode}`, "success");
  },
	

  async clearNavigation() {
    StockMapFindProductInput.setValue("");

    await storeValue("stockMapFoundLocations", []);
    await storeValue("stockMapFoundProduct", null);
    await storeValue("stockMapTargetLocationId", null);
  }
};

export default {
  async refresh(filters = null) {
    const selected =
      filters ||
      ProductDashboardCustom.model?.filters ||
      {};

    await storeValue(
      "productDashboardDateFrom",
      selected.dateFrom || moment().startOf("month").format("YYYY-MM-DD")
    );

    await storeValue(
      "productDashboardDateTo",
      selected.dateTo || moment().format("YYYY-MM-DD")
    );

    await storeValue(
      "productDashboardWarehouseId",
      Number(selected.warehouseId || 0)
    );

    await storeValue(
      "productDashboardCategoryId",
      Number(selected.categoryId || 0)
    );

    try {
      await Promise.all([
        GetProductDashboardOverview.run(),
        GetProductDashboardAlerts.run(),
        GetProductDashboardTopProducts.run(),
        GetProductDashboardSlowProduct.run(),
        GetProductDashboardSalesTrend.run(),
        GetProductDashboardPriceChange.run(),
        GetProductDashboardWarehouseSt.run()
      ]);

      await storeValue(
        "productDashboardRefreshedAt",
        moment().format("DD.MM.YYYY HH:mm:ss")
      );

      showAlert("Product dashboard refreshed.", "success");
    } catch (error) {
      showAlert(
        "Error while refreshing Product Dashboard: " + error.message,
        "error"
      );

      console.log(error);
    }
  },

  async load() {
    await Promise.all([
      ListProductDashboardWarehouses.run(),
      ListProductDashboardCategories.run()
    ]);

    await this.refresh();
  }
};
export default {
  canViewAllWarehouses() {
    const roles = appsmith.store.roleCodes || [];
    const permissions = appsmith.store.permissions || [];

    return (
      roles.includes("ADMIN") ||
      roles.includes("OWNER") ||
      permissions.includes("inventory.warehouse.all") ||
      permissions.includes("inventory.view_all_warehouses") ||
      permissions.includes("inventory.analytics.all_warehouses")
    );
  },

  defaultWarehouseId() {
    return this.canViewAllWarehouses()
      ? 0
      : Number(appsmith.store.warehouseId1 || appsmith.store.warehouseId || 0);
  },

  async setPeriod(period = "30D", customFrom = null, customTo = null) {
    let dateFrom = moment().subtract(30, "days").format("YYYY-MM-DD");
    let dateTo = moment().format("YYYY-MM-DD");

    if (period === "TODAY") {
      dateFrom = moment().format("YYYY-MM-DD");
      dateTo = moment().format("YYYY-MM-DD");
    }

    if (period === "7D") {
      dateFrom = moment().subtract(7, "days").format("YYYY-MM-DD");
      dateTo = moment().format("YYYY-MM-DD");
    }

    if (period === "30D") {
      dateFrom = moment().subtract(30, "days").format("YYYY-MM-DD");
      dateTo = moment().format("YYYY-MM-DD");
    }

    if (period === "MONTH") {
      dateFrom = moment().startOf("month").format("YYYY-MM-DD");
      dateTo = moment().format("YYYY-MM-DD");
    }

    if (period === "CUSTOM") {
      dateFrom = moment(customFrom || moment().subtract(30, "days")).format("YYYY-MM-DD");
      dateTo = moment(customTo || moment()).format("YYYY-MM-DD");
    }

    await storeValue("inventoryAnalyticsPeriod", period);
    await storeValue("inventoryAnalyticsDateFrom", dateFrom);
    await storeValue("inventoryAnalyticsDateTo", dateTo);
  },

  async setWarehouse(warehouseId = null) {
    const requested = Number(warehouseId ?? this.defaultWarehouseId());

    if (!this.canViewAllWarehouses()) {
      await storeValue("inventoryAnalyticsWarehouseId", Number(appsmith.store.warehouseId1 || appsmith.store.warehouseId || 0));
      return;
    }

    await storeValue("inventoryAnalyticsWarehouseId", requested);
  },

  async setupDefaults() {
    if (!appsmith.store.inventoryAnalyticsPeriod) {
      await this.setPeriod("30D");
    }

    if (appsmith.store.inventoryAnalyticsWarehouseId === undefined || appsmith.store.inventoryAnalyticsWarehouseId === null) {
      await this.setWarehouse(this.defaultWarehouseId());
    }

    await ListInventoryAnalyticsWarehous.run();
  },

  async load() {
    await this.setupDefaults();

    const overviewRows = await GetInventoryAnalyticsOverview.run();
    const alertRows = await GetInventoryAnalyticsAlerts.run();
    const movementRows = await GetInventoryAnalyticsMovements.run();
    const transferRows = await GetInventoryAnalyticsTransfers.run();
    const packageRows = await GetInventoryAnalyticsPackages.run();
    const topStockRows = await GetInventoryAnalyticsTopStock.run();
    const breakdownRows = await GetInventoryAnalyticsWarehouse.run();

    const warehouseId = Number(appsmith.store.inventoryAnalyticsWarehouseId || 0);
    const warehouses = ListInventoryAnalyticsWarehous.data || [];
    const selectedWarehouse = warehouses.find(w => Number(w.value) === warehouseId) || {};

    await storeValue("inventoryAnalyticsData", {
      controls: {
        warehouseId,
        period: appsmith.store.inventoryAnalyticsPeriod || "30D",
        dateFrom: appsmith.store.inventoryAnalyticsDateFrom || moment().subtract(30, "days").format("YYYY-MM-DD"),
        dateTo: appsmith.store.inventoryAnalyticsDateTo || moment().format("YYYY-MM-DD")
      },

      canViewAllWarehouses: this.canViewAllWarehouses(),
      warehouses,

      warehouseId,
      warehouseName:
        selectedWarehouse.label ||
        selectedWarehouse.name ||
        appsmith.store.warehouseName ||
        "Selected Warehouse",

      generatedAt: moment().format("DD.MM.YYYY HH:mm:ss"),
      generatedBy: appsmith.store.username || "",

      overview: overviewRows?.[0] || GetInventoryAnalyticsOverview.data?.[0] || {},
      alerts: alertRows || GetInventoryAnalyticsAlerts.data || [],
      movements: movementRows || GetInventoryAnalyticsMovements.data || [],
      transfers: transferRows || GetInventoryAnalyticsTransfers.data || [],
      packages: packageRows || GetInventoryAnalyticsPackages.data || [],
      topStock: topStockRows || GetInventoryAnalyticsTopStock.data || [],
      warehouseBreakdown: breakdownRows || GetInventoryAnalyticsWarehouse.data || []
    });
  },

  async applyFromCustom(controls = {}) {
    const period = controls.period || appsmith.store.inventoryAnalyticsPeriod || "30D";
    const warehouseId =
      controls.warehouseId !== undefined
        ? Number(controls.warehouseId)
        : Number(appsmith.store.inventoryAnalyticsWarehouseId || this.defaultWarehouseId());

    await this.setWarehouse(warehouseId);
    await this.setPeriod(period, controls.dateFrom, controls.dateTo);

    await this.load();
  },

  async loadSilent() {
    try {
      await this.load();
    } catch (error) {
      showAlert("Error while loading inventory analytics: " + error.message, "error");
      console.log(error);
    }
  },

  async loadWithLoader() {
    return AppLoader.run(
      "Loading inventory analytics",
      "Preparing warehouse dashboard...",
      async () => {
        await this.load();
      }
    );
  }
};
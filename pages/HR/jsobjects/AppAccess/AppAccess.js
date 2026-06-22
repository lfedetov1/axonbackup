export default {
  roleCodes() {
    return appsmith.store.roleCodes || [];
  },

  permissions() {
    return appsmith.store.permissions || [];
  },

  isAdmin() {
    return this.roleCodes().includes("ADMIN") || appsmith.store.isAdmin === true;
  },

  has(code) {
    return this.isAdmin() || this.permissions().includes(code);
  },

  hasAny(codes = []) {
    return this.isAdmin() || codes.some(code => this.permissions().includes(code));
  },

  canViewTab(moduleName, tabName) {
    return this.has(`${moduleName}.${tabName}.view`);
  },

  canViewAllWarehouses() {
    return (
      this.isAdmin() ||
      appsmith.store.canViewAllWarehouses === true ||
      this.has("inventory.warehouse_all") ||
      this.has("sales.view_all_warehouses")
    );
  },

  warehouseIds() {
    return appsmith.store.warehouseAccessIds || [];
  },

  canUseWarehouse(warehouseId) {
    const id = Number(warehouseId || 0);

    if (this.canViewAllWarehouses()) return true;
    if (!id) return false;

    return this.warehouseIds().includes(id);
  },

  canViewCost() {
    return this.has("sales.view_cost") || this.has("inventory.view_cost");
  },

  canViewMargin() {
    return this.has("sales.view_margin");
  },

  canViewSensitiveTotals() {
    return this.has("sales.sensitive_totals.view");
  }
};
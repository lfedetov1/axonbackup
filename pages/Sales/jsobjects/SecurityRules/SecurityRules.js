export default {
  roleCodes() {
    return appsmith.store.roleCodes || [];
  },

  permissions() {
    return appsmith.store.permissions || [];
  },

  isAdmin() {
    return this.roleCodes().includes("ADMIN") || this.roleCodes().includes("OWNER");
  },

  can(code) {
    return this.isAdmin() || this.permissions().includes(code);
  },

  canAny(codes = []) {
    return this.isAdmin() || codes.some(code => this.permissions().includes(code));
  },

  canViewCost() {
    return this.canAny([
      "cost.view",
      "inventory.cost.view",
      "purchase.cost.view",
      "product.cost.view"
    ]);
  },

  canViewMargin() {
    return this.canAny([
      "margin.view",
      "sales.margin.view",
      "finance.margin.view"
    ]);
  },

  canViewSensitive() {
    return this.canAny([
      "sensitive.view",
      "finance.view",
      "admin.sensitive.view"
    ]);
  },

  secureRows(rows = []) {
    return (rows || []).map(row => {
      if (this.canViewCost() && this.canViewMargin()) return row;

      return {
        ...row,

        purchasePrice: this.canViewCost() ? row.purchasePrice : null,
        purchase_price: this.canViewCost() ? row.purchase_price : null,
        unitCost: this.canViewCost() ? row.unitCost : null,
        unit_cost: this.canViewCost() ? row.unit_cost : null,
        averageCost: this.canViewCost() ? row.averageCost : null,
        average_cost: this.canViewCost() ? row.average_cost : null,
        stockValue: this.canViewCost() ? row.stockValue : null,
        stock_value: this.canViewCost() ? row.stock_value : null,

        marginAmount: this.canViewMargin() ? row.marginAmount : null,
        marginPercent: this.canViewMargin() ? row.marginPercent : null,
        grossMargin: this.canViewMargin() ? row.grossMargin : null
      };
    });
  }
};
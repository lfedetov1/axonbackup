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

  canViewTab(module, tab) {
    return this.can(`${module}.${tab}.view`);
  },

  canCreate(module, area) {
    return this.can(`${module}.${area}.create`);
  },

  canEdit(module, area) {
    return this.can(`${module}.${area}.edit`);
  },

  canPost(module, area) {
    return this.can(`${module}.${area}.post`);
  },

  canVoid(module, area) {
    return this.can(`${module}.${area}.void`);
  },

  canPrint(module, area) {
    return this.can(`${module}.${area}.print`);
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
      "product.margin.view"
    ]);
  }
};
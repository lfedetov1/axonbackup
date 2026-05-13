export default {
  async load() {
    await GetCurrentUserPermissions.run();

    const rows = GetCurrentUserPermissions.data || [];
    const permissions = rows.map(row => row.permissionCode);
    const roleCode = rows?.[0]?.roleCode || "";

    await storeValue("permissions", permissions);
    await storeValue("roleCode", roleCode);
  },

  permissions() {
    return appsmith.store.permissions || [];
  },

  roleCode() {
    return appsmith.store.roleCode || "";
  },

  isAdmin() {
    return ["ADMIN", "OWNER"].includes(this.roleCode());
  },

  can(code) {
    return this.isAdmin() || this.permissions().includes(code);
  },

  canAny(codes = []) {
    return this.isAdmin() || codes.some(code => this.can(code));
  },

  canAll(codes = []) {
    return this.isAdmin() || codes.every(code => this.can(code));
  }
};

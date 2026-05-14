export default {
  async load() {
    await storeValue("authLoaded", false);
    await GetCurrentUserPermissions.run();

    const rows = GetCurrentUserPermissions.data || [];

    const permissions = _.uniq(
      rows
        .map(row => row.permissionCode || row.permission_code || row.code || "")
        .filter(Boolean)
    );

    const roleCodes = _.uniq(
      rows
        .map(row => row.roleCode || row.role_code || row.RoleCode || "")
        .filter(Boolean)
    );

    await storeValue("permissions", permissions);
    await storeValue("roleCodes", roleCodes);
    await storeValue("roleCode", roleCodes[0] || "");
    await storeValue("authLoaded", true);
  },

  permissions() {
    return appsmith.store.permissions || [];
  },

  roleCodes() {
    return appsmith.store.roleCodes || [];
  },

  isAdmin() {
    const roles = this.roleCodes();
    return roles.includes("ADMIN") || roles.includes("OWNER");
  },

  can(code) {
    return this.isAdmin() || this.permissions().includes(code);
  },

  canAny(codes = []) {
    return this.isAdmin() || codes.some(code => this.permissions().includes(code));
  },

  canAll(codes = []) {
    return this.isAdmin() || codes.every(code => this.permissions().includes(code));
  },

  debug() {
    return {
      userId: appsmith.store.userId,
      companyId: appsmith.store.companyId,
      roleCode: appsmith.store.roleCode,
      roleCodes: appsmith.store.roleCodes,
      permissionsCount: this.permissions().length,
      sample: this.permissions().slice(0, 10)
    };
  }
};

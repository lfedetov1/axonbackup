export default {
  async loadAccess() {
    const rows = await GetCurrentUserAccess.run();
    const data = rows || GetCurrentUserAccess.data || [];

    await storeValue(
      "roleCodes",
      [...new Set(data.map(row => row.roleCode).filter(Boolean))]
    );

    await storeValue(
      "permissions",
      [...new Set(data.map(row => row.permissionCode).filter(Boolean))]
    );

    return {
      roleCodes: appsmith.store.roleCodes || [],
      permissions: appsmith.store.permissions || []
    };
  },

  async initSalesPage() {
    await this.loadAccess();

    if (typeof SalesNav !== "undefined" && SalesNav.init) {
      await SalesNav.init();
    }

    if (typeof SalesNav !== "undefined" && SalesNav.refreshForTab) {
      await SalesNav.refreshForTab();
    }
  }
};
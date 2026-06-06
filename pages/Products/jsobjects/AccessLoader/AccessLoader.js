export default {
  async load() {
    const roleRows = await LoadCurrentUserRoles.run();
    const permissionRows = await LoadCurrentUserPermissions.run();
    const warehouseRows = await LoadCurrentUserWarehouses.run();

    const roles = roleRows || LoadCurrentUserRoles.data || [];
    const permissionData = permissionRows || LoadCurrentUserPermissions.data || [];
    const warehouseData = warehouseRows || LoadCurrentUserWarehouses.data || [];

    const roleCodes = roles
      .map(row => row.roleCode)
      .filter(Boolean);

    const permissions = permissionData
      .map(row => row.permissionCode)
      .filter(Boolean);

    const warehouseIds = warehouseData
      .map(row => Number(row.warehouseId || 0))
      .filter(Boolean);

    const isAdmin = roleCodes.includes("ADMIN");

    const canViewAllWarehouses =
      isAdmin ||
      permissions.includes("inventory.warehouse_all") ||
      permissions.includes("sales.view_all_warehouses");

    await storeValue("roleCodes", roleCodes);
    await storeValue("permissions", permissions);
    await storeValue("warehouseAccessIds", warehouseIds);
    await storeValue("isAdmin", isAdmin);
    await storeValue("canViewAllWarehouses", canViewAllWarehouses);

    return {
      roleCodes,
      permissions,
      warehouseIds,
      isAdmin,
      canViewAllWarehouses
    };
  }
};
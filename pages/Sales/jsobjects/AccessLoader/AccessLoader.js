export default {
  async load() {
    const rows = await LoadCurrentUserAccess.run();
    const data = rows || LoadCurrentUserAccess.data || [];
    const row = data.length ? data[0] : {};

    const roleCodes = String(row.roleCodes || "")
      .split(",")
      .filter(Boolean);

    const permissions = String(row.permissionCodes || "")
      .split(",")
      .filter(Boolean);

    const warehouseIds = String(row.warehouseIds || "")
      .split(",")
      .filter(Boolean)
      .map(x => Number(x));

    await storeValue("roleCodes", roleCodes);
    await storeValue("permissions", permissions);
    await storeValue("warehouseAccessIds", warehouseIds);
    await storeValue("isAdmin", Number(row.isAdmin || 0) === 1);
    await storeValue("canViewAllWarehouses", Number(row.canViewAllWarehouses || 0) === 1);

    return {
      roleCodes,
      permissions,
      warehouseIds
    };
  }
};
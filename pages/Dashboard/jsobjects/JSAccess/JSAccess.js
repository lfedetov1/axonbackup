export default {
  isAdmin() {
    return appsmith.store.roleCode === "ADMIN";
  },

  has(permissionCode) {
    return (
      appsmith.store.roleCode === "ADMIN" ||
      (appsmith.store.permissions || []).includes(permissionCode)
    );
  },

  hasAny(permissionCodes) {
    return (
      appsmith.store.roleCode === "ADMIN" ||
      permissionCodes.some(code =>
        (appsmith.store.permissions || []).includes(code)
      )
    );
  },

  hasAll(permissionCodes) {
    return (
      appsmith.store.roleCode === "ADMIN" ||
      permissionCodes.every(code =>
        (appsmith.store.permissions || []).includes(code)
      )
    );
  }
};

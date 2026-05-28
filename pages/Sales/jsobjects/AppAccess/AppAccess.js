export default {
  list(value) {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value
        .map(x =>
          typeof x === "string"
            ? x
            : x.code || x.name || x.roleCode || x.permissionCode || x.value || ""
        )
        .filter(Boolean);
    }

    if (typeof value === "string") {
      return value.split(",").map(x => x.trim()).filter(Boolean);
    }

    if (typeof value === "object") {
      return Object.values(value)
        .map(x =>
          typeof x === "string"
            ? x
            : x?.code || x?.name || x?.roleCode || x?.permissionCode || x?.value || ""
        )
        .filter(Boolean);
    }

    return [];
  },

  roleCodes() {
    return this.list(appsmith.store.roleCodes).map(x => String(x).toUpperCase());
  },

  permissions() {
    return this.list(appsmith.store.permissions).map(x => String(x).toLowerCase());
  },

  isAdmin() {
    const roles = this.roleCodes();

    return (
      roles.includes("ADMIN") ||
      roles.includes("OWNER") ||
      roles.includes("SUPERADMIN") ||
      roles.includes("SUPER_ADMIN")
    );
  },

  can(code) {
    if (this.isAdmin()) return true;

    return this.permissions().includes(String(code || "").toLowerCase());
  },

  canAny(codes = []) {
    if (this.isAdmin()) return true;

    return codes.some(code => this.can(code));
  },

  canViewTab(module, tab) {
    const m = String(module || "").toLowerCase();
    const t = String(tab || "").toLowerCase();

    return this.canAny([
      `${m}.${t}.view`,
      `${m}.${t}.manage`,
      `${m}.view`,
      `${m}.manage`
    ]);
  },

  canCreate(module, area) {
    return this.canAny([
      `${module}.${area}.create`,
      `${module}.${area}.manage`,
      `${module}.manage`
    ]);
  },

  canEdit(module, area) {
    return this.canAny([
      `${module}.${area}.edit`,
      `${module}.${area}.manage`,
      `${module}.manage`
    ]);
  },

  canPost(module, area) {
    return this.canAny([
      `${module}.${area}.post`,
      `${module}.${area}.manage`,
      `${module}.manage`
    ]);
  },

  canVoid(module, area) {
    return this.canAny([
      `${module}.${area}.void`,
      `${module}.${area}.manage`,
      `${module}.manage`
    ]);
  },

  canPrint(module, area) {
    return this.canAny([
      `${module}.${area}.print`,
      `${module}.${area}.manage`,
      `${module}.manage`
    ]);
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
  },

  debug() {
    return {
      roleCodes: appsmith.store.roleCodes,
      permissions: appsmith.store.permissions,
      normalizedRoles: this.roleCodes(),
      normalizedPermissions: this.permissions(),
      isAdmin: this.isAdmin()
    };
  }
};
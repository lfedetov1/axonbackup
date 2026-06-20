export default {
  mode() {
    return String(appsmith.store.adminMode || "LIST").toUpperCase();
  },

  selectedTab() {
    return AdminTabs.selectedTab || appsmith.store.adminTab || "Overview";
  },

  async openTab(tabName = "Overview") {
    await storeValue("adminTab", tabName);
    await storeValue("adminMode", "LIST");
    return this.refresh();
  },

  async refresh() {
    const tab = this.selectedTab();

    if (tab === "Overview" && typeof GetAdminOverviewStats !== "undefined") {
      await GetAdminOverviewStats.run();
    }

    if (tab === "Users" && typeof ListAdminUsers !== "undefined") {
      await ListAdminUsers.run();
    }

    if (tab === "Roles" && typeof ListAdminRoles !== "undefined") {
      await ListAdminRoles.run();
    }

    if (tab === "Permissions" && typeof ListAdminPermissions !== "undefined") {
      await ListAdminPermissions.run();
    }

    if (tab === "Warehouse Access" && typeof ListAdminWarehouseAccess !== "undefined") {
      await ListAdminWarehouseAccess.run();
    }

    if (tab === "POS Access" && typeof ListAdminPOSAccessCodes !== "undefined") {
      await ListAdminPOSAccessCodes.run();
    }

    if (tab === "Document Setup" && typeof ListAdminDocumentTypes !== "undefined") {
      await ListAdminDocumentTypes.run();
    }

    if (tab === "Payment Setup" && typeof ListAdminPaymentMethods !== "undefined") {
      await ListAdminPaymentMethods.run();
    }

    if (tab === "Planning" && typeof GetBusinessPlanningDashboard !== "undefined") {
      await GetBusinessPlanningDashboard.run();
    }

    if (tab === "Audit" && typeof ListAdminAuditLog !== "undefined") {
      await ListAdminAuditLog.run();
    }
  },

  async resetMode() {
    await storeValue("adminMode", "LIST");
    await storeValue("selectedAdminUserId", null);
    await storeValue("selectedAdminRoleId", null);
  }
};
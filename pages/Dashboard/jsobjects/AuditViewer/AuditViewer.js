export default {
  async open(entityName = "ALL", entityId = null) {
    await storeValue("auditViewerEntityName", entityName || "ALL");
    await storeValue("auditViewerEntityId", entityId || null);

    if (typeof AuditEntitySelect !== "undefined") {
      AuditEntitySelect.setSelectedOption(entityName || "ALL");
    }

    if (typeof AuditActionSelect !== "undefined") {
      AuditActionSelect.setSelectedOption("ALL");
    }

    if (typeof AuditDateFrom !== "undefined") {
      AuditDateFrom.setValue(moment().subtract(7, "days").format("YYYY-MM-DD"));
    }

    if (typeof AuditDateTo !== "undefined") {
      AuditDateTo.setValue(moment().format("YYYY-MM-DD"));
    }

    if (typeof AuditSearchInput !== "undefined") {
      AuditSearchInput.setValue("");
    }

    await ListAuditViewerLogs.run();
    showModal(AuditViewerModal.name);
  },

  async refresh() {
    await ListAuditViewerLogs.run();
  },

  selectedOldValues() {
    const row = AuditViewerTable.selectedRow || {};
    try {
      return JSON.stringify(JSON.parse(row.oldValues || "{}"), null, 2);
    } catch (e) {
      return row.oldValues || "";
    }
  },

  selectedNewValues() {
    const row = AuditViewerTable.selectedRow || {};
    try {
      return JSON.stringify(JSON.parse(row.newValues || "{}"), null, 2);
    } catch (e) {
      return row.newValues || "";
    }
  }
};
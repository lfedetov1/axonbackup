export default {
  canView() {
    return AppAccess.has("audit.view") || AppAccess.has("admin.access");
  },

  idFromRow(row = {}) {
  return Number(
    row.documentId ||
    row.document_id ||
    row.documentID ||
    row.DocumentID ||
    row["Document ID"] ||

    row.productId ||
    row.product_id ||
    row.ProductID ||
    row["Product ID"] ||

    row.partnerId ||
    row.partner_id ||
    row.PartnerID ||
    row["Partner ID"] ||

    row.invoiceId ||
    row.quoteId ||
    row.salesOrderId ||
    row.deliveryNoteId ||
    row.cashRegisterId ||
    row.branchId ||

    row.id ||
    row.ID ||
    0
  );
},

  async open(entityName, rowOrId, title = "Change history") {
    if (!this.canView()) {
      showAlert("You do not have permission to view audit history.", "warning");
      return;
    }

    const entityId =
      typeof rowOrId === "object"
        ? this.idFromRow(rowOrId || {})
        : Number(rowOrId || 0);

    if (!entityName || !entityId) {
      showAlert("History target is missing.", "warning");
      console.log("Audit history target missing:", { entityName, rowOrId, entityId });
      return;
    }

    await storeValue("auditHistoryEntityName", entityName);
    await storeValue("auditHistoryEntityId", entityId);
    await storeValue("auditHistoryTitle", title);

    await ListEntityAuditHistory.run();

    showModal(EntityAuditHistoryModal.name);
  },

  title() {
    return appsmith.store.auditHistoryTitle || "Change history";
  },

  rows() {
    return ListEntityAuditHistory.data || [];
  },

  selectedOldValues() {
    const row = EntityAuditHistoryTable.selectedRow || {};
    try {
      return JSON.stringify(JSON.parse(row.oldValues || "{}"), null, 2);
    } catch (error) {
      return row.oldValues || "";
    }
  },

  selectedNewValues() {
    const row = EntityAuditHistoryTable.selectedRow || {};
    try {
      return JSON.stringify(JSON.parse(row.newValues || "{}"), null, 2);
    } catch (error) {
      return row.newValues || "";
    }
  }
};
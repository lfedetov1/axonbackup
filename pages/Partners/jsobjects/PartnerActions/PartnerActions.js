export default {
  row(row = null) {
    return row || PartnersTable.triggeredRow || PartnersTable.selectedRow || {};
  },

  partnerId(row = null) {
    const selected = this.row(row);

    return Number(
      selected.partner_id ||
      selected.partnerId ||
      selected.id ||
      selected.ID ||
      0
    );
  },

  isActive(row = null) {
    const selected = this.row(row);

    return Number(
      selected.is_active ??
      selected.isActive ??
      (selected.Status === "ACTIVE" ? 1 : 0)
    ) === 1;
  },

  actionLabel(row = null) {
    return this.isActive(row) ? "Deactivate" : "Activate";
  },

  async toggleActive(row = null) {
    const selected = this.row(row);
    const partnerId = this.partnerId(selected);

    if (!partnerId) {
      showAlert("Select partner first.", "warning");
      return;
    }

    const currentlyActive = this.isActive(selected);
    const targetStatus = currentlyActive ? 0 : 1;

    try {
      await SetPartnerActiveStatus.run({
        partnerId,
        targetStatus
      });

      if (typeof AuditLog !== "undefined" && AuditLog.insert) {
        await AuditLog.insert({
          entityName: "business_partners",
          entityId: partnerId,
          actionType: targetStatus ? "ACTIVATE" : "DEACTIVATE",
          oldValues: {
            is_active: currentlyActive ? 1 : 0
          },
          newValues: {
            is_active: targetStatus
          }
        });
      }

      await PartnerOverview.refresh();

      if (appsmith.store.selectedPartnerId === partnerId) {
        await Partner360.load(selected);
      }

      showAlert(
        targetStatus
          ? "Partner was activated."
          : "Partner was deactivated.",
        "success"
      );
    } catch (error) {
      showAlert("Error while changing partner status: " + error.message, "error");
      console.log(error);
    }
  }
};
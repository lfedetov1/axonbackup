export default {
  async load(row = null) {
    const selected =
      row ||
      PartnersTable.triggeredRow ||
      PartnersTable.selectedRow ||
      (PartnersTable.selectedRows && PartnersTable.selectedRows[0]) ||
      ((PartnersTable.tableData || [])[PartnersTable.selectedRowIndex]) ||
      {};

    const partnerId = Number(
      selected.partner_id ||
      selected["partner_id"] ||
      selected["Partner ID"] ||
      selected.partnerId ||
      selected.id ||
      selected.ID ||
      0
    );

    if (!partnerId) {
      showAlert(
        "Partner ID missing. Row keys: " + Object.keys(selected || {}).join(", "),
        "warning"
      );
      await storeValue("selectedPartnerId", null);
      return;
    }

    await storeValue("selectedPartnerId", partnerId);

    await GetPartner360Header.run({ partnerId });
    await ListPartner360Documents.run({ partnerId });
    await ListPartner360TopProducts.run({ partnerId });
  },

  model() {
    return {
      header: GetPartner360Header.data?.[0] || {},
      documents: ListPartner360Documents.data || [],
      topProducts: ListPartner360TopProducts.data || [],
      printedAt: moment().format("DD.MM.YYYY HH:mm:ss"),
      printedBy: appsmith.store.username || ""
    };
  },

  async clear() {
    await storeValue("selectedPartnerId", null);
  }
};
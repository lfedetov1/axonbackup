export default {
  async refresh() {
    await GetPartnerOverviewStats.run();
    await ListPartnersOverview.run();
  },

  model() {
    return {
      stats: GetPartnerOverviewStats.data?.[0] || {},
      partners: ListPartnersOverview.data || [],
      filters: {
        type: PartnerTypeFilterSelect.selectedOptionLabel || "Active",
        status: PartnerStatusFilterSelect.selectedOptionLabel || "Active",
        dateFrom: moment(PartnerDateFrom.selectedDate || moment().startOf("year")).format("YYYY-MM-DD"),
        dateTo: moment(PartnerDateTo.selectedDate || moment()).format("YYYY-MM-DD")
      },
      printedAt: moment().format("DD.MM.YYYY HH:mm:ss"),
      printedBy: appsmith.store.username || ""
    };
  }
};
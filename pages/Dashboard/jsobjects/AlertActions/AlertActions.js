export default {
  async closeMissingBusinessDay() {
    try {
      await CloseMissingBusinessDay.run();
      await CriticalAlertsQuery.run();
      closeModal("ConfirmCloseDayModal");
      showAlert("Business day closed successfully.", "success");
    } catch (error) {
      showAlert("Could not close business day: " + error.message, "error");
    }
  },

  async handle(row) {
    if (!row || Number(row.affected_count) <= 0) {
      showAlert("No issues found for this check.", "info");
      return;
    }

    if (row.alert_type === "business_day_not_closed") {
      showModal("ConfirmCloseDayModal");
      return;
    }

    if (row.alert_type === "posting_issue") {
      navigateTo("Documents");
      return;
    }

    if (row.alert_type === "overdue_unpaid_invoices") {
      navigateTo("Sales");
      return;
    }

    if (row.alert_type === "expired_open_quotes") {
      navigateTo("Sales");
      return;
    }

    if (row.alert_type === "old_draft_documents") {
      navigateTo("Documents");
      return;
    }

    if (row.alert_type === "document_total_mismatch") {
      navigateTo("Documents");
      return;
    }

    showAlert("No action configured for this alert.", "warning");
  }
};

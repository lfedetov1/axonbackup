export default {
  firstRow(result, queryObject) {
    return result?.[0] || queryObject?.data?.[0] || null;
  },

  async snapshot(dailyTargetId) {
    if (!dailyTargetId) return null;

    const rows = await GetAdminSalesPlanDailyTargetAu.run({
      dailyTargetId
    });

    return this.firstRow(rows, GetAdminSalesPlanDailyTargetAu);
  },

  normalize(row = {}) {
    return {
      dailyTargetId: row.dailyTargetId || row.id || row.ID,
      date: row.Date || row.target_date,
      salesTarget: Number(row["Sales Target"] || row.sales_target_amount || 0),
      marginTarget: Number(row["Margin Target"] || row.margin_target_amount || 0),
      transactionTarget: Number(row["Transaction Target"] || row.transaction_target_count || 0),
      itemQtyTarget: Number(row["Item Qty Target"] || row.item_target_quantity || 0),
      workingHours: Number(row["Working Hours"] || row.planned_working_hours || 0),
      absenceHours: Number(row["Absence Hours"] || row.planned_absence_hours || 0),
      sickLeaveHours: Number(row["Sick Leave Hours"] || row.planned_sick_leave_hours || 0),
      note: row.Note || row.note || null
    };
  },

  async updateRow(row = null) {
    const payload = this.normalize(row || AdminSalesPlanDailyTargetsTabl.updatedRow || {});

    if (!payload.dailyTargetId) {
      showAlert("Daily target row was not found.", "warning");
      return;
    }

    const oldValues = await this.snapshot(payload.dailyTargetId);

    try {
      await UpdateAdminSalesPlanDailyTarge.run(payload);

      await AdminAudit.log(
        "UPDATE",
        "sales_plan_daily_targets",
        payload.dailyTargetId,
        payload,
        oldValues
      );

      await ListAdminSalesPlanDailyTargets.run();

      showAlert("Daily target updated.", "success");
    } catch (error) {
      showAlert("Error while updating daily target: " + error.message, "error");
      console.log(error);
    }
  }
};
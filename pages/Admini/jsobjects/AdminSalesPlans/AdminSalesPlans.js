export default {
  selectedId() {
    return Number(appsmith.store.selectedAdminSalesPlanId || 0);
  },

  isEditMode() {
    return this.selectedId() > 0;
  },

  firstRow(result, queryObject) {
    return result?.[0] || queryObject?.data?.[0] || null;
  },

  async auditSnapshot(id = this.selectedId()) {
    if (!id) return null;

    const rows = await GetAdminSalesPlanAuditSnapshot.run({ id });
    return this.firstRow(rows, GetAdminSalesPlanAuditSnapshot);
  },

  async loadSelects() {
    if (typeof ListAdminPlanningBranches !== "undefined") {
      await ListAdminPlanningBranches.run();
    }

    if (typeof ListAdminCashRegisterWarehouses !== "undefined") {
      await ListAdminCashRegisterWarehouse.run();
    }

    if (typeof ListAdminCashRegisterUsers !== "undefined") {
      await ListAdminCashRegisterUsers.run();
    }
  },

  clearForm() {
    AdminSalesPlanCodeInput.setValue("");
    AdminSalesPlanNameInput.setValue("");
    AdminSalesPlanCurrencyInput.setValue("EUR");

    AdminSalesPlanSalesTargetInput.setValue("0");
    AdminSalesPlanMarginTargetInpu.setValue("0");
    AdminSalesPlanTransactionTarge.setValue("0");
    AdminSalesPlanItemQtyTargetInp.setValue("0");

    AdminSalesPlanWorkingHoursInpu.setValue("0");
    AdminSalesPlanAbsenceHoursInpu.setValue("0");
    AdminSalesPlanSickLeaveHoursIn.setValue("0");

    AdminSalesPlanNoteInput.setValue("");

    AdminSalesPlanPeriodSelect.setSelectedOption("MONTH");
    AdminSalesPlanStatusSelect.setSelectedOption("DRAFT");
    AdminSalesPlanBranchSelect.setSelectedOption("");
    AdminSalesPlanWarehouseSelect.setSelectedOption("");
    AdminSalesPlanResponsibleUserS.setSelectedOption("");

    AdminSalesPlanDateFrom.setValue(moment().startOf("month").format("YYYY-MM-DD"));
    AdminSalesPlanDateTo.setValue(moment().endOf("month").format("YYYY-MM-DD"));

    AdminSalesPlanActiveSwitch.setValue(true);
  },

  async openNew() {
    await storeValue("selectedAdminSalesPlanId", null);
    await this.loadSelects();
    this.clearForm();
    showModal(AdminSalesPlanModal.name);
  },

  async openEdit(row = null) {
    const selected = row || AdminSalesPlansTable.selectedRow || {};
    const id =
      selected.salesPlanId ||
      selected.id ||
      selected.ID ||
      0;

    if (!id) {
      showAlert("Select sales plan first.", "warning");
      return;
    }

    await storeValue("selectedAdminSalesPlanId", id);
    await this.loadSelects();

    const rows = await GetAdminSalesPlanForEdit.run();
    const plan = this.firstRow(rows, GetAdminSalesPlanForEdit);

    if (!plan) {
      showAlert("Sales plan was not found.", "error");
      return;
    }

    AdminSalesPlanCodeInput.setValue(plan.plan_code || "");
    AdminSalesPlanNameInput.setValue(plan.plan_name || "");
    AdminSalesPlanCurrencyInput.setValue(plan.currency_code || "EUR");

    AdminSalesPlanSalesTargetInput.setValue(String(plan.sales_target_amount || 0));
    AdminSalesPlanMarginTargetInpu.setValue(String(plan.margin_target_amount || 0));
    AdminSalesPlanTransactionTarge.setValue(String(plan.transaction_target_count || 0));
    AdminSalesPlanItemQtyTargetInp.setValue(String(plan.item_target_quantity || 0));

    AdminSalesPlanWorkingHoursInpu.setValue(String(plan.planned_working_hours || 0));
    AdminSalesPlanAbsenceHoursInpu.setValue(String(plan.planned_absence_hours || 0));
    AdminSalesPlanSickLeaveHoursIn.setValue(String(plan.planned_sick_leave_hours || 0));

    AdminSalesPlanNoteInput.setValue(plan.note || "");

    AdminSalesPlanPeriodSelect.setSelectedOption(plan.plan_period || "MONTH");
    AdminSalesPlanStatusSelect.setSelectedOption(plan.status || "DRAFT");

    AdminSalesPlanBranchSelect.setSelectedOption(plan.branch_id ? String(plan.branch_id) : "");
    AdminSalesPlanWarehouseSelect.setSelectedOption(plan.warehouse_id ? String(plan.warehouse_id) : "");
    AdminSalesPlanResponsibleUserS.setSelectedOption(plan.responsible_user_id ? String(plan.responsible_user_id) : "");

    AdminSalesPlanDateFrom.setValue(moment(plan.period_start).format("YYYY-MM-DD"));
    AdminSalesPlanDateTo.setValue(moment(plan.period_end).format("YYYY-MM-DD"));

    AdminSalesPlanActiveSwitch.setValue(Number(plan.is_active || 0) === 1);

    showModal(AdminSalesPlanModal.name);
  },

  validate() {
    if (!AdminSalesPlanCodeInput.text.trim()) {
      showAlert("Plan code is required.", "warning");
      return false;
    }

    if (!AdminSalesPlanNameInput.text.trim()) {
      showAlert("Plan name is required.", "warning");
      return false;
    }

    if (!AdminSalesPlanDateFrom.selectedDate || !AdminSalesPlanDateTo.selectedDate) {
      showAlert("Plan period dates are required.", "warning");
      return false;
    }

    if (moment(AdminSalesPlanDateTo.selectedDate).isBefore(moment(AdminSalesPlanDateFrom.selectedDate))) {
      showAlert("End date cannot be before start date.", "warning");
      return false;
    }

    return true;
  },

  payload() {
    return {
      plan_code: AdminSalesPlanCodeInput.text.trim().toUpperCase(),
      plan_name: AdminSalesPlanNameInput.text.trim(),
      plan_period: AdminSalesPlanPeriodSelect.selectedOptionValue || "MONTH",
      period_start: moment(AdminSalesPlanDateFrom.selectedDate).format("YYYY-MM-DD"),
      period_end: moment(AdminSalesPlanDateTo.selectedDate).format("YYYY-MM-DD"),
      currency_code: AdminSalesPlanCurrencyInput.text.trim().toUpperCase() || "EUR",
      branch_id: Number(AdminSalesPlanBranchSelect.selectedOptionValue || 0) || null,
      warehouse_id: Number(AdminSalesPlanWarehouseSelect.selectedOptionValue || 0) || null,
      responsible_user_id: Number(AdminSalesPlanResponsibleUserS.selectedOptionValue || 0) || null,
      sales_target_amount: Number(AdminSalesPlanSalesTargetInput.text || 0),
      margin_target_amount: Number(AdminSalesPlanMarginTargetInpu.text || 0),
      transaction_target_count: Number(AdminSalesPlanTransactionTarge.text || 0),
      item_target_quantity: Number(AdminSalesPlanItemQtyTargetInp.text || 0),
      planned_working_hours: Number(AdminSalesPlanWorkingHoursInpu.text || 0),
      planned_absence_hours: Number(AdminSalesPlanAbsenceHoursInpu.text || 0),
      planned_sick_leave_hours: Number(AdminSalesPlanSickLeaveHoursIn.text || 0),
      status: AdminSalesPlanStatusSelect.selectedOptionValue || "DRAFT",
      note: AdminSalesPlanNoteInput.text || null,
      is_active: AdminSalesPlanActiveSwitch.isSwitchedOn ? 1 : 0
    };
  },

  async save() {
    if (!this.validate()) return;

    const wasEditMode = this.isEditMode();
    const oldValues = wasEditMode ? await this.auditSnapshot() : null;

    try {
      if (wasEditMode) {
        await UpdateAdminSalesPlan.run();
      } else {
        await InsertAdminSalesPlan.run();
      }

      await AdminAudit.log(
        wasEditMode ? "UPDATE" : "INSERT",
        "sales_plans",
        this.selectedId(),
        this.payload(),
        oldValues
      );

      await ListAdminSalesPlans.run();

      closeModal(AdminSalesPlanModal.name);
      showAlert(wasEditMode ? "Sales plan updated." : "Sales plan created.", "success");
    } catch (error) {
      showAlert("Error while saving sales plan: " + error.message, "error");
      console.log(error);
    }
  },

  async approve(row = null) {
    const selected = row || AdminSalesPlansTable.selectedRow || {};
    const id =
      selected.salesPlanId ||
      selected.id ||
      selected.ID ||
      0;

    if (!id) {
      showAlert("Select sales plan first.", "warning");
      return;
    }

    await storeValue("selectedAdminSalesPlanId", id);

    const oldValues = await this.auditSnapshot(id);

    try {
      await UpdateAdminSalesPlanStatus.run({
        id,
        status: "APPROVED"
      });

      await AdminAudit.log(
        "APPROVE",
        "sales_plans",
        id,
        { status: "APPROVED" },
        oldValues
      );

      await ListAdminSalesPlans.run();
      showAlert("Sales plan approved.", "success");
    } catch (error) {
      showAlert("Error while approving sales plan: " + error.message, "error");
      console.log(error);
    }
  },

  async remove(row = null) {
    const selected = row || AdminSalesPlansTable.selectedRow || {};
    const id =
      selected.salesPlanId ||
      selected.id ||
      selected.ID ||
      0;

    if (!id) {
      showAlert("Select sales plan first.", "warning");
      return;
    }

    await storeValue("selectedAdminSalesPlanId", id);

    const oldValues = await this.auditSnapshot(id);

    try {
      await UpdateAdminSalesPlanStatus.run({
        id,
        status: "CANCELLED"
      });

      await AdminAudit.log(
        "CANCEL",
        "sales_plans",
        id,
        { status: "CANCELLED" },
        oldValues
      );

      await ListAdminSalesPlans.run();
      showAlert("Sales plan cancelled.", "success");
    } catch (error) {
      showAlert("Error while cancelling sales plan: " + error.message, "error");
      console.log(error);
    }
  }
};
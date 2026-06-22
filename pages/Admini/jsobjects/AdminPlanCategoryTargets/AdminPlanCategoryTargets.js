export default {
  selectedId() {
    return Number(appsmith.store.selectedAdminPlanCategoryTargetId || 0);
  },

  isEditMode() {
    return this.selectedId() > 0;
  },

  firstRow(result, queryObject) {
    return result?.[0] || queryObject?.data?.[0] || null;
  },

  async loadSelects() {
    if (typeof ListAdminPlanTargetCategories !== "undefined") {
      await ListAdminPlanTargetCategories.run();
    }

    if (typeof ListAdminPlanTargetProducts !== "undefined") {
      await ListAdminPlanTargetProducts.run();
    }
  },

  async auditSnapshot(id = this.selectedId()) {
    if (!id) return null;

    const rows = await GetAdminPlanCategoryTargetAudi.run({ id });
    return this.firstRow(rows, GetAdminPlanCategoryTargetAudi);
  },

  clearForm() {
    AdminPlanTargetCategorySelect.setSelectedOption("");
    AdminPlanTargetProductSelect.setSelectedOption("");
    AdminPlanTargetQuantityInput.setValue("0");
    AdminPlanTargetAmountInput.setValue("0");
    AdminPlanTargetNoteInput.setValue("");
  },

  async openNew() {
    if (!Number(appsmith.store.selectedAdminSalesPlanId || 0)) {
      showAlert("Select sales plan first.", "warning");
      return;
    }

    await storeValue("selectedAdminPlanCategoryTargetId", null);
    await this.loadSelects();
    this.clearForm();
    showModal(AdminSalesPlanCategoryTargetMo.name);
  },

  async openEdit(row = null) {
    const selected = row || AdminSalesPlanCategoryTarget.selectedRow || {};
    const id =
      selected.categoryTargetId ||
      selected.id ||
      selected.ID ||
      0;

    if (!id) {
      showAlert("Select category/product target first.", "warning");
      return;
    }

    await storeValue("selectedAdminPlanCategoryTargetId", id);
    await this.loadSelects();

    const rows = await GetAdminPlanCategoryTargetForE.run();
    const target = this.firstRow(rows, GetAdminPlanCategoryTargetForE);

    if (!target) {
      showAlert("Target was not found.", "error");
      return;
    }

    AdminPlanTargetCategorySelect.setSelectedOption(
      target.product_category_id ? String(target.product_category_id) : ""
    );

    AdminPlanTargetProductSelect.setSelectedOption(
      target.product_id ? String(target.product_id) : ""
    );

    AdminPlanTargetQuantityInput.setValue(String(target.target_quantity || 0));
    AdminPlanTargetAmountInput.setValue(String(target.target_amount || 0));
    AdminPlanTargetNoteInput.setValue(target.note || "");

    showModal(AdminSalesPlanCategoryTargetMo.name);
  },

  validate() {
    if (!Number(appsmith.store.selectedAdminSalesPlanId || 0)) {
      showAlert("Select sales plan first.", "warning");
      return false;
    }

    const categoryId = Number(AdminPlanTargetCategorySelect.selectedOptionValue || 0);
    const productId = Number(AdminPlanTargetProductSelect.selectedOptionValue || 0);

    if (!categoryId && !productId) {
      showAlert("Select category or product.", "warning");
      return false;
    }

    if (Number(AdminPlanTargetQuantityInput.text || 0) <= 0 && Number(AdminPlanTargetAmountInput.text || 0) <= 0) {
      showAlert("Enter quantity target or amount target.", "warning");
      return false;
    }

    return true;
  },

  payload() {
    return {
      sales_plan_id: Number(appsmith.store.selectedAdminSalesPlanId || 0),
      product_category_id: Number(AdminPlanTargetCategorySelect.selectedOptionValue || 0) || null,
      product_id: Number(AdminPlanTargetProductSelect.selectedOptionValue || 0) || null,
      target_quantity: Number(AdminPlanTargetQuantityInput.text || 0),
      target_amount: Number(AdminPlanTargetAmountInput.text || 0),
      note: AdminPlanTargetNoteInput.text || null
    };
  },

  async save() {
    if (!this.validate()) return;

    const wasEditMode = this.isEditMode();
    const oldValues = wasEditMode ? await this.auditSnapshot() : null;

    try {
      if (wasEditMode) {
        await UpdateAdminPlanCategoryTarget.run();
      } else {
        await InsertAdminPlanCategoryTarget.run();
      }

      await AdminAudit.log(
        wasEditMode ? "UPDATE" : "INSERT",
        "sales_plan_category_targets",
        this.selectedId(),
        this.payload(),
        oldValues
      );

      await ListAdminSalesPlanCategoryTarg.run();

      closeModal(AdminSalesPlanCategoryTargetMo.name);
      showAlert(wasEditMode ? "Target updated." : "Target created.", "success");
    } catch (error) {
      showAlert("Error while saving target: " + error.message, "error");
      console.log(error);
    }
  },

  async remove(row = null) {
    const selected = row || AdminSalesPlanCategoryTarget.selectedRow || {};
    const id =
      selected.categoryTargetId ||
      selected.id ||
      selected.ID ||
      0;

    if (!id) {
      showAlert("Select category/product target first.", "warning");
      return;
    }

    const oldValues = await this.auditSnapshot(id);

    try {
      await DeleteAdminPlanCategoryTarget.run({ id });

      await AdminAudit.log(
        "DELETE",
        "sales_plan_category_targets",
        id,
        {
          sales_plan_id: appsmith.store.selectedAdminSalesPlanId
        },
        oldValues
      );

      await ListAdminSalesPlanCategoryTarg.run();
      showAlert("Target deleted.", "success");
    } catch (error) {
      showAlert("Error while deleting target: " + error.message, "error");
      console.log(error);
    }
  }
};
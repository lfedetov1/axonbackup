export default {
  selectedId() {
    return Number(appsmith.store.selectedAdminBranchId || 0);
  },

  isEditMode() {
    return this.selectedId() > 0;
  },

  firstRow(result, queryObject) {
    return result?.[0] || queryObject?.data?.[0] || null;
  },

  async auditSnapshot(id = this.selectedId()) {
    if (!id) return null;

    const rows = await GetAdminBranchAuditSnapshot.run({ id });
    return this.firstRow(rows, GetAdminBranchAuditSnapshot);
  },

  clearForm() {
    AdminBranchCodeInput.setValue("");
    AdminBranchNameInput.setValue("");
    AdminBranchLegalNameInput.setValue("");
    AdminBranchAddressInput.setValue("");
    AdminBranchPostalCodeInput.setValue("");
    AdminBranchCityInput.setValue("");
    AdminBranchCountryInput.setValue("HR");
    AdminBranchPhoneInput.setValue("");
    AdminBranchEmailInput.setValue("");
    AdminBranchFiscalBusinessSpace.setValue("");

    AdminBranchDefaultWarehouseSel.setSelectedOption("");
    AdminBranchResponsibleUserSele.setSelectedOption("");
    AdminBranchActiveSwitch.setValue(true);
  },

  async loadSelects() {
    if (typeof ListAdminCashRegisterWarehouses !== "undefined") {
      await ListAdminCashRegisterWarehouse.run();
    }

    if (typeof ListAdminCashRegisterUsers !== "undefined") {
      await ListAdminCashRegisterUsers.run();
    }
  },

  async openNew() {
    await storeValue("selectedAdminBranchId", null);
    await this.loadSelects();
    this.clearForm();
    showModal(AdminBranchModal.name);
  },

  async openEdit(row = null) {
    const selected = row || AdminBranchesTable.selectedRow || {};
    const id =
      selected.branchId ||
      selected.id ||
      selected.ID ||
      0;

    if (!id) {
      showAlert("Select branch first.", "warning");
      return;
    }

    await storeValue("selectedAdminBranchId", id);
    await this.loadSelects();

    const rows = await GetAdminBranchForEdit.run();
    const branch = this.firstRow(rows, GetAdminBranchForEdit);

    if (!branch) {
      showAlert("Branch was not found.", "error");
      return;
    }

    AdminBranchCodeInput.setValue(branch.code || "");
    AdminBranchNameInput.setValue(branch.name || "");
    AdminBranchLegalNameInput.setValue(branch.legal_name || "");
    AdminBranchAddressInput.setValue(branch.address_line1 || "");
    AdminBranchPostalCodeInput.setValue(branch.postal_code || "");
    AdminBranchCityInput.setValue(branch.city || "");
    AdminBranchCountryInput.setValue(branch.country_code || "HR");
    AdminBranchPhoneInput.setValue(branch.phone || "");
    AdminBranchEmailInput.setValue(branch.email || "");
    AdminBranchFiscalBusinessSpace.setValue(branch.fiscal_business_space_code || "");

    AdminBranchDefaultWarehouseSel.setSelectedOption(
      branch.default_warehouse_id ? String(branch.default_warehouse_id) : ""
    );

    AdminBranchResponsibleUserSele.setSelectedOption(
      branch.responsible_user_id ? String(branch.responsible_user_id) : ""
    );

    AdminBranchActiveSwitch.setValue(Number(branch.is_active || 0) === 1);

    showModal(AdminBranchModal.name);
  },

  validate() {
    if (!AdminBranchCodeInput.text.trim()) {
      showAlert("Branch code is required.", "warning");
      return false;
    }

    if (!AdminBranchNameInput.text.trim()) {
      showAlert("Branch name is required.", "warning");
      return false;
    }

    return true;
  },

  payload() {
    return {
      code: AdminBranchCodeInput.text.trim().toUpperCase(),
      name: AdminBranchNameInput.text.trim(),
      legal_name: AdminBranchLegalNameInput.text.trim() || null,
      address_line1: AdminBranchAddressInput.text.trim() || null,
      postal_code: AdminBranchPostalCodeInput.text.trim() || null,
      city: AdminBranchCityInput.text.trim() || null,
      country_code: AdminBranchCountryInput.text.trim().toUpperCase() || "HR",
      phone: AdminBranchPhoneInput.text.trim() || null,
      email: AdminBranchEmailInput.text.trim() || null,
      fiscal_business_space_code: AdminBranchFiscalBusinessSpace.text.trim() || null,
      default_warehouse_id: Number(AdminBranchDefaultWarehouseSel.selectedOptionValue || 0) || null,
      responsible_user_id: Number(AdminBranchResponsibleUserSele.selectedOptionValue || 0) || null,
      is_active: AdminBranchActiveSwitch.isSwitchedOn ? 1 : 0
    };
  },

  async save() {
    if (!this.validate()) return;

    const wasEditMode = this.isEditMode();
    const oldValues = wasEditMode ? await this.auditSnapshot() : null;

    try {
      if (wasEditMode) {
        await UpdateAdminBranch.run();
      } else {
        await InsertAdminBranch.run();
      }

      await AdminAudit.log(
        wasEditMode ? "UPDATE" : "INSERT",
        "branches",
        this.selectedId(),
        this.payload(),
        oldValues
      );

      await ListAdminBranches.run();

      if (typeof ListAdminCashRegisters !== "undefined") {
        await ListAdminCashRegisters.run();
      }

      closeModal(AdminBranchModal.name);
      showAlert(wasEditMode ? "Branch updated." : "Branch created.", "success");
    } catch (error) {
      showAlert("Error while saving branch: " + error.message, "error");
      console.log(error);
    }
  },

  async remove(row = null) {
    const selected = row || AdminBranchesTable.selectedRow || {};
    const id =
      selected.branchId ||
      selected.id ||
      selected.ID ||
      0;

    const code =
      selected.Code ||
      selected.code ||
      "";

    if (!id || !code) {
      showAlert("Select branch first.", "warning");
      return;
    }

    try {
      const oldValues = await this.auditSnapshot(id);

      const usageRows = await GetAdminBranchUsage.run({ id });
      const usage = Number((usageRows?.[0] || GetAdminBranchUsage.data?.[0] || {}).usageCount || 0);

      if (usage > 0) {
        await DeactivateAdminBranch.run({ id });

        await AdminAudit.log(
          "DEACTIVATE",
          "branches",
          id,
          { code, usage_count: usage, is_active: 0 },
          oldValues
        );

        showAlert("Branch is already used, so it was deactivated instead of deleted.", "warning");
      } else {
        await DeleteAdminBranch.run({ id });

        await AdminAudit.log(
          "DELETE",
          "branches",
          id,
          { code },
          oldValues
        );

        showAlert("Branch deleted.", "success");
      }

      await ListAdminBranches.run();
    } catch (error) {
      showAlert("Error while removing branch: " + error.message, "error");
      console.log(error);
    }
  }
};
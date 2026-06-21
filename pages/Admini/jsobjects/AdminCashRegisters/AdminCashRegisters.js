export default {
  selectedId() {
    return Number(appsmith.store.selectedAdminCashRegisterId || 0);
  },

  isEditMode() {
    return this.selectedId() > 0;
  },

  firstRow(result, queryObject) {
    return result?.[0] || queryObject?.data?.[0] || null;
  },

  async auditSnapshot(id = this.selectedId()) {
    if (!id) return null;

    const rows = await GetAdminCashRegisterAuditSnaps.run({ id });
    return this.firstRow(rows, GetAdminCashRegisterAuditSnaps);
  },

  clearForm() {
    AdminCashRegisterCodeInput.setValue("");
    AdminCashRegisterNameInput.setValue("");
    AdminCashRegisterCurrencyInput.setValue("EUR");
    AdminCashRegisterOpeningBalanc.setValue("0");
    AdminCashRegisterBusinessSpace.setValue("");
    AdminCashRegisterFiscalDeviceI.setValue("");

    AdminCashRegisterWarehouseSele.setSelectedOption("");
    AdminCashRegisterResponsibleUs.setSelectedOption("");
    AdminCashRegisterActiveSwitch.setValue(true);
  },

  async openNew() {
    await storeValue("selectedAdminCashRegisterId", null);
    this.clearForm();

    if (typeof ListAdminCashRegisterWarehouses !== "undefined") {
      await ListAdminCashRegisterWarehouse.run();
    }

    if (typeof ListAdminCashRegisterUsers !== "undefined") {
      await ListAdminCashRegisterUsers.run();
    }

    showModal(AdminCashRegisterModal.name);
  },

  async openEdit(row = null) {
    const selected = row || AdminCashRegistersTable.selectedRow || {};
    const id =
      selected.cashRegisterId ||
      selected.id ||
      selected.ID ||
      0;

    if (!id) {
      showAlert("Select cash register first.", "warning");
      return;
    }

    await storeValue("selectedAdminCashRegisterId", id);

    if (typeof ListAdminCashRegisterWarehouses !== "undefined") {
      await ListAdminCashRegisterWarehouse.run();
    }

    if (typeof ListAdminCashRegisterUsers !== "undefined") {
      await ListAdminCashRegisterUsers.run();
    }

    const rows = await GetAdminCashRegisterForEdit.run();
    const cashRegister = this.firstRow(rows, GetAdminCashRegisterForEdit);

    if (!cashRegister) {
      showAlert("Cash register was not found.", "error");
      return;
    }

    AdminCashRegisterCodeInput.setValue(cashRegister.code || "");
    AdminCashRegisterNameInput.setValue(cashRegister.name || "");
    AdminCashRegisterCurrencyInput.setValue(cashRegister.currency_code || "EUR");
    AdminCashRegisterOpeningBalanc.setValue(String(cashRegister.opening_balance || 0));
    AdminCashRegisterBusinessSpace.setValue(cashRegister.fiscal_business_space_code || "");
    AdminCashRegisterFiscalDeviceI.setValue(cashRegister.fiscal_device_code || "");

    AdminCashRegisterWarehouseSele.setSelectedOption(
      cashRegister.warehouse_id ? String(cashRegister.warehouse_id) : ""
    );

    AdminCashRegisterResponsibleUs.setSelectedOption(
      cashRegister.responsible_user_id ? String(cashRegister.responsible_user_id) : ""
    );

    AdminCashRegisterActiveSwitch.setValue(Number(cashRegister.is_active || 0) === 1);

    showModal(AdminCashRegisterModal.name);
  },

  validate() {
    if (!AdminCashRegisterCodeInput.text.trim()) {
      showAlert("Cash register code is required.", "warning");
      return false;
    }

    if (!AdminCashRegisterNameInput.text.trim()) {
      showAlert("Cash register name is required.", "warning");
      return false;
    }

    if (!AdminCashRegisterCurrencyInput.text.trim()) {
      showAlert("Currency is required.", "warning");
      return false;
    }

    return true;
  },

  payload() {
    return {
      code: AdminCashRegisterCodeInput.text.trim().toUpperCase(),
      name: AdminCashRegisterNameInput.text.trim(),
      currency_code: AdminCashRegisterCurrencyInput.text.trim().toUpperCase() || "EUR",
      opening_balance: Number(AdminCashRegisterOpeningBalanc.text || 0),
      fiscal_business_space_code: AdminCashRegisterBusinessSpace.text.trim() || null,
      fiscal_device_code: AdminCashRegisterFiscalDeviceI.text.trim() || null,
      warehouse_id: Number(AdminCashRegisterWarehouseSele.selectedOptionValue || 0) || null,
      responsible_user_id: Number(AdminCashRegisterResponsibleUs.selectedOptionValue || 0) || null,
      is_active: AdminCashRegisterActiveSwitch.isSwitchedOn ? 1 : 0
    };
  },

  async save() {
    if (!this.validate()) return;

    const wasEditMode = this.isEditMode();
    const oldValues = wasEditMode ? await this.auditSnapshot() : null;

    try {
      if (wasEditMode) {
        await UpdateAdminCashRegister.run();
      } else {
        await InsertAdminCashRegister.run();
      }

      await AdminAudit.log(
        wasEditMode ? "UPDATE" : "INSERT",
        "cash_registers",
        this.selectedId(),
        this.payload(),
        oldValues
      );

      await ListAdminCashRegisters.run();

      closeModal(AdminCashRegisterModal.name);
      showAlert(wasEditMode ? "Cash register updated." : "Cash register created.", "success");
    } catch (error) {
      showAlert("Error while saving cash register: " + error.message, "error");
      console.log(error);
    }
  },

  async remove(row = null) {
    const selected = row || AdminCashRegistersTable.selectedRow || {};
    const id =
      selected.cashRegisterId ||
      selected.id ||
      selected.ID ||
      0;

    const code =
      selected.Code ||
      selected.code ||
      "";

    if (!id || !code) {
      showAlert("Select cash register first.", "warning");
      return;
    }

    try {
      const oldValues = await this.auditSnapshot(id);

      const usageRows = await GetAdminCashRegisterUsage.run({ id });
      const usage = Number((usageRows?.[0] || GetAdminCashRegisterUsage.data?.[0] || {}).usageCount || 0);

      if (usage > 0) {
        await DeactivateAdminCashRegister.run({ id });

        await AdminAudit.log(
          "DEACTIVATE",
          "cash_registers",
          id,
          { code, usage_count: usage, is_active: 0 },
          oldValues
        );

        showAlert("Cash register is already used, so it was deactivated instead of deleted.", "warning");
      } else {
        await DeleteAdminCashRegister.run({ id });

        await AdminAudit.log(
          "DELETE",
          "cash_registers",
          id,
          { code },
          oldValues
        );

        showAlert("Cash register deleted.", "success");
      }

      await ListAdminCashRegisters.run();
    } catch (error) {
      showAlert("Error while removing cash register: " + error.message, "error");
      console.log(error);
    }
  }
};
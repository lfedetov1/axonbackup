export default {
  selectedId() {
    return Number(appsmith.store.selectedAdminPaymentMethodId || 0);
  },

  isEditMode() {
    return this.selectedId() > 0;
  },

  clearForm() {
    AdminPaymentCodeInput.setValue("");
    AdminPaymentNameInput.setValue("");
    AdminPaymentGroupInput.setValue("OTHER");
    AdminPaymentFiscalCodeInput.setValue("");
    AdminPaymentDueDaysInput.setValue("0");
    AdminPaymentSortOrderInput.setValue("100");

    AdminPaymentMethodGroupSelect.setSelectedOption("OTHER");

    AdminPaymentCashRegisterSwitch.setValue(false);
    AdminPaymentCashSwitch.setValue(false);
    AdminPaymentRequiresReferenceS.setValue(false);
    AdminPaymentRequiresCardTypeSw.setValue(false);
    AdminPaymentRequiresBankAccoun.setValue(false);
    AdminPaymentActiveSwitch.setValue(true);
  },

  async openNew() {
    await storeValue("selectedAdminPaymentMethodId", null);
    this.clearForm();
    showModal(AdminPaymentMethodModal.name);
  },

  async openEdit(row = null) {
    const selected = row || AdminPaymentMethodsTable.selectedRow || {};
    const id =
      selected.paymentMethodId ||
      selected.id ||
      selected.ID ||
      0;

    if (!id) {
      showAlert("Select payment method first.", "warning");
      return;
    }

    await storeValue("selectedAdminPaymentMethodId", id);

    const rows = await GetAdminPaymentMethodForEdit.run();
    const method = rows?.[0] || GetAdminPaymentMethodForEdit.data?.[0];

    if (!method) {
      showAlert("Payment method was not found.", "error");
      return;
    }

    AdminPaymentCodeInput.setValue(method.code || "");
    AdminPaymentNameInput.setValue(method.name || "");
    AdminPaymentGroupInput.setValue(method.payment_group || "OTHER");
    AdminPaymentFiscalCodeInput.setValue(method.fiscal_payment_code || "");
    AdminPaymentDueDaysInput.setValue(String(method.default_due_days || 0));
    AdminPaymentSortOrderInput.setValue(String(method.sort_order || 100));

    AdminPaymentMethodGroupSelect.setSelectedOption(method.method_group || "OTHER");

    AdminPaymentCashRegisterSwitch.setValue(Number(method.affects_cash_register || 0) === 1);
    AdminPaymentCashSwitch.setValue(Number(method.is_cash || 0) === 1);
    AdminPaymentRequiresReferenceS.setValue(Number(method.requires_reference || 0) === 1);
    AdminPaymentRequiresCardTypeSw.setValue(Number(method.requires_card_type || 0) === 1);
    AdminPaymentRequiresBankAccoun.setValue(Number(method.requires_bank_account || 0) === 1);
    AdminPaymentActiveSwitch.setValue(Number(method.is_active || 0) === 1);

    showModal(AdminPaymentMethodModal.name);
  },

  validate() {
    if (!AdminPaymentCodeInput.text.trim()) {
      showAlert("Payment code is required.", "warning");
      return false;
    }

    if (!AdminPaymentNameInput.text.trim()) {
      showAlert("Payment name is required.", "warning");
      return false;
    }

    return true;
  },

  payload() {
    return {
      code: AdminPaymentCodeInput.text.trim().toUpperCase(),
      name: AdminPaymentNameInput.text.trim(),
      payment_group: AdminPaymentGroupInput.text.trim().toUpperCase() || "OTHER",
      method_group: AdminPaymentMethodGroupSelect.selectedOptionValue || "OTHER",
      fiscal_payment_code: AdminPaymentFiscalCodeInput.text.trim().toUpperCase() || null,
      default_due_days: Number(AdminPaymentDueDaysInput.text || 0),
      sort_order: Number(AdminPaymentSortOrderInput.text || 100),
      affects_cash_register: AdminPaymentCashRegisterSwitch.isSwitchedOn ? 1 : 0,
      is_cash: AdminPaymentCashSwitch.isSwitchedOn ? 1 : 0,
      requires_reference: AdminPaymentRequiresReferenceS.isSwitchedOn ? 1 : 0,
      requires_card_type: AdminPaymentRequiresCardTypeSw.isSwitchedOn ? 1 : 0,
      requires_bank_account: AdminPaymentRequiresBankAccoun.isSwitchedOn ? 1 : 0,
      is_active: AdminPaymentActiveSwitch.isSwitchedOn ? 1 : 0
    };
  },

  async save() {
    if (!this.validate()) return;

    const wasEditMode = this.isEditMode();

    try {
      if (wasEditMode) {
        await UpdateAdminPaymentMethod.run();
      } else {
        await InsertAdminPaymentMethod.run();
      }

      await AdminAudit.log(
        wasEditMode ? "UPDATE" : "INSERT",
        "payment_methods",
        this.selectedId(),
        this.payload()
      );

      await ListAdminPaymentMethods.run();

      closeModal(AdminPaymentMethodModal.name);
      showAlert(wasEditMode ? "Payment method updated." : "Payment method created.", "success");
    } catch (error) {
      showAlert("Error while saving payment method: " + error.message, "error");
      console.log(error);
    }
  },

  async remove(row = null) {
    const selected = row || AdminPaymentMethodsTable.selectedRow || {};
    const id =
      selected.paymentMethodId ||
      selected.id ||
      selected.ID ||
      0;

    const code =
      selected.Code ||
      selected.code ||
      "";

    if (!id || !code) {
      showAlert("Select payment method first.", "warning");
      return;
    }

    try {
      const usageRows = await GetAdminPaymentMethodUsage.run({ code });
      const usage = Number((usageRows?.[0] || GetAdminPaymentMethodUsage.data?.[0] || {}).usageCount || 0);

      if (usage > 0) {
        await DeactivateAdminPaymentMethod.run({ id });

        await AdminAudit.log(
          "DEACTIVATE",
          "payment_methods",
          id,
          { code, usage_count: usage }
        );

        showAlert("Payment method is already used, so it was deactivated instead of deleted.", "warning");
      } else {
        await DeleteAdminPaymentMethod.run({ id });

        await AdminAudit.log(
          "DELETE",
          "payment_methods",
          id,
          { code }
        );

        showAlert("Payment method deleted.", "success");
      }

      await ListAdminPaymentMethods.run();
    } catch (error) {
      showAlert("Error while removing payment method: " + error.message, "error");
      console.log(error);
    }
  }
};
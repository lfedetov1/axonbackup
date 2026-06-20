export default {
  selectedId() {
    return Number(appsmith.store.selectedAdminDocumentTypeSettingId || 0);
  },

  isEditMode() {
    return this.selectedId() > 0;
  },

  clearForm() {
    AdminDocumentTypeCodeInput.setValue("");
    AdminDocumentTypeNameInput.setValue("");
    AdminDocumentTypeModuleInput.setValue("");
    AdminDocumentTypePrefixInput.setValue("DOC");
    AdminDocumentTypePrintKindInpu.setValue("");
    AdminDocumentTypeCurrencyInput.setValue("EUR");
    AdminDocumentTypePaymentMethod.setValue("");

    AdminDocumentTypeDirectionSele.setSelectedOption("NONE");
    AdminDocumentTypeDefaultStatus.setSelectedOption("DRAFT");
    AdminDocumentTypeDefaultPostin.setSelectedOption("NOT_POSTED");
    AdminDocumentTypeStockEffectSe.setSelectedOption("NONE");
    AdminDocumentTypeStockStageSel.setSelectedOption("POST");

    AdminDocumentTypeAffectsStockS.setValue(false);
    AdminDocumentTypeCustomerBalan.setValue(false);
    AdminDocumentTypeSupplierBalan.setValue(false);
    AdminDocumentTypeRequiresPartn.setValue(false);
    AdminDocumentTypeRequiresWareh.setValue(false);
    AdminDocumentTypeRequiresPayme.setValue(false);
    AdminDocumentTypeFiscalAllowed.setValue(false);
    AdminDocumentTypeFiscalRequire.setValue(false);
    AdminDocumentTypeCanPrintSwitc.setValue(true);
    AdminDocumentTypeCanEmailSwitc.setValue(true);
    AdminDocumentTypeCanConvertSwi.setValue(false);
    AdminDocumentTypeActiveSwitch.setValue(true);
  },

  async openNew() {
    await storeValue("selectedAdminDocumentTypeSettingId", null);
    this.clearForm();
    showModal(AdminDocumentTypeModal.name);
  },

  async openEdit(row = null) {
    const selected = row || AdminDocumentTypesTable.selectedRow || {};
    const id =
      selected.documentTypeSettingId ||
      selected.id ||
      selected.ID ||
      0;

    if (!id) {
      showAlert("Select document type first.", "warning");
      return;
    }

    await storeValue("selectedAdminDocumentTypeSettingId", id);

    const rows = await GetAdminDocumentTypeForEdit.run();
    const doc = rows?.[0] || GetAdminDocumentTypeForEdit.data?.[0];

    if (!doc) {
      showAlert("Document type setup was not found.", "error");
      return;
    }

    AdminDocumentTypeCodeInput.setValue(doc.code || "");
    AdminDocumentTypeNameInput.setValue(doc.name || "");
    AdminDocumentTypeModuleInput.setValue(doc.module_code || "");
    AdminDocumentTypePrefixInput.setValue(doc.number_prefix || "");
    AdminDocumentTypePrintKindInpu.setValue(doc.print_kind || "");
    AdminDocumentTypeCurrencyInput.setValue(doc.default_currency_code || "EUR");
    AdminDocumentTypePaymentMethod.setValue(doc.default_payment_method_code || "");

    AdminDocumentTypeDirectionSele.setSelectedOption(doc.document_direction || "NONE");
    AdminDocumentTypeDefaultStatus.setSelectedOption(doc.default_status || "DRAFT");
    AdminDocumentTypeDefaultPostin.setSelectedOption(doc.default_posting_status || "NOT_POSTED");
    AdminDocumentTypeStockEffectSe.setSelectedOption(doc.stock_effect || "NONE");
    AdminDocumentTypeStockStageSel.setSelectedOption(doc.stock_posting_stage || "POST");

    AdminDocumentTypeAffectsStockS.setValue(Number(doc.affects_stock || 0) === 1);
    AdminDocumentTypeCustomerBalan.setValue(Number(doc.affects_customer_balance || 0) === 1);
    AdminDocumentTypeSupplierBalan.setValue(Number(doc.affects_supplier_balance || 0) === 1);
    AdminDocumentTypeRequiresPartn.setValue(Number(doc.requires_partner || 0) === 1);
    AdminDocumentTypeRequiresWareh.setValue(Number(doc.requires_warehouse || 0) === 1);
    AdminDocumentTypeRequiresPayme.setValue(Number(doc.requires_payment_method || 0) === 1);
    AdminDocumentTypeFiscalAllowed.setValue(Number(doc.fiscalization_allowed || doc.allows_fiscalization || 0) === 1);
    AdminDocumentTypeFiscalRequire.setValue(Number(doc.fiscalization_required || doc.requires_fiscalization || 0) === 1);
    AdminDocumentTypeCanPrintSwitc.setValue(Number(doc.can_print || 0) === 1);
    AdminDocumentTypeCanEmailSwitc.setValue(Number(doc.can_email || 0) === 1);
    AdminDocumentTypeCanConvertSwi.setValue(Number(doc.can_convert || 0) === 1);
    AdminDocumentTypeActiveSwitch.setValue(Number(doc.is_active || 0) === 1);

    showModal(AdminDocumentTypeModal.name);
  },

  validate() {
    if (!AdminDocumentTypeCodeInput.text.trim()) {
      showAlert("Document code is required.", "warning");
      return false;
    }

    if (!AdminDocumentTypeNameInput.text.trim()) {
      showAlert("Name is required.", "warning");
      return false;
    }

    if (!AdminDocumentTypeModuleInput.text.trim()) {
      showAlert("Module is required.", "warning");
      return false;
    }

    return true;
  },

  payload() {
    return {
      code: AdminDocumentTypeCodeInput.text.trim().toUpperCase(),
      name: AdminDocumentTypeNameInput.text.trim(),
      module_code: AdminDocumentTypeModuleInput.text.trim(),
      document_direction: AdminDocumentTypeDirectionSele.selectedOptionValue || "NONE",
      number_prefix: AdminDocumentTypePrefixInput.text.trim(),
      print_kind: AdminDocumentTypePrintKindInpu.text.trim(),
      default_status: AdminDocumentTypeDefaultStatus.selectedOptionValue || "DRAFT",
      default_posting_status: AdminDocumentTypeDefaultPostin.selectedOptionValue || "NOT_POSTED",
      stock_effect: AdminDocumentTypeStockEffectSe.selectedOptionValue || "NONE",
      stock_posting_stage: AdminDocumentTypeStockStageSel.selectedOptionValue || "POST",
      default_currency_code: AdminDocumentTypeCurrencyInput.text.trim() || "EUR",
      default_payment_method_code: AdminDocumentTypePaymentMethod.text.trim() || null,
      affects_stock: AdminDocumentTypeAffectsStockS.isSwitchedOn ? 1 : 0,
      affects_customer_balance: AdminDocumentTypeCustomerBalan.isSwitchedOn ? 1 : 0,
      affects_supplier_balance: AdminDocumentTypeSupplierBalan.isSwitchedOn ? 1 : 0,
      requires_partner: AdminDocumentTypeRequiresPartn.isSwitchedOn ? 1 : 0,
      requires_warehouse: AdminDocumentTypeRequiresWareh.isSwitchedOn ? 1 : 0,
      requires_payment_method: AdminDocumentTypeRequiresPayme.isSwitchedOn ? 1 : 0,
      fiscalization_allowed: AdminDocumentTypeFiscalAllowed.isSwitchedOn ? 1 : 0,
      fiscalization_required: AdminDocumentTypeFiscalRequire.isSwitchedOn ? 1 : 0,
      can_print: AdminDocumentTypeCanPrintSwitc.isSwitchedOn ? 1 : 0,
      can_email: AdminDocumentTypeCanEmailSwitc.isSwitchedOn ? 1 : 0,
      can_convert: AdminDocumentTypeCanConvertSwi.isSwitchedOn ? 1 : 0,
      is_active: AdminDocumentTypeActiveSwitch.isSwitchedOn ? 1 : 0
    };
  },

  async save() {
    if (!this.validate()) return;

    const wasEditMode = this.isEditMode();

    try {
      if (wasEditMode) {
        await UpdateAdminDocumentType.run();
      } else {
        await InsertAdminDocumentType.run();
      }

      await AdminAudit.log(
        wasEditMode ? "UPDATE" : "INSERT",
        "document_type_settings",
        this.selectedId(),
        this.payload()
      );

      await ListAdminDocumentTypes.run();

      closeModal(AdminDocumentTypeModal.name);
      showAlert(wasEditMode ? "Document setup updated." : "Document setup created.", "success");
    } catch (error) {
      showAlert("Error while saving document setup: " + error.message, "error");
      console.log(error);
    }
  },

  async remove(row = null) {
    const selected = row || AdminDocumentTypesTable.selectedRow || {};
    const id =
      selected.documentTypeSettingId ||
      selected.id ||
      selected.ID ||
      0;

    const code =
      selected["Document Type"] ||
      selected.code ||
      selected.document_type ||
      "";

    if (!id || !code) {
      showAlert("Select document type first.", "warning");
      return;
    }

    try {
      const usageRows = await GetAdminDocumentTypeUsage.run({ code });
      const usage = Number((usageRows?.[0] || GetAdminDocumentTypeUsage.data?.[0] || {}).documentCount || 0);

      if (usage > 0) {
        await DeactivateAdminDocumentType.run({ id });

        await AdminAudit.log(
          "DEACTIVATE",
          "document_type_settings",
          id,
          { code, document_count: usage }
        );

        showAlert("Document type is already used, so it was deactivated instead of deleted.", "warning");
      } else {
        await DeleteAdminDocumentType.run({ id });

        await AdminAudit.log(
          "DELETE",
          "document_type_settings",
          id,
          { code }
        );

        showAlert("Document type deleted.", "success");
      }

      await ListAdminDocumentTypes.run();
    } catch (error) {
      showAlert("Error while removing document setup: " + error.message, "error");
      console.log(error);
    }
  }
};
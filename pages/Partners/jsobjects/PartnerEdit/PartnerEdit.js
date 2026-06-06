export default {
  isEditMode() {
    return Number(appsmith.store.currentPartnerId || 0) > 0;
  },

  saveButtonLabel() {
    return this.isEditMode() ? "Update Partner" : "Save Partner";
  },

  value(source = {}, keys = [], fallback = "") {
    for (const key of keys) {
      if (source?.[key] !== undefined && source?.[key] !== null) {
        return source[key];
      }
    }

    return fallback;
  },

  partnerId(rowOrId = null) {
    if (
      typeof rowOrId === "number" ||
      typeof rowOrId === "string"
    ) {
      return Number(rowOrId || 0);
    }

    const row =
      rowOrId ||
      PartnersTable.triggeredRow ||
      PartnersTable.selectedRow ||
      {};

    return Number(
      row.partner_id ||
      row.partnerId ||
      row.id ||
      row.ID ||
      row["Partner ID"] ||
      0
    );
  },

  getPartnerAuditValues() {
    return {
      partner_type: PartnerTypeSelect.selectedOptionValue || null,
      code: PartnerCodeInput.text?.trim() || "",
      name: PartnerNameInput.text?.trim() || "",
      legal_name: LegalNameInput.text?.trim() || "",
      tax_number: OIBInput.text?.trim() || "",
      registration_number: RegistrationNumberInput.text?.trim() || "",
      responsible_person: ResponsiblePersonInput.text?.trim() || "",
      contact_person: ContactPersonInput.text?.trim() || "",
      address_line1: AddressInput.text?.trim() || "",
      country_code: CountryCodeSelect.text?.trim() || "HR",
      postal_code: PostalCodeInput.text?.trim() || "",
      city_name: CityInput.text?.trim() || "",
      email: Email.text?.trim() || "",
      phone: Phone.text?.trim() || "",
      payment_term_days: Number(PaymentTermDaysInput.text || 0),
      credit_limit: Number(PaymentTermDays.text || 0),
      note: Note.text || ""
    };
  },

  async loadPartnerForEdit(rowOrId = null) {
  const partnerId = this.partnerId(rowOrId);

  if (!partnerId) {
    showAlert("Select partner first.", "warning");
    return;
  }

  try {
    const rows = await GetPartnerForEdit.run({ partnerId });
    const partner = rows?.[0] || GetPartnerForEdit.data?.[0];

    if (!partner) {
      showAlert(`Partner was not found for ID ${partnerId}.`, "error");
      return;
    }

    await storeValue("currentPartnerId", partnerId);
    await storeValue("partnerEditMode", true);
    await storeValue("partnerBeforeEdit", partner);

    // Modal mora biti otvoren prije punjenja widgeta.
    await showModal(PartnerModal.name);

    await PartnerCodeInput.setValue(
      this.value(partner, ["partnerCode", "code"], "")
    );

    await OIBInput.setValue(
      this.value(partner, ["oib", "taxNumber", "tax_number"], "")
    );

    await PartnerNameInput.setValue(
      this.value(partner, ["partnerName", "name"], "")
    );

    await LegalNameInput.setValue(
      this.value(partner, ["legalName", "legal_name"], "")
    );

    await RegistrationNumberInput.setValue(
      this.value(partner, ["registrationNumber", "registration_number"], "")
    );

    await ResponsiblePersonInput.setValue(
      this.value(partner, [
        "responsiblePerson",
        "responsible_person",
        "contactPerson",
        "contact_person"
      ], "")
    );

    await ContactPersonInput.setValue(
      this.value(partner, ["contactPerson", "contact_person"], "")
    );

    await AddressInput.setValue(
      this.value(partner, ["addressLine1", "address_line1"], "")
    );

    await CountryCodeSelect.setValue(
      this.value(partner, ["countryCode", "country_code"], "HR")
    );

    await PostalCodeInput.setValue(
      this.value(partner, ["postalCode", "postal_code"], "")
    );

    await CityInput.setValue(
      this.value(partner, ["city", "cityName", "city_name"], "")
    );

    await Email.setValue(
      this.value(partner, ["email"], "")
    );

    await Phone.setValue(
      this.value(partner, ["phone"], "")
    );

    await PaymentTermDaysInput.setValue(
      String(this.value(partner, ["paymentTermDays", "payment_term_days"], 0))
    );

    await PaymentTermDays.setValue(
      String(this.value(partner, ["creditLimit", "credit_limit"], 0))
    );

    await Note.setValue(
      this.value(partner, ["note"], "")
    );

    if (typeof PartnerTypeSelect.setSelectedOption === "function") {
      await PartnerTypeSelect.setSelectedOption(
        this.value(partner, ["partnerType", "partner_type"], "BOTH")
      );
    }
  } catch (error) {
    showAlert("Error while loading partner: " + error.message, "error");
    console.log(error);
  }
},

  async startNewPartner() {
    await storeValue("currentPartnerId", null);
    await storeValue("partnerEditMode", false);
    await storeValue("partnerBeforeEdit", null);

    PartnerTypeSelect.setSelectedOption("BOTH");

    PartnerCodeInput.setValue("");
    OIBInput.setValue("");
    PartnerNameInput.setValue("");
    LegalNameInput.setValue("");
    RegistrationNumberInput.setValue("");
    ResponsiblePersonInput.setValue("");
    ContactPersonInput.setValue("");
    AddressInput.setValue("");
    CountryCodeSelect.setValue("HR");
    PostalCodeInput.setValue("");
    CityInput.setValue("");
    Email.setValue("");
    Phone.setValue("");
    PaymentTermDaysInput.setValue("0");
    PaymentTermDays.setValue("0");
    Note.setValue("");

    showModal(PartnerModal.name);
  },

  validate() {
    if (!PartnerCodeInput.text?.trim()) {
      showAlert("Partner code is required.", "warning");
      return false;
    }

    if (!PartnerNameInput.text?.trim()) {
      showAlert("Partner name is required.", "warning");
      return false;
    }

    if (!PartnerTypeSelect.selectedOptionValue) {
      showAlert("Partner type is required.", "warning");
      return false;
    }

    return true;
  },

  async savePartner() {
    if (!this.validate()) return;

    const wasEditMode = this.isEditMode();
    const currentPartnerId = Number(
      appsmith.store.currentPartnerId || 0
    );

    const auditValues = this.getPartnerAuditValues();

    try {
      let partnerId = currentPartnerId;

      if (wasEditMode) {
        await UpdatePartner.run({ partnerId });
      } else {
        const result = await InsertPartner.run();

        partnerId = Number(
          result?.insertId ||
          result?.[0]?.insertId ||
          result?.[0]?.partnerId ||
          InsertPartner.data?.insertId ||
          InsertPartner.data?.[0]?.insertId ||
          InsertPartner.data?.[0]?.partnerId ||
          0
        );
      }

      if (typeof AuditLog !== "undefined" && AuditLog.insert) {
        await AuditLog.insert({
          entityName: "business_partners",
          entityId: partnerId || PartnerCodeInput.text,
          actionType: wasEditMode ? "UPDATE" : "INSERT",
          oldValues: wasEditMode
            ? appsmith.store.partnerBeforeEdit || null
            : null,
          newValues: auditValues
        });
      }

      await this.afterSave(partnerId);

      showAlert(
        wasEditMode
          ? "Partner was updated successfully."
          : "Partner was saved successfully.",
        "success"
      );
    } catch (error) {
      showAlert("Error while saving partner: " + error.message, "error");
      console.log(error);
    }
  },

  async deletePartner(rowOrId = null) {
    const partnerId = this.partnerId(rowOrId);

    if (!partnerId) {
      showAlert("Select partner first.", "warning");
      return;
    }

    try {
      await DeletePartner.run({ partnerId });

      if (typeof AuditLog !== "undefined" && AuditLog.insert) {
        await AuditLog.insert({
          entityName: "business_partners",
          entityId: partnerId,
          actionType: "DELETE",
          oldValues: appsmith.store.partnerBeforeEdit || null
        });
      }

      await this.afterSave(null);
      showAlert("Partner was deleted.", "success");
    } catch (error) {
      showAlert(
        "Partner cannot be deleted because related documents may exist.",
        "error"
      );

      console.log(error);
    }
  },

  async refreshPartner360(partnerId) {
    if (!partnerId) {
      if (typeof Partner360 !== "undefined") {
        await Partner360.clear();
      }

      return;
    }

    await storeValue("selectedPartnerId", partnerId);

    if (typeof GetPartner360Header !== "undefined") {
      await GetPartner360Header.run();
    }

    if (typeof ListPartner360Documents !== "undefined") {
      await ListPartner360Documents.run();
    }

    if (typeof ListPartner360TopProducts !== "undefined") {
      await ListPartner360TopProducts.run();
    }
  },

  async afterSave(partnerId = null) {
    await storeValue("currentPartnerId", null);
    await storeValue("partnerEditMode", false);
    await storeValue("partnerBeforeEdit", null);

    closeModal(PartnerModal.name);

    if (typeof PartnerOverview !== "undefined") {
      await PartnerOverview.refresh();
    } else {
      if (typeof ListPartnersOverview !== "undefined") {
        await ListPartnersOverview.run();
      }

      if (typeof GetPartnerOverviewStats !== "undefined") {
        await GetPartnerOverviewStats.run();
      }
    }

    await this.refreshPartner360(partnerId);
  },

  async cancel() {
    await storeValue("currentPartnerId", null);
    await storeValue("partnerEditMode", false);
    await storeValue("partnerBeforeEdit", null);

    closeModal(PartnerModal.name);
  }
};
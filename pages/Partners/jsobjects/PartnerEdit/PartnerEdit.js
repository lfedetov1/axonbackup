export default {
  isEditMode() {
    return !!appsmith.store.currentPartnerId;
  },

  saveButtonLabel() {
    return this.isEditMode() ? "Update Partner" : "Save Partner";
  },

  getPartnerAuditValues() {
    return {
      partner_type: typeof PartnerTypeSelect !== "undefined"
        ? PartnerTypeSelect.selectedOptionValue
        : null,
      code: PartnerCodeInput.text,
      name: PartnerNameInput.text,
      legal_name: LegalNameInput.text,
      oib: OIBInput.text,
      registration_number: RegistrationNumberInput.text,
      contact_person: typeof ContactPersonInput !== "undefined"
        ? ContactPersonInput.text
        : null,
      email: Email.text,
      phone: Phone.text,
      address_line1: AddressInput.text,
      postal_code: PostalCodeInput.text,
      city: CityInput.text,
      country_code: typeof CountryCodeSelect !== "undefined"
        ? (CountryCodeSelect.selectedOptionValue || CountryCodeSelect.text || "HR")
        : "HR",
      payment_term_days: PaymentTermDaysInput.text,
      credit_limit: PaymentTermDays.text,
      note: Note.text
    };
  },

  async loadPartnerForEdit(partnerId) {
    if (!partnerId) {
      showAlert("Select partner first.", "warning");
      return;
    }

    try {
      const rows = await GetPartnerForEdit.run({ partnerId });
      const partner = rows?.[0] || GetPartnerForEdit.data?.[0];

      if (!partner) {
        showAlert("Partner was not found.", "error");
        return;
      }

      await storeValue("currentPartnerId", partner.partnerId);
      await storeValue("partnerBeforeEdit", partner);

      if (typeof PartnerTypeSelect !== "undefined") {
        PartnerTypeSelect.setSelectedOption(partner.partnerType || "BOTH");
      }

      PartnerCodeInput.setValue(partner.partnerCode || "");
      PartnerNameInput.setValue(partner.partnerName || "");
      LegalNameInput.setValue(partner.legalName || "");
      OIBInput.setValue(partner.oib || "");
      RegistrationNumberInput.setValue(partner.registrationNumber || "");

      if (typeof ContactPersonInput !== "undefined") {
        ContactPersonInput.setValue(partner.contactPerson || "");
      }

      Email.setValue(partner.email || "");
      Phone.setValue(partner.phone || "");
      AddressInput.setValue(partner.addressLine1 || "");
      PostalCodeInput.setValue(partner.postalCode || "");
      CityInput.setValue(partner.city || "");

      if (typeof CountryCodeSelect !== "undefined") {
        CountryCodeSelect.setSelectedOption(partner.countryCode || "HR");
      }

      PaymentTermDaysInput.setValue(String(partner.paymentTermDays || 0));
      PaymentTermDays.setValue(String(partner.creditLimit || 0));
      Note.setValue(partner.note || "");

      showAlert("Partner loaded for editing.", "success");
    } catch (error) {
      showAlert("Error while loading partner: " + error.message, "error");
      console.log(error);
    }
  },

  async startNewPartner() {
    await storeValue("currentPartnerId", null);
    await storeValue("partnerBeforeEdit", null);

    if (typeof PartnerTypeSelect !== "undefined") {
      PartnerTypeSelect.setSelectedOption("BOTH");
    }

    PartnerCodeInput.setValue("");
    PartnerNameInput.setValue("");
    LegalNameInput.setValue("");
    OIBInput.setValue("");
    RegistrationNumberInput.setValue("");

    if (typeof ContactPersonInput !== "undefined") {
      ContactPersonInput.setValue("");
    }

    Email.setValue("");
    Phone.setValue("");
    AddressInput.setValue("");
    PostalCodeInput.setValue("");
    CityInput.setValue("");

    if (typeof CountryCodeSelect !== "undefined") {
      CountryCodeSelect.text("HR");
    }

    PaymentTermDaysInput.setValue("0");
    PaymentTermDays.setValue("0");
    Note.setValue("");

    showAlert("New partner is ready.", "success");
  },

  async savePartner() {
    if (!PartnerNameInput.text) {
      showAlert("Partner name is required.", "warning");
      return;
    }

    try {
      const auditValues = this.getPartnerAuditValues();

      if (this.isEditMode()) {
        const partnerId = appsmith.store.currentPartnerId;

        await UpdatePartner.run();

        await AuditLog.insert({
          entityName: "business_partners",
          entityId: partnerId,
          actionType: "UPDATE",
          oldValues: appsmith.store.partnerBeforeEdit || null,
          newValues: auditValues
        });

        showAlert("Partner was updated successfully.", "success");
      } else {
        const result = await InsertPartner.run();

        const partnerId =
          result?.insertId ||
          result?.[0]?.insertId ||
          result?.[1]?.[0]?.partnerId ||
          InsertPartner.data?.insertId ||
          InsertPartner.data?.[0]?.insertId ||
          InsertPartner.data?.[1]?.[0]?.partnerId ||
          PartnerCodeInput.text;

        await AuditLog.insert({
          entityName: "business_partners",
          entityId: partnerId,
          actionType: "INSERT",
          newValues: auditValues
        });

        await storeValue("currentPartnerId", partnerId);

        showAlert("Partner was saved successfully.", "success");
      }

      await storeValue("partnerBeforeEdit", null);

      if (typeof SearchPartners !== "undefined") {
        await SearchPartners.run();
      }

      if (typeof InsertAuditLog !== "undefined") {
        await InsertAuditLog.run();
      }
    } catch (error) {
      showAlert("Error while saving partner: " + error.message, "error");
      console.log(error);
    }
  }
};

export default {
  isEditMode() {
    return !!appsmith.store.currentPartnerId;
  },

  saveButtonLabel() {
    return this.isEditMode() ? "Update Partner" : "Save Partner";
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
        CountryCodeSelect.text(partner.countryCode || "HR");
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
      if (this.isEditMode()) {
        await UpdatePartner.run();
        showAlert("Partner was updated successfully.", "success");
      } else {
        await InsertPartner.run();
        showAlert("Partner was saved successfully.", "success");
      }

      await SearchPartners.run();
    } catch (error) {
      showAlert("Error while saving partner: " + error.message, "error");
      console.log(error);
    }
  }
};

export default {
  getSubject(result) {
    if (Array.isArray(result)) {
      return result[0];
    }

    if (Array.isArray(result?.items)) {
      return result.items[0];
    }

    return result;
  },

  pick(data, keys, fallback = "") {
    for (const key of keys) {
      const value = data?.[key];

      if (value === undefined || value === null || value === "") {
        continue;
      }

      if (typeof value === "object") {
        if (value.ime_prezime) return value.ime_prezime;
        if (value.ime) return value.ime;
        if (value.naziv) return value.naziv;
        if (value.opis) return value.opis;
        continue;
      }

      return value;
    }

    return fallback;
  },

  nested(data, paths, fallback = "") {
    for (const path of paths) {
      const value = path.split(".").reduce((current, key) => current?.[key], data);

      if (value === undefined || value === null || value === "") {
        continue;
      }

      if (typeof value === "object") {
        if (value.ime_prezime) return value.ime_prezime;
        if (value.ime) return value.ime;
        if (value.naziv) return value.naziv;
        if (value.opis) return value.opis;
        continue;
      }

      return value;
    }

    return fallback;
  },

  first(items) {
    return Array.isArray(items) && items.length ? items[0] : {};
  },

  firstFromLists(data, listKeys, valueKeys) {
    for (const listKey of listKeys) {
      const value = data?.[listKey];
      const list = Array.isArray(value) ? value : value?.items;

      if (!Array.isArray(list) || !list.length) {
        continue;
      }

      const picked = this.pick(list[0], valueKeys);
      if (picked) {
        return picked;
      }
    }

    return "";
  },

  async getSudregToken() {
    const response = await SudregToken.run();
    const token = response?.access_token || SudregToken.data?.access_token;

    if (!token) {
      showAlert("Sudreg token was not returned.", "error");
      return null;
    }

    return token;
  },

  async fetchSudregSubject(token, oib) {
    const url =
      "https://sudreg-data.gov.hr/api/javni/detalji_subjekta" +
      "?expand_relations=true" +
      "&no_data_error=0" +
      "&omit_nulls=0" +
      "&tip_identifikatora=oib" +
      "&identifikator=" + encodeURIComponent(oib);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const text = await response.text();
      showAlert("Sudreg lookup failed: " + response.status, "error");
      console.log(text);
      return null;
    }

    return response.json();
  },

  async fetchPartnerData() {
    const oib = String(OIBInput.text || "").replace(/\D/g, "");

    if (!/^\d{11}$/.test(oib)) {
      showAlert("Please enter a valid 11-digit OIB.", "warning");
      return;
    }

    const token = await this.getSudregToken();

    if (!token) {
      return;
    }

    const result = await this.fetchSudregSubject(token, oib);
    const data = this.getSubject(result);

    if (!data || typeof data !== "object") {
      showAlert("No company was found for this OIB.", "warning");
      return;
    }

    const address =
      this.first(data.sjedista) ||
      this.first(data.adrese) ||
      data.sjediste ||
      data.adresa ||
      {};

    const companyName =
      this.pick(data, ["ime", "tvrtka", "naziv", "name"]) ||
      this.pick(this.first(data.imena || data.nazivi || data.tvrtke), ["ime", "naziv"]);

    const contactPerson =
      this.pick(data, ["kontakt_osoba", "kontakt", "contact_person", "contactPerson"]) ||
      this.nested(data, [
        "kontakt_osoba.ime_prezime",
        "kontakt_osoba.ime",
        "kontakt_osoba.naziv",
        "kontakt.ime_prezime",
        "kontakt.ime",
        "kontakt.naziv"
      ]);

    const responsiblePerson =
      this.pick(data, ["odgovorna_osoba", "responsible_person", "responsiblePerson"]) ||
      this.nested(data, [
        "odgovorna_osoba.ime_prezime",
        "odgovorna_osoba.ime",
        "odgovorna_osoba.naziv"
      ]) ||
      this.firstFromLists(
        data,
        ["osobe_ovlastene_za_zastupanje", "ovlastene_osobe", "zastupnici", "representatives"],
        ["ime_prezime", "ime", "naziv", "name", "fullName"]
      );

    const city =
      this.nested(data, [
        "sjediste.naziv_naselja",
        "sjediste.naselje.ime",
        "sjediste.naselje.naziv",
        "sjediste.mjesto.ime",
        "sjediste.mjesto.naziv",
        "sjediste.grad.ime",
        "sjediste.grad.naziv",
        "sjediste.opcina.ime",
        "sjediste.opcina.naziv"
      ]) ||
      this.pick(address, ["naziv_naselja", "naselje", "mjesto", "grad"]) ||
      this.pick(data, ["sjediste_naziv", "mjesto", "grad"]);

    const street =
      this.nested(data, [
        "sjediste.ulica",
        "sjediste.ulica.ime",
        "sjediste.ulica.naziv",
        "sjediste.adresa"
      ]) ||
      this.pick(address, ["ulica", "adresa", "sjediste_adresa"]);

    const houseNumber =
      this.nested(data, [
        "sjediste.kucni_broj",
        "sjediste.kucni_broj_dodatak",
        "sjediste.broj"
      ]) ||
      this.pick(address, ["kucni_broj", "broj"], "");

    const addressLine = [street, houseNumber].filter(Boolean).join(" ");

    const postalCode =
      this.nested(data, [
        "sjediste.postanski_broj",
        "sjediste.posta_broj",
        "sjediste.posta.postanski_broj",
        "sjediste.posta.broj",
        "sjediste.posta.oznaka"
      ]) ||
      this.pick(address, ["postanski_broj", "posta_broj"]);

    const autofill = {
      OIB: this.pick(data, ["oib", "potpuni_oib", "OIB"], oib),
      PartnerCode: this.pick(data, ["oib", "potpuni_oib", "OIB"], oib),
      PartnerName: companyName,
      LegalName: companyName,
      ContactPerson: contactPerson,
      ResponsiblePerson: responsiblePerson,
      RegistrationNumber: this.pick(data, ["mbs", "mb"]),
      Address: addressLine,
      City: city,
      PostalCode: postalCode,
      CountryCode: "HR",
      PartnerType: "BOTH"
    };

    await storeValue("partnerAutofill", autofill);

    PartnerCodeInput.setValue(autofill.PartnerCode);
    PartnerNameInput.setValue(autofill.PartnerName);
    LegalNameInput.setValue(autofill.LegalName);
    ContactPersonInput.setValue(autofill.ContactPerson);
    ResponsiblePersonInput.setValue(autofill.ResponsiblePerson);
    RegistrationNumberInput.setValue(autofill.RegistrationNumber);
    AddressInput.setValue(autofill.Address);
    CityInput.setValue(autofill.City);
    PostalCodeInput.setValue(autofill.PostalCode);

    showAlert("Partner data loaded.", "success");
  }
};

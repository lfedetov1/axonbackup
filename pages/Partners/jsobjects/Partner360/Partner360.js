export default {
  row(row = null) {
    return (
      row ||
      PartnerTable1.triggeredRow ||
      PartnerTable1.selectedRow ||
      {}
    );
  },

  partnerId(row = null) {
    const selected = this.row(row);

    return Number(
      selected.partner_id ||
      selected.partnerId ||
      selected["Partner ID"] ||
      selected.id ||
      selected.ID ||
      0
    );
  },

  firstRow(result, queryObject) {
    return (
      result?.[0] ||
      result?.data?.[0] ||
      queryObject?.data?.[0] ||
      null
    );
  },

  rows(result, queryObject) {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(queryObject?.data)) return queryObject.data;

    return [];
  },

  pick(source = {}, keys = [], fallback = "") {
    for (const key of keys) {
      const value = source?.[key];

      if (
        value !== undefined &&
        value !== null &&
        typeof value !== "object"
      ) {
        return value;
      }
    }

    return fallback;
  },

  normalizeHeader(header = {}) {
    return {
      partnerId: Number(
        this.pick(header, ["partnerId", "partner_id", "id"], 0)
      ),

      companyId: Number(
        this.pick(header, ["companyId", "company_id"], 0)
      ),

      partnerCode: this.pick(
        header,
        ["partnerCode", "partner_code", "code"]
      ),

      partnerName: this.pick(
        header,
        ["partnerName", "partner_name", "name"]
      ),

      legalName: this.pick(
        header,
        ["legalName", "legal_name"]
      ),

      partnerType: this.pick(
        header,
        ["partnerType", "partner_type"],
        "PARTNER"
      ),

      taxNumber: this.pick(
        header,
        ["taxNumber", "tax_number", "oib"]
      ),

      registrationNumber: this.pick(
        header,
        ["registrationNumber", "registration_number"]
      ),

      responsiblePerson: this.pick(
        header,
        ["responsiblePerson", "responsible_person"]
      ),

      contactPerson: this.pick(
        header,
        ["contactPerson", "contact_person"]
      ),

      email: this.pick(header, ["email"]),
      phone: this.pick(header, ["phone"]),
      mobile: this.pick(header, ["mobile"]),

      address: this.pick(
        header,
        ["address", "addressLine1", "address_line1"]
      ),

      city: this.pick(
        header,
        ["city", "cityName", "city_name"]
      ),

      postalCode: this.pick(
        header,
        ["postalCode", "postal_code"]
      ),

      country: this.pick(
        header,
        ["country", "countryCode", "country_code"]
      ),

      paymentTermDays: Number(
        this.pick(header, ["paymentTermDays", "payment_term_days"], 0)
      ),

      creditLimit: Number(
        this.pick(header, ["creditLimit", "credit_limit"], 0)
      ),

      documentCount: Number(
        this.pick(header, ["documentCount", "document_count"], 0)
      ),

      salesAmount: Number(
        this.pick(header, ["salesAmount", "sales_amount"], 0)
      ),

      purchaseAmount: Number(
        this.pick(header, ["purchaseAmount", "purchase_amount"], 0)
      ),

      openAmount: Number(
        this.pick(header, ["openAmount", "open_amount"], 0)
      ),

      lastDocumentDate: this.pick(
        header,
        ["lastDocumentDate", "last_document_date"]
      ),

      createdAt: this.pick(
        header,
        ["createdAt", "created_at"]
      ),

      updatedAt: this.pick(
        header,
        ["updatedAt", "updated_at"]
      ),

      isActive: Number(
        this.pick(header, ["isActive", "is_active"], 0)
      ),

      riskStatus: this.pick(
        header,
        ["riskStatus", "risk_status"],
        "NEW"
      )
    };
  },

  normalizeDocuments(documents = []) {
    return documents.map(row => ({
      documentId: Number(
        this.pick(row, ["documentId", "document_id", "id"], 0)
      ),

      documentType: this.pick(
        row,
        ["documentType", "document_type"]
      ),

      documentNumber: this.pick(
        row,
        ["documentNumber", "document_number"]
      ),

      documentDate: this.pick(
        row,
        ["documentDate", "document_date"]
      ),

      status: this.pick(row, ["status"], "DRAFT"),

      postingStatus: this.pick(
        row,
        ["postingStatus", "posting_status"]
      ),

      paymentMethod: this.pick(
        row,
        ["paymentMethod", "payment_method"]
      ),

      currencyCode: this.pick(
        row,
        ["currencyCode", "currency_code"],
        "EUR"
      ),

      totalAmount: Number(
        this.pick(row, ["totalAmount", "total_amount"], 0)
      ),

      paidAmount: Number(
        this.pick(row, ["paidAmount", "paid_amount"], 0)
      ),

      openAmount: Number(
        this.pick(row, ["openAmount", "open_amount"], 0)
      )
    }));
  },

  normalizeProducts(products = []) {
    return products.map(row => ({
      productCode: this.pick(
        row,
        ["productCode", "product_code", "code"]
      ),

      productName: this.pick(
        row,
        ["productName", "product_name", "name"]
      ),

      quantity: Number(
        this.pick(row, ["quantity"], 0)
      ),

      totalAmount: Number(
        this.pick(row, ["totalAmount", "total_amount"], 0)
      )
    }));
  },

  async load(row = null) {
    const selected = this.row(row);
    const partnerId = this.partnerId(selected);

    if (!partnerId) {
      showAlert("Select partner first.", "warning");
      await this.clear();
      return;
    }

    try {
      await storeValue("selectedPartnerId", partnerId);

      const headerResult = await GetPartner360Header.run();
      const documentsResult = await ListPartner360Documents.run();
      const productsResult = await ListPartner360TopProducts.run();

      const rawHeader = this.firstRow(
        headerResult,
        GetPartner360Header
      );

      if (!rawHeader) {
        await storeValue("partner360Data", null);

        showAlert(
          `Partner 360 data was not found for ID ${partnerId}.`,
          "error"
        );

        return;
      }

      const data = {
        header: this.normalizeHeader(rawHeader),

        documents: this.normalizeDocuments(
          this.rows(documentsResult, ListPartner360Documents)
        ),

        topProducts: this.normalizeProducts(
          this.rows(productsResult, ListPartner360TopProducts)
        ),

        printedAt: moment().format("DD.MM.YYYY HH:mm:ss"),
        printedBy: appsmith.store.username || ""
      };

      await storeValue("partner360Data", data);
    } catch (error) {
      showAlert(
        "Error while loading Partner 360: " + error.message,
        "error"
      );

      console.log(error);
    }
  },

  async refresh() {
    const partnerId = Number(
      appsmith.store.selectedPartnerId || 0
    );

    if (!partnerId) {
      showAlert("Select partner first.", "warning");
      return;
    }

    await this.load({ partner_id: partnerId });
  },

  model() {
    return (
      appsmith.store.partner360Data || {
        header: {},
        documents: [],
        topProducts: [],
        printedAt: "",
        printedBy: ""
      }
    );
  },

  async clear() {
    await storeValue("selectedPartnerId", null);
    await storeValue("partner360Data", null);
  }
};
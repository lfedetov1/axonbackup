export default {
  slipTypes() {
    return [
      "CASH_IN_SLIP",
      "CASH_OUT_SLIP",
      "BANK_DEPOSIT_SLIP",
      "BANK_WITHDRAWAL_SLIP"
    ];
  },

  isSlipType(type = PosReportTypeSelect.selectedOptionValue) {
    return this.slipTypes().includes(type);
  },

  slipTitle(type, transactionType = "") {
    if (type === "BANK_DEPOSIT_SLIP" || transactionType === "TRANSFER_OUT") return "Polog na banku";
    if (type === "BANK_WITHDRAWAL_SLIP" || transactionType === "TRANSFER_IN") return "Podizanje s banke";
    if (type === "CASH_OUT_SLIP" || transactionType === "OUT") return "Isplatnica";
    return "Uplatnica";
  },

  async preview() {
    try {
      await this.load();
      showAlert("POS report preview loaded.", "success");
    } catch (error) {
      showAlert("Error while loading POS report: " + error.message, "error");
      console.log(error);
    }
  },

  async open() {
    try {
      await this.load();
      showModal(PosReportCenterModal.name);
    } catch (error) {
      showAlert("Error while opening POS report: " + error.message, "error");
      console.log(error);
    }
  },

  async load() {
    const type = PosReportTypeSelect.selectedOptionValue || "POS_OVERVIEW";

    if (this.isSlipType(type)) {
      await this.loadCashSlip(type);
      return;
    }

    await GetPosReportOverview.run();
    await GetPosReportPayments.run();
    await GetPosReportCashTransactions.run();
    await GetPosReportClosing.run();
    await GetPosReportTopItems.run();

    await storeValue("posReportPrintModel", {
      type,
      cashRegister:
        PosReportCashRegisterSelect.selectedOptionLabel ||
        PosReportCashRegisterSelect.selectedOptionValue ||
        "All Registers",
      dateFrom: moment(PosReportDateFrom.selectedDate || moment()).format("YYYY-MM-DD"),
      dateTo: moment(PosReportDateTo.selectedDate || moment()).format("YYYY-MM-DD"),
      overview: GetPosReportOverview.data?.[0] || {},
      payments: GetPosReportPayments.data || [],
      cashTransactions: GetPosReportCashTransactions.data || [],
      closings: GetPosReportClosing.data || [],
      topItems: GetPosReportTopItems.data || [],
      printedAt: moment().format("DD.MM.YYYY HH:mm:ss"),
      printedBy: appsmith.store.username || ""
    });
  },

  async loadCashSlip(type) {
    const slip = appsmith.store.posLastCashPrintModel || {};

    if (!slip.referenceNumber) {
      showAlert("No cash operation is ready for print. Save cash operation first.", "warning");
      return;
    }

    await storeValue("posReportPrintModel", {
      type: "CASH_SLIP",
      slipType: type,
      title: slip.title || this.slipTitle(type, slip.type),

      companyName: slip.companyName || "AXON POS",
      companyTaxNumber: slip.companyTaxNumber || "",
      companyRegistrationNumber: slip.companyRegistrationNumber || "",
      companyEmail: slip.companyEmail || "",
      companyPhone: slip.companyPhone || "",
      companyAddress: slip.companyAddress || "",
      companyLogoPath: slip.companyLogoPath || "",

      warehouse: slip.warehouse || "",
      cashRegister: slip.cashRegister || "",
      referenceNumber: slip.referenceNumber,
      transactionType: slip.type || "",
      transactionDate: slip.transactionDate || "",
      amount: Number(slip.amount || 0),
      currency: slip.currency || "EUR",
      note: slip.note || "",
      createdBy: slip.createdBy || "",

      cashLines: slip.lines || [],
      accountingEntryNumber: slip.accountingEntryNumber || "",
      accountingLines: slip.accountingLines || [],

      printedAt: moment().format("DD.MM.YYYY HH:mm:ss"),
      printedBy: appsmith.store.username || ""
    });
  }
};
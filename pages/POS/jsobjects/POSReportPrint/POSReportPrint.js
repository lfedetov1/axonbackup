export default {
  async open(type, title, data = {}, cashRows = []) {
    await storeValue("posReportPrintData", {
      type,
      title,
      data,
      cashRows
    });

    showModal(PrintCenter.name);
  },

  async openingBalance() {
    return this.open("OPENING_BALANCE", "OPENING BALANCE / POČETNO STANJE", {
      reportDate: new Date().toISOString().slice(0, 10),
      companyName: appsmith.store.companyName,
      cashRegisterCode: appsmith.store.cashRegisterCode,
      warehouseName: appsmith.store.warehouseName,
      cashier: appsmith.store.username,
      openingAmount: appsmith.store.openingAmount || 0,
      currencyCode: "EUR"
    });
  },

  async totalSales() {
    const rows = await GetZReportPrintData.run();
    const data = rows?.[0] || GetZReportPrintData.data?.[0] || {};

    return this.open("TOTAL_SALES", "TOTAL SALES / UKUPNI PROMET", data);
  },

  async cashHandover() {
    const rows = await GetCashReconciliationPrintData.run();
    const data = rows?.[0] || GetCashReconciliationPrintData.data?.[0] || {};

    data.cashDepositTotal = CashCount.total();
    data.difference = CashCount.difference();

    return this.open(
      "CASH_HANDOVER",
      "CASH HANDOVER / PREDAJA GOTOVINE",
      data,
      appsmith.store.cashDepositRows || []
    );
  },

  async cashReconciliation() {
    const rows = await GetCashReconciliationPrintData.run();
    const data = rows?.[0] || GetCashReconciliationPrintData.data?.[0] || {};

    data.cashDepositTotal = CashCount.total();
    data.countedCash = CashCount.total();
    data.difference = CashCount.difference();

    return this.open(
      "CASH_RECONCILIATION",
      "CASH RECONCILIATION / OBRAČUN GOTOVINE",
      data,
      appsmith.store.cashDepositRows || []
    );
  },

  async zReport() {
    const rows = await GetZReportPrintData.run();
    const data = rows?.[0] || GetZReportPrintData.data?.[0] || {};

    return this.open("Z_REPORT", "Z REPORT / Z TRAKA", data);
  },

  async paymentReceipt(paymentId) {
    const rows = await GetPaymentReceiptPrintData.run({ paymentId });
    const data = rows?.[0] || GetPaymentReceiptPrintData.data?.[0] || {};

    return this.open("PAYMENT_RECEIPT", "PAYMENT RECEIPT / POTVRDA O UPLATI", data);
  },

  async paymentConfirmation(paymentId) {
    const rows = await GetPaymentReceiptPrintData.run({ paymentId });
    const data = rows?.[0] || GetPaymentReceiptPrintData.data?.[0] || {};

    return this.open("PAYMENT_CONFIRMATION", "PAYMENT CONFIRMATION / POTVRDA O UPLATI", data);
  }
};

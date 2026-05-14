export default {
  can(code) {
    return (
      (appsmith.store.roleCodes || []).includes("ADMIN") ||
      (appsmith.store.roleCodes || []).includes("OWNER") ||
      (appsmith.store.permissions || []).includes(code)
    );
  },
	async openRegister() {
  if (!this.can("pos.open")) {
    showAlert("You do not have permission to open register.", "error");
    return;
  }

  if (!PosControlCashRegisterSelect.selectedOptionValue) {
    showAlert("Select cash register first.", "warning");
    return;
  }

  const amount = Number(appsmith.store.posOpenCashTotal || 0);

  if (amount < 0) {
    showAlert("Opening amount cannot be negative.", "warning");
    return;
  }

  await InsertPosOpeningTransaction.run();

  const txRows = await GetLastPosCashTransaction.run();
  const tx = txRows?.[0] || GetLastPosCashTransaction.data?.[0];

  if (!tx?.cashTransactionId) {
    showAlert("Opening transaction was saved, but ID was not found.", "error");
    return;
  }

  const lines = (appsmith.store.posOpenCashLines || []).filter(row => Number(row.quantity || 0) > 0);

  for (const row of lines) {
    await InsertPosCashCountLine.run({
      cashTransactionId: tx.cashTransactionId,
      closingId: null,
      countType: "OPENING",
      denominationValue: row.denominationValue,
      quantity: row.quantity,
      amount: row.amount
    });
  }

  await storeValue("posLastCashPrintModel", {
    type: "OPENING",
    title: "Opening Cash",
    cashRegister: PosControlCashRegisterSelect.selectedOptionLabel,
    referenceNumber: tx.referenceNumber,
    transactionDate: tx.transactionDate,
    amount,
    lines,
    note: PosControlOpeningNoteInput.text || "",
    printedAt: moment().format("DD.MM.YYYY HH:mm:ss"),
    printedBy: appsmith.store.username || ""
  });

  await this.refreshStatus();

  showAlert("Cash register opened.", "success");
  showModal(PosCashSlipPrintModal.name);
},
	async ensureRegisterOpen() {
  await this.refreshStatus();

  const status = appsmith.store.posShiftStatus?.shiftStatus || "NOT_OPENED";

  if (status !== "OPEN") {
    showAlert(
      status === "CLOSED"
        ? "Cash register is closed. Open a new shift before selling."
        : "Cash register is not opened. Open register before selling.",
      "warning"
    );

    showModal(PosControlModal.name);
    return false;
  }

  return true;
},
	async closeRegister() {
  if (!this.can("pos.close_day")) {
    showAlert("You do not have permission to close register.", "error");
    return;
  }

  if (!PosControlCashRegisterSelect.selectedOptionValue) {
    showAlert("Select cash register first.", "warning");
    return;
  }

  await this.refreshStatus();

  const status = appsmith.store.posShiftStatus?.shiftStatus || "NOT_OPENED";

  if (status !== "OPEN") {
    showAlert("Cash register is not open.", "warning");
    return;
  }

  const alreadyClosedRows = await CheckCashRegisterAlreadyClosed.run();
  const alreadyClosed = alreadyClosedRows?.[0] || CheckCashRegisterAlreadyClosed.data?.[0];

  if (alreadyClosed) {
    showAlert("Cash register is already closed for today.", "warning");
    return;
  }

  const countedAmount = Number(appsmith.store.posCloseCashTotal || 0);

  if (countedAmount < 0) {
    showAlert("Counted cash cannot be negative.", "warning");
    return;
  }

  await InsertPosCashRegisterClosing.run();

  const closingRows = await GetLastPosCashRegisterClosing.run();
  const closing = closingRows?.[0] || GetLastPosCashRegisterClosing.data?.[0];

  if (!closing?.closingId) {
    showAlert("Closing was saved, but closing ID was not found.", "error");
    return;
  }

  await InsertPosClosingTransaction.run();

  const txRows = await GetLastPosCashTransaction.run();
  const tx = txRows?.[0] || GetLastPosCashTransaction.data?.[0];

  const lines = (appsmith.store.posCloseCashLines || []).filter(row => Number(row.quantity || 0) > 0);

  for (const row of lines) {
    await InsertPosCashCountLine.run({
      cashTransactionId: tx?.cashTransactionId || null,
      closingId: closing.closingId,
      countType: "CLOSING",
      denominationValue: row.denominationValue,
      quantity: row.quantity,
      amount: row.amount
    });
  }

  await storeValue("posLastCashPrintModel", {
    type: "CLOSING",
    title: "Closing Cash",
    cashRegister: PosControlCashRegisterSelect.selectedOptionLabel,
    referenceNumber: "CLOSE-" + closing.closingId,
    transactionDate: closing.closedAt,
    amount: countedAmount,
    expectedAmount: Number(closing.expectedCashAmount || 0),
    differenceAmount: Number(closing.differenceAmount || 0),
    lines,
    note: PosControlClosingNoteInput.text || "",
    printedAt: moment().format("DD.MM.YYYY HH:mm:ss"),
    printedBy: appsmith.store.username || ""
  });

  await this.refreshStatus();

  showAlert("Cash register was closed.", "success");
  showModal(PosCashSlipPrintModal.name);
},




  async open() {
    await ListPosCashRegisters.run();

    if (!PosControlCashRegisterSelect.selectedOptionValue && ListPosCashRegisters.data?.[0]?.cashRegisterId) {
      PosControlCashRegisterSelect.setSelectedOption(String(ListPosCashRegisters.data[0].cashRegisterId));
    }

    await this.refreshStatus();
    showModal(PosControlModal.name);
  },

  async refreshStatus() {
    if (!PosControlCashRegisterSelect.selectedOptionValue) return;

    await GetPosShiftStatus.run();
    const s = GetPosShiftStatus.data?.[0] || {};

    await storeValue("posShiftStatus", s);

    PosControlStatusText.setText(s.shiftStatus || "NOT_OPENED");
    Name.setText(appsmith.store.posCashierName || appsmith.store.username || "");
    PosControlExpectedCashText.setText(Number(s.expectedCashAmount || 0).toFixed(2));
    PosControlTodaySalesText.setText(Number(s.totalSalesAmount || 0).toFixed(2));
  }
};

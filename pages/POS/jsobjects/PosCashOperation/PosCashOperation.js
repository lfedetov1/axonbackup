export default {
  can(code) {
    return (
      (appsmith.store.roleCodes || []).includes("ADMIN") ||
      (appsmith.store.roleCodes || []).includes("OWNER") ||
      (appsmith.store.permissions || []).includes(code)
    );
  },

  defaultLines() {
    return [500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01].map(value => ({
      denominationValue: value,
      quantity: 0,
      amount: 0
    }));
  },

  cashRegisterId() {
    return (
      PosControlCashRegisterSelect.selectedOptionValue ||
      appsmith.store.currentCashRegisterId ||
      null
    );
  },

  cashRegisterLabel() {
    return (
      PosControlCashRegisterSelect.selectedOptionLabel ||
      PosControlCashRegisterSelect.selectedOptionValue ||
      ""
    );
  },

  async open(type = "IN") {
    await ListPosCashRegisters.run();

    await storeValue("posCashOperationLines", this.defaultLines());
    await storeValue("posCashOperationTotal", 0);
    await storeValue("posCashOperationType", type);
    await storeValue("posCashOperationNote", "");

    if (typeof PosControlCashInOutTypeSelect !== "undefined") {
      PosControlCashInOutTypeSelect.setSelectedOption(type);
    }

    showModal(PosCashOperationModal.name);
  },

  getCountType(type) {
    return type === "IN" || type === "TRANSFER_IN" ? "CASH_IN" : "CASH_OUT";
  },

  referencePrefix(type) {
    if (type === "TRANSFER_OUT") return "BANK-DEP";
    if (type === "TRANSFER_IN") return "BANK-WDR";
    if (type === "OUT") return "CASH-OUT";
    return "CASH-IN";
  },

  operationTitle(type) {
    if (type === "TRANSFER_OUT") return "Bank Deposit / Polog na banku";
    if (type === "TRANSFER_IN") return "Bank Withdrawal / Podizanje s banke";
    if (type === "OUT") return "Cash Out / Isplata iz blagajne";
    return "Cash In / Uplata u blagajnu";
  },

  accountingLines(type, amount) {
    const cash = "1000";
    const bank = "1110";
    const cashInOffset = "4100";
    const cashOutOffset = "5490";

    if (type === "TRANSFER_OUT") {
      return [
        { accountCode: bank, debit: amount, credit: 0, note: "Bank deposit" },
        { accountCode: cash, debit: 0, credit: amount, note: "Cash register decrease" }
      ];
    }

    if (type === "TRANSFER_IN") {
      return [
        { accountCode: cash, debit: amount, credit: 0, note: "Cash register increase" },
        { accountCode: bank, debit: 0, credit: amount, note: "Bank withdrawal" }
      ];
    }

    if (type === "OUT") {
      return [
        { accountCode: cashOutOffset, debit: amount, credit: 0, note: "Cash out expense/adjustment" },
        { accountCode: cash, debit: 0, credit: amount, note: "Cash register decrease" }
      ];
    }

    return [
      { accountCode: cash, debit: amount, credit: 0, note: "Cash register increase" },
      { accountCode: cashInOffset, debit: 0, credit: amount, note: "Cash in revenue/adjustment" }
    ];
  },

  async postAccounting({ type, amount, referenceNumber, note }) {
    const entryNumber = `JE-CASH-${moment().format("YYYYMMDDHHmmss")}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const lines = this.accountingLines(type, amount);

    await InsertPosCashOperationJournal.run({
      entryNumber,
      referenceNumber,
      description: `${this.operationTitle(type)} - ${referenceNumber}`
    });

    const entryRows = await GetPosCashOperationJournalId.run({ entryNumber });
    const entry = entryRows?.[0] || GetPosCashOperationJournalId.data?.[0];

    if (!entry?.journalEntryId) {
      showAlert("Cash operation was saved, but journal entry was not found.", "error");
      return null;
    }

    for (let i = 0; i < lines.length; i += 1) {
      await InsertPosCashOperationJournalL.run({
        journalEntryId: entry.journalEntryId,
        lineNo: i + 1,
        accountCode: lines[i].accountCode,
        debit: lines[i].debit,
        credit: lines[i].credit,
        note: note || lines[i].note
      });
    }

    return { entryNumber, lines };
  },

  async save() {
    if (!this.can("pos.cash_count")) {
      showAlert("You do not have permission for cash operations.", "error");
      return;
    }

    const model = PosCashOperationCustom.model || {};
    const type =
      PosControlCashInOutTypeSelect.selectedOptionValue ||
      appsmith.store.posCashOperationType ||
      model.operationType ||
      "IN";

    const cashRegisterId = this.cashRegisterId();
    const cashRegisterLabel = this.cashRegisterLabel();

    const amount = Number(
      appsmith.store.posCashOperationTotal ||
      model.total ||
      0
    );

    const note =
      PosControlCashIONoteInput.text ||
      appsmith.store.posCashOperationNote ||
      "";

    if (!cashRegisterId) {
      showAlert("Select cash register first.", "warning");
      return;
    }

    if (amount <= 0) {
      showAlert("Enter cash amount first.", "warning");
      return;
    }

    const referenceNumber = `${this.referencePrefix(type)}-${moment().format("YYYYMMDD-HHmmss")}`;

    await InsertPosCashOperationTransact.run({
      cashRegisterId,
      transactionType: type,
      amount,
      referenceNumber,
      note
    });

    const txRows = await GetLastPosCashOperationTransac.run({
      cashRegisterId,
      referenceNumber
    });

    const tx = txRows?.[0] || GetLastPosCashOperationTransac.data?.[0];

    if (!tx?.cashTransactionId) {
      showAlert("Cash operation was saved, but transaction ID was not found.", "error");
      return;
    }

    const lines = (appsmith.store.posCashOperationLines || model.lines || [])
      .filter(row => Number(row.quantity || 0) > 0);

    const countType = this.getCountType(type);

    for (const row of lines) {
      await InsertPosCashOperationCountLin.run({
        cashRegisterId,
        cashTransactionId: tx.cashTransactionId,
        countType,
        denominationValue: row.denominationValue,
        quantity: row.quantity,
        amount: row.amount
      });
    }

    const accounting = await this.postAccounting({
      type,
      amount,
      referenceNumber,
      note
    });

    await storeValue("posLastCashPrintModel", {
      type,
      title: this.operationTitle(type),
      cashRegister: cashRegisterLabel,
      referenceNumber,
      transactionDate: tx.transactionDate || moment().format("YYYY-MM-DD HH:mm:ss"),
      amount,
      lines,
      note,
      accountingEntryNumber: accounting?.entryNumber || "",
      accountingLines: accounting?.lines || [],
      printedAt: moment().format("DD.MM.YYYY HH:mm:ss"),
      printedBy: appsmith.store.username || ""
    });

    await storeValue("posCashOperationLines", this.defaultLines());
    await storeValue("posCashOperationTotal", 0);
    await storeValue("posCashOperationNote", "");

    if (typeof PosControlCashIONoteInput !== "undefined") {
      PosControlCashIONoteInput.setValue("");
    }

    if (typeof GetPosShiftStatus !== "undefined") await GetPosShiftStatus.run();
    if (typeof GetPosReportOverview !== "undefined") await GetPosReportOverview.run();

    showAlert("Cash operation was saved and posted.", "success");
    showModal(PosCashSlipPrintModal1.name);
  }
};
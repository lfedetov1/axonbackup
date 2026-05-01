export default {
  async closeDay() {
    if (!CashRegisterSelect.text) {
      showAlert("Select cash register.", "warning");
      return;
    }

    try {
      await GetCashRevenue.run();

      const closedRows = await CheckPOSDayClosed.run();
      const alreadyClosed = closedRows?.[0] || CheckPOSDayClosed.data?.[0];

      if (alreadyClosed) {
        showAlert("POS day is already closed.", "warning");
        return;
      }

      await InsertPOSDayClosing.run();

      if (CashCount.total() > 0) {
        await InsertCashClosingTransaction.run();
      }

      await PostRetailDocuments.run();

      await storeValue("posStoreClosed", true);
      await storeValue("cashDepositRows", CashCount.initialRows());

      showAlert("POS day was closed and retail sales were posted successfully.", "success");
    } catch (error) {
      showAlert("Error while closing POS day: " + error.message, "error");
      console.log(error);
    }
  }
};

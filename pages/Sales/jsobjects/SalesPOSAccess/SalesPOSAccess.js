export default {
  async unlockPOSSelection() {
    const today = new Date().toISOString().slice(0, 10);

    if (
      appsmith.store.posStoreClosed === true &&
      appsmith.store.posClosedDate === today
    ) {
      showAlert("POS store is closed for today.", "warning");
      return;
    }

    if (!SalesPOSCodeInput.text) {
      showAlert("Enter employee code.", "warning");
      return;
    }

    try {
      const rows = await VerifyCurrentUserPOSCode.run();
      const user = rows?.[0] || VerifyCurrentUserPOSCode.data?.[0];

      if (!user?.userId) {
        showAlert("Employee code is not valid for the current user.", "error");
        return;
      }

      await storeValue("salesPOSUnlocked", true);
      SalesPOSCodeInput.setValue("");

      showAlert("POS access confirmed.", "success");

      navigateTo("POS");
    } catch (error) {
      showAlert("Error while confirming POS access: " + error.message, "error");
      console.log(error);
    }
  },

  async lockPOSSelection() {
    await storeValue("salesPOSUnlocked", false);
  }
};

export default {
  async unlockCashier() {
    if (!POSUserCodeInput.text) {
      showAlert("Enter cashier code.", "warning");
      return;
    }

    try {
      const rows = await VerifyAnyPOSUserCode.run();
      const user = rows?.[0] || VerifyAnyPOSUserCode.data?.[0];

      if (!user?.userId) {
        showAlert("Cashier code is not valid or has no POS access.", "error");
        return;
      }

      await storeValue("originalUserId", appsmith.store.originalUserId || appsmith.store.userId);
      await storeValue("originalUsername", appsmith.store.originalUsername || appsmith.store.username);

      await storeValue("userId", user.userId);
      await storeValue("username", user.username);

      await storeValue("posCashierUnlocked", true);
      await storeValue("posCashierUserId", user.userId);
      await storeValue("posCashierUsername", user.username);

      POSUserCodeInput.setValue("");

      showAlert("Cashier access confirmed.", "success");
    } catch (error) {
      showAlert("Error while confirming cashier access: " + error.message, "error");
      console.log(error);
    }
  },

  async clearCashier() {
    const originalUserId = appsmith.store.originalUserId;
    const originalUsername = appsmith.store.originalUsername;

    if (originalUserId) {
      await storeValue("userId", originalUserId);
    }

    if (originalUsername) {
      await storeValue("username", originalUsername);
    }

    await storeValue("posCashierUnlocked", false);
    await storeValue("posCashierUserId", null);
    await storeValue("posCashierUsername", null);
  }
};

export default {
  async open(targetPage = "POS") {
    if (typeof AccessLoader !== "undefined") {
      await AccessLoader.load();
    }

    if (!AppAccess.has("pos.view")) {
      showAlert("You do not have permission to access POS.", "error");
      return;
    }

    await storeValue("posAccessTargetPage", targetPage);
    await storeValue("posAccessGranted", false);

    if (typeof PosAccessCodeInput !== "undefined") {
      PosAccessCodeInput.setValue("");
    }

    showModal(PosAccessModal.name);
  },

  async verify() {
    if (!AppAccess.has("pos.view")) {
      showAlert("You do not have permission to access POS.", "error");
      return;
    }

    const code = String(PosAccessCodeInput.text || "").trim();

    if (!code) {
      showAlert("Enter POS access code.", "warning");
      return;
    }

    const rows = await CheckPosAccessCode.run();
    const data = rows || CheckPosAccessCode.data || [];
    const found = data.length ? data[0] : null;

    if (!found || !found.userId) {
      await storeValue("posAccessGranted", false);
      showAlert("Invalid POS access code for this user.", "error");
      return;
    }

    await storeValue("posAccessGranted", true);
    await storeValue("posAccessUserId", found.userId);
    await storeValue("posAccessUsername", found.username);
    await storeValue("posAccessGrantedAt", moment().format("YYYY-MM-DD HH:mm:ss"));

  

    closeModal(PosAccessModal.name);

    navigateTo(appsmith.store.posAccessTargetPage || "POS");
  },

  async cancel() {
    await storeValue("posAccessGranted", false);

    if (typeof PosAccessCodeInput !== "undefined") {
      PosAccessCodeInput.setValue("");
    }

    closeModal(PosAccessModal.name);
  }
};
export default {
  handleAction() {
    const action = LoginHelpCustom.model.selectedAction || "";

    if (action === "RESET_PASSWORD") {
      navigateTo("mailto:axonsystemerp@gmail.com?subject=Reset password request");
      return;
    }

    if (action === "CONTACT_SUPPORT") {
      navigateTo("mailto:axonsystemerp@gmail.com?subject=Login problem");
      return;
    }

    if (action === "CONTACT_ADMIN") {
      navigateTo("mailto:axonsystemerp@gmail.com?subject=Axon access request");
      return;
    }

    if (action === "REQUEST_ACCESS") {
      navigateTo("mailto:axonsystemerp@gmail.com?subject=Request access to Axon");
      return;
    }
  }
};
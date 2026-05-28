export default {
  async show(title = "Processing", message = "Please wait...") {
    await storeValue("globalLoadingTitle", title);
    await storeValue("globalLoadingMessage", message);
    showModal(GlobalLoadingModal.name);
  },

  async hide() {
    closeModal(GlobalLoadingModal.name);
    await storeValue("globalLoadingTitle", "");
    await storeValue("globalLoadingMessage", "");
  },

  async run(title, message, task) {
    try {
      await this.show(title, message);
      const result = await task();
      await this.hide();
      return result;
    } catch (error) {
      await this.hide();
      throw error;
    }
  }
};
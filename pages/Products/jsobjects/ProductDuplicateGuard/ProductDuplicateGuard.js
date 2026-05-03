export default {
  async check() {
    const rows = await CheckProductDuplicate.run();
    const duplicate = rows?.[0] || null;

    await storeValue("productDuplicate", duplicate);

    if (duplicate) {
      showAlert(
        `Duplicate ${duplicate.duplicateField}: product "${duplicate.name}" already exists.`,
        "error"
      );
    }

    return !duplicate;
  },

  hasDuplicate() {
    return !!appsmith.store.productDuplicate;
  },

  async clear() {
    await storeValue("productDuplicate", null);
  }
};

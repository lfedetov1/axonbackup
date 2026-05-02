export default {
  normalizeKey(key) {
    return String(key || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
  },

  normalizeRow(row, index) {
    const normalized = { rowNo: index + 1 };

    Object.keys(row).forEach(key => {
      normalized[this.normalizeKey(key)] = row[key];
    });

    normalized.importStatus = "";
    normalized.importMessage = "";

    return normalized;
  },

  async loadFile() {
    const file = ProductFastImportFilePicker.files?.[0];

    if (!file?.data) {
      showAlert("Select Excel file.", "warning");
      return;
    }

    if (typeof XLSX === "undefined") {
      showAlert("XLSX library is not loaded.", "error");
      return;
    }

    const workbook = XLSX.read(file.data, { type: "base64" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    const rows = rawRows.map((row, index) => this.normalizeRow(row, index));

    await storeValue("productFastImportRows", rows);
    showAlert("Fast import file loaded.", "success");
  },

  async clear() {
    await storeValue("productFastImportRows", []);
  }
};

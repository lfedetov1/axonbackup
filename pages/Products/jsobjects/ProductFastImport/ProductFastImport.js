export default {
  rows() {
    return appsmith.store.productFastImportRows || [];
  },

  cleanText(value) {
    return String(value || "").trim();
  },

  async importRows() {
    const rows = this.rows();

    if (!rows.length) {
      showAlert("Load Excel file first.", "warning");
      return;
    }

    let importedRows = 0;
    let errorRows = 0;
    const resultRows = [];

    for (const row of rows) {
      const code = this.cleanText(row.code);
      const name = this.cleanText(row.name);
      const unit = this.cleanText(row.unit);

      if (!code || !name || !unit) {
        errorRows += 1;
        resultRows.push({
          ...row,
          importStatus: "ERROR",
          importMessage: "Missing code, name or unit"
        });
        continue;
      }

      try {
        const unitRows = await FastImportFindUnit.run({ unit });
        const unitObj = unitRows?.[0] || FastImportFindUnit.data?.[0];

        if (!unitObj?.unitId) {
          errorRows += 1;
          resultRows.push({
            ...row,
            importStatus: "ERROR",
            importMessage: "Unit not found: " + unit
          });
          continue;
        }

        const categoryRows = await FastImportFindCategory.run({
          category: this.cleanText(row.category)
        });
        const category = categoryRows?.[0] || FastImportFindCategory.data?.[0] || {};

        const taxRows = await FastImportFindTaxRate.run({
          taxRate: this.cleanText(row.tax_rate)
        });
        const tax = taxRows?.[0] || FastImportFindTaxRate.data?.[0] || {};

        const countryRows = await FastImportFindCountry.run({
          country: this.cleanText(row.country_of_origin)
        });
        const country = countryRows?.[0] || FastImportFindCountry.data?.[0] || {};

        await FastImportUpsertProduct.run({
          row: {
            ...row,
            code,
            name,
            unit,
            product_type: this.cleanText(row.product_type || "GOODS").toUpperCase(),
            track_stock: row.track_stock === "" || row.track_stock === undefined ? 1 : Number(row.track_stock),
            is_active: row.is_active === "" || row.is_active === undefined ? 1 : Number(row.is_active)
          },
          unitId: unitObj.unitId,
          categoryId: category.categoryId || null,
          taxRateId: tax.taxRateId || null,
          countryId: country.countryId || null
        });

        const productRows = await FastImportFindProductByCode.run({ code });
        const product = productRows?.[0] || FastImportFindProductByCode.data?.[0];

        importedRows += 1;
        resultRows.push({
          ...row,
          productId: product?.productId || "",
          importStatus: "OK",
          importMessage: "Imported"
        });
      } catch (error) {
        errorRows += 1;
        resultRows.push({
          ...row,
          importStatus: "ERROR",
          importMessage: error.message
        });
      }
    }

    await storeValue("productFastImportRows", resultRows);

    if (typeof SearchProducts !== "undefined") {
      await SearchProducts.run();
    }

    showAlert(
      "Fast import finished. OK: " + importedRows + ", errors: " + errorRows,
      errorRows ? "warning" : "success"
    );
  }
};

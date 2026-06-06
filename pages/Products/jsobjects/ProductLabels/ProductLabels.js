export default {
  rows() {
    return appsmith.store.productLabelQueue || [];
  },

  productId(row = {}) {
    return Number(
      row.productId ||
      row.product_id ||
      row["Product ID"] ||
      row.id ||
      row.ID ||
      0
    );
  },

  async open(row = null) {
    await storeValue("productLabelQueue", []);
    await storeValue("productLabelLayout", "A4_4");

    if (row) {
      const productId = this.productId(row);

      if (productId) {
        const result = await FindProductForLabel.run({ productId });
        const product = result?.[0] || FindProductForLabel.data?.[0];

        if (product) {
          await this.addProduct(product);
        }
      }
    }

    ProductLabelBarcodeInput.setValue("");
    showModal(ProductLabelPrintModal.name);
  },

  async scan(value = null) {
    const lookup = String(
      value ||
      ProductLabelBarcodeInput.text ||
      ""
    ).trim();

    if (!lookup) return;

    try {
      const result = await FindProductForLabel.run({ lookup });
      const product = result?.[0] || FindProductForLabel.data?.[0];

      if (!product) {
        showAlert("Product was not found.", "warning");
        ProductLabelBarcodeInput.setValue("");
        return;
      }

      await this.addProduct(product);
      ProductLabelBarcodeInput.setValue("");
    } catch (error) {
      showAlert("Error while loading product: " + error.message, "error");
      console.log(error);
    }
  },

  async addProduct(product = {}) {
    const rows = [...this.rows()];
    const productId = this.productId(product);

    if (!productId) {
      showAlert("Product ID is missing.", "error");
      return;
    }

    const existingIndex = rows.findIndex(
      row => Number(row.productId) === productId
    );

    if (existingIndex >= 0) {
      rows[existingIndex] = {
        ...rows[existingIndex],
        copies: Number(rows[existingIndex].copies || 1) + 1
      };
    } else {
      rows.push({
        productId,
        productCode: product.productCode || product.code || "",
        productName: product.productName || product.name || "",
        barcode: product.barcode || "",
        sku: product.sku || "",
        salesPrice: Number(product.salesPrice || product.price || 0),
        copies: 1
      });
    }

    await storeValue("productLabelQueue", rows);
  },

  async updateCopies(rowIndex, value) {
    const rows = [...this.rows()];

    if (rowIndex < 0 || rowIndex >= rows.length) return;

    rows[rowIndex] = {
      ...rows[rowIndex],
      copies: Math.max(1, Number(value || 1))
    };

    await storeValue("productLabelQueue", rows);
  },

  async remove(row = null) {
    const selected =
      row ||
      ProductLabelQueueTable.triggeredRow ||
      ProductLabelQueueTable.selectedRow ||
      {};

    const productId = this.productId(selected);

    await storeValue(
      "productLabelQueue",
      this.rows().filter(row => Number(row.productId) !== productId)
    );
  },

  async clear() {
    await storeValue("productLabelQueue", []);
    ProductLabelBarcodeInput.setValue("");
  },
	async removeRow(row = null) {
  const selected =
    row ||
    ProductLabelQueueTable.triggeredRow ||
    ProductLabelQueueTable.selectedRow ||
    {};

  const rows = [...(appsmith.store.productLabelQueue || [])];

  const filtered = rows.filter(item => {
    if (selected.productId) {
      return String(item.productId) !== String(selected.productId);
    }

    return String(item.barcode || "") !== String(selected.barcode || "");
  });

  await storeValue("productLabelQueue", filtered);
},

async removeSelectedRows() {
  const selectedRows = ProductLabelQueueTable.selectedRows || [];

  if (!selectedRows.length) {
    showAlert("Select label rows first.", "warning");
    return;
  }

  const selectedIds = selectedRows.map(row => String(row.productId));
  const rows = appsmith.store.productLabelQueue || [];

  await storeValue(
    "productLabelQueue",
    rows.filter(row => !selectedIds.includes(String(row.productId)))
  );
},

async clearAll() {
  await storeValue("productLabelQueue", []);
},
	
	async updateRows() {
  const rows = ProductLabelQueueTable.tableData || [];

  await storeValue(
    "productLabelQueue",
    rows.map(row => ({
      ...row,
      copies: Math.max(1, Math.floor(Number(row.copies || 1)))
    }))
  );
},

  async setLayout(value) {
    await storeValue("productLabelLayout", value || "A4_4");
  },

  expandedLabels() {
    return this.rows().flatMap(row =>
      Array.from(
        { length: Math.max(1, Number(row.copies || 1)) },
        (_, index) => ({
          ...row,
          copyNumber: index + 1
        })
      )
    );
  },

  model() {
    return {
      layout: appsmith.store.productLabelLayout || "A4_4",
      labels: this.expandedLabels(),

      company: {
        name: appsmith.store.companyName || "Axon",
        currencyCode: appsmith.store.currencyCode || "EUR"
      },

      printedAt: moment().format("DD.MM.YYYY HH:mm:ss"),
      printedBy: appsmith.store.username || ""
    };
  }
};
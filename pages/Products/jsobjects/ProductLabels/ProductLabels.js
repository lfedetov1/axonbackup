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

  normalizeProduct(product = {}) {
    const salesPrice = Number(
      product.salesPrice ||
      product.unitPrice ||
      product.price ||
      product["Sales Price"] ||
      0
    );

    const lowestPrice30Days = Number(
      product.lowestPrice30Days ||
      product["Lowest Price 30 Days"] ||
      salesPrice
    );

    const isDiscounted =
      product.isDiscounted === true ||
      product.isDiscounted === 1 ||
      product.isDiscounted === "1" ||
      lowestPrice30Days > salesPrice;

    const discountPercent =
      lowestPrice30Days > salesPrice && lowestPrice30Days > 0
        ? Math.round((1 - salesPrice / lowestPrice30Days) * 100)
        : Number(product.discountPercent || 0);

    return {
      productId: this.productId(product),
      productCode:
        product.productCode ||
        product.code ||
        product.Code ||
        product["Product Code"] ||
        "",

      productName:
        product.productName ||
        product.name ||
        product.Name ||
        product["Product Name"] ||
        "",

      barcode:
        product.barcode ||
        product.Barcode ||
        "",

      sku:
        product.sku ||
        product.SKU ||
        "",

      unitCode:
        product.unitCode ||
        product.Unit ||
        product["Unit Code"] ||
        "kom",

      salesPrice,
      lowestPrice30Days,
      isDiscounted,
      discountPercent,
      copies: Math.max(1, Math.floor(Number(product.copies || 1)))
    };
  },

  async open(row = null) {
    await storeValue("productLabelQueue", []);
    await storeValue("productLabelLayout", "A4_4");

    if (row) {
      const productId = this.productId(row);

      if (productId) {
        const result = await FindProductForLabel.run({ productId });
        const product =
          result?.[0] ||
          FindProductForLabel.data?.[0];

        if (product) {
          await this.addProduct(product);
        }
      }
    }

    if (typeof ProductLabelBarcodeInput !== "undefined") {
      ProductLabelBarcodeInput.setValue("");
    }

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
      const product =
        result?.[0] ||
        FindProductForLabel.data?.[0];

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

  async scanDebounced(value) {
    const lookup = String(value || "").trim();

    if (!lookup || lookup.length < 3) return;

    await storeValue("productLabelLastScan", lookup);

    setTimeout(() => {
      if (appsmith.store.productLabelLastScan === lookup) {
        this.scan(lookup);
      }
    }, 350);
  },

  async addProduct(product = {}) {
    const normalized = this.normalizeProduct(product);

    if (!normalized.productId) {
      showAlert("Product ID is missing.", "error");
      return;
    }

    const rows = [...this.rows()];

    const existingIndex = rows.findIndex(row =>
      Number(row.productId) === Number(normalized.productId)
    );

    if (existingIndex >= 0) {
      rows[existingIndex] = {
        ...rows[existingIndex],
        ...normalized,
        copies: Number(rows[existingIndex].copies || 1) + 1
      };
    } else {
      rows.push(normalized);
    }

    await storeValue("productLabelQueue", rows);
  },

  async updateCopies(rowIndexOrRow, value = null) {
    const rows = [...this.rows()];

    let index = -1;
    let updatedRow = {};

    if (typeof rowIndexOrRow === "number") {
      index = rowIndexOrRow;
      updatedRow = ProductLabelQueueTable.updatedRow || {};
    } else {
      updatedRow =
        rowIndexOrRow ||
        ProductLabelQueueTable.updatedRow ||
        {};
    }

    if (index < 0) {
      const updatedProductId = this.productId(updatedRow);

      index = rows.findIndex(row =>
        updatedProductId > 0 &&
        Number(row.productId) === updatedProductId
      );
    }

    if (index < 0 && updatedRow.barcode) {
      index = rows.findIndex(row =>
        String(row.barcode || "") === String(updatedRow.barcode)
      );
    }

    if (index < 0) {
      index =
        ProductLabelQueueTable.selectedRowIndex ??
        ProductLabelQueueTable.triggeredRowIndex ??
        -1;
    }

    if (index < 0 || index >= rows.length) {
      showAlert("Label row was not found.", "warning");
      return;
    }

    const copies = Math.max(
      1,
      Math.floor(
        Number(
          value ??
          updatedRow.copies ??
          rows[index].copies ??
          1
        )
      )
    );

    rows[index] = {
      ...rows[index],
      copies
    };

    await storeValue("productLabelQueue", rows);
  },

  async removeRow(row = null) {
    const selected =
      row ||
      ProductLabelQueueTable.triggeredRow ||
      ProductLabelQueueTable.selectedRow ||
      {};

    const selectedProductId = this.productId(selected);

    if (!selectedProductId && !selected.barcode) {
      showAlert("Select label row first.", "warning");
      return;
    }

    const filtered = this.rows().filter(item => {
      if (selectedProductId) {
        return Number(item.productId) !== selectedProductId;
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

    const selectedIds = selectedRows.map(row =>
      String(this.productId(row))
    );

    await storeValue(
      "productLabelQueue",
      this.rows().filter(row =>
        !selectedIds.includes(String(this.productId(row)))
      )
    );
  },

  async clearAll() {
    await storeValue("productLabelQueue", []);

    if (typeof ProductLabelBarcodeInput !== "undefined") {
      ProductLabelBarcodeInput.setValue("");
    }
  },

  async setLayout(value) {
    await storeValue(
      "productLabelLayout",
      value || "A4_4"
    );
  },

  expandedLabels() {
    return this.rows().flatMap(row =>
      Array.from(
        {
          length: Math.max(
            1,
            Math.floor(Number(row.copies || 1))
          )
        },
        (_, index) => ({
          ...row,
          copyNumber: index + 1
        })
      )
    );
  },


  model() {
    return {
      layout:
        appsmith.store.productLabelLayout ||
        ProductLabelLayoutSelect.selectedOptionValue ||
        "A4_4",

      labels: this.rows(),

      company: {
        name: appsmith.store.companyName || "Axon",
        logo: appsmith.store.companyLogoPath || ""
      },

      currencyCode: appsmith.store.currencyCode || "EUR",
      printedAt: moment().format("DD.MM.YYYY HH:mm:ss"),
      printedBy: appsmith.store.username || ""
    };
  }
};
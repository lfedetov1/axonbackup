export default {
  normRows() {
    return appsmith.store.productNormItems || [];
  },

  async save() {
    if (!ProductCodeInput.text) {
      showAlert("Product code is required.", "warning");
      return;
    }

    if (!ProductNameInput.text) {
      showAlert("Product name is required.", "warning");
      return;
    }

    if (!ProductUnitSelect.selectedOptionValue) {
      showAlert("Unit is required.", "warning");
      return;
    }

    if (ProductHasNormSwitch.isSwitchedOn && !this.normRows().length) {
      showAlert("Add at least one norm component.", "warning");
      return;
    }

    try {
      const productResponse = await InsertProduct.run();

      const productId =
        productResponse?.insertId ||
        productResponse?.[0]?.insertId ||
        InsertProduct.data?.insertId ||
        InsertProduct.data?.[0]?.insertId;

      if (!productId) {
        showAlert("Product was saved, but product ID was not returned.", "error");
        console.log(productResponse);
        return;
      }

      if (Number(ProductSalePriceInput.text || 0) > 0) {
        await InsertProductSalePrice.run({ productId });
      }

      if (Number(ProductPurchasePriceInput.text || 0) > 0) {
        await InsertProductPurchasePrice.run({ productId });
      }

      if (ProductHasNormSwitch.isSwitchedOn) {
        const normResponse = await InsertProductNorm.run({ productId });

        const productNormId =
          normResponse?.insertId ||
          normResponse?.[0]?.insertId ||
          InsertProductNorm.data?.insertId ||
          InsertProductNorm.data?.[0]?.insertId;

        if (!productNormId) {
          showAlert("Product was saved, but norm ID was not returned.", "error");
          console.log(normResponse);
          return;
        }

        const rows = this.normRows();

        for (let i = 0; i < rows.length; i += 1) {
          await InsertProductNormItem.run({
            productNormId,
            lineNo: i + 1,
            componentProductId: rows[i].componentProductId,
            quantity: rows[i].quantity,
            unitId: rows[i].unitId,
            wastePercent: rows[i].wastePercent || 0,
            note: rows[i].note || null
          });
        }
      }

      await storeValue("productNormItems", []);

      if (typeof SearchProducts !== "undefined") {
        await SearchProducts.run();
      }

      closeModal(addnewproduct.name);
      showAlert("Product was saved.", "success");
    } catch (error) {
      showAlert("Error while saving product: " + error.message, "error");
      console.log(error);
    }
  }
};

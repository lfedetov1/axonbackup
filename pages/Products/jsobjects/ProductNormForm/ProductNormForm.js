export default {
  getSelectedComponent() {
    return (FindNormComponentProducts.data || []).find(
      row => String(row.componentProductId) === String(ProductNormComponentSelect.selectedOptionValue)
    );
  },

  getRows() {
    return appsmith.store.productNormItems || [];
  },

  async addComponent() {
    const component = this.getSelectedComponent();

    if (!component) {
      showAlert("Select component.", "warning");
      return;
    }

    if (!ProductNormComponentQuantityIn.text || Number(ProductNormComponentQuantityIn.text) <= 0) {
      showAlert("Enter component quantity.", "warning");
      return;
    }

    const rows = this.getRows();

    const existingIndex = rows.findIndex(
      row => String(row.componentProductId) === String(component.componentProductId)
    );

    const nextRow = {
      componentProductId: component.componentProductId,
      componentCode: component.componentCode,
      componentName: component.componentName,
      quantity: String(ProductNormComponentQuantityIn.text || "0"),
      unitId: ProductNormComponentUnitSelect.selectedOptionValue || component.unitId,
      unitCode: component.unitCode,
      unitName: component.unitName,
      wastePercent: String(ProductNormComponentWastePerce.text || "0"),
      note: ProductNormComponentNoteInput.text || ""
    };

    let nextRows;

    if (existingIndex >= 0) {
      nextRows = rows.map((row, index) =>
        index === existingIndex ? nextRow : row
      );
    } else {
      nextRows = [...rows, nextRow];
    }

    await storeValue(
      "productNormItems",
      nextRows.map((row, index) => ({
        ...row,
        lineNo: index + 1
      }))
    );

    if (typeof roductNormComponentSearchInput !== "undefined") {
      roductNormComponentSearchInput.setValue("");
    }

    ProductNormComponentQuantityIn.setValue("");
    ProductNormComponentWastePerce.setValue("0");
    ProductNormComponentNoteInput.setValue("");

    if (typeof ProductNormComponentSelect !== "undefined") {
      ProductNormComponentSelect.setSelectedOption("");
    }
  },

  async removeComponent(rowIndex) {
    const rows = this.getRows().filter((_, index) => index !== rowIndex);

    await storeValue(
      "productNormItems",
      rows.map((row, index) => ({
        ...row,
        lineNo: index + 1
      }))
    );
  },

  async clear() {
    await storeValue("productNormItems", []);
  }
};

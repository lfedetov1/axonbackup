export default {
  initialRows() {
    return [
      { Type: "Banknote", Denomination: "500", Quantity: "0", Amount: "0.00" },
      { Type: "Banknote", Denomination: "200", Quantity: "0", Amount: "0.00" },
      { Type: "Banknote", Denomination: "100", Quantity: "0", Amount: "0.00" },
      { Type: "Banknote", Denomination: "50", Quantity: "0", Amount: "0.00" },
      { Type: "Banknote", Denomination: "20", Quantity: "0", Amount: "0.00" },
      { Type: "Banknote", Denomination: "10", Quantity: "0", Amount: "0.00" },
      { Type: "Banknote", Denomination: "5", Quantity: "0", Amount: "0.00" },
      { Type: "Coin", Denomination: "2", Quantity: "0", Amount: "0.00" },
      { Type: "Coin", Denomination: "1", Quantity: "0", Amount: "0.00" },
      { Type: "Coin", Denomination: "0.50", Quantity: "0", Amount: "0.00" },
      { Type: "Coin", Denomination: "0.20", Quantity: "0", Amount: "0.00" },
      { Type: "Coin", Denomination: "0.10", Quantity: "0", Amount: "0.00" },
      { Type: "Coin", Denomination: "0.05", Quantity: "0", Amount: "0.00" },
      { Type: "Coin", Denomination: "0.02", Quantity: "0", Amount: "0.00" },
      { Type: "Coin", Denomination: "0.01", Quantity: "0", Amount: "0.00" }
    ];
  },

  async reset() {
    await storeValue("cashDepositRows", this.initialRows());
  },

  updateQuantity(rowIndex, value) {
    const rows = [...(appsmith.store.cashDepositRows || this.initialRows())];

    if (rowIndex < 0 || rowIndex >= rows.length) {
      return;
    }

    const quantity = Number(value || 0);
    const denomination = Number(rows[rowIndex].Denomination || 0);

    rows[rowIndex] = {
      ...rows[rowIndex],
      Quantity: String(quantity),
      Amount: String((quantity * denomination).toFixed(2))
    };

    return storeValue("cashDepositRows", rows);
  },

  total(rows = appsmith.store.cashDepositRows || this.initialRows()) {
    return rows.reduce(
      (sum, row) => sum + Number(row.Amount || 0),
      0
    );
  },

  cashRevenue() {
    return Number(GetCashRevenue.data?.[0]?.cashRevenue || 0);
  },

  difference() {
    return this.cashRevenue() - this.total();
  }
};

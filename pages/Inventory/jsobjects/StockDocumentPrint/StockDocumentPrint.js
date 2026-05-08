export default {
  esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  },

  money(value) {
    return Number(value || 0).toFixed(2);
  },

  qty(value) {
    return Number(value || 0).toFixed(4);
  },

  documentTitle(type) {
    return {
      STOCK_IN: "Stock In Document",
      STOCK_OUT: "Stock Out Document",
      STOCK_TRANSFER: "Stock Transfer Document",
      STOCK_ADJUSTMENT: "Stock Adjustment Document"
    }[type] || "Stock Document";
  },

  movementLabel(type) {
    return {
      STOCK_IN: "Stock In",
      STOCK_OUT: "Stock Out",
      STOCK_TRANSFER: "Transfer",
      STOCK_ADJUSTMENT: "Adjustment"
    }[type] || type;
  },

  warehouseBlock(header) {
    if (header.documentType === "STOCK_TRANSFER") {
      return `
        <div class="box">
          <div class="label">Source Warehouse</div>
          <div class="value">${this.esc(header.sourceWarehouseCode || "")} - ${this.esc(header.sourceWarehouseName || "")}</div>
        </div>
        <div class="box">
          <div class="label">Destination Warehouse</div>
          <div class="value">${this.esc(header.destinationWarehouseCode || "")} - ${this.esc(header.destinationWarehouseName || "")}</div>
        </div>
      `;
    }

    return `
      <div class="box">
        <div class="label">Warehouse</div>
        <div class="value">${this.esc(header.warehouseCode || header.sourceWarehouseCode || header.destinationWarehouseCode || "")} - ${this.esc(header.warehouseName || header.sourceWarehouseName || header.destinationWarehouseName || "")}</div>
      </div>
    `;
  },

  buildHtml(header, items) {
    const totalQty = items.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    const totalValue = items.reduce((sum, row) => sum + Number(row.lineTotal || 0), 0);

    const logo = header.companyLogoPath
      ? `<img class="logo" src="${this.esc(header.companyLogoPath)}" />`
      : `<div class="logoFallback">${this.esc((header.companyName || "AX").slice(0, 2).toUpperCase())}</div>`;

    const rows = items.map(row => `
      <tr>
        <td class="center">${this.esc(row.lineNo)}</td>
        <td>
          <div class="strong">${this.esc(row.productCode)}</div>
          <div class="muted">${this.esc(row.productName)}</div>
          ${row.barcode ? `<div class="tiny">Barcode: ${this.esc(row.barcode)}</div>` : ""}
        </td>
        <td>${this.esc(row.description || row.productName)}</td>
        <td class="right">${this.qty(row.quantity)}</td>
        <td class="center">${this.esc(row.unitCode)}</td>
        <td class="right">${this.money(row.unitCost)}</td>
        <td class="right">${this.money(row.lineTotal)}</td>
        <td>${this.esc(row.batchNumber || "")}</td>
        <td>${this.esc(row.serialNumber || "")}</td>
      </tr>
    `).join("");

    return `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; color: #17202a; margin: 0; padding: 28px; background: #fff; }
  .page { max-width: 980px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #17202a; padding-bottom: 18px; }
  .company { display: flex; gap: 16px; align-items: flex-start; }
  .logo { width: 86px; max-height: 70px; object-fit: contain; }
  .logoFallback { width: 76px; height: 56px; border: 2px solid #17202a; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; }
  h1 { margin: 0; font-size: 24px; letter-spacing: 0; }
  .companyName { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .muted { color: #5d6975; font-size: 12px; }
  .tiny { color: #5d6975; font-size: 11px; margin-top: 2px; }
  .docMeta { text-align: right; min-width: 240px; }
  .docNo { font-size: 18px; font-weight: 700; margin-top: 8px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 18px 0; }
  .box { border: 1px solid #d7dde3; padding: 10px; min-height: 58px; }
  .label { color: #5d6975; font-size: 11px; text-transform: uppercase; margin-bottom: 5px; }
  .value { font-size: 13px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 14px; }
  th { background: #17202a; color: white; font-size: 11px; text-align: left; padding: 8px; }
  td { border-bottom: 1px solid #e1e6eb; padding: 8px; font-size: 12px; vertical-align: top; }
  .right { text-align: right; }
  .center { text-align: center; }
  .strong { font-weight: 700; }
  .summary { display: flex; justify-content: flex-end; margin-top: 18px; }
  .summary table { width: 340px; margin-top: 0; }
  .summary td { font-size: 13px; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; margin-top: 54px; }
  .signatureLine { border-top: 1px solid #17202a; padding-top: 7px; text-align: center; font-size: 12px; }
  .note { margin-top: 18px; border: 1px solid #d7dde3; padding: 10px; font-size: 12px; }
  @media print {
    body { padding: 0; }
    .noPrint { display: none; }
    .page { max-width: none; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="company">
      ${logo}
      <div>
        <div class="companyName">${this.esc(header.companyLegalName || header.companyName)}</div>
        <div class="muted">${this.esc(header.companyAddressLine1 || "")}</div>
        <div class="muted">${this.esc([header.companyPostalCode, header.companyCity, header.companyCountryCode].filter(Boolean).join(" "))}</div>
        <div class="muted">Tax No: ${this.esc(header.companyTaxNumber || "")}</div>
        <div class="muted">${this.esc(header.companyEmail || "")} ${this.esc(header.companyPhone || "")}</div>
      </div>
    </div>
    <div class="docMeta">
      <h1>${this.esc(this.documentTitle(header.documentType))}</h1>
      <div class="docNo">${this.esc(header.documentNumber)}</div>
      <div class="muted">${this.esc(this.movementLabel(header.documentType))}</div>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <div class="label">Document Date</div>
      <div class="value">${this.esc(header.documentDate)}</div>
    </div>
    <div class="box">
      <div class="label">Status</div>
      <div class="value">${this.esc(header.status)}</div>
    </div>
    <div class="box">
      <div class="label">Created By</div>
      ${this.esc(appsmith.store.username || header.createdByUserId || "")}
    </div>
    ${this.warehouseBlock(header)}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:42px;">#</th>
        <th>Product</th>
        <th>Description</th>
        <th class="right">Qty</th>
        <th class="center">Unit</th>
        <th class="right">Unit Cost</th>
        <th class="right">Total</th>
        <th>Batch</th>
        <th>Serial</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="summary">
    <table>
      <tr><td>Total Quantity</td><td class="right strong">${this.qty(totalQty)}</td></tr>
      <tr><td>Total Value</td><td class="right strong">${this.money(totalValue)}</td></tr>
    </table>
  </div>

  ${header.note ? `<div class="note"><span class="strong">Note:</span> ${this.esc(header.note)}</div>` : ""}

  <div class="signatures">
    <div class="signatureLine">Prepared by</div>
    <div class="signatureLine">Received / Approved by</div>
  </div>
</div>
</body>
</html>`;
  },

  async preview(documentNumber = null) {
    const number = String(documentNumber || MovementNumberInput.text || "").trim();

    if (!number) {
      showAlert("Document number is required.", "warning");
      return;
    }

    const headerRows = await GetStockDocumentPrintHeader.run({ documentNumber: number });
    const header = headerRows?.[0] || GetStockDocumentPrintHeader.data?.[0];

    if (!header) {
      showAlert("Document was not found.", "error");
      return;
    }

    const itemRows = await GetStockDocumentPrintItems.run({ documentNumber: number });
    const items = itemRows || GetStockDocumentPrintItems.data || [];

    const html = this.buildHtml(header, items);

    await storeValue("stockDocumentPrintHtml", html);
    await storeValue("stockDocumentPrintNumber", number);

    showModal(PrintStockDocumentModal.name);
  },

  async downloadHtml() {
    const number = appsmith.store.stockDocumentPrintNumber || "stock-document";
    download(appsmith.store.stockDocumentPrintHtml || "", `${number}.html`, "text/html");
  }
};

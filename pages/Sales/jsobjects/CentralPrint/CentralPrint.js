export default {
  companyId() {
    return Number(appsmith.store.companyId || 1);
  },

  documentNumber(row = {}) {
    return String(
      row.documentNumber ||
      row["Document Number"] ||
      row["Invoice Number"] ||
      row["Quote Number"] ||
      row["Order Number"] ||
      row["Delivery Number"] ||
      row["Receipt Number"] ||
      row.document_number ||
      ""
    );
  },

  async download(kind, payload = {}) {
    try {
      const result = await GenerateCentralDocumentPDF.run({
        kind,
        companyId: this.companyId(),
        ...payload
      });

      if (!result?.base64 || !result?.fileName) {
        showAlert("PDF was not generated.", "error");
        return;
      }

      download(
        `data:application/pdf;base64,${result.base64}`,
        result.fileName,
        "application/pdf"
      );

      showAlert("PDF generated successfully.", "success");
      return result;
    } catch (error) {
      showAlert("PDF generation failed: " + error.message, "error");
      console.log(error);
    }
  },

  async printDocument(kind, row = {}) {
    const documentNumber = this.documentNumber(row);

    if (!documentNumber) {
      showAlert("Select document first.", "warning");
      return;
    }

    return this.download(kind, { documentNumber });
  },

  async email(kind, payload = {}) {
    if (!payload.to) {
      showAlert("Recipient email is required.", "warning");
      return;
    }

    try {
      const result = await SendCentralDocumentEmail.run({
        kind,
        companyId: this.companyId(),
        ...payload
      });

      if (!result?.ok) {
        showAlert("Email was not sent.", "error");
        return;
      }

      showAlert("Document sent successfully.", "success");
      return result;
    } catch (error) {
      showAlert("Email sending failed: " + error.message, "error");
      console.log(error);
    }
  },

  emailDocument(kind, row = {}, email = "") {
    const documentNumber = this.documentNumber(row);

    const recipient =
      email ||
      row.partnerEmail ||
      row.customerEmail ||
      row.supplierEmail ||
      row.Email ||
      "";

    if (!documentNumber) {
      showAlert("Select document first.", "warning");
      return;
    }

    return this.email(kind, {
      documentNumber,
      to: recipient
    });
  }
};
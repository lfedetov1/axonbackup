export default {
  businessSpaceCode() {
    return appsmith.store.fiscalBusinessSpaceCode || "POS01";
  },

  deviceCode() {
    return appsmith.store.fiscalDeviceCode || "1";
  },

  async prepare(documentId) {
    if (!documentId) {
      showAlert("Document ID is missing for fiscalization.", "error");
      return false;
    }

    const docRows = await GetSalesDocumentFiscalStatus.run({ documentId });
    const doc = docRows?.[0] || GetSalesDocumentFiscalStatus.data?.[0];

    if (!doc) {
      showAlert("Sales document was not found or is not fiscal document.", "error");
      return false;
    }

    if (doc.fiscalNumber) {
      return true;
    }

    const fiscalRows = await GetNextSalesFiscalNumber.run({
      businessSpaceCode: this.businessSpaceCode(),
      deviceCode: this.deviceCode()
    });

    const fiscalNumber =
      fiscalRows?.[0]?.nextFiscalNumber ||
      GetNextSalesFiscalNumber.data?.[0]?.nextFiscalNumber;

    if (!fiscalNumber) {
      showAlert("Fiscal number could not be generated.", "error");
      return false;
    }

    await UpdateSalesFiscalData.run({
      documentId,
      fiscalNumber,
      fiscalStatus: "NOT_FISCALIZED",
      jir: null,
      zki: null,
      fiscalQrUrl: null,
      fiscalVerificationUrl: null,
      fiscalizedAt: null,
      fiscalError: "Fiscalization service is not connected yet"
    });

    return true;
  }
};
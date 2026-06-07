export default {
  selected(row = null) {
    return row || DocumentInboxTable.selectedRow || {};
  },

  submissionId(row = null) {
    const selected = this.selected(row);

    return Number(
      selected.id ||
      selected.submissionId ||
      selected.ID ||
      0
    );
  },

  async refresh() {
    await ListDocumentInbox.run();

    if (appsmith.store.selectedDocumentInboxId) {
      await GetDocumentInboxDetails.run();
    }
  },

  async openUploadLinkModal() {
    await storeValue("documentUploadGeneratedLink", "");

    if (typeof ListDocumentUploadPartners !== "undefined") {
      await ListDocumentUploadPartners.run();
    }

    DocumentUploadRecipientNameInp.setValue("");
    DocumentUploadRecipientEmailIn.setValue("");
    DocumentUploadPartnerSelect.setSelectedOption("");
    DocumentUploadLinkNameInput.setValue("Document Upload");
    DocumentUploadExpiresHoursInpu.setValue("72");
    DocumentUploadMaxUploadsInput.setValue("5");
    DocumentUploadMessageInput.setValue(
      "Please upload the requested documents using the secure link below."
    );

    showModal(DocumentUploadLinkModal.name);
  },

  async createUploadLink() {
    try {
      const params = {
        companyId: Number(appsmith.store.companyId || 1),

        partnerId:
          Number(DocumentUploadPartnerSelect.selectedOptionValue || 0) || null,

        linkName:
          DocumentUploadLinkNameInput.text || "Document Upload",

        expiresHours:
          Number(DocumentUploadExpiresHoursInpu.text || 72),

        maxUploads:
          Number(DocumentUploadMaxUploadsInput.text || 5),

        createdByUserId:
          Number(appsmith.store.userId || 0) || null
      };

      const response = await CreateDocumentUploadLink.run(params);

      const result =
        response?.uploadUrl
          ? response
          : CreateDocumentUploadLink.data || {};

      console.log("Create upload link result:", result);

      if (!result.uploadUrl) {
        showAlert("Upload URL was not returned by the server.", "error");
        return null;
      }

      await storeValue("documentUploadGeneratedLink", result.uploadUrl);

      if (typeof DocumentUploadGeneratedLinkInput !== "undefined") {
        DocumentUploadGeneratedLinkInp.setValue(result.uploadUrl);
      }

      showAlert("Secure upload link created.", "success");

      return result;
    } catch (error) {
      showAlert(
        "Error while creating upload link: " + error.message,
        "error"
      );

      console.log(error);
      return null;
    }
  },
	

archive(row = null) {
  return this.process(row, "ARCHIVE_ONLY");
},
	
	async sendUploadLink() {
  const recipientEmail =
    String(DocumentUploadRecipientEmailIn.text || "").trim();

  const uploadUrl =
    String(appsmith.store.documentUploadGeneratedLink || "").trim();

  if (!recipientEmail) {
    showAlert("Recipient email is required.", "warning");
    return;
  }

  if (!uploadUrl) {
    showAlert("Create upload link first.", "warning");
    return;
  }

  try {
    const response = await SendDocumentUploadLink.run({
      recipientEmail,
      recipientName: DocumentUploadRecipientNameInp.text || "",
      uploadUrl,
      linkName: DocumentUploadLinkNameInput.text || "Document Upload",
      message: DocumentUploadMessageInput.text || ""
    });

    console.log("Send email response:", response);

    showAlert("Secure upload link was sent successfully.", "success");
  } catch (error) {
    showAlert("Error while sending upload link: " + error.message, "error");
    console.log(error);
  }
},
	
  async changeStatus(status, row = null, note = null) {
    const submissionId = this.submissionId(row);

    if (!submissionId) {
      showAlert("Select inbox document first.", "warning");
      return;
    }

    try {
      await UpdateDocumentInboxStatus.run({
        submissionId,
        status,
        note
      });

      await storeValue("selectedDocumentInboxId", submissionId);
      await this.refresh();

      showAlert(`Document status changed to ${status}.`, "success");
    } catch (error) {
      showAlert(
        "Document status could not be changed: " + error.message,
        "error"
      );

      console.log(error);
    }
  },

  review(row = null) {
    return this.changeStatus("UNDER_REVIEW", row);
  },

  approve(row = null) {
    return this.changeStatus("APPROVED", row);
  },

  reject(row = null) {
    return this.changeStatus(
      "REJECTED",
      row,
      DocumentInboxDecisionNoteInput.text || null
    );
  },

 async process(row = null, forcedTargetType = null) {
  const selected = this.selected(row);
  const submissionId = this.submissionId(selected);

  const status = String(
    selected.status ||
    selected.Status ||
    ""
  ).toUpperCase();

  if (!submissionId) {
    showAlert("Select inbox document first.", "warning");
    return;
  }

  if (status !== "APPROVED") {
    showAlert("Only approved documents can be processed.", "warning");
    return;
  }

  const sourceType = String(
    selected.documentType ||
    selected.document_type ||
    selected["Document Type"] ||
    ""
  ).toUpperCase();

  const typeMap = {
    SUPPLIER_INVOICE: "PURCHASE_INVOICE",
    PURCHASE_INVOICE: "PURCHASE_INVOICE",
    SUPPLIER_QUOTE: "PURCHASE_QUOTE",
    PURCHASE_QUOTE: "PURCHASE_QUOTE",
    DELIVERY_NOTE: "DELIVERY_NOTE"
  };

  const targetType = forcedTargetType || typeMap[sourceType];

  if (!targetType) {
    showAlert(
      `Processing type is not configured for ${sourceType || "this document"}.`,
      "warning"
    );
    return;
  }

  try {
    const result = await ProcessDocumentInbox.run({
      submissionId,
      targetType,
      warehouseId: Number(appsmith.store.warehouseId || 0) || null
    });

    await this.refresh();

    showAlert(
      result?.documentNumber
        ? `ERP document ${result.documentNumber} was created.`
        : "Document was processed successfully.",
      "success"
    );

    return result;
  } catch (error) {
    showAlert("Error while processing document: " + error.message, "error");
    console.log(error);
  }
},
	
  cancel(row = null) {
    return this.changeStatus(
      "CANCELLED",
      row,
      DocumentInboxDecisionNoteInput.text || null
    );
  }
};
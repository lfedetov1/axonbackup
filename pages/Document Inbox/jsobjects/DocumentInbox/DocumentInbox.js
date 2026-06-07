export default {
  selected(row = null) {
    return row || DocumentInboxTable.selectedRow || {};
  },

  submissionId(row = null) {
    const selected = this.selected(row);

    return Number(
      selected.submissionId ||
      selected.id ||
      selected.ID ||
      0
    );
  },

  processedDocumentId(row = null) {
    const selected = this.selected(row);

    return Number(
      selected.processedDocumentId ||
      selected.processed_document_id ||
      0
    );
  },

  async refresh() {
    await ListDocumentInbox.run();

    if (
      appsmith.store.selectedDocumentInboxId &&
      typeof GetDocumentInboxDetails !== "undefined"
    ) {
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
      const response = await CreateDocumentUploadLink.run({
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
      });

      const result = response?.uploadUrl
        ? response
        : CreateDocumentUploadLink.data || {};

      if (!result.uploadUrl) {
        showAlert("Upload URL was not returned by the server.", "error");
        return null;
      }

      await storeValue(
        "documentUploadGeneratedLink",
        result.uploadUrl
      );

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

  async sendUploadLink() {
    const recipientEmail = String(
      DocumentUploadRecipientEmailIn.text || ""
    ).trim();

    let uploadUrl = String(
      appsmith.store.documentUploadGeneratedLink || ""
    ).trim();

    if (!recipientEmail) {
      showAlert("Recipient email is required.", "warning");
      return;
    }

    if (!uploadUrl) {
      const result = await this.createUploadLink();
      uploadUrl = result?.uploadUrl || "";
    }

    if (!uploadUrl) {
      return;
    }

    try {
      await SendDocumentUploadLink.run({
        recipientEmail,
        recipientName: DocumentUploadRecipientNameInp.text || "",
        uploadUrl,
        linkName: DocumentUploadLinkNameInput.text || "Document Upload",
        message: DocumentUploadMessageInput.text || ""
      });

      showAlert("Secure upload link was sent successfully.", "success");
    } catch (error) {
      showAlert(
        "Error while sending upload link: " + error.message,
        "error"
      );

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

  cancel(row = null) {
    return this.changeStatus(
      "CANCELLED",
      row,
      DocumentInboxDecisionNoteInput.text || null
    );
  },

  async process(row = null, targetType = "AUTO") {
    const selected = this.selected(row);
    const submissionId = this.submissionId(selected);
    const processedDocumentId = this.processedDocumentId(selected);

    const status = String(
      selected.status ||
      selected.Status ||
      ""
    ).toUpperCase();

    if (!submissionId) {
      showAlert("Document was not found.", "warning");
      return;
    }

    if (status !== "APPROVED") {
      showAlert("Only approved documents can be processed.", "warning");
      return;
    }

    if (processedDocumentId) {
      showAlert("Document has already been processed.", "warning");
      return;
    }

    try {
      const result = await ProcessDocumentInbox.run({
        submissionId,
        targetType,
        warehouseId:
          Number(appsmith.store.warehouseId || 0) || null
      });

      await storeValue("selectedDocumentInboxId", submissionId);
      await this.refresh();

      showAlert(
        result?.documentNumber
          ? `${result.documentType} ${result.documentNumber} was created.`
          : "Document was processed successfully.",
        "success"
      );

      return result;
    } catch (error) {
      showAlert(
        "Error while processing document: " + error.message,
        "error"
      );

      console.log(error);
      return null;
    }
  },

  archive(row = null) {
    return this.process(row, "ARCHIVE_ONLY");
  }
};
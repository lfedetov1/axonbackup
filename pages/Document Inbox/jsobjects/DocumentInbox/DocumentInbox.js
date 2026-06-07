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
  await storeValue("lastDocumentUploadLink", "");

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
    const result = await CreateDocumentUploadLink.run();

    const uploadUrl =
      result?.uploadUrl ||
      CreateDocumentUploadLink.data?.uploadUrl ||
      "";

    if (!uploadUrl) {
      showAlert("Upload link was not created.", "error");
      return;
    }

    await storeValue("lastDocumentUploadLink", uploadUrl);

    showAlert("Secure upload link was created.", "success");
  } catch (error) {
    showAlert(
      "Error while creating upload link: " + error.message,
      "error"
    );
  }
},

async sendUploadLink() {
  if (!DocumentUploadRecipientEmailIn.text.trim()) {
    showAlert("Recipient email is required.", "warning");
    return;
  }

  try {
    const result = await SendDocumentUploadLink.run();

    const uploadUrl =
      result?.uploadUrl ||
      SendDocumentUploadLink.data?.uploadUrl ||
      "";

    if (uploadUrl) {
      await storeValue("lastDocumentUploadLink", uploadUrl);
    }

    showAlert("Secure upload link was sent.", "success");
  } catch (error) {
    showAlert(
      "Upload email could not be sent: " + error.message,
      "error"
    );
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
      showAlert("Document status could not be changed: " + error.message, "error");
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

  process(row = null) {
    return this.changeStatus("PROCESSED", row);
  },

  cancel(row = null) {
    return this.changeStatus(
      "CANCELLED",
      row,
      DocumentInboxDecisionNoteInput.text || null
    );
  }
};
export default {
  getRow(row = null) {
    return row || InvoicesTable.triggeredRow || InvoicesTable.selectedRow || {};
  },

  getDocumentId(row = null) {
    const selected = this.getRow(row);

    return (
      selected.documentId ||
      selected.id ||
      selected.ID ||
      selected["Document ID"] ||
      selected["Invoice ID"] ||
      null
    );
  },

  getStatus(row = null) {
    const selected = this.getRow(row);
    return String(selected.Status || selected.status || "").toUpperCase();
  },

  getPostingStatus(row = null) {
    const selected = this.getRow(row);
    return String(selected.postingStatus || selected["Posting Status"] || "").toUpperCase();
  },

  async refresh() {
    if (typeof ListInvoices !== "undefined") {
      await ListInvoices.run();
    }

    if (typeof GetInvoiceOverviewHeader !== "undefined") {
      await GetInvoiceOverviewHeader.run();
    }

    if (typeof GetInvoiceOverviewItems !== "undefined") {
      await GetInvoiceOverviewItems.run();
    }

    if (typeof GetInvoiceOverviewTaxSummary !== "undefined") {
      await GetInvoiceOverviewTaxSummary.run();
    }
  },

  async print(row = null) {
    const documentId = this.getDocumentId(row);

    if (!documentId) {
      showAlert("Select invoice first.", "warning");
      return;
    }

    await storeValue("currentInvoiceId", documentId);

    await GetSalesInvoicePrintHeader.run({ documentId });
    await GetSalesInvoicePrintItems.run({ documentId });
    await GetSalesInvoicePrintTaxSummary.run({ documentId });

    showModal(SalesInvoicePrintModal.name);
  },

  async voidDocument(row = null) {
    const documentId = this.getDocumentId(row);

    if (!documentId) {
      showAlert("Select invoice first.", "warning");
      return;
    }

    const headerRows = await GetSalesDocumentForVoid.run({ documentId });
    const header = headerRows?.[0] || GetSalesDocumentForVoid.data?.[0];

    if (!header) {
      showAlert("Document was not found.", "error");
      return;
    }

    if (String(header.status || "").toUpperCase() !== "DRAFT") {
      showAlert("Only draft documents can be voided. Posted/fiscalized invoices must be reversed with credit note.", "warning");
      return;
    }

    await VoidDraftSalesDocument.run({ documentId });

    if (typeof AuditLog !== "undefined" && AuditLog.insert) {
      await AuditLog.insert({
        entityName: "documents",
        entityId: documentId,
        actionType: "VOID",
        newValues: {
          source: "Sales Invoice",
          status: "CANCELLED"
        }
      });
    }

    await this.refresh();
    showAlert("Document was voided.", "success");
  },

  async createCreditNote(row = null) {
    const invoiceId = this.getDocumentId(row);

    if (!invoiceId) {
      showAlert("Select invoice first.", "warning");
      return;
    }

    const invoiceRows = await GetSalesInvoiceForStorno.run({ invoiceId });
    const invoice = invoiceRows?.[0] || GetSalesInvoiceForStorno.data?.[0];

    if (!invoice) {
      showAlert("Invoice was not found.", "error");
      return;
    }

    if (String(invoice.status || "").toUpperCase() === "CANCELLED") {
      showAlert("Cancelled invoice cannot be reversed.", "warning");
      return;
    }

    const numberRows = await GetNextDocumentNumberByType.run({
      documentType: "CREDIT_NOTE"
    });

    const creditNoteNumber =
      numberRows?.[0]?.nextDocumentNumber ||
      GetNextDocumentNumberByType.data?.[0]?.nextDocumentNumber;

    if (!creditNoteNumber) {
      showAlert("Credit note number could not be generated.", "error");
      return;
    }

    await InsertCreditNoteFromInvoice.run({
      invoiceId,
      creditNoteNumber
    });

    const creditRows = await GetCreditNoteIdByNumber.run({
      creditNoteNumber
    });

    const creditNote = creditRows?.[0] || GetCreditNoteIdByNumber.data?.[0];

    if (!creditNote?.creditNoteId) {
      showAlert("Credit note was created, but ID was not found.", "error");
      return;
    }

    await InsertCreditNoteItemsFromInvoi.run({
      invoiceId,
      creditNoteId: creditNote.creditNoteId
    });

    await MarkInvoiceStornoLinked.run({
      invoiceId,
      creditNoteNumber
    });

    if (typeof AuditLog !== "undefined" && AuditLog.insert) {
      await AuditLog.insert({
        entityName: "documents",
        entityId: creditNote.creditNoteId,
        actionType: "INSERT",
        newValues: {
          source: "Sales Invoice Storno",
          document_type: "CREDIT_NOTE",
          document_number: creditNoteNumber,
          source_document_id: invoiceId
        }
      });
    }

    await this.refresh();
    await storeValue("currentInvoiceId", creditNote.creditNoteId);

    showAlert(`Credit note ${creditNoteNumber} was created.`, "success");
  }
};
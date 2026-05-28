export default {
  async audit(actionType, entityId, newValues = {}, oldValues = null) {
    try {
      if (typeof AuditLog !== "undefined" && AuditLog.insert) {
        await AuditLog.insert({
          entityName: "document_packages",
          entityId,
          actionType,
          oldValues,
          newValues: {
            source: "Package Flow",
            ...newValues
          }
        });
      }
    } catch (error) {
      console.log("Audit log skipped:", error);
    }
  },

  selectedDeliveryNoteId() {
    const selected = DeliveryNotesTable.selectedRow || {};
    return (
      selected.documentId ||
      selected.id ||
      selected.ID ||
      selected["Document ID"] ||
      appsmith.store.selectedDeliveryNoteId ||
      null
    );
  },

  async createPackageFromSelectedDeliveryNote() {
    const deliveryNoteId = this.selectedDeliveryNoteId();

    if (!deliveryNoteId) {
      showAlert("Select delivery note first.", "warning");
      return;
    }

    try {
      const numberRows = await GetNextPackageNumber.run();
      const packageNumber =
        numberRows?.[0]?.nextPackageNumber ||
        GetNextPackageNumber.data?.[0]?.nextPackageNumber;

      if (!packageNumber) {
        showAlert("Package number could not be generated.", "error");
        return;
      }

      const packageBarcode = `${packageNumber}-${deliveryNoteId}`;

      await InsertPackageForDeliveryNote.run({
        deliveryNoteId,
        packageNumber,
        packageBarcode,
        packageType: "BOX"
      });

      const packageRows = await GetPackageIdByNumber.run({ packageNumber });
      const pkg = packageRows?.[0] || GetPackageIdByNumber.data?.[0];

      if (!pkg?.packageId) {
        showAlert("Package was created, but ID was not found.", "error");
        return;
      }

      await InsertPackageItemsFromDelivery.run({
        deliveryNoteId,
        packageId: pkg.packageId
      });

      await UpdatePackageTotals.run({
        packageId: pkg.packageId
      });

      await this.audit("INSERT", pkg.packageId, {
        package_number: packageNumber,
        package_barcode: packageBarcode,
        delivery_note_id: deliveryNoteId
      });

      await storeValue("selectedPackageId", pkg.packageId);
      await storeValue("selectedPackageNumber", packageNumber);
      await storeValue("selectedPackageBarcode", packageBarcode);

      if (typeof ListSalesOrderPackages !== "undefined") {
        await ListSalesOrderPackages.run();
      }

      if (typeof ListDeliveryPackages !== "undefined") {
        await ListDeliveryPackages.run();
      }

      showAlert(`Package ${packageNumber} was created.`, "success");
    } catch (error) {
      showAlert("Error while creating package: " + error.message, "error");
      console.log(error);
    }
  }
};
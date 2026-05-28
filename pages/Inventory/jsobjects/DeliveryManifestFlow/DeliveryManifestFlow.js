export default {
  currentManifestId() {
    return appsmith.store.currentDeliveryManifestId || null;
  },

  async audit(actionType, entityId, newValues = {}, oldValues = null) {
    try {
      if (typeof AuditLog !== "undefined" && AuditLog.insert) {
        await AuditLog.insert({
          entityName: "delivery_manifests",
          entityId,
          actionType,
          oldValues,
          newValues: {
            source: "Delivery Manifest",
            ...newValues
          }
        });
      }
    } catch (error) {
      console.log("Audit log skipped:", error);
    }
  },

  async startNew() {
    if (typeof ListCarriersForManifest !== "undefined") {
      await ListCarriersForManifest.run();
    }

    if (typeof ListDriversForManifest !== "undefined") {
      await ListDriversForManifest.run();
    }

    await GetNextDeliveryManifestNumber.run();

    const manifestNumber =
      GetNextDeliveryManifestNumber.data?.[0]?.nextManifestNumber || "";

    await storeValue("currentDeliveryManifestId", null);
    await storeValue("currentDeliveryManifestNumber", manifestNumber);
    await storeValue("deliveryManifestPackages", []);

    DeliveryManifestNumberInput.setValue(manifestNumber);
    DeliveryManifestDateInput.setValue(moment().format("YYYY-MM-DD"));
    DeliveryManifestRouteInput.setValue("");
    DeliveryManifestCarrierSelect.setSelectedOption("");
    DeliveryManifestDriverSelect.setSelectedOption("");
    DeliveryManifestVehicleInput.setValue("");
    DeliveryManifestNoteInput.setValue("");

    if (typeof DeliveryManifestBarcodeInput !== "undefined") {
      DeliveryManifestBarcodeInput.setValue("");
    }

    showModal(DeliveryManifestModal.name);
  },

  async saveHeaderIfNeeded() {
    if (this.currentManifestId()) {
      return this.currentManifestId();
    }

    const manifestNumber =
      DeliveryManifestNumberInput.text ||
      appsmith.store.currentDeliveryManifestNumber;

    if (!manifestNumber) {
      showAlert("Manifest number is missing.", "warning");
      return null;
    }

    await InsertDeliveryManifest.run({
      manifestNumber,
      manifestDate: DeliveryManifestDateInput.selectedDate || moment().format("YYYY-MM-DD"),
      routeName: DeliveryManifestRouteInput.text || "",
      carrier: DeliveryManifestCarrierSelect.selectedOptionLabel || "",
      driverName: DeliveryManifestDriverSelect.selectedOptionLabel || "",
      vehiclePlate: DeliveryManifestVehicleInput.text || "",
      note: DeliveryManifestNoteInput.text || ""
    });

    const rows = await GetDeliveryManifestByNumber.run({ manifestNumber });
    const manifest = rows?.[0] || GetDeliveryManifestByNumber.data?.[0];

    if (!manifest?.manifestId) {
      showAlert("Manifest was saved, but ID was not found.", "error");
      return null;
    }

    await storeValue("currentDeliveryManifestId", manifest.manifestId);

    await this.audit("INSERT", manifest.manifestId, {
      manifest_number: manifestNumber,
      carrier: DeliveryManifestCarrierSelect.selectedOptionLabel || "",
      driver: DeliveryManifestDriverSelect.selectedOptionLabel || "",
      vehicle_plate: DeliveryManifestVehicleInput.text || "",
      status: "DRAFT"
    });

    return manifest.manifestId;
  },

  async scanPackage(value, scanMode = "PLAN") {
    const lookup = String(value || DeliveryManifestBarcodeInput.text || "").trim();

    if (!lookup) {
      showAlert("Scan or enter package barcode first.", "warning");
      return;
    }

    const manifestId = await this.saveHeaderIfNeeded();

    if (!manifestId) return;

    try {
      const packageRows = await FindPackageForManifestScan.run({ lookup });
      const pkg = packageRows?.[0] || FindPackageForManifestScan.data?.[0];

      if (!pkg?.packageId) {
        showAlert("Package was not found.", "warning");
        DeliveryManifestBarcodeInput.setValue("");
        return;
      }

      if (scanMode === "PLAN") {
        await InsertDeliveryManifestPackage.run({
          manifestId,
          packageId: pkg.packageId
        });

        await InsertPackageScanEvent.run({
          packageId: pkg.packageId,
          manifestId,
          scanType: "PLAN",
          scanResult: "OK",
          note: `Package added to manifest ${DeliveryManifestNumberInput.text}`
        });
      }

      if (scanMode === "LOAD") {
        await this.ensurePackageOnManifest(manifestId, pkg.packageId);

        await MarkManifestPackageLoaded.run({
          manifestId,
          packageId: pkg.packageId
        });

        await InsertPackageScanEvent.run({
          packageId: pkg.packageId,
          manifestId,
          scanType: "LOAD",
          scanResult: "OK",
          note: `Package loaded ${pkg.packageNumber}`
        });
      }

      if (scanMode === "RECEIVE") {
        await this.ensurePackageOnManifest(manifestId, pkg.packageId);

        await MarkManifestPackageReceived.run({
          manifestId,
          packageId: pkg.packageId
        });

        await InsertPackageScanEvent.run({
          packageId: pkg.packageId,
          manifestId,
          scanType: "RECEIVE",
          scanResult: "OK",
          note: `Package received ${pkg.packageNumber}`
        });
      }

      await this.refreshPackages();

      DeliveryManifestBarcodeInput.setValue("");
      showAlert(`Package ${pkg.packageNumber} scanned.`, "success");
    } catch (error) {
      showAlert("Error while scanning package: " + error.message, "error");
      console.log(error);
    }
  },

  async ensurePackageOnManifest(manifestId, packageId) {
    const rows = appsmith.store.deliveryManifestPackages || [];
    const exists = rows.some(row =>
      Number(row.packageId || row.PackageID || row["Package ID"] || 0) === Number(packageId)
    );

    if (exists) return;

    await InsertDeliveryManifestPackage.run({
      manifestId,
      packageId
    });
  },

  async markSelectedMissing() {
    const row = DeliveryManifestPackagesTable.selectedRow || {};
    const manifestId = this.currentManifestId();
    const packageId =
      row.packageId ||
      row.PackageID ||
      row["Package ID"] ||
      row.id ||
      row.ID;

    if (!manifestId || !packageId) {
      showAlert("Select package first.", "warning");
      return;
    }

    try {
      await MarkManifestPackageMissing.run({
        manifestId,
        packageId
      });

      await InsertPackageScanEvent.run({
        packageId,
        manifestId,
        scanType: "MISSING",
        scanResult: "MISSING",
        note: "Package marked as missing"
      });

      await this.refreshPackages();
      showAlert("Package marked as missing.", "success");
    } catch (error) {
      showAlert("Error while marking package missing: " + error.message, "error");
      console.log(error);
    }
  },

  async refreshPackages() {
    if (typeof ListDeliveryManifestPackages !== "undefined") {
      await ListDeliveryManifestPackages.run();
      await storeValue("deliveryManifestPackages", ListDeliveryManifestPackages.data || []);
    }

    if (typeof ListDeliveryManifestPackagesOverview !== "undefined") {
      await ListDeliveryManifestPackagesOv.run();
    }

    if (typeof ListDeliveryManifests !== "undefined") {
      await ListDeliveryManifests.run();
    }
  },
	async loadForEdit(row = null) {
  const selected = row || DeliveryManifestsTable.triggeredRow || DeliveryManifestsTable.selectedRow || {};
  const manifestId =
    selected.manifestId ||
    selected.id ||
    selected.ID ||
    selected["Manifest ID"];

  if (!manifestId) {
    showAlert("Select manifest first.", "warning");
    return;
  }

  const headerRows = await GetDeliveryManifestForEdit.run({ manifestId });
  const header = headerRows?.[0] || GetDeliveryManifestForEdit.data?.[0];

  if (!header) {
    showAlert("Manifest was not found.", "error");
    return;
  }

  if (header.status !== "DRAFT") {
    showAlert("Only draft manifest can be edited.", "warning");
    return;
  }

  const packageRows = await GetDeliveryManifestPackagesFor.run({ manifestId });
  const packages = packageRows || GetDeliveryManifestPackagesFor.data || [];

  await storeValue("currentDeliveryManifestId", header.manifestId);
  await storeValue("currentDeliveryManifestNumber", header.manifestNumber);
  await storeValue("deliveryManifestPackages", packages);

  DeliveryManifestNumberInput.setValue(header.manifestNumber || "");
  DeliveryManifestDateInput.setValue(header.manifestDate || "");
  DeliveryManifestRouteInput.setValue(header.routeName || "");
  DeliveryManifestVehicleInput.setValue(header.vehiclePlate || "");
  DeliveryManifestNoteInput.setValue(header.note || "");

  if (typeof ListCarriersForManifest !== "undefined") await ListCarriersForManifest.run();
  if (typeof ListDriversForManifest !== "undefined") await ListDriversForManifest.run();

  const carrier = (ListCarriersForManifest.data || []).find(row => row.label === header.carrier);
  const driver = (ListDriversForManifest.data || []).find(row => row.label === header.driverName);

  DeliveryManifestCarrierSelect.setSelectedOption(carrier ? String(carrier.value) : "");
  DeliveryManifestDriverSelect.setSelectedOption(driver ? String(driver.value) : "");

  showModal(DeliveryManifestModal.name);
},

async saveHeader() {
  const manifestId = this.currentManifestId();

  if (!manifestId) {
    return this.saveHeaderIfNeeded();
  }

  await UpdateDeliveryManifestHeader.run({ manifestId });

  await this.audit("UPDATE", manifestId, {
    manifest_number: DeliveryManifestNumberInput.text,
    carrier: DeliveryManifestCarrierSelect.selectedOptionLabel || "",
    driver: DeliveryManifestDriverSelect.selectedOptionLabel || "",
    vehicle_plate: DeliveryManifestVehicleInput.text || "",
    status: "DRAFT"
  });

  await this.refreshPackages();
  showAlert("Manifest header was updated.", "success");

  return manifestId;
},

async voidManifest(row = null) {
  const selected = row || DeliveryManifestsTable.triggeredRow || DeliveryManifestsTable.selectedRow || {};
  const manifestId =
    selected.manifestId ||
    selected.id ||
    selected.ID ||
    selected["Manifest ID"];

  if (!manifestId) {
    showAlert("Select manifest first.", "warning");
    return;
  }

  await VoidDeliveryManifest.run({ manifestId });
  await VoidDeliveryManifestPackages.run({ manifestId });

  await this.audit("CANCEL", manifestId, {
    status: "CANCELLED"
  });

  if (typeof ListDeliveryManifests !== "undefined") await ListDeliveryManifests.run();
  if (typeof ListDeliveryManifestPackagesOverview !== "undefined") await ListDeliveryManifestPackagesOv.run();

  showAlert("Manifest was cancelled.", "success");
},

  async close() {
    await storeValue("currentDeliveryManifestId", null);
    await storeValue("currentDeliveryManifestNumber", null);
    await storeValue("deliveryManifestPackages", []);

    closeModal(DeliveryManifestModal.name);
  }
};
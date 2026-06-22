export default {
  rows() {
    return appsmith.store.adminPlanningImportRows || [];
  },

  normalizeKey(key = "") {
    return String(key)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/-/g, "_");
  },

  parseNumber(value) {
    return Number(
      String(value || "0")
        .replace(",", ".")
        .replace(/[^\d.-]/g, "")
    ) || 0;
  },

  normalizeDate(value) {
    const raw = String(value || "").trim();

    if (!raw) return "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    const dotMatch = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (dotMatch) {
      const day = dotMatch[1].padStart(2, "0");
      const month = dotMatch[2].padStart(2, "0");
      const year = dotMatch[3];
      return `${year}-${month}-${day}`;
    }

    const excelSerial = Number(raw);
    if (excelSerial > 25000 && excelSerial < 60000) {
      const date = new Date((excelSerial - 25569) * 86400 * 1000);
      return moment(date).format("YYYY-MM-DD");
    }

    const parsed = moment(raw);
    return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
  },

  parseCsvLine(line, separator) {
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"' && next === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current);
    return values.map(value => value.trim());
  },

  parseCsv(text = "") {
    const lines = String(text || "")
      .replace(/\r/g, "")
      .split("\n")
      .filter(line => line.trim());

    if (lines.length < 2) {
      showAlert("CSV file has no data rows.", "warning");
      return [];
    }

    const separator = lines[0].includes(";") ? ";" : ",";
    const headers = this.parseCsvLine(lines[0], separator).map(header =>
      this.normalizeKey(header)
    );

    return lines.slice(1).map((line, index) => {
      const values = this.parseCsvLine(line, separator);
      const raw = {};

      headers.forEach((header, i) => {
        raw[header] = values[i] ?? "";
      });

      const targetDate = this.normalizeDate(
        raw.date ||
        raw.target_date ||
        raw.datum ||
        raw.targetdate ||
        ""
      );

      return {
        rowNo: index + 1,
        targetDate,
        salesTargetAmount: this.parseNumber(
          raw.sales_target_amount ||
          raw.sales ||
          raw.sales_target ||
          raw.promet ||
          raw.plan_prometa
        ),
        marginTargetAmount: this.parseNumber(
          raw.margin_target_amount ||
          raw.margin ||
          raw.marza ||
          raw.plan_marze
        ),
        transactionTargetCount: this.parseNumber(
          raw.transaction_target_count ||
          raw.transactions ||
          raw.broj_racuna ||
          raw.racuni
        ),
        itemTargetQuantity: this.parseNumber(
          raw.item_target_quantity ||
          raw.items ||
          raw.kolicina ||
          raw.komada
        ),
        plannedWorkingHours: this.parseNumber(
          raw.planned_working_hours ||
          raw.working_hours ||
          raw.radni_sati
        ),
        plannedAbsenceHours: this.parseNumber(
          raw.planned_absence_hours ||
          raw.absence_hours ||
          raw.izostanak_sati
        ),
        plannedSickLeaveHours: this.parseNumber(
          raw.planned_sick_leave_hours ||
          raw.sick_leave_hours ||
          raw.bolovanje_sati
        ),
        note: raw.note || raw.napomena || "",
        importStatus: targetDate ? "OK" : "INVALID_DATE",
        rawDate: raw.date || raw.target_date || raw.datum || ""
      };
    });
  },

  fileText() {
    const file = AdminPlanningImportFilePicker.files?.[0];

    if (!file) return "";

    return file.data || file.content || file.text || "";
  },

  async preview() {
    const text = this.fileText();

    if (!text) {
      showAlert("Select CSV file first.", "warning");
      return;
    }

    const rows = this.parseCsv(text);

    await storeValue("adminPlanningImportRows", rows);

    const invalidRows = rows.filter(row => row.importStatus !== "OK");

    if (!rows.length) {
      showAlert("No rows found in file.", "warning");
      return;
    }

    if (invalidRows.length) {
      showAlert(
        `${invalidRows.length} row(s) have invalid date. Fix them before import.`,
        "warning"
      );
      return;
    }

    showAlert(`${rows.length} planning rows loaded for preview.`, "success");
  },

  validate() {
    const salesPlanId = Number(AdminPlanningImportPlanSelect.selectedOptionValue || 0);

    if (!salesPlanId) {
      showAlert("Select sales plan first.", "warning");
      return false;
    }

    const rows = this.rows();

    if (!rows.length) {
      showAlert("Preview file before import.", "warning");
      return false;
    }

    const invalid = rows.find(row => row.importStatus !== "OK" || !row.targetDate);

    if (invalid) {
      showAlert(
        `Row ${invalid.rowNo} has invalid date. Original value: ${invalid.rawDate || "-"}`,
        "warning"
      );
      return false;
    }

    return true;
  },

  async importRows() {
    if (!this.validate()) return;

    const salesPlanId = Number(AdminPlanningImportPlanSelect.selectedOptionValue || 0);
    const rows = this.rows();

    try {
      for (const row of rows) {
        await UpsertAdminSalesPlanDailyTargetImport.run({
          salesPlanId,
          targetDate: row.targetDate,
          salesTargetAmount: row.salesTargetAmount,
          marginTargetAmount: row.marginTargetAmount,
          transactionTargetCount: row.transactionTargetCount,
          itemTargetQuantity: row.itemTargetQuantity,
          plannedWorkingHours: row.plannedWorkingHours,
          plannedAbsenceHours: row.plannedAbsenceHours,
          plannedSickLeaveHours: row.plannedSickLeaveHours,
          note: row.note
        });
      }

      await AdminAudit.log("IMPORT", "sales_plan_daily_targets", salesPlanId, {
        imported_rows: rows.length,
        source: "Planning CSV import"
      });

      if (typeof ListAdminSalesPlanDailyTargets !== "undefined") {
        await ListAdminSalesPlanDailyTargets.run();
      }

      await storeValue("adminPlanningImportRows", []);
      closeModal(AdminPlanningImportModal.name);

      showAlert(`${rows.length} planning rows imported.`, "success");
    } catch (error) {
      showAlert("Planning import failed: " + error.message, "error");
      console.log(error);
    }
  },

  async clear() {
    await storeValue("adminPlanningImportRows", []);
    resetWidget("AdminPlanningImportFilePicker", true);
  },

  async downloadTemplate() {
    const csv = [
      "date;sales_target_amount;margin_target_amount;transaction_target_count;item_target_quantity;planned_working_hours;planned_absence_hours;planned_sick_leave_hours;note",
      "2026-06-01;1500.00;450.00;35;120;8;0;0;Monday target",
      "2026-06-02;1800.00;540.00;40;140;8;0;0;Campaign day"
    ].join("\n");

    download(csv, "sales-planning-template.csv", "text/csv");
  }
};
export default {
  selectedUserId() {
    return Number(appsmith.store.selectedAdminUserId || 0);
  },

  isEditMode() {
    return this.selectedUserId() > 0;
  },

  clearForm() {
    AdminUserUsernameInput.setValue("");
    AdminUserEmailInput.setValue("");
    AdminUserFirstNameInput.setValue("");
    AdminUserLastNameInput.setValue("");
    AdminUserPhoneInput.setValue("");
    AdminUserPasswordInput.setValue("");

    if (typeof AdminUserActiveSwitch !== "undefined") {
      AdminUserActiveSwitch.setValue(true);
    }
  },

  async openNew() {
    await storeValue("selectedAdminUserId", null);
    this.clearForm();
    showModal(AdminUserModal.name);
  },

  async openEdit(row = null) {
    const selected = row || AdminUsersTable.selectedRow || {};
    const userId =
      selected.userId ||
      selected.id ||
      selected.ID ||
      0;

    if (!userId) {
      showAlert("Select user first.", "warning");
      return;
    }

    await storeValue("selectedAdminUserId", userId);

    const rows = await GetAdminUserForEdit.run();
    const user = rows?.[0] || GetAdminUserForEdit.data?.[0];

    if (!user) {
      showAlert("User was not found.", "error");
      return;
    }

    AdminUserUsernameInput.setValue(user.username || "");
    AdminUserEmailInput.setValue(user.email || "");
    AdminUserFirstNameInput.setValue(user.firstName || "");
    AdminUserLastNameInput.setValue(user.lastName || "");
    AdminUserPhoneInput.setValue(user.phone || "");
    AdminUserPasswordInput.setValue("");

    if (typeof AdminUserActiveSwitch !== "undefined") {
      AdminUserActiveSwitch.setValue(Number(user.isActive || 0) === 1);
    }

    showModal(AdminUserModal.name);
  },

  validate() {
    if (!AdminUserUsernameInput.text.trim()) {
      showAlert("Username is required.", "warning");
      return false;
    }

    if (!AdminUserEmailInput.text.trim()) {
      showAlert("Email is required.", "warning");
      return false;
    }

    if (!this.isEditMode() && !AdminUserPasswordInput.text) {
      showAlert("Password is required for new user.", "warning");
      return false;
    }

    return true;
  },

  async save() {
    if (!this.validate()) return;

    const wasEditMode = this.isEditMode();

    try {
      if (wasEditMode) {
        await UpdateAdminUser.run();

        if (AdminUserPasswordInput.text) {
          await UpdateAdminUserPassword.run();

          await AdminAudit.log(
            "PASSWORD_CHANGE",
            "users",
            this.selectedUserId(),
            {
              username: AdminUserUsernameInput.text.trim()
            }
          );
        }
      } else {
        await InsertAdminUser.run();
      }

      await AdminAudit.log(
        wasEditMode ? "UPDATE" : "INSERT",
        "users",
        this.selectedUserId(),
        {
          username: AdminUserUsernameInput.text.trim(),
          email: AdminUserEmailInput.text.trim(),
          first_name: AdminUserFirstNameInput.text.trim(),
          last_name: AdminUserLastNameInput.text.trim(),
          phone: AdminUserPhoneInput.text.trim() || null,
          is_active: AdminUserActiveSwitch.isSwitchedOn ? 1 : 0
        }
      );

      await ListAdminUsers.run();

      if (typeof ListAdminUsersForWarehouseAccess !== "undefined") {
        await ListAdminUsersForWarehouseAcce.run();
      }

      if (typeof ListAdminUsersForPOSAccess !== "undefined") {
        await ListAdminUsersForPOSAccess.run();
      }

      closeModal(AdminUserModal.name);
      showAlert(wasEditMode ? "User updated." : "User created.", "success");
    } catch (error) {
      showAlert("Error while saving user: " + error.message, "error");
      console.log(error);
    }
  }
};
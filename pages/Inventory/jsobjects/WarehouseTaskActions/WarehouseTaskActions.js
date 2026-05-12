export default {
  getTask(row = null) {
    return row || WarehouseTasksTable.triggeredRow || WarehouseTasksTable.selectedRow || {};
  },

  async start(row = null) {
    const task = this.getTask(row);
    const taskId = task.taskId || task.ID || task.id;

    if (!taskId) {
      showAlert("Select task first.", "warning");
      return;
    }

    await StartWarehouseTask.run({ taskId });
    await ListWarehouseTasks.run();
    showAlert("Task started.", "success");
  },

  async complete(row = null) {
    const task = this.getTask(row);
    const taskId = task.taskId || task.ID || task.id;

    if (!taskId) {
      showAlert("Select task first.", "warning");
      return;
    }

    await CompleteWarehouseTask.run({ taskId });
    await ListWarehouseTasks.run();
    showAlert("Task completed.", "success");
  },

  async cancel(row = null) {
    const task = this.getTask(row);
    const taskId = task.taskId || task.ID || task.id;

    if (!taskId) {
      showAlert("Select task first.", "warning");
      return;
    }

    await CancelWarehouseTask.run({ taskId });
    await ListWarehouseTasks.run();
    showAlert("Task cancelled.", "success");
  },

  async open(row = null) {
    const task = this.getTask(row);
    const taskType = task["Task Type"] || task.taskType || "";
    const documentId = task.documentId || task.documentID || task["Document ID"];

    await storeValue("selectedWarehouseTask", task);

    if (taskType === "PICKING" || taskType === "PACKING") {
      await storeValue("pickingDocumentId", documentId);
      await ListPickingItems.run({ documentId });
      showAlert("Open Picking / Packing tab.", "info");
      return;
    }

    if (taskType === "TRANSFER" || taskType === "RECEIVE_TRANSFER") {
      await storeValue("currentTransferRequestId", documentId);
      showAlert("Open Transfer Request tab.", "info");
      return;
    }

    if (taskType === "PUTAWAY") {
      await storeValue("putawayDocumentId", documentId);
      showAlert("Open Putaway tab.", "info");
      return;
    }

    if (taskType === "RECEIVING") {
      await storeValue("inboundDeliveryId", documentId);
      showAlert("Open Inbound Delivery tab.", "info");
      return;
    }

    if (taskType === "COUNTING") {
      await storeValue("currentInventoryCountId", documentId);
      showAlert("Open Inventory Count tab.", "info");
      return;
    }

    showAlert("Task action is not configured yet.", "warning");
  }
};

export default {
  async log(actionType, entityName, entityId, newValues = {}, oldValues = null) {
    try {
      if (typeof InsertAdminAuditLog === "undefined") {
        console.log("InsertAdminAuditLog query is missing.");
        return;
      }

      await InsertAdminAuditLog.run({
        entityName,
        entityId: Number(entityId || 0),
        actionType,
        oldValues: oldValues ? JSON.stringify(oldValues) : null,
        newValues: JSON.stringify({
          source: "Administration",
          ...newValues
        })
      });
    } catch (error) {
      console.log("Admin audit skipped:", error);
    }
  }
};
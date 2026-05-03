export default {
  async insert({ entityName, entityId, actionType, oldValues = null, newValues = null }) {
    try {
      await InsertAuditLog.run({
        entityName,
        entityId: String(entityId),
        actionType,
        oldValues: oldValues ? JSON.stringify(oldValues) : null,
        newValues: newValues ? JSON.stringify(newValues) : null
      });
    } catch (error) {
      console.log("Audit log failed", error);
    }
  }
};

import * as backupService from "../services/backupService.js";
import { sendSuccess, sendError } from "../utils/responseUtil.js";

export const exportData = async (req, res) => {
  try {
    const format = (req.query.format || "xlsx").toLowerCase();

    if (format === "csv") {
      const { buffer, contentType, filename } = await backupService.exportAsCsvZip();
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length);
      return res.send(buffer);
    }

    // Default: Multi-sheet Excel (.xlsx)
    const { buffer, contentType, filename } = await backupService.exportAsExcel();
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    return res.send(buffer);
  } catch (error) {
    console.error("Backup export error:", error);
    return sendError(res, error.message || "Failed to export tables data", 500);
  }
};

export const resetDatabase = async (req, res) => {
  try {
    const result = await backupService.resetDatabase();
    return sendSuccess(res, "Database wiped and reset successfully", result);
  } catch (error) {
    console.error("Database reset error:", error);
    return sendError(res, error.message || "Failed to reset database", 500);
  }
};

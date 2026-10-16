import * as backupService from "../services/backupService.js";
import { sendSuccess } from "../utils/responseUtil.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { audit } from "../utils/audit.js";

export const exportData = asyncHandler(async (req, res) => {
  const format = String(req.query.format || "xlsx").toLowerCase();
  const { buffer, contentType, filename } =
    format === "csv" ? await backupService.exportAsCsvZip() : await backupService.exportAsExcel();

  await audit(null, req.user, "DATA_EXPORTED", "System", null, { format });

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", buffer.length);
  return res.send(buffer);
});

export const resetDatabase = asyncHandler(async (req, res) => {
  const result = await backupService.resetDatabase(req.user, req.body.password);
  return sendSuccess(res, "Database wiped and reset successfully", result);
});

import Report from '../models/Report.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getReports = async (req, res) => {
  try {
    const reports = await Report.find().sort({ generatedAt: -1 });
    return sendSuccess(res, reports, 'Reports fetched');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const generateReport = async (req, res) => {
  try {
    const report = await Report.create({ type: req.body.type || 'daily', generatedBy: req.user?._id, data: { summary: 'Generated report' } });
    return sendSuccess(res, report, 'Report generated', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

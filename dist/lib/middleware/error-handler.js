"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
const logger_1 = __importDefault(require("../utils/logger"));
class AppError extends Error {
    statusCode;
    code;
    details;
    isOperational;
    constructor(message, statusCode = 500, code = 'INTERNAL', details, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = isOperational;
    }
    static badRequest(message = 'Bad Request', details) { return new AppError(message, 400, 'BAD_REQUEST', details); }
    static unauthorized(message = 'Unauthorized', details) { return new AppError(message, 401, 'UNAUTHORIZED', details); }
    static forbidden(message = 'Forbidden', details) { return new AppError(message, 403, 'FORBIDDEN', details); }
    static notFound(message = 'Not Found', details) { return new AppError(message, 404, 'NOT_FOUND', details); }
    static internal(message = 'Internal Server Error', details) { return new AppError(message, 500, 'INTERNAL', details); }
}
exports.AppError = AppError;
function errorHandler(error, req, res) {
    const appErr = error instanceof AppError ? error : AppError.internal('Unexpected error');
    const requestId = req.headers['x-request-id'] || '';
    const payload = {
        status: 'error',
        code: appErr.code,
        message: process.env.NODE_ENV === 'production' ? appErr.message : `${appErr.message}`,
        details: process.env.NODE_ENV === 'production' ? undefined : appErr.details,
        requestId,
        timestamp: new Date().toISOString()
    };
    logger_1.default.error('API error', { code: payload.code, requestId, message: appErr.message, details: appErr.details });
    res.statusCode = appErr.statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
}
function asyncHandler(handler) {
    return async (req, res) => {
        try {
            await handler(req, res);
        }
        catch (err) {
            errorHandler(err, req, res);
        }
    };
}

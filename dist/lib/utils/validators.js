"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.budgetSchema = exports.objectiveSchema = exports.industrySchema = exports.metaPageIdSchema = exports.metaPixelIdSchema = exports.metaAdAccountIdSchema = exports.emailSchema = exports.urlSchema = void 0;
exports.validateUrl = validateUrl;
exports.sanitizeUrl = sanitizeUrl;
exports.validateEmail = validateEmail;
exports.validateAndParse = validateAndParse;
exports.safeValidate = safeValidate;
const zod_1 = require("zod");
exports.urlSchema = zod_1.z.string().url({ message: 'Invalid URL' }).refine((u) => /^(https?:)\/\//.test(u), {
    message: 'URL must start with http or https'
});
function validateUrl(url) {
    return exports.urlSchema.safeParse(url).success;
}
function sanitizeUrl(url) {
    try {
        const u = new URL(url);
        // remove common tracking params
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((p) => u.searchParams.delete(p));
        u.hash = '';
        return u.toString();
    }
    catch {
        return url;
    }
}
exports.emailSchema = zod_1.z.string().email({ message: 'Invalid email address' });
function validateEmail(email) {
    return exports.emailSchema.safeParse(email).success;
}
exports.metaAdAccountIdSchema = zod_1.z.string().regex(/^act_\d{6,}$/, { message: 'Invalid Meta Ad Account ID (expected act_XXXXXXXXXX)' });
exports.metaPixelIdSchema = zod_1.z.string().regex(/^\d+$/, { message: 'Invalid Meta Pixel ID (numeric string expected)' });
exports.metaPageIdSchema = zod_1.z.string().regex(/^\d+$/, { message: 'Invalid Meta Page ID (numeric string expected)' });
exports.industrySchema = zod_1.z.enum(['ecommerce', 'saas', 'education', 'healthcare', 'finance', 'agency', 'other']);
exports.objectiveSchema = zod_1.z.enum(['OUTCOME_AWARENESS', 'OUTCOME_TRAFFIC', 'OUTCOME_SALES', 'OUTCOME_ENGAGEMENT', 'OUTCOME_LEADS']);
exports.budgetSchema = zod_1.z.number().min(1, { message: 'Budget must be at least 1' }).max(1000000, { message: 'Budget exceeds max allowed' });
function validateAndParse(schema, data) {
    return schema.parse(data);
}
function safeValidate(schema, data) {
    const res = schema.safeParse(data);
    if (res.success)
        return { success: true, data: res.data };
    return { success: false, errors: res.error.errors.map((e) => e.message) };
}

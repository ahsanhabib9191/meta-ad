"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const validators_1 = require("../lib/utils/validators");
dotenv_1.default.config();
async function run() {
    console.log('Testing validators...');
    // Test URL validation
    if (!(0, validators_1.validateUrl)('https://example.com'))
        throw new Error('Valid HTTPS URL failed validation');
    if (!(0, validators_1.validateUrl)('http://example.com'))
        throw new Error('Valid HTTP URL failed validation');
    if ((0, validators_1.validateUrl)('ftp://example.com'))
        throw new Error('FTP URL should not validate');
    if ((0, validators_1.validateUrl)('not-a-url'))
        throw new Error('Invalid URL should not validate');
    if ((0, validators_1.validateUrl)(''))
        throw new Error('Empty URL should not validate');
    // Test URL sanitization
    const dirtyUrl = 'https://example.com/page?utm_source=test&utm_campaign=fall&id=123#section';
    const clean = (0, validators_1.sanitizeUrl)(dirtyUrl);
    if (clean.includes('utm_source') || clean.includes('utm_campaign')) {
        throw new Error('UTM parameters should be removed from URL');
    }
    if (clean.includes('#section'))
        throw new Error('Hash should be removed from URL');
    if (!clean.includes('id=123'))
        throw new Error('Non-UTM parameters should be preserved');
    // Test email validation
    if (!(0, validators_1.validateEmail)('test@example.com'))
        throw new Error('Valid email failed validation');
    if (!(0, validators_1.validateEmail)('user+tag@domain.co.uk'))
        throw new Error('Email with + and subdomain failed');
    if ((0, validators_1.validateEmail)('invalid.email'))
        throw new Error('Invalid email should not validate');
    if ((0, validators_1.validateEmail)('@example.com'))
        throw new Error('Email without username should not validate');
    if ((0, validators_1.validateEmail)('user@'))
        throw new Error('Email without domain should not validate');
    // Test Meta ID schemas
    if (!validators_1.metaAdAccountIdSchema.safeParse('act_123456').success) {
        throw new Error('Valid Meta Ad Account ID failed validation');
    }
    if (!validators_1.metaAdAccountIdSchema.safeParse('act_1234567890').success) {
        throw new Error('Long Meta Ad Account ID failed validation');
    }
    if (validators_1.metaAdAccountIdSchema.safeParse('123456').success) {
        throw new Error('Ad Account ID without act_ prefix should not validate');
    }
    if (validators_1.metaAdAccountIdSchema.safeParse('act_123').success) {
        throw new Error('Ad Account ID with too few digits should not validate');
    }
    if (!validators_1.metaPixelIdSchema.safeParse('123456789').success) {
        throw new Error('Valid Meta Pixel ID failed validation');
    }
    if (validators_1.metaPixelIdSchema.safeParse('abc123').success) {
        throw new Error('Pixel ID with letters should not validate');
    }
    if (!validators_1.metaPageIdSchema.safeParse('987654321').success) {
        throw new Error('Valid Meta Page ID failed validation');
    }
    if (validators_1.metaPageIdSchema.safeParse('page_123').success) {
        throw new Error('Page ID with letters should not validate');
    }
    // Test enum schemas
    const validIndustries = ['ecommerce', 'saas', 'education', 'healthcare', 'finance', 'agency', 'other'];
    for (const industry of validIndustries) {
        if (!validators_1.industrySchema.safeParse(industry).success) {
            throw new Error(`Valid industry "${industry}" failed validation`);
        }
    }
    if (validators_1.industrySchema.safeParse('invalid-industry').success) {
        throw new Error('Invalid industry should not validate');
    }
    const validObjectives = ['OUTCOME_AWARENESS', 'OUTCOME_TRAFFIC', 'OUTCOME_SALES', 'OUTCOME_ENGAGEMENT', 'OUTCOME_LEADS'];
    for (const objective of validObjectives) {
        if (!validators_1.objectiveSchema.safeParse(objective).success) {
            throw new Error(`Valid objective "${objective}" failed validation`);
        }
    }
    if (validators_1.objectiveSchema.safeParse('INVALID_OBJECTIVE').success) {
        throw new Error('Invalid objective should not validate');
    }
    // Test budget schema
    if (!validators_1.budgetSchema.safeParse(100).success)
        throw new Error('Valid budget failed validation');
    if (!validators_1.budgetSchema.safeParse(1).success)
        throw new Error('Minimum budget (1) failed validation');
    if (!validators_1.budgetSchema.safeParse(1000000).success)
        throw new Error('Maximum budget failed validation');
    if (validators_1.budgetSchema.safeParse(0).success)
        throw new Error('Zero budget should not validate');
    if (validators_1.budgetSchema.safeParse(-100).success)
        throw new Error('Negative budget should not validate');
    if (validators_1.budgetSchema.safeParse(1000001).success)
        throw new Error('Budget exceeding max should not validate');
    // Test validateAndParse (should throw on invalid data)
    try {
        (0, validators_1.validateAndParse)(validators_1.emailSchema, 'invalid-email');
        throw new Error('validateAndParse should throw on invalid data');
    }
    catch (err) {
        if (!err.message.includes('Invalid')) {
            throw new Error('validateAndParse should throw Zod validation error');
        }
    }
    const validEmail = (0, validators_1.validateAndParse)(validators_1.emailSchema, 'test@example.com');
    if (validEmail !== 'test@example.com')
        throw new Error('validateAndParse should return parsed data');
    // Test safeValidate
    const invalidResult = (0, validators_1.safeValidate)(validators_1.emailSchema, 'bad-email');
    if (invalidResult.success)
        throw new Error('safeValidate should return success=false for invalid data');
    if (!invalidResult.errors || invalidResult.errors.length === 0) {
        throw new Error('safeValidate should return errors for invalid data');
    }
    const validResult = (0, validators_1.safeValidate)(validators_1.emailSchema, 'good@example.com');
    if (!validResult.success)
        throw new Error('safeValidate should return success=true for valid data');
    if (validResult.data !== 'good@example.com')
        throw new Error('safeValidate should return parsed data');
    // Test complex validation scenarios
    const complexUrl = 'https://sub.domain.example.com:8080/path/to/page?valid=param&utm_source=remove#hash';
    const sanitized = (0, validators_1.sanitizeUrl)(complexUrl);
    if (sanitized.includes('utm_'))
        throw new Error('Complex URL should have UTM params removed');
    if (sanitized.includes('#'))
        throw new Error('Complex URL should have hash removed');
    // Test edge cases
    try {
        (0, validators_1.sanitizeUrl)('not-a-valid-url-at-all');
        // Should return original if parsing fails
    }
    catch (err) {
        // This is acceptable behavior
    }
    console.log('✅ All validator tests passed');
}
run().catch((err) => {
    console.error('❌ Validator tests failed:', err.message);
    process.exit(1);
});

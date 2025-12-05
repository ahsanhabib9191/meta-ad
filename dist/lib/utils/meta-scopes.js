"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CREATIVE_SCOPES = exports.PIXEL_SCOPES = exports.INSIGHTS_SCOPES = exports.CAMPAIGN_MANAGEMENT_SCOPES = exports.META_ALL_SCOPES = exports.META_OPTIONAL_SCOPES = exports.META_REQUIRED_SCOPES = void 0;
exports.validateScopes = validateScopes;
exports.getScopeDescription = getScopeDescription;
exports.generateAuthUrl = generateAuthUrl;
exports.hasScope = hasScope;
// Meta API Scopes aligned with v21.0
exports.META_REQUIRED_SCOPES = [
    'ads_management',
    'ads_read',
    'business_management',
    'pages_read_engagement'
];
exports.META_OPTIONAL_SCOPES = [
    'instagram_basic',
    'instagram_content_publish',
    'leads_retrieval'
];
exports.META_ALL_SCOPES = [...exports.META_REQUIRED_SCOPES, ...exports.META_OPTIONAL_SCOPES];
exports.CAMPAIGN_MANAGEMENT_SCOPES = [
    'ads_management',
    'business_management'
];
exports.INSIGHTS_SCOPES = [
    'ads_read',
    'pages_read_engagement'
];
exports.PIXEL_SCOPES = [
    'business_management'
];
exports.CREATIVE_SCOPES = [
    'ads_management'
];
function validateScopes(grantedScopes) {
    const missing = exports.META_REQUIRED_SCOPES.filter((s) => !grantedScopes.includes(s));
    return { valid: missing.length === 0, missing };
}
function getScopeDescription(scope) {
    const desc = {
        ads_management: 'Create and manage ads and campaigns',
        ads_read: 'Read ads performance and insights',
        business_management: 'Manage business assets and permissions',
        pages_read_engagement: 'Read engagement metrics for pages',
        instagram_basic: 'Read basic Instagram account info',
        instagram_content_publish: 'Publish content to Instagram',
        leads_retrieval: 'Retrieve leads generated from ads'
    };
    return desc[scope] || 'Unknown scope';
}
function generateAuthUrl(appId, redirectUri, state) {
    const scopes = exports.META_ALL_SCOPES.join(',');
    const base = 'https://www.facebook.com/v21.0/dialog/oauth';
    const params = new URLSearchParams({ client_id: appId, redirect_uri: redirectUri, state, scope: scopes });
    return `${base}?${params.toString()}`;
}
function hasScope(grantedScopes, requiredScope) {
    return grantedScopes.includes(requiredScope);
}

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureConnectionAccessToken = ensureConnectionAccessToken;
exports.fetchGraphEdges = fetchGraphEdges;
exports.fetchGraphNode = fetchGraphNode;
exports.buildGraphEdgeParams = buildGraphEdgeParams;
const MetaConnection_1 = require("../../db/models/MetaConnection");
const logger_1 = __importDefault(require("../../utils/logger"));
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v17.0';
const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;
if (!META_APP_ID || !META_APP_SECRET) {
    logger_1.default.warn('META_APP_ID or META_APP_SECRET is not configured. Meta Graph sync will fail until both are provided.');
}
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // refresh 5 minutes before expiry
function buildUrl(path, params) {
    const url = new URL(`${GRAPH_BASE_URL}/${path}`);
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });
    }
    return url;
}
async function fetchJson(url, accessToken) {
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    const payload = (await response.json());
    if (!response.ok || (payload && payload.error)) {
        const error = payload.error;
        const message = error
            ? `${error.code} ${error.message}`
            : `Meta Graph returned HTTP ${response.status}`;
        throw new Error(message);
    }
    return payload;
}
async function refreshAccessToken(connection) {
    if (!META_APP_ID || !META_APP_SECRET) {
        throw new Error('META_APP_ID and META_APP_SECRET must be defined to refresh tokens.');
    }
    const refreshToken = connection.getRefreshToken();
    if (!refreshToken) {
        throw new Error('Cannot refresh Meta token because refreshToken is missing.');
    }
    const refreshUrl = new URL('https://graph.facebook.com/oauth/access_token');
    refreshUrl.searchParams.set('grant_type', 'fb_exchange_token');
    refreshUrl.searchParams.set('client_id', META_APP_ID);
    refreshUrl.searchParams.set('client_secret', META_APP_SECRET);
    refreshUrl.searchParams.set('fb_exchange_token', refreshToken);
    const refreshResponse = await fetch(refreshUrl.toString());
    const refreshPayload = (await refreshResponse.json());
    if (!refreshResponse.ok || refreshPayload?.error) {
        const error = refreshPayload?.error;
        const message = error ? `${error.code} ${error.message}` : 'Failed to refresh Meta token';
        throw new Error(message);
    }
    const data = refreshPayload;
    const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : undefined;
    const updated = await MetaConnection_1.MetaConnection.updateTokens(connection.tenantId, connection.adAccountId, {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        tokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
        status: 'ACTIVE',
    });
    if (!updated) {
        throw new Error('Failed to update MetaConnection after refreshing tokens.');
    }
    return updated;
}
async function ensureConnectionAccessToken(connection) {
    const needsRefresh = connection.tokenExpiresAt && connection.tokenExpiresAt.getTime() - Date.now() < TOKEN_REFRESH_THRESHOLD_MS;
    if (needsRefresh) {
        const refreshed = await refreshAccessToken(connection);
        return { connection: refreshed, accessToken: refreshed.getAccessToken() };
    }
    return { connection, accessToken: connection.getAccessToken() };
}
async function fetchGraphEdges(accessToken, path, params, maxResults) {
    const results = [];
    let nextUrl = buildUrl(path, params).toString();
    const limit = maxResults || 10000; // Default limit to prevent unbounded memory growth
    while (nextUrl && results.length < limit) {
        const payload = await fetchJson(nextUrl, accessToken);
        if (payload?.data) {
            // Only add items up to the limit
            const remainingSpace = limit - results.length;
            const itemsToAdd = payload.data.slice(0, remainingSpace);
            results.push(...itemsToAdd);
            // Stop if we've reached the limit
            if (results.length >= limit) {
                logger_1.default.warn('fetchGraphEdges reached max results limit', {
                    path,
                    limit,
                    actualCount: results.length
                });
                break;
            }
        }
        nextUrl = payload?.paging?.next || '';
    }
    return results;
}
async function fetchGraphNode(accessToken, path, params) {
    const url = buildUrl(path, params).toString();
    return fetchJson(url, accessToken);
}
function buildGraphEdgeParams(fields, limit = 100) {
    return {
        fields: fields.join(','),
        limit: limit.toString(),
    };
}

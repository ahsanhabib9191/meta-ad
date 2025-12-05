import { MetaConnection, IMetaConnection } from '../../db/models/MetaConnection';
import logger from '../../utils/logger';

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v17.0';
const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

if (!META_APP_ID || !META_APP_SECRET) {
  logger.warn(
    'META_APP_ID or META_APP_SECRET is not configured. Meta Graph sync will fail until both are provided.'
  );
}

const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // refresh 5 minutes before expiry

interface GraphError {
  code: number;
  message: string;
  error_subcode?: number;
  fbtrace_id?: string;
}

interface GraphResponse<T> {
  data: T[];
  paging?: { next?: string };
  error?: GraphError;
}

function buildUrl(path: string, params?: Record<string, string>): URL {
  const url = new URL(`${GRAPH_BASE_URL}/${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return url;
}

async function fetchJson<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json()) as T & { error?: GraphError };

  if (!response.ok || (payload && (payload as any).error)) {
    const error = (payload as any).error;
    const message = error
      ? `${error.code} ${error.message}`
      : `Meta Graph returned HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

async function refreshAccessToken(connection: IMetaConnection): Promise<IMetaConnection> {
  if (!META_APP_ID || !META_APP_SECRET) {
    throw new Error('META_APP_ID and META_APP_SECRET must be defined to refresh tokens.');
  }

  const refreshToken = connection.getRefreshToken();

  if (!refreshToken) {
    throw new Error('Cannot refresh Meta token because refreshToken is missing.');
  }

  const refreshUrl = new URL('https://graph.facebook.com/oauth/access_token');
  refreshUrl.searchParams.set('grant_type', 'fb_exchange_token');
  refreshUrl.searchParams.set('client_id', META_APP_ID!);
  refreshUrl.searchParams.set('client_secret', META_APP_SECRET!);
  refreshUrl.searchParams.set('fb_exchange_token', refreshToken);

  const refreshResponse = await fetch(refreshUrl.toString());
  const refreshPayload = (await refreshResponse.json()) as Record<string, any> & { error?: GraphError };

  if (!refreshResponse.ok || refreshPayload?.error) {
    const error = refreshPayload?.error;
    const message = error ? `${error.code} ${error.message}` : 'Failed to refresh Meta token';
    throw new Error(message);
  }

  const data = refreshPayload;

  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : undefined;
  const updated = await MetaConnection.updateTokens(connection.tenantId, connection.adAccountId, {
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

export async function ensureConnectionAccessToken(
  connection: IMetaConnection
): Promise<{ connection: IMetaConnection; accessToken: string }> {
  const needsRefresh =
    connection.tokenExpiresAt && connection.tokenExpiresAt.getTime() - Date.now() < TOKEN_REFRESH_THRESHOLD_MS;

  if (needsRefresh) {
    const refreshed = await refreshAccessToken(connection);
    return { connection: refreshed, accessToken: refreshed.getAccessToken() };
  }

  return { connection, accessToken: connection.getAccessToken() };
}

export async function fetchGraphEdges<T>(
  accessToken: string,
  path: string,
  params?: Record<string, string>
): Promise<T[]> {
  const results: T[] = [];
  let nextUrl = buildUrl(path, params).toString();

  while (nextUrl) {
    const payload = await fetchJson<GraphResponse<T>>(nextUrl, accessToken);
    if (payload?.data) {
      results.push(...payload.data);
    }

    nextUrl = payload?.paging?.next || '';
  }

  return results;
}

export async function fetchGraphNode<T>(
  accessToken: string,
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = buildUrl(path, params).toString();
  return fetchJson<T>(url, accessToken);
}

export function buildGraphEdgeParams(fields: string[], limit = 100): Record<string, string> {
  return {
    fields: fields.join(','),
    limit: limit.toString(),
  };
}

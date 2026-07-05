'use strict';

function parseServiceAccountJson() {
  const raw = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON is not valid JSON');
  }
}

module.exports = {
  rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || null,
  serviceAccount: parseServiceAccountJson(),
  useLocalFallback: process.env.GOOGLE_DRIVE_USE_LOCAL_FALLBACK === 'true'
    || (!process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID && process.env.NODE_ENV !== 'production'),
  isConfigured() {
    return Boolean(this.rootFolderId && this.serviceAccount);
  },
};

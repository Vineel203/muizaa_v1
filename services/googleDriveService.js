'use strict';

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const driveConfig = require('../config/googleDrive');
const documentConfig = require('../config/documents');
const logger = require('../utils/logger');

class GoogleDriveService {
  constructor() {
    this.rootFolderId = driveConfig.rootFolderId;
    this.gdmFolderId = null;
    this.drive = null;

    if (driveConfig.isConfigured()) {
      const auth = new google.auth.GoogleAuth({
        credentials: driveConfig.serviceAccount,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });
      this.drive = google.drive({ version: 'v3', auth });
    }
  }

  canUpload() {
    return Boolean(this.drive && this.rootFolderId);
  }

  async ensureGdmFolder() {
    if (this.gdmFolderId) return this.gdmFolderId;

    const folderName = documentConfig.gdmFolderName;
    const query = [
      `'${this.rootFolderId}' in parents`,
      `name = '${folderName}'`,
      "mimeType = 'application/vnd.google-apps.folder'",
      'trashed = false',
    ].join(' and ');

    const existing = await this.drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (existing.data.files?.length) {
      this.gdmFolderId = existing.data.files[0].id;
      return this.gdmFolderId;
    }

    const created = await this.drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [this.rootFolderId],
      },
      fields: 'id',
      supportsAllDrives: true,
    });

    this.gdmFolderId = created.data.id;
    return this.gdmFolderId;
  }

  async uploadPdf({ buffer, fileName, mimeType = 'application/pdf' }) {
    if (!this.canUpload()) {
      throw new Error('Google Drive is not configured');
    }

    const folderId = await this.ensureGdmFolder();

    const response = await this.drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: Buffer.isBuffer(buffer) ? require('stream').Readable.from(buffer) : buffer,
      },
      fields: 'id, webViewLink, webContentLink',
      supportsAllDrives: true,
    });

    return {
      fileId: response.data.id,
      url: response.data.webViewLink || response.data.webContentLink,
    };
  }

  async downloadFile(fileId) {
    if (!this.canUpload()) {
      throw new Error('Google Drive is not configured');
    }

    const response = await this.drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );

    return Buffer.from(response.data);
  }

  saveLocalFallback({ buffer, fileName }) {
    const dir = documentConfig.localStorageDir;
    fs.mkdirSync(dir, { recursive: true });
    const uniqueFileName = this.resolveUniqueFileName(dir, fileName);
    const filePath = path.join(dir, uniqueFileName);
    fs.writeFileSync(filePath, buffer);
    return { filePath, fileName: uniqueFileName };
  }

  resolveUniqueFileName(dir, desiredFileName) {
    const ext = path.extname(desiredFileName);
    const base = path.basename(desiredFileName, ext);
    let candidate = desiredFileName;

    if (!fs.existsSync(path.join(dir, candidate))) {
      return candidate;
    }

    let suffix = 1;
    while (fs.existsSync(path.join(dir, `${base}_${suffix}${ext}`))) {
      suffix += 1;
    }
    return `${base}_${suffix}${ext}`;
  }

  readLocalFallback(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error('Local PDF file not found');
    }
    return fs.readFileSync(filePath);
  }

  shouldUseLocalFallback() {
    return driveConfig.useLocalFallback && !this.canUpload();
  }
}

module.exports = GoogleDriveService;

'use strict';

const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const documentConfig = require('../config/documents');
const logger = require('../utils/logger');

const IMAGE_MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

class DocumentTemplateService {
  constructor() {
    this.templatesDir = documentConfig.templatesDir;
    this.templateImagesDir = documentConfig.templateImagesDir;
  }

  resolveImageDataUri(relativePath) {
    const fileName = relativePath.replace(/^images\//, '');
    const absolute = path.resolve(this.templateImagesDir, fileName);

    if (!fs.existsSync(absolute)) {
      logger.warn('Template image not found', { path: absolute });
      return null;
    }

    const ext = path.extname(absolute).slice(1).toLowerCase();
    const mime = IMAGE_MIME[ext] || 'image/png';
    const data = fs.readFileSync(absolute).toString('base64');
    return `data:${mime};base64,${data}`;
  }

  buildTemplateImages() {
    return {
      logoRight: this.resolveImageDataUri('logo-right.png'),
      companySignature: this.resolveImageDataUri('company-signature.png'),
    };
  }

  async render(templateName, data) {
    const templatePath = path.join(this.templatesDir, `${templateName}.ejs`);
    const templateData = {
      ...data,
      images: this.buildTemplateImages(),
    };

    try {
      return await ejs.renderFile(templatePath, templateData, {
        root: this.templatesDir,
      });
    } catch (error) {
      logger.error('Template render failed', {
        template: templateName,
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

module.exports = DocumentTemplateService;

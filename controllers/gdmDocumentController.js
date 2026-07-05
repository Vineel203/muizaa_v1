'use strict';

const { getContainer } = require('../config/container');
const { isReadOnlyStage } = require('../utils/helpers');
const logger = require('../utils/logger');

class GdmDocumentController {
  constructor() {
    const { gdmDocumentService, bookingService } = getContainer().services;
    this.gdmDocumentService = gdmDocumentService;
    this.bookingService = bookingService;
  }

  async generateForm(req, res, next) {
    try {
      const { booking, formDefaults, packageNameOptions } = await this.gdmDocumentService
        .getGenerationContext(req.params.id);

      res.render('bookings/gdm-generate', {
        title: `Generate GDM — ${booking.bookingId || `Parking Lot #${booking.id}`}`,
        booking,
        formDefaults,
        packageNameOptions,
        readOnly: isReadOnlyStage(booking.stage),
      });
    } catch (error) {
      next(error);
    }
  }

  async assignGdmNumber(req, res, next) {
    try {
      const result = await this.gdmDocumentService.assignGdmNumber(req.params.id, req.user);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('Assign GDM number failed', { message: error.message });
      res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async generatePdf(req, res, next) {
    const wantsPdf = req.headers.accept?.includes('application/pdf');

    try {
      const { pdfBuffer, fileName, document } = await this.gdmDocumentService.generatePdf(
        req.params.id,
        req.body,
        req.user
      );

      if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length < 5 || pdfBuffer.toString('utf8', 0, 4) !== '%PDF') {
        throw new Error('Generated file is not a valid PDF');
      }

      res.status(200);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('X-Gdm-Document-Id', String(document.id));
      return res.end(pdfBuffer);
    } catch (error) {
      logger.error('GDM PDF generation failed', {
        bookingId: req.params.id,
        message: error.message,
        stack: error.stack,
      });

      if (wantsPdf || req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(error.statusCode || 500).json({
          success: false,
          message: error.message,
        });
      }

      req.session.flash = { type: 'danger', message: error.message };
      return res.redirect(`/bookings/${req.params.id}/gdm/generate`);
    }
  }

  async download(req, res, next) {
    try {
      const { document, buffer } = await this.gdmDocumentService.getDocumentFile(
        req.params.id,
        req.params.documentId
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${document.driveFileName}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    } catch (error) {
      next(error);
    }
  }

  async view(req, res, next) {
    try {
      const { document, buffer } = await this.gdmDocumentService.getDocumentFile(
        req.params.id,
        req.params.documentId
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${document.driveFileName}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = GdmDocumentController;

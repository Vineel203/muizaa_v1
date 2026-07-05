'use strict';

const { withTransaction } = require('../utils/db');
const {
  sanitizeString,
  toNumber,
  ensureArray,
  formatDate,
} = require('../utils/helpers');
const documentConfig = require('../config/documents');
const { NotFoundError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

const PACKAGE_NAME_OPTIONS = documentConfig.packageNameOptions;
const GDM_DEFAULTS = documentConfig.gdmDefaults;

function formatArticles(packages, packageName) {
  const count = packages != null && packages !== '' ? packages : null;
  const unit = sanitizeString(packageName);
  if (count == null && !unit) return '—';
  if (count == null) return unit;
  if (!unit) return String(count);
  return `${count} ${unit}`;
}

function formatWeight(weightKgs) {
  if (weightKgs == null || weightKgs === '') return '—';
  const num = Number(weightKgs);
  if (Number.isNaN(num)) return '—';
  return `${num.toLocaleString('en-IN')} Kg`;
}

function formatRatePerMt(value) {
  const str = sanitizeString(value);
  if (!str) return '';
  if (str.startsWith('₹')) return str;
  const num = Number(str);
  if (!Number.isNaN(num)) return `₹${num.toLocaleString('en-IN')}`;
  return str;
}

function displayValue(value, fallback = '—') {
  const str = sanitizeString(value);
  return str || fallback;
}

class GdmDocumentService {
  constructor({
    bookingRepository,
    gdmDocumentRepository,
    documentSequenceRepository,
    bookingService,
    documentTemplateService,
    pdfService,
    googleDriveService,
    historyService,
  }) {
    this.bookingRepository = bookingRepository;
    this.gdmDocumentRepository = gdmDocumentRepository;
    this.documentSequenceRepository = documentSequenceRepository;
    this.bookingService = bookingService;
    this.documentTemplateService = documentTemplateService;
    this.pdfService = pdfService;
    this.googleDriveService = googleDriveService;
    this.historyService = historyService;
  }

  async getGenerationContext(bookingId) {
    const booking = await this.bookingService.getById(bookingId);
    const documents = await this.gdmDocumentRepository.findByBookingId(bookingId);
    return {
      booking,
      documents,
      formDefaults: this.buildFormDefaults(booking),
      packageNameOptions: PACKAGE_NAME_OPTIONS,
    };
  }

  buildFormDefaults(booking) {
    const goodsItems = (booking.goodsItems || []).map((item) => ({
      description: item.description || '',
      packages: item.packages ?? '',
      packageName: item.packageName || 'Bags',
      weightKgs: item.weightKgs ?? '',
      ratePerMt: GDM_DEFAULTS.ratePerMt,
      totalFreight: GDM_DEFAULTS.totalFreight,
      freightPaid: GDM_DEFAULTS.freightPaid,
      freightPayable: GDM_DEFAULTS.freightPayable,
    }));

    if (!goodsItems.length) {
      goodsItems.push({
        description: '',
        packages: '',
        packageName: 'Bags',
        weightKgs: '',
        ...GDM_DEFAULTS,
      });
    }

    return {
      gdmNumber: booking.gdmNumber || '',
      invoiceNumber: '',
      bookingId: booking.bookingId || '',
      stage: booking.stage,
      serialNumber: booking.serialNumber || '',
      truckNumber: booking.truckNumber || '',
      truckCapacity: booking.truckCapacity ?? '',
      driverName: booking.driverName || '',
      driverNumber: booking.driverNumber || '',
      truckOwnerName: booking.truckOwnerName || '',
      truckOwnerNumber: booking.truckOwnerNumber || '',
      transporterName: booking.transporterName || '',
      transporterPhone: booking.transporterPhoneNumber || '',
      goodsRemark: booking.goodsRemark || '',
      pickups: (booking.pickups || []).map((p) => ({
        fromLocation: p.locationName || '',
        consignor: p.consignorName || '',
      })),
      deliveries: (booking.deliveries || []).map((d) => ({
        toLocation: d.locationName || '',
        consignee: d.consigneeName || '',
      })),
      goodsItems,
      commission: booking.commission ?? '',
      localDriverCharges: booking.localDriverCharges ?? '',
      roughBalance: booking.roughBalance ?? '',
      gumastaCharges: booking.gumastaCharges ?? '',
      weightKattaCharges: booking.weightKattaCharges ?? '',
      lorryFreightPaid: booking.lorryFreightPaid ?? '',
      companyUnload: booking.companyUnload || '',
      totalCompanyFreight: booking.totalCompanyFreight ?? '',
      totalAdvance: booking.totalAdvance ?? '',
      totalLoadingHamali: booking.totalLoadingHamali ?? '',
      totalUnloadingHamali: booking.totalUnloadingHamali ?? '',
      totalBalance: booking.totalBalance ?? '',
      financeRemark: booking.financeRemark || '',
    };
  }

  parseFormInput(body) {
    const pickups = ensureArray(body.pickups).map((row) => ({
      consignorName: sanitizeString(row?.consignor || row?.consignorName) || '',
      locationName: sanitizeString(row?.fromLocation || row?.locationName) || '',
    })).filter((row) => row.consignorName || row.locationName);

    const deliveries = ensureArray(body.deliveries).map((row) => ({
      consigneeName: sanitizeString(row?.consignee || row?.consigneeName) || '',
      locationName: sanitizeString(row?.toLocation || row?.locationName) || '',
    })).filter((row) => row.consigneeName || row.locationName);

    const goodsItems = ensureArray(body.goodsItems).map((row) => ({
      description: sanitizeString(row?.description) || '',
      packages: toNumber(row?.packages) != null ? Math.round(toNumber(row.packages)) : null,
      packageName: sanitizeString(row?.packageName) || 'Bags',
      weightKgs: toNumber(row?.weightKgs ?? row?.weight),
      ratePerMt: sanitizeString(row?.ratePerMt) ?? GDM_DEFAULTS.ratePerMt,
      totalFreight: sanitizeString(row?.totalFreight) ?? GDM_DEFAULTS.totalFreight,
      freightPaid: sanitizeString(row?.freightPaid) ?? GDM_DEFAULTS.freightPaid,
      freightPayable: sanitizeString(row?.freightPayable) ?? GDM_DEFAULTS.freightPayable,
    })).filter((row) => {
      return row.description || row.packages != null || row.weightKgs != null
        || row.ratePerMt || row.totalFreight !== GDM_DEFAULTS.totalFreight
        || row.freightPaid !== GDM_DEFAULTS.freightPaid
        || row.freightPayable !== GDM_DEFAULTS.freightPayable;
    });

    if (!goodsItems.length) {
      throw new ValidationError('At least one goods item is required for GDM generation');
    }

    const gdmNumber = sanitizeString(body.gdmNumber);
    if (!gdmNumber) {
      throw new ValidationError('GDM Number is required. Enter one or click Generate.');
    }

    return {
      gdmNumber,
      invoiceNumber: sanitizeString(body.invoiceNumber),
      bookingId: sanitizeString(body.bookingId),
      truckNumber: sanitizeString(body.truckNumber),
      driverName: sanitizeString(body.driverName),
      driverNumber: sanitizeString(body.driverNumber),
      truckOwnerName: sanitizeString(body.truckOwnerName),
      truckOwnerNumber: sanitizeString(body.truckOwnerNumber),
      transporterName: sanitizeString(body.transporterName),
      transporterPhone: sanitizeString(body.transporterPhone),
      goodsRemark: sanitizeString(body.goodsRemark),
      pickups,
      deliveries,
      goodsItems,
    };
  }

  resolveDensityClass(documentData, goodsRows) {
    const consignors = documentData.pickups.length
      ? documentData.pickups
      : [{ consignorName: '—', locationName: '' }];
    const consignees = documentData.deliveries.length
      ? documentData.deliveries
      : [{ consigneeName: '—', locationName: '' }];
    const partyRows = Math.max(consignors.length, consignees.length);
    const goodsCount = goodsRows.length;
    const textLength = goodsRows.reduce((sum, row) => {
      return sum + (row.description || '').length + (row.articles || '').length;
    }, 0);
    const partyTextLength = [...consignors, ...consignees].reduce((sum, row) => {
      const name = row.consignorName || row.consigneeName || '';
      return sum + name.length + (row.locationName || '').length;
    }, 0);

    const score = goodsCount + partyRows + Math.ceil((textLength + partyTextLength) / 50);

    if (score >= 22) return 'density-xs';
    if (score >= 16) return 'density-dense';
    if (score >= 10) return 'density-compact';
    return 'density-normal';
  }

  resolveFillClass(documentData, goodsRows) {
    const partyRows = Math.max(
      documentData.pickups.length || 1,
      documentData.deliveries.length || 1
    );
    const goodsCount = goodsRows.length;
    const score = goodsCount + partyRows;

    if (score <= 4) return 'fill-spacious';
    if (score <= 7) return 'fill-comfortable';
    return 'fill-normal';
  }

  padGoodsRows(goodsRows) {
    return goodsRows.map((row) => ({ ...row, isFiller: false }));
  }

  padPartyRows(parties) {
    return parties.map((row) => ({ ...row, isFiller: false }));
  }

  formatPartyList(parties, nameKey) {
    if (!parties || !parties.length) return '—';
    return parties
      .map((p) => {
        const name = p[nameKey] || '';
        const loc = p.locationName || '';
        return loc ? `${name} (${loc})` : name;
      })
      .filter(Boolean)
      .join('; ') || '—';
  }

  formatLocationList(parties, nameKey) {
    if (!parties || !parties.length) return '—';
    const locations = parties
      .map((p) => p.locationName || p[nameKey] || '')
      .filter(Boolean);
    return locations.length ? locations.join('; ') : '—';
  }

  buildTemplateData(documentData, generatedAt) {
    const goodsRows = documentData.goodsItems.map((item) => ({
      articles: formatArticles(item.packages, item.packageName),
      description: displayValue(item.description, ''),
      weight: formatWeight(item.weightKgs),
      ratePerMt: formatRatePerMt(item.ratePerMt),
      totalFreight: displayValue(item.totalFreight, '-'),
      freightPaid: displayValue(item.freightPaid, '-'),
      freightPayable: displayValue(item.freightPayable, 'TO BE BILLED'),
    }));

    const consignors = documentData.pickups.length
      ? documentData.pickups
      : [{ consignorName: '—', locationName: '' }];
    const consignees = documentData.deliveries.length
      ? documentData.deliveries
      : [{ consigneeName: '—', locationName: '' }];

    const densityClass = this.resolveDensityClass(documentData, goodsRows);
    const fillClass = this.resolveFillClass(documentData, goodsRows);

    return {
      gdmNumber: documentData.gdmNumber || '—',
      bookingId: documentData.bookingId || '—',
      generatedDate: formatDate(generatedAt),
      truckNumber: documentData.truckNumber || '—',
      invoiceNumber: documentData.invoiceNumber || '',
      driverName: documentData.driverName || '—',
      driverNumber: documentData.driverNumber || '—',
      truckOwnerName: documentData.truckOwnerName || '—',
      truckOwnerNumber: documentData.truckOwnerNumber || '—',
      transporterName: documentData.transporterName || '—',
      transporterPhone: documentData.transporterPhone || '—',
      goodsRemark: documentData.goodsRemark || '',
      fromLocations: this.formatLocationList(consignors, 'consignorName'),
      toLocations: this.formatLocationList(consignees, 'consigneeName'),
      consignorsText: this.formatPartyList(consignors, 'consignorName'),
      consigneesText: this.formatPartyList(consignees, 'consigneeName'),
      consignors: this.padPartyRows(consignors),
      consignees: this.padPartyRows(consignees),
      goodsRows: this.padGoodsRows(goodsRows),
      goodsRowCount: Math.max(goodsRows.length, 1),
      // Minimum rows the goods table reserves space for so short memos still
      // look balanced. Extra items flow past this and, if needed, onto page 2.
      goodsMinRows: 6,
      partySlotCount: 3,
      densityClass,
      fillClass,
    };
  }

  resolvePdfBaseName(bookingId, gdmNumber, bookingInternalId) {
    if (bookingId) return bookingId.replace(/[^\w.-]/g, '_');
    if (gdmNumber) return gdmNumber.replace(/[^\w.-]/g, '_');
    return `PL${bookingInternalId}`;
  }

  resolvePdfFileName(baseName, existingCount) {
    if (existingCount <= 0) return `${baseName}.pdf`;
    return `${baseName}_${existingCount}.pdf`;
  }

  async persistGdmNumberIfNew(bookingId, gdmNumber, user, booking) {
    if (!gdmNumber || booking.gdmNumber) return;

    return withTransaction(async (client) => {
      const existing = await this.bookingRepository.findById(bookingId, client);
      if (existing.gdmNumber) return;

      await this.bookingRepository.update(
        bookingId,
        {
          gdm_number: gdmNumber,
          updated_by: user.email,
          updated_at: new Date(),
        },
        client
      );

      await this.historyService.recordFieldChanges(
        {
          bookingId,
          changedBy: user.email,
          changes: [{
            field: 'gdm_number',
            label: 'GDM Number',
            oldValue: '',
            newValue: gdmNumber,
          }],
          remark: 'GDM number assigned during document generation',
        },
        client
      );
    });
  }

  async ensureGdmNumber(bookingId, user) {
    const booking = await this.bookingService.getById(bookingId);

    if (booking.gdmNumber) {
      return booking.gdmNumber;
    }

    return withTransaction(async (client) => {
      const gdmNumber = await this.documentSequenceRepository.getNextNumber('GDM', client);

      await this.bookingRepository.update(
        bookingId,
        {
          gdm_number: gdmNumber,
          updated_by: user.email,
          updated_at: new Date(),
        },
        client
      );

      await this.historyService.recordFieldChanges(
        {
          bookingId,
          changedBy: user.email,
          changes: [{
            field: 'gdm_number',
            label: 'GDM Number',
            oldValue: '',
            newValue: gdmNumber,
          }],
          remark: 'GDM number assigned for document generation',
        },
        client
      );

      return gdmNumber;
    });
  }

  async assignGdmNumber(bookingId, user) {
    const booking = await this.bookingService.getById(bookingId);

    if (booking.gdmNumber) {
      const gdmNumber = await this.documentSequenceRepository.getNextNumber('GDM');
      return { gdmNumber, created: false, documentOnly: true };
    }

    const gdmNumber = await this.ensureGdmNumber(bookingId, user);
    return { gdmNumber, created: true, documentOnly: false };
  }

  async generatePdf(bookingId, formInput, user) {
    const booking = await this.bookingService.getById(bookingId);
    const documentData = this.parseFormInput(formInput);

    if (!booking.gdmNumber) {
      await this.persistGdmNumberIfNew(bookingId, documentData.gdmNumber, user, booking);
    }

    const generatedAt = new Date();
    const templateData = this.buildTemplateData(documentData, generatedAt);
    const html = await this.documentTemplateService.render('GDM', templateData);
    const pdfBuffer = await this.pdfService.generateFromHtml(html, {
      format: documentConfig.gdmPageFormat,
    });

    const existingCount = await this.gdmDocumentRepository.countByBookingId(bookingId);
    const baseName = this.resolvePdfBaseName(
      documentData.bookingId || booking.bookingId,
      documentData.gdmNumber,
      booking.id
    );
    let fileName = this.resolvePdfFileName(baseName, existingCount);

    let driveFileId = null;
    let driveUrl = null;
    let localFilePath = null;

    if (this.googleDriveService.canUpload()) {
      try {
        const upload = await this.googleDriveService.uploadPdf({
          buffer: pdfBuffer,
          fileName,
        });
        driveFileId = upload.fileId;
        driveUrl = upload.url;
      } catch (error) {
        logger.error('Google Drive upload failed', { message: error.message, bookingId });
        if (!this.googleDriveService.shouldUseLocalFallback()) {
          throw new Error(`Google Drive upload failed: ${error.message}`);
        }
      }
    }

    if (!driveFileId && this.googleDriveService.shouldUseLocalFallback()) {
      const saved = this.googleDriveService.saveLocalFallback({
        buffer: pdfBuffer,
        fileName,
      });
      localFilePath = saved.filePath;
      fileName = saved.fileName;
    } else if (!driveFileId) {
      throw new Error('Google Drive is not configured. Set GOOGLE_DRIVE_ROOT_FOLDER_ID and GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON.');
    }

    const record = await this.gdmDocumentRepository.create({
      bookingId,
      gdmNumber: documentData.gdmNumber,
      invoiceNumber: documentData.invoiceNumber,
      generatedAt,
      generatedBy: user.email,
      driveFileId,
      driveUrl,
      driveFileName: fileName,
      localFilePath,
      documentData: {
        ...documentData,
        generatedAt: generatedAt.toISOString(),
      },
    });

    return {
      document: record,
      pdfBuffer,
      fileName,
    };
  }

  async listByBookingId(bookingId) {
    return this.gdmDocumentRepository.findByBookingId(bookingId);
  }

  async getDocumentFile(bookingId, documentId) {
    const document = await this.gdmDocumentRepository.findByIdForBooking(documentId, bookingId);
    if (!document) throw new NotFoundError('GDM document not found');

    if (document.localFilePath) {
      return {
        document,
        buffer: this.googleDriveService.readLocalFallback(document.localFilePath),
      };
    }

    if (document.driveFileId) {
      const buffer = await this.googleDriveService.downloadFile(document.driveFileId);
      return { document, buffer };
    }

    throw new NotFoundError('GDM document file is not available');
  }
}

module.exports = GdmDocumentService;

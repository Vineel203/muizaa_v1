'use strict';

const { withTransaction } = require('../utils/db');
const {
  STAGES,
  VALID_TRANSITIONS,
  STAGE_LABELS,
} = require('../config/permissions');
const {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} = require('../utils/errors');
const {
  sanitizeString,
  toNumber,
  toBoolean,
  isReadOnlyStage,
  ensureArray,
  parseBookingId,
} = require('../utils/helpers');

const FIELD_MAP = {
  goodsRemark: 'goods_remark',
  unloadQuantity: 'unload_quantity',
  unloadedWeightKgs: 'unloaded_weight_kgs',
  managementRemark: 'management_remark',
  serialNumber: 'serial_number',
  companyUnload: 'company_unload',
  commission: 'commission',
  localDriverCharges: 'local_driver_charges',
  roughBalance: 'rough_balance',
  gumastaCharges: 'gumasta_charges',
  weightKattaCharges: 'weight_katta_charges',
  lorryFreightPaid: 'lorry_freight_paid',
  financeRemark: 'finance_remark',
  financeEditedFlag: 'finance_edited_flag',
  isFinanceComplete: 'is_finance_complete',
  isUnloadComplete: 'is_unload_complete',
};

const FIELD_LABELS = {
  booking_id: 'Booking ID',
  gdm_number: 'GDM Number',
  goods_remark: 'Goods Remark',
  unload_quantity: 'Unload Quantity',
  unloaded_weight_kgs: 'Unloaded Weight (Kgs)',
  management_remark: 'Management Remark',
  serial_number: 'Serial Number',
  company_unload: 'Company Unload',
  commission: 'Commission',
  local_driver_charges: 'Local Driver Charges',
  rough_balance: 'Rough Balance',
  gumasta_charges: 'Gumasta Charges',
  weight_katta_charges: 'Weight Katta Charges',
  lorry_freight_paid: 'Lorry Freight Paid',
  finance_remark: 'Finance Remark',
  finance_edited_flag: 'Finance Edited',
  is_finance_complete: 'Finance Complete',
  is_unload_complete: 'Unload Complete',
  transporter_id: 'Transporter',
  driver_id: 'Driver',
  truck_id: 'Truck',
  truck_owner_id: 'Truck Owner',
  banking_detail_id: 'Banking Detail',
  pickups: 'Pickup Points',
  deliveries: 'Delivery Points',
  goods_items: 'Goods Items',
};

class BookingService {
  constructor({
    bookingRepository,
    bookingPickupRepository,
    bookingDeliveryRepository,
    bookingGoodsItemRepository,
    documentSequenceRepository,
    invoiceRepository,
    masterDataService,
    historyService,
  }) {
    this.bookingRepository = bookingRepository;
    this.bookingPickupRepository = bookingPickupRepository;
    this.bookingDeliveryRepository = bookingDeliveryRepository;
    this.bookingGoodsItemRepository = bookingGoodsItemRepository;
    this.documentSequenceRepository = documentSequenceRepository;
    this.invoiceRepository = invoiceRepository;
    this.masterDataService = masterDataService;
    this.historyService = historyService;
  }

  async getById(id) {
    const booking = await this.bookingRepository.findById(id);
    if (!booking) throw new NotFoundError('Booking not found');
    return booking;
  }

  async saveChildRecords(bookingId, input, client) {
    const [pickups, deliveries, goodsItems] = await Promise.all([
      this.masterDataService.resolvePickupPoints(input, client),
      this.masterDataService.resolveDeliveryPoints(input, client),
      this.masterDataService.resolveGoodsItems(input),
    ]);

    await Promise.all([
      this.bookingPickupRepository.replaceForBooking(bookingId, pickups, client),
      this.bookingDeliveryRepository.replaceForBooking(bookingId, deliveries, client),
      this.bookingGoodsItemRepository.replaceForBooking(bookingId, goodsItems, client),
    ]);

    return { pickups, deliveries, goodsItems };
  }

  async createParkingLotEntry(input, user) {
    return withTransaction(async (client) => {
      const masterIds = await this.masterDataService.resolveMasterData(input, client);

      const booking = await this.bookingRepository.create(
        {
          stage: STAGES.PARKING_LOT,
          ...masterIds,
          goods_remark: sanitizeString(input.goodsRemark),
          management_remark: sanitizeString(input.managementRemark),
          created_by: user.email,
          updated_by: user.email,
        },
        client
      );

      await this.saveChildRecords(booking.id, input, client);

      await this.historyService.recordFieldChanges(
        {
          bookingId: booking.id,
          changedBy: user.email,
          changes: [{ field: 'stage', label: 'Stage', oldValue: null, newValue: STAGE_LABELS[STAGES.PARKING_LOT] }],
          remark: 'Parking lot entry created',
        },
        client
      );

      return this.bookingRepository.findById(booking.id, client);
    });
  }

  async updateBooking(id, input, user) {
    const existing = await this.getById(id);

    if (isReadOnlyStage(existing.stage)) {
      throw new ForbiddenError('Archived bookings are read-only');
    }

    return withTransaction(async (client) => {
      const masterIds = await this.masterDataService.resolveMasterData(input, client);
      const updateData = { ...masterIds, updated_by: user.email, updated_at: new Date() };

      if (Object.prototype.hasOwnProperty.call(input, 'bookingId')) {
        const bookingId = sanitizeString(input.bookingId);
        if (bookingId) {
          if (!parseBookingId(bookingId)) {
            throw new ValidationError('Invalid booking ID format. Expected MYYYYMMSSS');
          }
          const taken = await this.bookingRepository.isBookingIdTaken(bookingId, id, client);
          if (taken) throw new ValidationError('Booking ID already exists');
          updateData.booking_id = bookingId;
        } else {
          updateData.booking_id = null;
        }
      }

      Object.entries(FIELD_MAP).forEach(([inputKey, dbKey]) => {
        if (Object.prototype.hasOwnProperty.call(input, inputKey)) {
          const value = input[inputKey];
          if ([
            'unloadQuantity', 'unloadedWeightKgs', 'commission',
            'localDriverCharges', 'roughBalance', 'gumastaCharges', 'weightKattaCharges',
            'lorryFreightPaid',
          ].includes(inputKey)) {
            updateData[dbKey] = toNumber(value);
          } else if (['isFinanceComplete', 'isUnloadComplete', 'financeEditedFlag'].includes(inputKey)) {
            updateData[dbKey] = toBoolean(value);
          } else {
            updateData[dbKey] = sanitizeString(value);
          }
        }
      });

      const changes = this.buildChangeSet(existing, updateData);

      if (input.pickups || input.deliveries || input.goodsItems) {
        changes.push(...this.buildChildChangeSet(existing, input));
        await this.saveChildRecords(id, input, client);
      }

      const updated = await this.bookingRepository.update(id, updateData, client);

      if (
        Object.prototype.hasOwnProperty.call(input, 'invoiceNumber')
        && existing.invoiceId
      ) {
        const invoiceNumber = sanitizeString(input.invoiceNumber);
        if (invoiceNumber) {
          const taken = await this.invoiceRepository.isInvoiceNumberTaken(
            invoiceNumber,
            existing.invoiceId,
            client
          );
          if (taken) throw new ValidationError('Invoice number already exists');
          await this.invoiceRepository.update(
            existing.invoiceId,
            { invoice_number: invoiceNumber, updated_by: user.email, updated_at: new Date() },
            client
          );
        }
      }

      if (changes.length) {
        await this.historyService.recordFieldChanges(
          {
            bookingId: id,
            changedBy: user.email,
            changes: changes.map((c) => ({
              ...c,
              label: FIELD_LABELS[c.field] || c.field,
            })),
          },
          client
        );
      }

      return updated;
    });
  }

  async ensureGdmNumber(id, user) {
    const existing = await this.getById(id);
    if (existing.gdmNumber) return existing;

    return withTransaction(async (client) => {
      const gdmNumber = await this.documentSequenceRepository.getNextNumber('GDM', client);

      const updated = await this.bookingRepository.update(
        id,
        {
          gdm_number: gdmNumber,
          updated_by: user.email,
          updated_at: new Date(),
        },
        client
      );

      await this.historyService.recordFieldChanges(
        {
          bookingId: id,
          changedBy: user.email,
          changes: [{
            field: 'gdm_number',
            label: FIELD_LABELS.gdm_number,
            oldValue: '',
            newValue: gdmNumber,
          }],
          remark: 'GDM number assigned',
        },
        client
      );

      return updated;
    });
  }

  /** @deprecated Use ensureGdmNumber via GDM document flow */
  async generateGdm(id, user) {
    const existing = await this.getById(id);
    if (existing.gdmNumber) {
      throw new ValidationError('GDM has already been generated for this booking');
    }
    return this.ensureGdmNumber(id, user);
  }

  async transitionStage(id, newStage, user, remark) {
    const existing = await this.getById(id);

    if (isReadOnlyStage(existing.stage)) {
      throw new ForbiddenError('Archived bookings cannot be modified');
    }

    const allowed = VALID_TRANSITIONS[existing.stage] || [];
    if (!allowed.includes(newStage)) {
      throw new ValidationError(
        `Invalid stage transition from ${STAGE_LABELS[existing.stage]} to ${STAGE_LABELS[newStage]}`
      );
    }

    if (newStage === STAGES.DONE) {
      if (!existing.isUnloadComplete) {
        throw new ValidationError('Cannot mark as Done: unload is not complete');
      }
      if (!existing.isFinanceComplete) {
        throw new ValidationError('Cannot mark as Done: finance is not complete');
      }
    }

    return withTransaction(async (client) => {
      const updateData = {
        stage: newStage,
        updated_by: user.email,
        updated_at: new Date(),
      };

      if (newStage === STAGES.ON_ROAD) {
        updateData.booking_id = await this.documentSequenceRepository.getNextNumber('BOOKING', client);
        updateData.on_road_time = new Date();
      }

      if (newStage === STAGES.UNLOAD) {
        updateData.unload_time = new Date();
      }

      const updated = await this.bookingRepository.update(id, updateData, client);

      await this.historyService.recordStageChange(
        {
          bookingId: id,
          changedBy: user.email,
          stageFrom: existing.stage,
          stageTo: newStage,
          remark,
        },
        client
      );

      return updated;
    });
  }

  async getDataTable(filters) {
    return this.bookingRepository.searchDataTable(filters);
  }

  formatPickupSummary(pickups = []) {
    return pickups
      .map((p) => [p.locationName, p.consignorName].filter(Boolean).join(' / '))
      .filter(Boolean)
      .join('; ');
  }

  formatDeliverySummary(deliveries = []) {
    return deliveries
      .map((d) => [d.locationName, d.consigneeName].filter(Boolean).join(' / '))
      .filter(Boolean)
      .join('; ');
  }

  formatGoodsSummary(goodsItems = []) {
    return goodsItems
      .map((g) => {
        const parts = [g.description];
        if (g.packages != null) {
          parts.push(g.packageName ? `${g.packages} ${g.packageName}` : `${g.packages} pkg`);
        }
        if (g.weightKgs != null) parts.push(`${g.weightKgs} kg`);
        if (g.advance != null) parts.push(`adv ₹${g.advance}`);
        return parts.filter(Boolean).join(' — ');
      })
      .filter(Boolean)
      .join('; ');
  }

  buildChildChangeSet(existing, input) {
    const changes = [];

    if (input.pickups) {
      const oldSummary = this.formatPickupSummary(existing.pickups);
      const newSummary = ensureArray(input.pickups)
        .filter((row) => row?.fromLocation || row?.consignor)
        .map((row) => [row.fromLocation, row.consignor].filter(Boolean).join(' / '))
        .filter(Boolean)
        .join('; ');
      if (oldSummary !== newSummary) {
        changes.push({ field: 'pickups', oldValue: oldSummary, newValue: newSummary });
      }
    }

    if (input.deliveries) {
      const oldSummary = this.formatDeliverySummary(existing.deliveries);
      const newSummary = ensureArray(input.deliveries)
        .filter((row) => row?.toLocation || row?.consignee)
        .map((row) => [row.toLocation, row.consignee].filter(Boolean).join(' / '))
        .filter(Boolean)
        .join('; ');
      if (oldSummary !== newSummary) {
        changes.push({ field: 'deliveries', oldValue: oldSummary, newValue: newSummary });
      }
    }

    if (input.goodsItems) {
      const oldSummary = this.formatGoodsSummary(existing.goodsItems);
      const newSummary = ensureArray(input.goodsItems)
        .filter((row) => {
          const numericFields = [
            'description', 'packages', 'packageName', 'weight', 'companyFreight',
            'advance', 'loadingHamali', 'unloadingHamali', 'balance',
          ];
          return numericFields.some((field) => row?.[field] != null && row[field] !== '');
        })
        .map((row) => {
          const parts = [row.description];
          if (row.packages) {
            parts.push(row.packageName ? `${row.packages} ${row.packageName}` : `${row.packages} pkg`);
          }
          if (row.weight) parts.push(`${row.weight} kg`);
          if (row.advance) parts.push(`adv ₹${row.advance}`);
          return parts.filter(Boolean).join(' — ');
        })
        .filter(Boolean)
        .join('; ');
      if (oldSummary !== newSummary) {
        changes.push({ field: 'goods_items', oldValue: oldSummary, newValue: newSummary });
      }
    }

    return changes;
  }

  buildChangeSet(existing, updateData) {
    const changes = [];
    Object.entries(updateData).forEach(([field, newValue]) => {
      if (['updated_by', 'updated_at'].includes(field)) return;

      const camelField = field.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
      const oldValue = existing[camelField] ?? existing[field];
      const normalizedOld = oldValue == null ? '' : String(oldValue);
      const normalizedNew = newValue == null ? '' : String(newValue);

      if (normalizedOld !== normalizedNew) {
        changes.push({ field, oldValue: normalizedOld, newValue: normalizedNew });
      }
    });
    return changes;
  }
}

module.exports = BookingService;

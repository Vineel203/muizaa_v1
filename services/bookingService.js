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
} = require('../utils/helpers');

const FIELD_MAP = {
  descriptionOfGoods: 'description_of_goods',
  quantity: 'quantity',
  unloadQuantity: 'unload_quantity',
  weightKgs: 'weight_kgs',
  unloadedWeightKgs: 'unloaded_weight_kgs',
  managementRemark: 'management_remark',
  courier: 'courier',
  serialNumber: 'serial_number',
  invoiceNumber: 'invoice_number',
  rate: 'rate',
  capacity: 'capacity',
  companyUnload: 'company_unload',
  advance: 'advance',
  loadingHamali: 'loading_hamali',
  unloadingHamali: 'unloading_hamali',
  balanceCourier: 'balance_courier',
  commission: 'commission',
  localDriverCharges: 'local_driver_charges',
  roughBalance: 'rough_balance',
  gumastaCharges: 'gumasta_charges',
  weightKattaCharges: 'weight_katta_charges',
  balance: 'balance',
  courierCharges: 'courier_charges',
  lorryFreightPaid: 'lorry_freight_paid',
  companyRate: 'company_rate',
  companyFreight: 'company_freight',
  financeRemark: 'finance_remark',
  financeEditedFlag: 'finance_edited_flag',
  recipientDetails: 'recipient_details',
  isFinanceComplete: 'is_finance_complete',
  isUnloadComplete: 'is_unload_complete',
};

const FIELD_LABELS = {
  description_of_goods: 'Description of Goods',
  quantity: 'Quantity',
  unload_quantity: 'Unload Quantity',
  weight_kgs: 'Weight (Kgs)',
  unloaded_weight_kgs: 'Unloaded Weight (Kgs)',
  management_remark: 'Management Remark',
  courier: 'Courier',
  serial_number: 'Serial Number',
  invoice_number: 'Invoice Number',
  rate: 'Rate',
  capacity: 'Capacity',
  company_unload: 'Company Unload',
  advance: 'Advance',
  loading_hamali: 'Loading Hamali',
  unloading_hamali: 'Unloading Hamali',
  balance_courier: 'Balance Courier',
  commission: 'Commission',
  local_driver_charges: 'Local Driver Charges',
  rough_balance: 'Rough Balance',
  gumasta_charges: 'Gumasta Charges',
  weight_katta_charges: 'Weight Katta Charges',
  balance: 'Balance',
  courier_charges: 'Courier Charges',
  lorry_freight_paid: 'Lorry Freight Paid',
  company_rate: 'Company Rate',
  company_freight: 'Company Freight',
  finance_remark: 'Finance Remark',
  finance_edited_flag: 'Finance Edited',
  recipient_details: 'Recipient Details',
  is_finance_complete: 'Finance Complete',
  is_unload_complete: 'Unload Complete',
  from_location_id: 'From Location',
  to_location_id: 'To Location',
  consignor_id: 'Consignor',
  consignee_id: 'Consignee',
  transporter_id: 'Transporter',
  driver_id: 'Driver',
  truck_id: 'Truck',
  truck_owner_id: 'Truck Owner',
  banking_detail_id: 'Banking Detail',
  good_id: 'Good',
};

class BookingService {
  constructor({ bookingRepository, bookingSequenceRepository, masterDataService, historyService }) {
    this.bookingRepository = bookingRepository;
    this.bookingSequenceRepository = bookingSequenceRepository;
    this.masterDataService = masterDataService;
    this.historyService = historyService;
  }

  async getById(id) {
    const booking = await this.bookingRepository.findById(id);
    if (!booking) throw new NotFoundError('Booking not found');
    return booking;
  }

  async createParkingLotEntry(input, user) {
    return withTransaction(async (client) => {
      const masterIds = await this.masterDataService.resolveMasterData(input, client);

      const booking = await this.bookingRepository.create(
        {
          stage: STAGES.PARKING_LOT,
          ...masterIds,
          description_of_goods: sanitizeString(input.descriptionOfGoods),
          quantity: toNumber(input.quantity),
          weight_kgs: toNumber(input.weightKgs),
          capacity: toNumber(input.capacity),
          management_remark: sanitizeString(input.managementRemark),
          created_by: user.email,
          updated_by: user.email,
        },
        client
      );

      await this.historyService.recordFieldChanges(
        {
          bookingId: booking.id,
          changedBy: user.email,
          changes: [{ field: 'stage', label: 'Stage', oldValue: null, newValue: STAGE_LABELS[STAGES.PARKING_LOT] }],
          remark: 'Parking lot entry created',
        },
        client
      );

      return booking;
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

      Object.entries(FIELD_MAP).forEach(([inputKey, dbKey]) => {
        if (Object.prototype.hasOwnProperty.call(input, inputKey)) {
          const value = input[inputKey];
          if (['quantity', 'unloadQuantity', 'weightKgs', 'unloadedWeightKgs', 'rate', 'capacity',
            'advance', 'loadingHamali', 'unloadingHamali', 'balanceCourier', 'commission',
            'localDriverCharges', 'roughBalance', 'gumastaCharges', 'weightKattaCharges',
            'balance', 'courierCharges', 'lorryFreightPaid', 'companyRate', 'companyFreight'].includes(inputKey)) {
            updateData[dbKey] = toNumber(value);
          } else if (['isFinanceComplete', 'isUnloadComplete', 'financeEditedFlag'].includes(inputKey)) {
            updateData[dbKey] = toBoolean(value);
          } else {
            updateData[dbKey] = sanitizeString(value);
          }
        }
      });

      const changes = this.buildChangeSet(existing, updateData);
      const updated = await this.bookingRepository.update(id, updateData, client);

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
        updateData.booking_id = await this.bookingSequenceRepository.getNextBookingId(client);
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

'use strict';

/**
 * Booking domain model - documents the booking entity shape.
 * Database mapping is handled by repositories.
 */
const { STAGES } = require('../config/permissions');

const BOOKING_FIELDS = [
  'id', 'bookingId', 'stage',
  'fromLocationId', 'toLocationId',
  'consignorId', 'consigneeId',
  'transporterId', 'driverId', 'truckId', 'truckOwnerId',
  'bankingDetailId', 'goodId',
  'descriptionOfGoods', 'quantity', 'unloadQuantity',
  'weightKgs', 'unloadedWeightKgs',
  'onRoadTime', 'unloadTime',
  'managementRemark', 'courier', 'serialNumber', 'invoiceNumber',
  'rate', 'capacity', 'companyUnload',
  'advance', 'loadingHamali', 'unloadingHamali',
  'balanceCourier', 'commission', 'localDriverCharges',
  'roughBalance', 'gumastaCharges', 'weightKattaCharges',
  'balance', 'courierCharges', 'lorryFreightPaid',
  'companyRate', 'companyFreight',
  'financeRemark', 'financeEditedFlag', 'recipientDetails',
  'isFinanceComplete', 'isUnloadComplete',
  'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
];

module.exports = {
  STAGES,
  BOOKING_FIELDS,
};

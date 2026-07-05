'use strict';

/**
 * Booking domain model - documents the booking entity shape.
 */
const { STAGES } = require('../config/permissions');

const BOOKING_FIELDS = [
  'id', 'bookingId', 'gdmNumber', 'stage',
  'invoiceId', 'invoiceNumber',
  'transporterId', 'driverId', 'truckId', 'truckOwnerId',
  'bankingDetailId',
  'goodsRemark', 'unloadQuantity', 'unloadedWeightKgs',
  'pickups', 'deliveries', 'goodsItems',
  'totalCompanyFreight', 'netCompanyFreight',
  'totalAdvance', 'totalLoadingHamali', 'totalUnloadingHamali', 'totalBalance',
  'onRoadTime', 'unloadTime',
  'managementRemark', 'serialNumber',
  'companyUnload',
  'commission', 'localDriverCharges',
  'roughBalance', 'gumastaCharges', 'weightKattaCharges',
  'lorryFreightPaid',
  'financeRemark', 'financeEditedFlag',
  'isFinanceComplete', 'isUnloadComplete',
  'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
];

const GOODS_ITEM_FIELDS = [
  'id', 'bookingId', 'sortOrder',
  'description', 'packages', 'packageName', 'weightKgs',
  'unloadPackages', 'unloadWeightKgs',
  'companyFreight', 'advance',
  'loadingHamali', 'unloadingHamali', 'balance',
];

module.exports = {
  STAGES,
  BOOKING_FIELDS,
  GOODS_ITEM_FIELDS,
};

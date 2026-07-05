'use strict';

const { sanitizeString, toNumber } = require('../utils/helpers');

function ensureArray(value) {
  if (value === null || value === undefined || value === '') return [];
  return Array.isArray(value) ? value : [value];
}

class MasterDataService {
  constructor(repositories) {
    this.repositories = repositories;
  }

  async resolvePickupPoints(input, client) {
    const rows = ensureArray(input.pickups).filter(
      (row) => sanitizeString(row?.fromLocation) || sanitizeString(row?.consignor)
    );

    const resolved = [];
    for (const row of rows) {
      let locationId = null;
      let consignorId = null;

      if (sanitizeString(row.fromLocation)) {
        locationId = (await this.repositories.locationRepository.findOrCreateByName(
          row.fromLocation,
          client
        )).id;
      }

      if (sanitizeString(row.consignor)) {
        consignorId = (await this.repositories.consignorRepository.findOrCreateByName(
          row.consignor,
          client
        )).id;
      }

      resolved.push({ locationId, consignorId });
    }
    return resolved;
  }

  async resolveDeliveryPoints(input, client) {
    const rows = ensureArray(input.deliveries).filter(
      (row) => sanitizeString(row?.toLocation) || sanitizeString(row?.consignee)
    );

    const resolved = [];
    for (const row of rows) {
      let locationId = null;
      let consigneeId = null;

      if (sanitizeString(row.toLocation)) {
        locationId = (await this.repositories.locationRepository.findOrCreateByName(
          row.toLocation,
          client
        )).id;
      }

      if (sanitizeString(row.consignee)) {
        consigneeId = (await this.repositories.consigneeRepository.findOrCreateByName(
          row.consignee,
          client
        )).id;
      }

      resolved.push({ locationId, consigneeId });
    }
    return resolved;
  }

  async resolveGoodsItems(input) {
    const numericGoodsFields = [
      'packages', 'weight', 'unloadPackages', 'unloadWeightKgs',
      'companyFreight', 'advance',
      'loadingHamali', 'unloadingHamali', 'balance',
    ];

    return ensureArray(input.goodsItems)
      .filter((row) => {
        const hasContent = sanitizeString(row?.description)
          || sanitizeString(row?.packageName)
          || numericGoodsFields.some((field) => row?.[field] != null && row[field] !== '');
        return hasContent;
      })
      .map((row) => ({
        description: sanitizeString(row.description),
        packages: toNumber(row.packages) != null ? Math.round(toNumber(row.packages)) : null,
        packageName: sanitizeString(row.packageName),
        weightKgs: toNumber(row.weight),
        unloadPackages: toNumber(row.unloadPackages) != null
          ? Math.round(toNumber(row.unloadPackages))
          : null,
        unloadWeightKgs: toNumber(row.unloadWeightKgs),
        companyFreight: toNumber(row.companyFreight),
        advance: toNumber(row.advance),
        loadingHamali: toNumber(row.loadingHamali),
        unloadingHamali: toNumber(row.unloadingHamali),
        balance: toNumber(row.balance),
      }));
  }

  async resolveMasterData(input, client) {
    const resolved = {};

    if (input.transporterId) {
      resolved.transporter_id = parseInt(input.transporterId, 10) || null;
    } else if (input.transporter) {
      resolved.transporter_id = (await this.repositories.transporterRepository.findOrCreateByName(
        input.transporter,
        client
      )).id;
    }

    if (input.driverName) {
      resolved.driver_id = (await this.repositories.driverRepository.findOrCreateByNameAndNumber(
        input.driverName,
        input.driverNumber,
        client
      )).id;
    }

    if (input.truckOwnerName) {
      resolved.truck_owner_id = (await this.repositories.truckOwnerRepository.findOrCreateByNameAndNumber(
        input.truckOwnerName,
        input.truckOwnerNumber,
        client
      )).id;
    }

    if (input.truckId) {
      resolved.truck_id = parseInt(input.truckId, 10) || null;
    } else if (input.truckNumber) {
      resolved.truck_id = (await this.repositories.truckRepository.findOrCreateByNumber(
        input.truckNumber,
        input.truckCapacity,
        client
      )).id;
    }

    if (input.bankName) {
      resolved.banking_detail_id = (await this.repositories.bankingDetailRepository.findOrCreateByDetails(
        input.bankName,
        input.accountNumber,
        input.ifsc,
        client
      )).id;
    }

    return resolved;
  }

  async createTruck(input, client = null) {
    return this.repositories.truckRepository.createTruck(
      {
        number: sanitizeString(input.number),
        capacity: toNumber(input.capacity),
        driverName: sanitizeString(input.driverName),
        driverNumber: sanitizeString(input.driverNumber),
        ownerName: sanitizeString(input.ownerName),
        ownerNumber: sanitizeString(input.ownerNumber),
      },
      client
    );
  }

  async createTransporter(input, client = null) {
    const name = sanitizeString(input.name);
    if (!name) {
      const { ValidationError } = require('../utils/errors');
      throw new ValidationError('Transporter name is required');
    }

    let bankingDetailId = null;
    if (sanitizeString(input.bankName)) {
      bankingDetailId = (await this.repositories.bankingDetailRepository.findOrCreateByDetails(
        input.bankName,
        input.accountNumber,
        input.ifsc,
        client
      )).id;
    }

    return this.repositories.transporterRepository.createWithDetails(
      {
        name,
        phone_number: sanitizeString(input.phoneNumber),
        address: sanitizeString(input.address),
        operating_routes: sanitizeString(input.operatingRoutes),
        banking_detail_id: bankingDetailId,
        notes: sanitizeString(input.notes),
      },
      client
    );
  }

  async search(type, term) {
    const searchMap = {
      location: () => this.repositories.locationRepository.search(term),
      consignor: () => this.repositories.consignorRepository.search(term),
      consignee: () => this.repositories.consigneeRepository.search(term),
      transporter: () => this.repositories.transporterRepository.search(term),
      driver: () => this.repositories.driverRepository.search(term),
      truck: () => this.repositories.truckRepository.search(term),
      owner: () => this.repositories.truckOwnerRepository.search(term),
      banking: () => this.repositories.bankingDetailRepository.search(term),
    };

    const handler = searchMap[type];
    if (!handler) return [];
    return handler();
  }
}

module.exports = MasterDataService;

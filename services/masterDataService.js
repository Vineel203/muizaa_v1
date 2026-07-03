'use strict';

class MasterDataService {
  constructor(repositories) {
    this.repositories = repositories;
  }

  async resolveMasterData(input, client) {
    const resolved = {};

    if (input.fromLocation) {
      resolved.from_location_id = (await this.repositories.locationRepository.findOrCreateByName(
        input.fromLocation,
        client
      )).id;
    }

    if (input.toLocation) {
      resolved.to_location_id = (await this.repositories.locationRepository.findOrCreateByName(
        input.toLocation,
        client
      )).id;
    }

    if (input.consignor) {
      resolved.consignor_id = (await this.repositories.consignorRepository.findOrCreateByName(
        input.consignor,
        client
      )).id;
    }

    if (input.consignee) {
      resolved.consignee_id = (await this.repositories.consigneeRepository.findOrCreateByName(
        input.consignee,
        client
      )).id;
    }

    if (input.transporter) {
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

    if (input.truckNumber) {
      resolved.truck_id = (await this.repositories.truckRepository.findOrCreateByNumber(
        input.truckNumber,
        input.truckCapacity || input.capacity,
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

    if (input.goodName) {
      resolved.good_id = (await this.repositories.goodRepository.findOrCreateByName(
        input.goodName,
        client
      )).id;
    }

    return resolved;
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
      good: () => this.repositories.goodRepository.search(term),
    };

    const handler = searchMap[type];
    if (!handler) return [];
    return handler();
  }
}

module.exports = MasterDataService;

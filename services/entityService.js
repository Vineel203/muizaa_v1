'use strict';

const { NotFoundError } = require('../utils/errors');

const ENTITY_CONFIG = {
  driver: {
    repo: 'driverRepository',
    label: 'Driver',
    nameField: 'name',
    extraFields: ['number'],
  },
  truck: {
    repo: 'truckRepository',
    label: 'Truck',
    nameField: 'number',
    extraFields: ['capacity'],
  },
  transporter: {
    repo: 'transporterRepository',
    label: 'Transporter',
    nameField: 'name',
    extraFields: [],
  },
  consignor: {
    repo: 'consignorRepository',
    label: 'Consignor',
    nameField: 'name',
    extraFields: [],
  },
  consignee: {
    repo: 'consigneeRepository',
    label: 'Consignee',
    nameField: 'name',
    extraFields: [],
  },
  location: {
    repo: 'locationRepository',
    label: 'Location',
    nameField: 'name',
    extraFields: [],
  },
  owner: {
    repo: 'truckOwnerRepository',
    label: 'Truck Owner',
    nameField: 'name',
    extraFields: ['number'],
  },
};

class EntityService {
  constructor(repositories) {
    this.repositories = repositories;
  }

  async getEntityPage(type, id) {
    const config = ENTITY_CONFIG[type];
    if (!config) throw new NotFoundError('Entity type not found');

    const repo = this.repositories[config.repo];
    const entity = await repo.findById(id);
    if (!entity) throw new NotFoundError(`${config.label} not found`);

    const stats = await this.repositories.bookingRepository.getEntityStats(type, id);
    const currentBookings = await this.repositories.bookingRepository.findByEntityFilter(type, id, { currentOnly: true });
    const previousBookings = await this.repositories.bookingRepository.findByEntityFilter(type, id, { currentOnly: false });

    return {
      type,
      config,
      entity,
      stats,
      currentBookings,
      previousBookings,
    };
  }
}

module.exports = EntityService;

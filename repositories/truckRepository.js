'use strict';

const BaseRepository = require('./baseRepository');
const { query } = require('../utils/db');
const { mapRowToCamel, mapRowsToCamel } = require('../utils/helpers');
const { ValidationError } = require('../utils/errors');

const TRUCK_SELECT = `
  SELECT
    t.*,
    dd.name AS default_driver_name,
    dd.number AS default_driver_number,
    dow.name AS default_owner_name,
    dow.number AS default_owner_number
  FROM trucks t
  LEFT JOIN drivers dd ON t.default_driver_id = dd.id
  LEFT JOIN truck_owners dow ON t.default_owner_id = dow.id
`;

class TruckRepository extends BaseRepository {
  constructor({ driverRepository, truckOwnerRepository } = {}) {
    super('trucks');
    this.driverRepository = driverRepository;
    this.truckOwnerRepository = truckOwnerRepository;
  }

  async findById(id, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `${TRUCK_SELECT} WHERE t.id = $1 LIMIT 1`,
      [id]
    );
    return mapRowToCamel(result.rows[0]);
  }

  async findByNumber(number, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `${TRUCK_SELECT} WHERE LOWER(t.number) = LOWER($1) LIMIT 1`,
      [number]
    );
    return mapRowToCamel(result.rows[0]);
  }

  async findOrCreateByNumber(number, capacity, client = null) {
    const existing = await this.findByNumber(number, client);
    if (existing) return existing;

    if (capacity == null || capacity === '') {
      throw new ValidationError('Capacity is required when creating a new truck');
    }

    return this.create({ number, capacity }, client);
  }

  async createTruck(data, client = null) {
    const number = data.number?.trim();
    const capacity = data.capacity;

    if (!number) throw new ValidationError('Truck number is required');
    if (capacity == null || capacity === '') {
      throw new ValidationError('Truck capacity is required');
    }

    const existing = await this.findByNumber(number, client);
    if (existing) throw new ValidationError('A truck with this number already exists');

    let defaultDriverId = null;
    let defaultOwnerId = null;

    if (data.driverName && this.driverRepository) {
      defaultDriverId = (await this.driverRepository.findOrCreateByNameAndNumber(
        data.driverName,
        data.driverNumber,
        client
      )).id;
    }

    if (data.ownerName && this.truckOwnerRepository) {
      defaultOwnerId = (await this.truckOwnerRepository.findOrCreateByNameAndNumber(
        data.ownerName,
        data.ownerNumber,
        client
      )).id;
    }

    const truck = await this.create(
      {
        number,
        capacity,
        default_driver_id: defaultDriverId,
        default_owner_id: defaultOwnerId,
      },
      client
    );

    return this.findById(truck.id, client);
  }

  async search(term, limit = 20, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `${TRUCK_SELECT}
       WHERE t.number ILIKE $1
       ORDER BY t.number ASC
       LIMIT $2`,
      [`%${term}%`, limit]
    );
    return mapRowsToCamel(result.rows);
  }
}

module.exports = TruckRepository;

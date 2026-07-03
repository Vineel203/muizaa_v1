'use strict';

const UserRepository = require('../repositories/userRepository');
const LocationRepository = require('../repositories/locationRepository');
const ConsignorRepository = require('../repositories/consignorRepository');
const ConsigneeRepository = require('../repositories/consigneeRepository');
const TransporterRepository = require('../repositories/transporterRepository');
const DriverRepository = require('../repositories/driverRepository');
const TruckOwnerRepository = require('../repositories/truckOwnerRepository');
const TruckRepository = require('../repositories/truckRepository');
const BankingDetailRepository = require('../repositories/bankingDetailRepository');
const GoodRepository = require('../repositories/goodRepository');
const BookingRepository = require('../repositories/bookingRepository');
const BookingHistoryRepository = require('../repositories/bookingHistoryRepository');
const BookingSequenceRepository = require('../repositories/bookingSequenceRepository');

const AuthService = require('../services/authService');
const MasterDataService = require('../services/masterDataService');
const HistoryService = require('../services/historyService');
const BookingService = require('../services/bookingService');
const DashboardService = require('../services/dashboardService');
const EntityService = require('../services/entityService');

function createContainer() {
  const userRepository = new UserRepository();
  const locationRepository = new LocationRepository();
  const consignorRepository = new ConsignorRepository();
  const consigneeRepository = new ConsigneeRepository();
  const transporterRepository = new TransporterRepository();
  const driverRepository = new DriverRepository();
  const truckOwnerRepository = new TruckOwnerRepository();
  const truckRepository = new TruckRepository();
  const bankingDetailRepository = new BankingDetailRepository();
  const goodRepository = new GoodRepository();
  const bookingRepository = new BookingRepository();
  const bookingHistoryRepository = new BookingHistoryRepository();
  const bookingSequenceRepository = new BookingSequenceRepository();

  const historyService = new HistoryService(bookingHistoryRepository);
  const masterDataService = new MasterDataService({
    locationRepository,
    consignorRepository,
    consigneeRepository,
    transporterRepository,
    driverRepository,
    truckOwnerRepository,
    truckRepository,
    bankingDetailRepository,
    goodRepository,
  });

  const authService = new AuthService(userRepository);
  const bookingService = new BookingService({
    bookingRepository,
    bookingSequenceRepository,
    masterDataService,
    historyService,
  });
  const dashboardService = new DashboardService(bookingRepository);
  const entityService = new EntityService({
    locationRepository,
    consignorRepository,
    consigneeRepository,
    transporterRepository,
    driverRepository,
    truckOwnerRepository,
    truckRepository,
    bookingRepository,
  });

  return {
    repositories: {
      userRepository,
      locationRepository,
      consignorRepository,
      consigneeRepository,
      transporterRepository,
      driverRepository,
      truckOwnerRepository,
      truckRepository,
      bankingDetailRepository,
      goodRepository,
      bookingRepository,
      bookingHistoryRepository,
      bookingSequenceRepository,
    },
    services: {
      authService,
      masterDataService,
      historyService,
      bookingService,
      dashboardService,
      entityService,
    },
  };
}

let container = null;

function getContainer() {
  if (!container) {
    container = createContainer();
  }
  return container;
}

module.exports = { createContainer, getContainer };

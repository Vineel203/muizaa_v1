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
const BookingPickupRepository = require('../repositories/bookingPickupRepository');
const BookingDeliveryRepository = require('../repositories/bookingDeliveryRepository');
const BookingGoodsItemRepository = require('../repositories/bookingGoodsItemRepository');
const BookingRepository = require('../repositories/bookingRepository');
const BookingHistoryRepository = require('../repositories/bookingHistoryRepository');
const DocumentSequenceRepository = require('../repositories/documentSequenceRepository');
const InvoiceRepository = require('../repositories/invoiceRepository');

const GdmDocumentRepository = require('../repositories/gdmDocumentRepository');

const AuthService = require('../services/authService');
const MasterDataService = require('../services/masterDataService');
const HistoryService = require('../services/historyService');
const BookingService = require('../services/bookingService');
const InvoiceService = require('../services/invoiceService');
const DashboardService = require('../services/dashboardService');
const EntityService = require('../services/entityService');
const DocumentTemplateService = require('../services/documentTemplateService');
const PdfService = require('../services/pdfService');
const GoogleDriveService = require('../services/googleDriveService');
const GdmDocumentService = require('../services/gdmDocumentService');

function createContainer() {
  const userRepository = new UserRepository();
  const locationRepository = new LocationRepository();
  const consignorRepository = new ConsignorRepository();
  const consigneeRepository = new ConsigneeRepository();
  const transporterRepository = new TransporterRepository();
  const driverRepository = new DriverRepository();
  const truckOwnerRepository = new TruckOwnerRepository();
  const truckRepository = new TruckRepository({ driverRepository, truckOwnerRepository });
  const bankingDetailRepository = new BankingDetailRepository();
  const bookingPickupRepository = new BookingPickupRepository();
  const bookingDeliveryRepository = new BookingDeliveryRepository();
  const bookingGoodsItemRepository = new BookingGoodsItemRepository();
  const bookingRepository = new BookingRepository({
    bookingPickupRepository,
    bookingDeliveryRepository,
    bookingGoodsItemRepository,
  });
  const bookingHistoryRepository = new BookingHistoryRepository();
  const documentSequenceRepository = new DocumentSequenceRepository();
  const invoiceRepository = new InvoiceRepository();
  const gdmDocumentRepository = new GdmDocumentRepository();

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
  });

  const authService = new AuthService(userRepository);
  const bookingService = new BookingService({
    bookingRepository,
    bookingPickupRepository,
    bookingDeliveryRepository,
    bookingGoodsItemRepository,
    documentSequenceRepository,
    invoiceRepository,
    masterDataService,
    historyService,
  });
  const invoiceService = new InvoiceService({
    invoiceRepository,
    documentSequenceRepository,
    bookingRepository,
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

  const documentTemplateService = new DocumentTemplateService();
  const pdfService = new PdfService();
  const googleDriveService = new GoogleDriveService();
  const gdmDocumentService = new GdmDocumentService({
    bookingRepository,
    gdmDocumentRepository,
    documentSequenceRepository,
    bookingService,
    documentTemplateService,
    pdfService,
    googleDriveService,
    historyService,
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
      bookingPickupRepository,
      bookingDeliveryRepository,
      bookingGoodsItemRepository,
      bookingRepository,
      bookingHistoryRepository,
      documentSequenceRepository,
      invoiceRepository,
      gdmDocumentRepository,
    },
    services: {
      authService,
      masterDataService,
      historyService,
      bookingService,
      invoiceService,
      dashboardService,
      entityService,
      documentTemplateService,
      pdfService,
      googleDriveService,
      gdmDocumentService,
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

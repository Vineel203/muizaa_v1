'use strict';

const { withTransaction } = require('../utils/db');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { sanitizeString, ensureArray } = require('../utils/helpers');

class InvoiceService {
  constructor({ invoiceRepository, documentSequenceRepository, bookingRepository, historyService }) {
    this.invoiceRepository = invoiceRepository;
    this.documentSequenceRepository = documentSequenceRepository;
    this.bookingRepository = bookingRepository;
    this.historyService = historyService;
  }

  async getById(id) {
    const invoice = await this.invoiceRepository.findById(id);
    if (!invoice) throw new NotFoundError('Invoice not found');

    const bookings = await this.invoiceRepository.findBookingsByInvoiceId(id);
    return { ...invoice, bookings };
  }

  async getDataTable(filters) {
    return this.invoiceRepository.searchDataTable(filters);
  }

  async searchAvailableBookings(search) {
    return this.invoiceRepository.findAvailableBookings(search, 25);
  }

  async create(input, user) {
    const recipientDetails = sanitizeString(input.recipientDetails);
    if (!recipientDetails) {
      throw new ValidationError('Recipient details are required');
    }

    const bookingIds = ensureArray(input.bookingIds)
      .map((id) => parseInt(id, 10))
      .filter((id) => !Number.isNaN(id));

    if (!bookingIds.length) {
      throw new ValidationError('Select at least one booking');
    }

    return withTransaction(async (client) => {
      const invoiceNumber = await this.documentSequenceRepository.getNextNumber('INVOICE', client);

      const invoice = await this.invoiceRepository.create(
        {
          invoice_number: invoiceNumber,
          recipient_details: recipientDetails,
          created_by: user.email,
          updated_by: user.email,
        },
        client
      );

      const alreadyAssigned = await client.query(
        `SELECT id, booking_id FROM bookings
         WHERE id = ANY($1::int[]) AND invoice_id IS NOT NULL`,
        [bookingIds]
      );

      if (alreadyAssigned.rows.length) {
        const ids = alreadyAssigned.rows.map((r) => r.booking_id || r.id).join(', ');
        throw new ValidationError(`These bookings are already invoiced: ${ids}`);
      }

      await this.invoiceRepository.assignBookings(invoice.id, bookingIds, client);

      const full = await this.invoiceRepository.findById(invoice.id, client);
      full.bookings = await this.invoiceRepository.findBookingsByInvoiceId(invoice.id, client);
      return full;
    });
  }

  async update(id, input, user) {
    const existing = await this.getById(id);
    const updateData = { updated_by: user.email, updated_at: new Date() };

    if (Object.prototype.hasOwnProperty.call(input, 'recipientDetails')) {
      const recipientDetails = sanitizeString(input.recipientDetails);
      if (!recipientDetails) throw new ValidationError('Recipient details are required');
      updateData.recipient_details = recipientDetails;
    }

    if (Object.prototype.hasOwnProperty.call(input, 'invoiceNumber')) {
      const invoiceNumber = sanitizeString(input.invoiceNumber);
      if (!invoiceNumber) throw new ValidationError('Invoice number is required');
      const taken = await this.invoiceRepository.isInvoiceNumberTaken(invoiceNumber, id);
      if (taken) throw new ValidationError('Invoice number already exists');
      updateData.invoice_number = invoiceNumber;
    }

    await this.invoiceRepository.update(id, updateData);
    return this.getById(id);
  }
}

module.exports = InvoiceService;

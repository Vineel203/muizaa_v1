'use strict';

const { getContainer } = require('../config/container');
const { STAGES, STAGE_LABELS } = require('../config/permissions');
const { isReadOnlyStage } = require('../utils/helpers');

class BookingController {
  constructor() {
    const { bookingService, historyService } = getContainer().services;
    this.bookingService = bookingService;
    this.historyService = historyService;
  }

  async list(req, res, next) {
    try {
      res.render('bookings/list', {
        title: 'Bookings',
        filters: {
          stage: req.query.stage || '',
          dateFrom: req.query.dateFrom || '',
          dateTo: req.query.dateTo || '',
          pendingFinance: req.query.pendingFinance || '',
          pendingUnload: req.query.pendingUnload || '',
        },
        stages: STAGES,
        stageLabels: STAGE_LABELS,
      });
    } catch (error) {
      next(error);
    }
  }

  async createForm(req, res, next) {
    try {
      res.render('bookings/form', {
        title: 'New Parking Lot Entry',
        booking: null,
        isEdit: false,
        readOnly: false,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const booking = await this.bookingService.createParkingLotEntry(req.body, req.user);
      req.session.flash = { type: 'success', message: 'Parking lot entry created successfully' };
      res.redirect(`/bookings/${booking.id}`);
    } catch (error) {
      next(error);
    }
  }

  async show(req, res, next) {
    try {
      const booking = await this.bookingService.getById(req.params.id);
      const timeline = await this.historyService.getTimeline(booking.id);

      res.render('bookings/detail', {
        title: booking.bookingId || `Parking Lot #${booking.id}`,
        booking,
        timeline,
        readOnly: isReadOnlyStage(booking.stage),
        nextStages: this.getNextStages(booking),
      });
    } catch (error) {
      next(error);
    }
  }

  async editForm(req, res, next) {
    try {
      const booking = await this.bookingService.getById(req.params.id);
      res.render('bookings/form', {
        title: `Edit ${booking.bookingId || 'Parking Lot Entry'}`,
        booking,
        isEdit: true,
        readOnly: isReadOnlyStage(booking.stage),
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const booking = await this.bookingService.updateBooking(req.params.id, req.body, req.user);

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.json({ success: true, booking });
      }

      req.session.flash = { type: 'success', message: 'Booking updated successfully' };
      return res.redirect(`/bookings/${booking.id}`);
    } catch (error) {
      next(error);
    }
  }

  async transitionStage(req, res, next) {
    try {
      const { stage, remark } = req.body;
      const booking = await this.bookingService.transitionStage(
        req.params.id,
        stage,
        req.user,
        remark
      );

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.json({ success: true, booking });
      }

      req.session.flash = {
        type: 'success',
        message: `Stage updated to ${STAGE_LABELS[stage]}`,
      };
      return res.redirect(`/bookings/${booking.id}`);
    } catch (error) {
      next(error);
    }
  }

  async dataTable(req, res, next) {
    try {
      const {
        draw,
        start,
        length,
        search,
        orderColumn,
        orderDir,
        stage,
        dateFrom,
        dateTo,
        transporterId,
        driverId,
        truckId,
        pendingFinance,
        pendingUnload,
      } = req.query;

      const filters = {
        start: parseInt(start, 10) || 0,
        length: parseInt(length, 10) || 25,
        search: search?.value || search || '',
        orderColumn: orderColumn || 'created_at',
        orderDir: orderDir || 'desc',
        stage: stage || req.query['filters[stage]'] || '',
        dateFrom: dateFrom || req.query['filters[dateFrom]'] || '',
        dateTo: dateTo || req.query['filters[dateTo]'] || '',
        transporterId: transporterId || req.query['filters[transporterId]'] || '',
        driverId: driverId || req.query['filters[driverId]'] || '',
        truckId: truckId || req.query['filters[truckId]'] || '',
      };

      if (pendingFinance === '1') {
        filters.stage = filters.stage || '';
      }

      const result = await this.bookingService.getDataTable(filters);

      res.json({
        draw: parseInt(draw, 10) || 1,
        recordsTotal: result.total,
        recordsFiltered: result.filtered,
        data: result.data.map((b) => ({
          id: b.id,
          bookingId: b.bookingId || '—',
          stage: b.stage,
          stageLabel: STAGE_LABELS[b.stage],
          fromLocation: b.fromLocationName || '—',
          toLocation: b.toLocationName || '—',
          transporter: b.transporterName || '—',
          driver: b.driverName || '—',
          truck: b.truckNumber || '—',
          rate: b.rate ?? '—',
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  getNextStages(booking) {
    const transitions = {
      [STAGES.PARKING_LOT]: [STAGES.ON_ROAD],
      [STAGES.ON_ROAD]: [STAGES.UNLOAD],
      [STAGES.UNLOAD]: [STAGES.DONE],
      [STAGES.DONE]: [STAGES.ARCHIVED],
      [STAGES.ARCHIVED]: [],
    };
    return (transitions[booking.stage] || []).map((stage) => ({
      value: stage,
      label: STAGE_LABELS[stage],
    }));
  }
}

module.exports = BookingController;

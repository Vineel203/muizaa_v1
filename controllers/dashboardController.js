'use strict';

const { getContainer } = require('../config/container');
const { STAGES } = require('../config/permissions');

class DashboardController {
  constructor() {
    const { dashboardService } = getContainer().services;
    this.dashboardService = dashboardService;
  }

  async index(req, res, next) {
    try {
      const stats = await this.dashboardService.getStats();
      res.render('dashboard/index', {
        title: 'Dashboard',
        stats,
        cardLinks: {
          parkingLot: `/bookings?stage=${STAGES.PARKING_LOT}`,
          onRoad: `/bookings?stage=${STAGES.ON_ROAD}`,
          unload: `/bookings?stage=${STAGES.UNLOAD}`,
          done: `/bookings?stage=${STAGES.DONE}`,
          archived: `/bookings?stage=${STAGES.ARCHIVED}`,
          todaysBookings: `/bookings?dateFrom=${new Date().toISOString().slice(0, 10)}`,
          todaysGeneratedIds: `/bookings?dateFrom=${new Date().toISOString().slice(0, 10)}&hasBookingId=1`,
          pendingFinance: `/bookings?pendingFinance=1`,
          pendingUnload: `/bookings?stage=${STAGES.UNLOAD}&pendingUnload=1`,
          totalFreight: `/bookings?stage=${STAGES.DONE}`,
          totalCompanyFreight: `/bookings?stage=${STAGES.DONE}`,
          activeDrivers: `/bookings?stage=${STAGES.ON_ROAD}`,
          activeTrucks: `/bookings?stage=${STAGES.ON_ROAD}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DashboardController;

'use strict';

class DashboardService {
  constructor(bookingRepository) {
    this.bookingRepository = bookingRepository;
  }

  async getStats() {
    return this.bookingRepository.getDashboardStats();
  }
}

module.exports = DashboardService;

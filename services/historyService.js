'use strict';

const { STAGE_LABELS } = require('../config/permissions');

class HistoryService {
  constructor(bookingHistoryRepository) {
    this.bookingHistoryRepository = bookingHistoryRepository;
  }

  async recordStageChange({ bookingId, changedBy, stageFrom, stageTo, remark }, client) {
    return this.bookingHistoryRepository.create(
      {
        bookingId,
        changedBy,
        actionDescription: `Stage changed from ${STAGE_LABELS[stageFrom] || stageFrom} to ${STAGE_LABELS[stageTo] || stageTo}`,
        stageFrom,
        stageTo,
        remark,
      },
      client
    );
  }

  async recordFieldChanges({ bookingId, changedBy, changes, remark }, client) {
    if (!changes.length) return [];

    const entries = changes.map((change) => ({
      bookingId,
      changedBy,
      actionDescription: `Updated ${change.label || change.field}`,
      fieldName: change.field,
      oldValue: change.oldValue,
      newValue: change.newValue,
      remark,
    }));

    return this.bookingHistoryRepository.createMany(entries, client);
  }

  async getTimeline(bookingId) {
    return this.bookingHistoryRepository.findByBookingId(bookingId);
  }
}

module.exports = HistoryService;

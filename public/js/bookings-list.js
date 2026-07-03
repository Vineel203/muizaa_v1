'use strict';

/* global $ */

$(document).ready(function () {
  const stageColors = {
    PARKING_LOT: 'secondary',
    ON_ROAD: 'primary',
    UNLOAD: 'warning',
    DONE: 'success',
    ARCHIVED: 'dark',
  };

  const table = $('#bookingsTable').DataTable({
    processing: true,
    serverSide: true,
    ajax: {
      url: '/bookings/data',
      data: function (d) {
        d.stage = $('#filterStage').val();
        d.dateFrom = $('#filterDateFrom').val();
        d.dateTo = $('#filterDateTo').val() ? $('#filterDateTo').val() + 'T23:59:59' : '';
        d.search = d.search.value;
        d.orderColumn = d.columns[d.order[0].column].name || d.columns[d.order[0].column].data;
        d.orderDir = d.order[0].dir;
      },
    },
    columns: [
      {
        data: 'bookingId',
        name: 'booking_id',
        render: function (data, type, row) {
          return `<a href="/bookings/${row.id}" class="fw-semibold text-decoration-none">${data}</a>`;
        },
      },
      {
        data: 'stage',
        name: 'stage',
        render: function (data, type, row) {
          const color = stageColors[data] || 'secondary';
          return `<span class="badge bg-${color}">${row.stageLabel}</span>`;
        },
      },
      { data: 'fromLocation', name: 'from_location_name' },
      { data: 'toLocation', name: 'to_location_name' },
      { data: 'transporter', name: 'transporter_name' },
      { data: 'driver', name: 'driver_name' },
      { data: 'truck', name: 'truck_number' },
      {
        data: 'rate',
        name: 'rate',
        render: function (data) {
          return data !== '—' && data != null ? '₹' + Number(data).toLocaleString('en-IN') : '—';
        },
      },
      {
        data: 'createdAt',
        name: 'created_at',
        render: function (data) {
          if (!data) return '—';
          return new Date(data).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
        },
      },
    ],
    order: [[8, 'desc']],
    pageLength: 25,
    lengthMenu: [10, 25, 50, 100],
    language: {
      processing: '<div class="spinner-border spinner-border-sm text-primary"></div> Loading...',
      emptyTable: 'No bookings found',
      zeroRecords: 'No matching bookings',
    },
    responsive: true,
  });

  $('#applyFilters').on('click', function () {
    table.ajax.reload();
  });

  $('#filterSearch').on('keyup', function (e) {
    if (e.key === 'Enter') {
      table.search(this.value).draw();
    }
  });

  $('#bookingsTable tbody').on('click', 'tr', function (e) {
    if ($(e.target).closest('a').length) return;
    const data = table.row(this).data();
    if (data) window.location = '/bookings/' + data.id;
  });
});

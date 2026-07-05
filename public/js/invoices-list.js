'use strict';

/* global $ */

$(document).ready(function () {
  const table = $('#invoicesTable').DataTable({
    processing: true,
    serverSide: true,
    ajax: {
      url: '/invoices/data',
      data: function (d) {
        d.dateFrom = $('#filterDateFrom').val();
        d.dateTo = $('#filterDateTo').val() ? $('#filterDateTo').val() + 'T23:59:59' : '';
        d.search = d.search.value;
        d.orderColumn = d.columns[d.order[0].column].name || d.columns[d.order[0].column].data;
        d.orderDir = d.order[0].dir;
      },
    },
    columns: [
      {
        data: 'invoiceNumber',
        name: 'invoice_number',
        render: function (data, type, row) {
          return `<a href="/invoices/${row.id}" class="fw-semibold text-decoration-none">${data}</a>`;
        },
      },
      {
        data: 'recipientDetails',
        name: 'recipient_details',
        render: function (data) {
          const text = data || '—';
          return text.length > 60 ? text.slice(0, 60) + '…' : text;
        },
      },
      { data: 'bookingCount', name: 'booking_count' },
      { data: 'totalPackages', name: 'total_packages' },
      {
        data: 'totalWeight',
        name: 'total_weight',
        render: (data) => (data != null ? Number(data).toLocaleString('en-IN') + ' kg' : '—'),
      },
      {
        data: 'totalFreight',
        name: 'total_freight',
        render: (data) => (data != null ? '₹' + Number(data).toLocaleString('en-IN') : '—'),
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
    order: [[6, 'desc']],
    pageLength: 25,
    lengthMenu: [10, 25, 50, 100],
    language: {
      processing: '<div class="spinner-border spinner-border-sm text-primary"></div> Loading...',
      emptyTable: 'No invoices found',
      zeroRecords: 'No matching invoices',
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

  $('#invoicesTable tbody').on('click', 'tr', function (e) {
    if ($(e.target).closest('a').length) return;
    const data = table.row(this).data();
    if (data) window.location = '/invoices/' + data.id;
  });
});

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('bookingSearch');
  const resultsEl = document.getElementById('bookingSearchResults');
  const selectedEl = document.getElementById('selectedBookings');
  const countEl = document.getElementById('selectedCount');
  const submitBtn = document.getElementById('submitInvoiceBtn');
  const form = document.getElementById('invoiceForm');

  const selected = new Map();
  let debounceTimer = null;

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(searchBookings, 300);
  });

  searchInput.addEventListener('focus', () => {
    if (!resultsEl.children.length) searchBookings();
  });

  async function searchBookings() {
    const q = searchInput.value.trim();
    try {
      const res = await fetch(`/api/bookings/available-for-invoice?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      renderResults(json.data || []);
    } catch (err) {
      console.error('Booking search failed', err);
    }
  }

  function renderResults(bookings) {
    resultsEl.innerHTML = '';
    const available = bookings.filter((b) => !selected.has(b.id));

    if (!available.length) {
      resultsEl.innerHTML = '<div class="list-group-item text-muted">No available bookings found</div>';
      return;
    }

    available.forEach((b) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'list-group-item list-group-item-action';
      item.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">${b.bookingId || 'Parking Lot #' + b.id}</div>
            <div class="small text-muted">
              ${b.transporterName || '—'} · ${b.truckNumber || '—'} ·
              ${b.fromLocationName || '—'} → ${b.toLocationName || '—'}
            </div>
          </div>
          <span class="badge bg-secondary-subtle text-secondary">${formatDate(b.createdAt)}</span>
        </div>`;
      item.addEventListener('click', () => addBooking(b));
      resultsEl.appendChild(item);
    });
  }

  function addBooking(booking) {
    selected.set(booking.id, booking);
    renderSelected();
    searchBookings();
  }

  function removeBooking(id) {
    selected.delete(id);
    renderSelected();
    searchBookings();
  }

  function renderSelected() {
    selectedEl.innerHTML = '';
    selected.forEach((b) => {
      const card = document.createElement('div');
      card.className = 'card card-body border';
      card.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">${b.bookingId || 'Parking Lot #' + b.id}</div>
            <div class="small text-muted">
              ${b.transporterName || '—'} · ${b.truckNumber || '—'} ·
              ${b.fromLocationName || '—'} → ${b.toLocationName || '—'}
            </div>
          </div>
          <button type="button" class="btn btn-sm btn-outline-danger remove-booking-btn">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <input type="hidden" name="bookingIds" value="${b.id}">`;
      card.querySelector('.remove-booking-btn').addEventListener('click', () => removeBooking(b.id));
      selectedEl.appendChild(card);
    });

    const count = selected.size;
    countEl.textContent = `${count} selected`;
    submitBtn.disabled = count === 0;
  }

  form.addEventListener('submit', () => {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';
  });

  searchBookings();
});

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

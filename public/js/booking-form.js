'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('bookingForm') || document.getElementById('bookingDetailForm');
  if (!form) return;

  form.addEventListener('submit', () => {
    form.querySelectorAll('[type="submit"]').forEach((submitBtn) => {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
    });
  });

  setupDynamicRows('routeRows', 'addRouteRow', 'routeRowTemplate', 'route', 'Point');
  setupDynamicRows('goodsRows', 'addGoodsRow', 'goodsRowTemplate', 'goods', 'Goods');

  form.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.remove-row-btn');
    if (!removeBtn) return;

    const container = removeBtn.closest('.dynamic-rows');
    const minRows = parseInt(removeBtn.dataset.minRows, 10) || 1;
    const rows = container.querySelectorAll('.dynamic-row');
    if (rows.length <= minRows) return;

    removeBtn.closest('.dynamic-row').remove();
    reindexRows(container);
  });

  setupTransporterModal();
  setupTruckModal();
  setupFinanceTotals();
});

const FINANCE_TOTAL_FIELDS = [
  { field: 'companyFreight', displayId: 'totalCompanyFreightDisplay' },
  { field: 'loadingHamali', displayId: 'totalLoadingHamaliDisplay' },
  { field: 'unloadingHamali', displayId: 'totalUnloadingHamaliDisplay' },
  { field: 'balance', displayId: 'totalBalanceDisplay' },
];

function setupFinanceTotals() {
  const form = document.getElementById('bookingForm') || document.getElementById('bookingDetailForm');
  if (!form) return;

  const updateTotals = () => {
    FINANCE_TOTAL_FIELDS.forEach(({ field, displayId }) => {
      const display = document.getElementById(displayId);
      if (!display) return;

      let sum = 0;
      let hasValue = false;
      form.querySelectorAll(`[data-finance-field="${field}"]`).forEach((input) => {
        const value = parseFloat(input.value);
        if (!Number.isNaN(value)) {
          sum += value;
          hasValue = true;
        }
      });
      display.value = hasValue ? sum.toFixed(2) : '';
    });

    const netDisplay = document.getElementById('netCompanyFreightDisplay');
    const lorryInput = document.getElementById('lorryFreightPaidInput');
    const companyFreightDisplay = document.getElementById('totalCompanyFreightDisplay');
    if (netDisplay && companyFreightDisplay) {
      const companyFreight = parseFloat(companyFreightDisplay.value);
      const lorryPaid = lorryInput ? parseFloat(lorryInput.value) : 0;
      if (!Number.isNaN(companyFreight)) {
        const lorry = Number.isNaN(lorryPaid) ? 0 : lorryPaid;
        netDisplay.value = (companyFreight - lorry).toFixed(2);
      } else {
        netDisplay.value = '';
      }
    }
  };

  form.addEventListener('input', (e) => {
    if (e.target.matches('[data-finance-field]') || e.target.id === 'lorryFreightPaidInput') {
      updateTotals();
    }
  });

  form.addEventListener('click', (e) => {
    if (e.target.closest('.remove-row-btn') || e.target.id === 'addGoodsRow') {
      setTimeout(updateTotals, 0);
    }
  });

  updateTotals();
}

function setupDynamicRows(containerId, addBtnId, templateId, prefix, label) {
  const container = document.getElementById(containerId);
  const addBtn = document.getElementById(addBtnId);
  const template = document.getElementById(templateId);
  if (!container || !addBtn || !template) return;

  addBtn.addEventListener('click', () => {
    const index = container.querySelectorAll('.dynamic-row').length;
    const row = template.content.firstElementChild.cloneNode(true);
    applyRowNames(row, prefix, index);
    updateRowLabel(row, label, index + 1);
    container.appendChild(row);
    if (window.initAutocomplete) {
      window.initAutocomplete(row);
    }
  });
}

function applyRowNames(row, prefix, index) {
  row.querySelectorAll('[data-name]').forEach((input) => {
    const field = input.dataset.name;
    const array = input.dataset.array || (prefix === 'route' ? 'pickups' : `${prefix === 'pickup' ? 'pickups' : prefix === 'delivery' ? 'deliveries' : 'goodsItems'}`);
    input.name = `${array}[${index}][${field}]`;
    input.removeAttribute('data-name');
    input.removeAttribute('data-array');
  });
}

function updateRowLabel(row, label, number) {
  const labelEl = row.querySelector('.row-label');
  if (labelEl) labelEl.textContent = `${label} ${number}`;
}

function reindexRows(container) {
  const rowType = container.dataset.rowType;
  const prefix = rowType;
  const labelMap = { route: 'Point', pickup: 'Pickup', delivery: 'Delivery', goods: 'Goods' };

  container.querySelectorAll('.dynamic-row').forEach((row, index) => {
    updateRowLabel(row, labelMap[prefix] || 'Row', index + 1);
    row.querySelectorAll('input, textarea, select').forEach((input) => {
      if (!input.name) return;
      const match = input.name.match(/^(pickups|deliveries|goodsItems)\[(\d+)\]\[([^\]]+)\]$/);
      if (match) input.name = `${match[1]}[${index}][${match[3]}]`;
    });
  });
}

function setupTransporterModal() {
  const saveBtn = document.getElementById('saveTransporterBtn');
  const modalEl = document.getElementById('transporterModal');
  if (!saveBtn || !modalEl) return;

  const errorEl = document.getElementById('transporterModalError');
  const searchInput = document.getElementById('transporterSearch');
  const idInput = document.getElementById('transporterId');

  modalEl.addEventListener('show.bs.modal', () => {
    if (errorEl) {
      errorEl.classList.add('d-none');
      errorEl.textContent = '';
    }
    if (searchInput && searchInput.value && !document.getElementById('newTransporterName').value) {
      document.getElementById('newTransporterName').value = searchInput.value;
    }
  });

  saveBtn.addEventListener('click', async () => {
    const name = document.getElementById('newTransporterName').value.trim();
    if (!name) {
      showModalError(errorEl, 'Transporter name is required.');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

    try {
      const res = await fetch('/api/transporters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name,
          phoneNumber: document.getElementById('newTransporterPhone').value.trim(),
          address: document.getElementById('newTransporterAddress').value.trim(),
          operatingRoutes: document.getElementById('newTransporterRoutes').value.trim(),
          bankName: document.getElementById('newTransporterBank').value.trim(),
          accountNumber: document.getElementById('newTransporterAccount').value.trim(),
          ifsc: document.getElementById('newTransporterIfsc').value.trim(),
          notes: document.getElementById('newTransporterNotes').value.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to create transporter');
      }

      if (searchInput) searchInput.value = json.data.name;
      if (idInput) idInput.value = json.data.id;

      modalEl.querySelectorAll('input, textarea').forEach((el) => {
        if (el.id !== 'newTransporterName') el.value = '';
      });
      document.getElementById('newTransporterName').value = '';

      if (window.bootstrap) {
        window.bootstrap.Modal.getOrCreateInstance(modalEl).hide();
      }
    } catch (err) {
      showModalError(errorEl, err.message || 'Unable to save transporter.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Save Transporter';
    }
  });
}

function showModalError(errorEl, message) {
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.classList.remove('d-none');
}

function setupTruckModal() {
  const saveBtn = document.getElementById('saveTruckBtn');
  const modalEl = document.getElementById('truckModal');
  if (!saveBtn || !modalEl) return;

  const errorEl = document.getElementById('truckModalError');
  const searchInput = document.getElementById('truckSearch');
  const idInput = document.getElementById('truckId');
  const capDisplay = document.getElementById('truckCapacityDisplay');

  modalEl.addEventListener('show.bs.modal', () => {
    if (errorEl) {
      errorEl.classList.add('d-none');
      errorEl.textContent = '';
    }
    if (searchInput && searchInput.value && !document.getElementById('newTruckNumber').value) {
      document.getElementById('newTruckNumber').value = searchInput.value;
    }
  });

  saveBtn.addEventListener('click', async () => {
    const number = document.getElementById('newTruckNumber').value.trim();
    const capacity = document.getElementById('newTruckCapacity').value;
    if (!number || !capacity) {
      showModalError(errorEl, 'Truck number and capacity are required.');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

    try {
      const res = await fetch('/api/trucks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          number,
          capacity,
          driverName: document.getElementById('newTruckDriverName').value.trim(),
          driverNumber: document.getElementById('newTruckDriverNumber').value.trim(),
          ownerName: document.getElementById('newTruckOwnerName').value.trim(),
          ownerNumber: document.getElementById('newTruckOwnerNumber').value.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to create truck');
      }

      if (searchInput) searchInput.value = json.data.number;
      if (idInput) idInput.value = json.data.id;
      if (capDisplay) capDisplay.value = json.data.capacity ?? '';

      const driverNameInput = document.querySelector('[name="driverName"]');
      const driverNumberInput = document.querySelector('[name="driverNumber"]');
      const ownerNameInput = document.querySelector('[name="truckOwnerName"]');
      const ownerNumberInput = document.querySelector('[name="truckOwnerNumber"]');
      if (driverNameInput && json.data.defaultDriverName) {
        driverNameInput.value = json.data.defaultDriverName;
      }
      if (driverNumberInput && json.data.defaultDriverNumber) {
        driverNumberInput.value = json.data.defaultDriverNumber;
      }
      if (ownerNameInput && json.data.defaultOwnerName) {
        ownerNameInput.value = json.data.defaultOwnerName;
      }
      if (ownerNumberInput && json.data.defaultOwnerNumber) {
        ownerNumberInput.value = json.data.defaultOwnerNumber;
      }

      document.getElementById('newTruckNumber').value = '';
      document.getElementById('newTruckCapacity').value = '';
      document.getElementById('newTruckDriverName').value = '';
      document.getElementById('newTruckDriverNumber').value = '';
      document.getElementById('newTruckOwnerName').value = '';
      document.getElementById('newTruckOwnerNumber').value = '';

      if (window.bootstrap) {
        window.bootstrap.Modal.getOrCreateInstance(modalEl).hide();
      }
    } catch (err) {
      showModalError(errorEl, err.message || 'Unable to save truck.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Save Truck';
    }
  });
}

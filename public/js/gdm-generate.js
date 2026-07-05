'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('gdmGenerateForm');
  if (!form) return;

  const bookingId = window.GDM_BOOKING_ID;
  setupGdmNumberGeneration(bookingId);
  setupDynamicGdmRows();
  setupPdfGeneration(form, bookingId);
});

function setupGdmNumberGeneration(bookingId) {
  const btn = document.getElementById('generateGdmNumberBtn');
  const input = document.getElementById('gdmNumberInput');
  if (!btn || !input) return;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    try {
      const res = await fetch(`/bookings/${bookingId}/gdm/number`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to generate GDM number');

      input.value = json.gdmNumber;
      if (json.created) {
        input.classList.add('border-success');
        setTimeout(() => input.classList.remove('border-success'), 2000);
      }
    } catch (error) {
      alert(error.message);
      btn.disabled = false;
      btn.textContent = 'Generate';
    }
  });
}

function setupDynamicGdmRows() {
  setupGdmRouteRows();
  setupGdmGoodsRows();
}

function setupGdmRouteRows() {
  const container = document.getElementById('gdmRouteRows');
  const addBtn = document.getElementById('addGdmRouteRow');
  const template = document.getElementById('gdmRouteRowTemplate');
  if (!container || !addBtn || !template) return;

  const applyRowNames = (row, index) => {
    row.querySelectorAll('[data-name]').forEach((el) => {
      const array = el.dataset.array || 'pickups';
      el.name = `${array}[${index}][${el.dataset.name}]`;
      el.removeAttribute('data-name');
      el.removeAttribute('data-array');
    });
  };

  const reindex = () => {
    container.querySelectorAll('.gdm-route-row').forEach((row, index) => {
      const labelEl = row.querySelector('.row-label');
      if (labelEl) labelEl.textContent = `Point ${index + 1}`;
      row.querySelectorAll('input[name]').forEach((input) => {
        const match = input.name.match(/^(pickups|deliveries)\[(\d+)\]\[([^\]]+)\]$/);
        if (match) input.name = `${match[1]}[${index}][${match[3]}]`;
      });
    });
  };

  addBtn.addEventListener('click', () => {
    const index = container.querySelectorAll('.gdm-route-row').length;
    const row = template.content.firstElementChild.cloneNode(true);
    applyRowNames(row, index);
    const labelEl = row.querySelector('.row-label');
    if (labelEl) labelEl.textContent = `Point ${index + 1}`;
    container.appendChild(row);
  });

  container.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.gdm-remove-route-btn');
    if (!removeBtn) return;
    const rows = container.querySelectorAll('.gdm-route-row');
    if (rows.length <= 1) return;
    removeBtn.closest('.gdm-route-row').remove();
    reindex();
  });
}

function setupGdmGoodsRows() {
  const container = document.getElementById('gdmGoodsRows');
  const addBtn = document.getElementById('addGdmGoodsRow');
  const template = document.getElementById('gdmGoodsRowTemplate');
  if (!container || !addBtn || !template) return;

  const reindex = () => {
    container.querySelectorAll('.gdm-goods-row').forEach((row, index) => {
      row.querySelector('.row-label').textContent = `Goods ${index + 1}`;
      row.querySelectorAll('[data-name], input[name]').forEach((el) => {
        const field = el.dataset.name || (el.name && el.name.match(/\[([^\]]+)\]$/)?.[1]);
        if (field) el.name = `goodsItems[${index}][${field}]`;
        el.removeAttribute('data-name');
      });
    });
  };

  addBtn.addEventListener('click', () => {
    const index = container.querySelectorAll('.gdm-goods-row').length;
    const row = template.content.firstElementChild.cloneNode(true);
    row.querySelectorAll('[data-name]').forEach((el) => {
      el.name = `goodsItems[${index}][${el.dataset.name}]`;
      el.removeAttribute('data-name');
    });
    container.appendChild(row);
    reindex();
  });

  container.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.gdm-remove-goods-btn');
    if (!removeBtn) return;
    const rows = container.querySelectorAll('.gdm-goods-row');
    if (rows.length <= 1) return;
    removeBtn.closest('.gdm-goods-row').remove();
    reindex();
  });
}

function setupPdfGeneration(form, bookingId) {
  const submitBtn = document.getElementById('generatePdfBtn');
  const alertBox = document.getElementById('gdmGenerateAlert');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const gdmNumber = document.getElementById('gdmNumberInput')?.value?.trim();
    if (!gdmNumber) {
      showAlert(alertBox, 'Enter a GDM Number or click Generate to assign one.', 'danger');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Generating...';
    alertBox.classList.add('d-none');

    try {
      const body = formToUrlEncoded(form);
      const res = await fetch(form.action, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          Accept: 'application/pdf',
        },
        body,
      });

      const contentType = res.headers.get('Content-Type') || '';

      if (!res.ok || !contentType.includes('application/pdf')) {
        let message = 'PDF generation failed';
        try {
          const json = await res.json();
          message = json.message || message;
        } catch {
          const text = await res.text();
          if (text) message = text.slice(0, 200);
        }
        throw new Error(message);
      }

      const blob = await res.blob();
      if (!blob.type.includes('pdf')) {
        throw new Error('Server did not return a valid PDF file');
      }
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/);
      const fileName = match ? match[1] : `GDM_${gdmNumber}.pdf`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      showAlert(alertBox, 'PDF generated and downloaded successfully. Redirecting to booking...', 'success');
      setTimeout(() => {
        window.location.href = `/bookings/${bookingId}`;
      }, 1500);
    } catch (error) {
      showAlert(alertBox, error.message, 'danger');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-file-earmark-pdf me-1"></i> Generate PDF';
    }
  });
}

function showAlert(el, message, type) {
  if (!el) return;
  el.textContent = message;
  el.className = `alert alert-${type}`;
  el.classList.remove('d-none');
}

function formToUrlEncoded(form) {
  const params = new URLSearchParams();
  const formData = new FormData(form);
  formData.forEach((value, key) => {
    params.append(key, value);
  });
  return params.toString();
}

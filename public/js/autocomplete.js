'use strict';

class Autocomplete {
  constructor(input) {
    this.input = input;
    this.type = input.dataset.type;
    this.valueFieldId = input.dataset.valueField || null;
    this.createModalId = input.dataset.createModal || null;
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'autocomplete-wrapper';
    this.input.parentNode.insertBefore(this.wrapper, this.input);
    this.wrapper.appendChild(this.input);

    this.dropdown = document.createElement('div');
    this.dropdown.className = 'autocomplete-dropdown';
    this.wrapper.appendChild(this.dropdown);

    this.debounceTimer = null;
    this.activeIndex = -1;
    this.input.dataset.acInit = 'true';

    this.input.addEventListener('input', () => this.onInputChange());
    this.input.addEventListener('keydown', (e) => this.onKeydown(e));
    this.input.addEventListener('blur', () => {
      setTimeout(() => this.hide(), 150);
    });
  }

  onInputChange() {
    if (this.valueFieldId) {
      const field = document.getElementById(this.valueFieldId);
      if (field) field.value = '';
    }
    if (this.type === 'truck') {
      const capDisplay = document.getElementById('truckCapacityDisplay');
      if (capDisplay) capDisplay.value = '';
    }
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.search(), 250);
  }

  async search() {
    const q = this.input.value.trim();
    if (q.length < 1) {
      this.hide();
      return;
    }

    try {
      const res = await fetch(`/api/master-data/search?type=${this.type}&q=${encodeURIComponent(q)}`);
      const json = await res.json();
      this.renderResults(json.data || [], q);
    } catch (err) {
      console.error('Autocomplete search failed', err);
    }
  }

  renderResults(items, query) {
    this.dropdown.innerHTML = '';
    this.activeIndex = -1;

    items.forEach((item) => {
      const label = this.getLabel(item);
      const el = document.createElement('div');
      el.className = 'autocomplete-item';
      el.textContent = label;
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.select(label, item);
      });
      this.dropdown.appendChild(el);
    });

    const exactMatch = items.some((item) => this.getLabel(item).toLowerCase() === query.toLowerCase());

    if (!exactMatch) {
      if (this.type === 'transporter' && this.createModalId) {
        const createEl = document.createElement('div');
        createEl.className = 'autocomplete-item text-primary';
        createEl.innerHTML = `<i class="bi bi-plus-circle me-1"></i> Create new transporter "${query}"`;
        createEl.addEventListener('mousedown', (e) => {
          e.preventDefault();
          this.openCreateModal(query);
        });
        this.dropdown.appendChild(createEl);
      } else if (this.type === 'truck' && this.createModalId) {
        const createEl = document.createElement('div');
        createEl.className = 'autocomplete-item text-primary';
        createEl.innerHTML = `<i class="bi bi-plus-circle me-1"></i> Create new truck "${query}"`;
        createEl.addEventListener('mousedown', (e) => {
          e.preventDefault();
          this.openTruckModal(query);
        });
        this.dropdown.appendChild(createEl);
      } else {
        const createEl = document.createElement('div');
        createEl.className = 'autocomplete-item text-muted';
        createEl.innerHTML = `<i class="bi bi-plus-circle me-1"></i> Use "${query}"`;
        createEl.addEventListener('mousedown', (e) => {
          e.preventDefault();
          this.hide();
        });
        this.dropdown.appendChild(createEl);
      }
    }

    this.dropdown.classList.add('show');
  }

  openCreateModal(prefillName) {
    this.hide();
    const nameInput = document.getElementById('newTransporterName');
    if (nameInput) nameInput.value = prefillName;
    const modalEl = document.getElementById(this.createModalId);
    if (modalEl && window.bootstrap) {
      window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
  }

  openTruckModal(prefillNumber) {
    this.hide();
    const numberInput = document.getElementById('newTruckNumber');
    if (numberInput) numberInput.value = prefillNumber;
    const modalEl = document.getElementById(this.createModalId);
    if (modalEl && window.bootstrap) {
      window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
  }

  applyTruckDefaults(item) {
    const driverNameInput = document.querySelector('[name="driverName"]');
    const driverNumberInput = document.querySelector('[name="driverNumber"]');
    const ownerNameInput = document.querySelector('[name="truckOwnerName"]');
    const ownerNumberInput = document.querySelector('[name="truckOwnerNumber"]');

    if (driverNameInput && item.defaultDriverName) {
      driverNameInput.value = item.defaultDriverName;
    }
    if (driverNumberInput && item.defaultDriverNumber) {
      driverNumberInput.value = item.defaultDriverNumber;
    }
    if (ownerNameInput && item.defaultOwnerName) {
      ownerNameInput.value = item.defaultOwnerName;
    }
    if (ownerNumberInput && item.defaultOwnerNumber) {
      ownerNumberInput.value = item.defaultOwnerNumber;
    }
  }

  getLabel(item) {
    const labelMap = {
      location: item.name,
      consignor: item.name,
      consignee: item.name,
      transporter: item.phoneNumber ? `${item.name} (${item.phoneNumber})` : item.name,
      driver: item.number ? `${item.name} (${item.number})` : item.name,
      truck: item.number,
      owner: item.number ? `${item.name} (${item.number})` : item.name,
      banking: [item.bankName, item.accountNumber].filter(Boolean).join(' - '),
    };
    return labelMap[this.type] || item.name || '';
  }

  select(label, item) {
    if (this.type === 'driver') {
      this.input.value = item.name || label;
      const numberInput = document.querySelector('[name="driverNumber"]');
      if (numberInput && item.number) numberInput.value = item.number;
    } else if (this.type === 'owner') {
      this.input.value = item.name || label;
      const numberInput = document.querySelector('[name="truckOwnerNumber"]');
      if (numberInput && item.number) numberInput.value = item.number;
    } else if (this.type === 'truck') {
      this.input.value = item.number || label;
      if (this.valueFieldId) {
        const field = document.getElementById(this.valueFieldId);
        if (field) field.value = item.id || '';
      }
      const capDisplay = document.getElementById('truckCapacityDisplay');
      if (capDisplay) capDisplay.value = item.capacity != null ? item.capacity : '';
      this.applyTruckDefaults(item);
    } else if (this.type === 'banking') {
      this.input.value = item.bankName || label;
      const accInput = document.querySelector('[name="accountNumber"]');
      const ifscInput = document.querySelector('[name="ifsc"]');
      if (accInput && item.accountNumber) accInput.value = item.accountNumber;
      if (ifscInput && item.ifsc) ifscInput.value = item.ifsc;
    } else if (this.type === 'transporter') {
      this.input.value = item.name || label;
      if (this.valueFieldId) {
        const field = document.getElementById(this.valueFieldId);
        if (field) field.value = item.id || '';
      }
    } else {
      this.input.value = item.name || label;
    }
    this.hide();
  }

  onKeydown(e) {
    const items = this.dropdown.querySelectorAll('.autocomplete-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.activeIndex = Math.min(this.activeIndex + 1, items.length - 1);
      this.highlight(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.activeIndex = Math.max(this.activeIndex - 1, 0);
      this.highlight(items);
    } else if (e.key === 'Enter' && this.activeIndex >= 0) {
      e.preventDefault();
      items[this.activeIndex].dispatchEvent(new Event('mousedown'));
    } else if (e.key === 'Escape') {
      this.hide();
    }
  }

  highlight(items) {
    items.forEach((item, i) => {
      item.classList.toggle('active', i === this.activeIndex);
    });
  }

  hide() {
    this.dropdown.classList.remove('show');
    this.activeIndex = -1;
  }
}

function initAutocomplete(root = document) {
  root.querySelectorAll('.autocomplete-input:not([data-ac-init])').forEach((input) => {
    new Autocomplete(input);
  });
}

window.initAutocomplete = initAutocomplete;

document.addEventListener('DOMContentLoaded', () => {
  initAutocomplete();
});

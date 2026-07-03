'use strict';

class Autocomplete {
  constructor(input) {
    this.input = input;
    this.type = input.dataset.type;
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'autocomplete-wrapper';
    this.input.parentNode.insertBefore(this.wrapper, this.input);
    this.wrapper.appendChild(this.input);

    this.dropdown = document.createElement('div');
    this.dropdown.className = 'autocomplete-dropdown';
    this.wrapper.appendChild(this.dropdown);

    this.debounceTimer = null;
    this.activeIndex = -1;

    this.input.addEventListener('input', () => this.onInput());
    this.input.addEventListener('keydown', (e) => this.onKeydown(e));
    this.input.addEventListener('blur', () => {
      setTimeout(() => this.hide(), 150);
    });
  }

  onInput() {
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

    if (!items.some((item) => this.getLabel(item).toLowerCase() === query.toLowerCase())) {
      const createEl = document.createElement('div');
      createEl.className = 'autocomplete-item text-muted';
      createEl.innerHTML = `<i class="bi bi-plus-circle me-1"></i> Use "${query}"`;
      createEl.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.hide();
      });
      this.dropdown.appendChild(createEl);
    }

    this.dropdown.classList.add('show');
  }

  getLabel(item) {
    const labelMap = {
      location: item.name,
      consignor: item.name,
      consignee: item.name,
      transporter: item.name,
      driver: item.number ? `${item.name} (${item.number})` : item.name,
      truck: item.number,
      owner: item.number ? `${item.name} (${item.number})` : item.name,
      banking: [item.bankName, item.accountNumber].filter(Boolean).join(' - '),
      good: item.name,
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
      const capInput = document.querySelector('[name="capacity"]');
      if (capInput && item.capacity) capInput.value = item.capacity;
    } else if (this.type === 'banking') {
      this.input.value = item.bankName || label;
      const accInput = document.querySelector('[name="accountNumber"]');
      const ifscInput = document.querySelector('[name="ifsc"]');
      if (accInput && item.accountNumber) accInput.value = item.accountNumber;
      if (ifscInput && item.ifsc) ifscInput.value = item.ifsc;
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

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.autocomplete-input').forEach((input) => {
    new Autocomplete(input);
  });
});

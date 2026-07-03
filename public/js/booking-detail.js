'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const stageModal = document.getElementById('stageModal');
  const stageForm = document.getElementById('stageForm');
  const stageValue = document.getElementById('stageValue');
  const stageLabel = document.getElementById('stageLabel');

  document.querySelectorAll('.stage-transition-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      stageValue.value = btn.dataset.stage;
      stageLabel.textContent = btn.dataset.label;
      new bootstrap.Modal(stageModal).show();
    });
  });

  if (stageForm) {
    stageForm.addEventListener('submit', (e) => {
      if (!window.confirmAction(`Move booking to ${stageLabel.textContent}?`)) {
        e.preventDefault();
      }
    });
  }
});

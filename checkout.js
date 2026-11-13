'use strict';
(() => {
  const i18n = window.PondoI18n;
  const t = i18n.t;
  const productName = product => i18n.product(product);
  const products = new Map((window.PONDO_PRODUCTS || []).map(product => [product.id, product]));
  const form = document.querySelector('#checkout-form');
  const result = document.querySelector('#checkout-result');
  const money = value => `${new Intl.NumberFormat('uk-UA').format(value)} ₴`;
  let items = [];
  function renderOrder() {
    const stored = window.PondoCart.read();
    items = stored.items;
    document.querySelector('#checkout-storage-warning').hidden = !stored.unavailable;
    document.querySelector('#checkout-empty').hidden = items.length > 0;
    document.querySelector('#checkout-layout').hidden = !items.length;
    document.querySelector('#checkout-check').disabled = !items.length;
    const list = document.querySelector('#checkout-items');
    list.replaceChildren();
    items.forEach(line => {
      const product = products.get(line.id);
      const row = document.createElement('article');
      row.className = 'cart-line checkout-line';
      row.dataset.category = product.category;
      // Product metadata is local, curated data. No form input/storage strings become HTML.
      row.innerHTML = `<div class="product-image"><img src="${product.image}" width="100" height="110" alt="${productName(product)}"></div><div class="cart-line-info"><h3>${productName(product)}</h3><p>${line.size ? `${t('product.size')}: ${line.size}` : t('product.oneSize')}</p><p>${line.quantity} × ${money(product.price)}</p><strong>${money(product.price * line.quantity)}</strong></div>`;
      const image = row.querySelector('img');
      image.addEventListener('error', () => { image.src = 'images/placeholder.svg'; }, { once: true });
      list.append(row);
    });
    document.querySelector('#checkout-total').textContent = money(items.reduce((sum, line) => sum + products.get(line.id).price * line.quantity, 0));
  }
  const checks = [
    ['name', input => input.value.trim().length >= 2, 'validation.name'],
    ['email', input => input.value.trim() !== '' && input.validity.valid, 'validation.email'],
    ['phone', input => /^[+\d\s()\-]+$/.test(input.value.trim()) && input.value.replace(/\D/g, '').length >= 7 && input.value.replace(/\D/g, '').length <= 15, 'validation.phone'],
    ['city', input => input.value.trim().length >= 2, 'validation.city'],
    ['delivery', input => ['pickup', 'delivery'].includes(input.value), 'validation.delivery']
  ];
  function validateField(key, valid, message) {
    const input = document.querySelector(`#customer-${key}`);
    const ok = valid(input);
    input.setAttribute('aria-invalid', String(!ok));
    document.querySelector(`#${key}-error`).textContent = ok ? '' : t(message);
    return ok;
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    renderOrder(); // Recheck catalog prices and current cart, including edits in another tab.
    if (!items.length) { result.textContent = ''; return; }
    let firstInvalid = null;
    checks.forEach(([key, valid, message]) => {
      if (!validateField(key, valid, message) && !firstInvalid) firstInvalid = document.querySelector(`#customer-${key}`);
    });
    if (firstInvalid) {
      result.dataset.state = 'error';
      result.textContent = t('validation.error');
      firstInvalid.focus();
      return;
    }
    result.dataset.state = 'valid';
    result.textContent = t('validation.valid');
    result.focus({ preventScroll: true });
  });
  form.addEventListener('input', event => {
    result.textContent = '';
    delete result.dataset.state;
    const check = checks.find(([key]) => event.target.id === `customer-${key}`);
    if (check && event.target.hasAttribute('aria-invalid')) validateField(...check);
  });
  window.addEventListener('storage', event => {
    if (event.key === window.PondoCart.key || event.key === null) {
      renderOrder(); result.textContent = '';
    }
  });
  window.addEventListener('languagechange', () => {
    renderOrder();
    checks.forEach(([key, valid, message]) => {
      if (document.querySelector(`#customer-${key}`).hasAttribute('aria-invalid')) validateField(key, valid, message);
    });
    if (result.textContent) result.textContent = t(result.dataset.state === 'valid' ? 'validation.valid' : 'validation.error');
  });
  window.addEventListener('pageshow', renderOrder);
  renderOrder();
})();

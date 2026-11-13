'use strict';
/* One validation policy for the drawer and checkout. Prices always come from products.js. */
(() => {
  const products = new Map((window.PONDO_PRODUCTS || []).map(product => [product.id, product]));
  const key = 'pondo.cart.v1';
  const needsSize = product => product.sizes.length > 0 && !(product.sizes.length === 1 && product.sizes[0] === 'ONE SIZE');
  function normalize(items) {
    const clean = [];
    if (!Array.isArray(items)) return clean;
    items.forEach(item => {
      if (!item || typeof item !== 'object') return;
      const product = products.get(item.id);
      if (!product || !Number.isInteger(item.quantity) || item.quantity < 1) return;
      if (needsSize(product) ? !product.sizes.includes(item.size) : item.size !== null && item.size !== 'ONE SIZE') return;
      const size = needsSize(product) ? item.size : null;
      const existing = clean.find(line => line.id === product.id && line.size === size);
      if (existing) existing.quantity = Math.min(99, existing.quantity + item.quantity);
      else clean.push({ id: product.id, size, quantity: Math.min(99, item.quantity) });
    });
    return clean;
  }
  function read() {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return { items: [], unavailable: false };
      const data = JSON.parse(raw);
      return { items: data?.version === 1 ? normalize(data.items) : [], unavailable: false };
    } catch (error) {
      return { items: [], unavailable: !(error instanceof SyntaxError) };
    }
  }
  window.PondoCart = Object.freeze({ key, needsSize, normalize, read });
})();

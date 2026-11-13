'use strict';
(() => {
  const products = window.PONDO_PRODUCTS || [];
  const i18n = window.PondoI18n;
  const t = i18n.t;
  const productName = product => i18n.product(product);
  const productColor = product => i18n.product(product, 'color');
  const state = { category: 'all', query: '', newOnly: false };
  const categoryName = category => t(`category.${category}`);
  const priceFormat = new Intl.NumberFormat('uk-UA');
  const grid = document.querySelector('#product-grid');
  const menuButton = document.querySelector('#menu-toggle');
  const menu = document.querySelector('#mobile-nav');
  const searchButton = document.querySelector('#search-toggle');
  const searchPanel = document.querySelector('#search-panel');
  const searchInput = document.querySelector('#search');

  const productById = new Map(products.map(product => [product.id, product]));
  const storageKeys = { cart: window.PondoCart.key, favorites: 'pondo.favorites.v1' };
  const panel = document.querySelector('#shop-panel');
  const panelContent = document.querySelector('#panel-content');
  const cartToggle = document.querySelector('#cart-toggle');
  const favoritesToggle = document.querySelector('#favorites-toggle');
  const heart = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6c-2-2-5.2-1.8-7 .3L12 7l-1.8-2.1c-1.8-2.1-5-2.3-7-.3-2 2-2 5.2 0 7.2L12 21l8.8-9.2c2-2 2-5.2 0-7.2Z"/></svg>';
  let storageUnavailable = false;
  let panelMode = 'cart';
  let panelOpener = null;
  let lockedScrollY = 0;
  let notificationTimer;
  let lastNotice = null;
  const needsSize = window.PondoCart.needsSize;
  const money = value => `${priceFormat.format(value)} ₴`;

  function readStored(kind) {
    try {
      const raw = localStorage.getItem(storageKeys[kind]);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (data?.version !== 1 || !Array.isArray(data.items)) return [];
      if (kind === 'favorites') return [...new Set(data.items.filter(id => productById.has(id)))];
      return window.PondoCart.normalize(data.items);
    } catch (error) {
      if (!(error instanceof SyntaxError)) storageUnavailable = true;
      return [];
    }
  }
  let cart = readStored('cart');
  let favorites = new Set(readStored('favorites'));
  function persist(kind) {
    try {
      localStorage.setItem(storageKeys[kind], JSON.stringify({ version: 1, items: kind === 'cart' ? cart : [...favorites] }));
    } catch { storageUnavailable = true; }
  }
  function notify(key, params = {}) {
    lastNotice = { key, params };
    const message = t(key, params);
    const notification = document.querySelector('#shop-notification');
    clearTimeout(notificationTimer);
    notification.textContent = panel.open ? '' : message;
    document.querySelector('#panel-status').textContent = panel.open ? message : '';
    notification.classList.add('visible');
    notificationTimer = setTimeout(() => { notification.classList.remove('visible');
      notification.textContent = '';
      document.querySelector('#panel-status').textContent = '';
      lastNotice = null; }, 3200);
  }
  function syncHearts() {
    document.querySelectorAll('[data-favorite]').forEach(button => {
      const selected = favorites.has(button.dataset.favorite);
      const product = productById.get(button.dataset.favorite);
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', t(selected ? 'favorites.remove' : 'favorites.add', { name: productName(product) }));
    });
  }
  function updateShop() {
    const count = cart.reduce((sum, line) => sum + line.quantity, 0);
    cartToggle.querySelector('span').textContent = count;
    cartToggle.setAttribute('aria-label', t('cart.open', { count }));
    document.querySelector('#favorites-count').textContent = favorites.size;
    favoritesToggle.setAttribute('aria-label', t('favorites.open', { count: favorites.size }));
    document.querySelector('#storage-warning').hidden = !storageUnavailable;
    syncHearts();
  }
  function createProductCard(product, inFavorites = false) {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.dataset.category = product.category;
    card.dataset.productId = product.id;
    const scope = inFavorites ? 'saved' : 'catalog';
    const selectId = `${scope}-size-${product.id}`;
    // Only curated local product data is interpolated; storage/user input is never HTML.
    card.innerHTML = `<div class="product-image"><img src="${product.image}" alt="${product.brand} ${productName(product)}. ${t('product.photo')}" loading="lazy" width="600" height="650"><span class="product-tag ${product.isNew ? '' : 'neutral'}">${t(product.isNew ? 'product.new' : 'product.edit')}</span><button type="button" class="favorite-button" data-favorite="${product.id}" aria-pressed="${favorites.has(product.id)}" aria-label="${t(favorites.has(product.id) ? 'favorites.remove' : 'favorites.add', { name: productName(product) })}">${heart}</button><span class="product-category">${categoryName(product.category)}</span></div><div class="product-meta"><span>${product.brand}</span><span>${t('product.demo')}</span></div><h3>${productName(product)}</h3><div class="product-details"><strong>${money(product.price)}</strong><span>${productColor(product)}</span></div><form class="product-purchase" data-add="${product.id}" novalidate>${needsSize(product) ? `<label for="${selectId}">${t('product.size')}</label><select id="${selectId}" name="size" required aria-label="${t('product.size')} ${productName(product)}"><option value="">${t('product.chooseSize')}</option>${product.sizes.map(size => `<option value="${size}">${size}</option>`).join('')}</select><span class="size-error" role="status"></span>` : `<p class="one-size">${t('product.oneSize')}</p>`}<button class="product-button" type="submit">${t('product.add')} <span aria-hidden="true">↗</span></button></form>${inFavorites ? `<button class="view-product text-button" type="button" data-view="${product.id}">${t('product.view')}</button>` : ''}`;
    handleImage(card.querySelector('img'));
    return card;
  }
  function renderPanel(focusKey) {
    document.querySelector('#panel-title').textContent = t(panelMode === 'cart' ? 'cart.title' : 'favorites.title');
    document.querySelector('#cart-summary').hidden = panelMode !== 'cart';
    document.querySelector('#checkout-link').hidden = panelMode !== 'cart' || !cart.length || storageUnavailable;
    panelContent.replaceChildren();
    const empty = panelMode === 'cart' ? !cart.length : !favorites.size;
    if (empty) {
      panelContent.innerHTML = `<div class="panel-empty"><span aria-hidden="true">${panelMode === 'cart' ? '↗' : '♡'}</span><h3>${t(panelMode === 'cart' ? 'cart.empty' : 'favorites.empty')}</h3><p>${t(panelMode === 'cart' ? 'cart.emptyHint' : 'favorites.emptyHint')}</p><button type="button" class="button empty-catalog">${t('cart.catalog')}</button></div>`;
    } else if (panelMode === 'favorites') {
      const list = document.createElement('div');
      list.className = 'saved-grid';
      favorites.forEach(id => list.append(createProductCard(productById.get(id), true)));
      panelContent.append(list);
    } else {
      cart.forEach((line, index) => {
        const product = productById.get(line.id);
        const row = document.createElement('article');
        row.className = 'cart-line';
        row.dataset.category = product.category;
        row.innerHTML = `<div class="product-image"><img src="${product.image}" alt="${productName(product)}" width="100" height="110"></div><div class="cart-line-info"><h3>${productName(product)}</h3><p>${line.size ? `${t('product.size')}: ${line.size}` : t('product.oneSize')}</p><p>${money(product.price)} / ${t('product.each')}</p><div class="quantity-control"><button type="button" data-quantity="${index}" data-delta="-1" data-focus="minus-${index}" aria-label="${t('cart.minus', { name: productName(product) })}" ${line.quantity === 1 ? 'disabled' : ''}>−</button><span aria-label="${t('cart.quantity')}">${line.quantity}</span><button type="button" data-quantity="${index}" data-delta="1" data-focus="plus-${index}" aria-label="${t('cart.plus', { name: productName(product) })}" ${line.quantity === 99 ? 'disabled' : ''}>+</button></div><strong>${money(product.price * line.quantity)}</strong><button type="button" class="remove-line" data-remove="${index}" data-focus="remove-${index}" aria-label="${t('cart.removeLabel', { name: productName(product), size: line.size ? t('cart.sizeSuffix', { size: line.size }) : '' })}">${t('cart.remove')}</button></div>`;
        handleImage(row.querySelector('img'));
        panelContent.append(row);
      });
    }
    document.querySelector('#cart-total').textContent = money(cart.reduce((sum, line) => sum + productById.get(line.id).price * line.quantity, 0));
    if (focusKey) {
      const target = Array.from(panelContent.querySelectorAll('[data-focus]')).find(button => button.dataset.focus === focusKey && !button.disabled);
      (target || panel.querySelector('.panel-close')).focus({ preventScroll: true });
    }
  }
  function openPanel(mode, opener) {
    closeMenu();
    searchPanel.hidden = true;
    searchButton.setAttribute('aria-expanded', 'false');
    searchButton.setAttribute('aria-label', t('search.open'));
    document.querySelector('#panel-status').textContent = '';
    panelMode = mode;
    panelOpener = opener;
    renderPanel();
    lockedScrollY = window.scrollY;
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.classList.add('panel-open');
    panel.showModal(); // Native modal supplies background inertness and keyboard focus containment.
    opener.setAttribute('aria-expanded', 'true');
    panel.querySelector('.panel-close').focus();
  }
  function closePanel() { if (panel.open) panel.close(); }
  panel.addEventListener('close', () => {
    document.body.classList.remove('panel-open');
    document.body.style.top = '';
    window.scrollTo({ top: lockedScrollY, behavior: 'instant' });
    cartToggle.setAttribute('aria-expanded', 'false');
    favoritesToggle.setAttribute('aria-expanded', 'false');
    panelOpener?.focus({ preventScroll: true });
  });
  panel.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = Array.from(panel.querySelectorAll('button:not(:disabled), select, a[href], input, [tabindex="0"]')).filter(control => control.getClientRects().length);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  panel.addEventListener('cancel', event => { event.preventDefault(); closePanel(); });
  panel.addEventListener('click', event => {
    const bounds = panel.getBoundingClientRect();
    if (event.target === panel && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) closePanel();
  });
  panel.querySelector('.panel-close').addEventListener('click', closePanel);
  panel.querySelector('.continue-shopping').addEventListener('click', closePanel);
  cartToggle.addEventListener('click', () => openPanel('cart', cartToggle));
  favoritesToggle.addEventListener('click', () => openPanel('favorites', favoritesToggle));
  document.addEventListener('submit', event => {
    const form = event.target.closest('[data-add]');
    if (!form) return;
    event.preventDefault();
    const product = productById.get(form.dataset.add);
    const size = needsSize(product) ? form.elements.size.value : null;
    if (needsSize(product) && !product.sizes.includes(size)) {
      form.querySelector('.size-error').textContent = t('product.sizeRequired');
      form.elements.size.setAttribute('aria-invalid', 'true');
      form.elements.size.focus();
      return;
    }
    form.querySelector('.size-error')?.replaceChildren();
    form.elements.size?.removeAttribute('aria-invalid');
    const existing = cart.find(line => line.id === product.id && line.size === size);
    if (existing?.quantity === 99) { notify('notice.limit'); return; }
    if (existing) existing.quantity++;
    else cart.push({ id: product.id, size, quantity: 1 });
    persist('cart'); updateShop();
    notify('notice.added', { id: product.id, name: productName(product), size: size ? ` · ${size}` : '' });
  });
  document.addEventListener('click', event => {
    const favorite = event.target.closest('[data-favorite]');
    if (favorite) {
      const id = favorite.dataset.favorite;
      const removed = favorites.delete(id);
      if (!removed) favorites.add(id);
      persist('favorites'); updateShop();
      if (panel.open && panelMode === 'favorites') {
        const cards = Array.from(panelContent.querySelectorAll('[data-favorite]'));
        const position = cards.indexOf(favorite);
        renderPanel();
        const remaining = panelContent.querySelectorAll('[data-favorite]');
        (remaining[Math.min(position, remaining.length - 1)] || panel.querySelector('.panel-close')).focus({ preventScroll: true });
      }
      notify(removed ? 'notice.favoriteRemoved' : 'notice.favoriteAdded');
    }
    const quantity = event.target.closest('[data-quantity]');
    const remove = event.target.closest('[data-remove]');
    if ((quantity && !quantity.disabled) || remove) {
      const index = Number(quantity ? quantity.dataset.quantity : remove.dataset.remove);
      if (!cart[index]) return;
      if (remove) cart.splice(index, 1);
      else cart[index].quantity = Math.max(1, Math.min(99, cart[index].quantity + Number(quantity.dataset.delta)));
      persist('cart'); updateShop(); renderPanel((quantity || remove).dataset.focus);
      notify(remove ? 'notice.removed' : 'notice.quantity');
    }
    const view = event.target.closest('[data-view]');
    const catalogLink = event.target.closest('.empty-catalog');
    if (view || catalogLink) {
      closePanel();
      if (view) {
        state.category = 'all'; state.query = ''; state.newOnly = false; searchInput.value = '';
        renderProducts();
      }
      // Let the dialog's close event restore page position before navigating.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const target = view ? Array.from(grid.children).find(card => card.dataset.productId === view.dataset.view) : document.querySelector('#catalog');
        target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
        const focusTarget = target.querySelector('.product-purchase select, .product-purchase button') || target;
        if (!focusTarget.hasAttribute('tabindex') && focusTarget === target) focusTarget.tabIndex = -1;
        focusTarget.focus({ preventScroll: true });
      }));
    }
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      closePanel();
      cart = readStored('cart');
      favorites = new Set(readStored('favorites'));
      updateShop();
    }
  });
  window.addEventListener('storage', event => {
    if (event.key !== null && !Object.values(storageKeys).includes(event.key)) return;
    if (event.key === storageKeys.cart || event.key === null) cart = readStored('cart');
    if (event.key === storageKeys.favorites || event.key === null) favorites = new Set(readStored('favorites'));
    updateShop();
    if (panel.open) renderPanel();
  });

  function closeMenu() {
    menu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', t('nav.menuOpen'));
  }
  menuButton.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', t(open ? 'nav.menuClose' : 'nav.menuOpen'));
  });
  menu.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || panel.open) return;
    if (!menu.hidden) { closeMenu(); menuButton.focus(); }
    if (!searchPanel.hidden) { searchPanel.hidden = true; searchButton.setAttribute('aria-expanded', 'false');
    searchButton.setAttribute('aria-label', t('search.open')); searchButton.focus(); }
  });
  document.addEventListener('click', event => { if (!event.target.closest('.header')) closeMenu(); });
  window.matchMedia('(min-width: 901px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
  searchButton.addEventListener('click', () => {
    searchPanel.hidden = !searchPanel.hidden;
    searchButton.setAttribute('aria-label', t(searchPanel.hidden ? 'search.open' : 'search.close'));
    searchButton.setAttribute('aria-expanded', String(!searchPanel.hidden));
    if (!searchPanel.hidden) { closeMenu(); searchInput.focus(); }
  });

  function handleImage(image) {
    image.addEventListener('error', () => {
      if (image.getAttribute('src') !== 'images/placeholder.svg') image.src = 'images/placeholder.svg';
      image.classList.add('image-fallback');
    });
  }
  document.querySelectorAll('img').forEach(handleImage);
  function renderProducts() {
    const visible = products.filter(product =>
      (state.category === 'all' || product.category === state.category) &&
      (!state.newOnly || product.isNew) &&
      `${product.brand} ${product.name} ${i18n.product(product, 'name', 'uk')} ${i18n.product(product, 'name', 'ru')} ${i18n.product(product, 'name', 'en')} ${t(`category.${product.category}`, {}, 'uk')} ${t(`category.${product.category}`, {}, 'ru')} ${t(`category.${product.category}`, {}, 'en')}`.toLocaleLowerCase().includes(state.query)
    );
    grid.replaceChildren();
    visible.forEach(product => grid.append(createProductCard(product)));
    document.querySelector('#empty-state').hidden = visible.length > 0;
    const count = visible.length;
    document.querySelector('#product-count').textContent = i18n.count(count) + (state.newOnly ? t('catalog.newSuffix') : '');
    document.querySelectorAll('[data-filter]').forEach(button => {
      const selected = button.dataset.filter === state.category;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    state.category = button.dataset.filter;
    state.newOnly = false;
    renderProducts();
  }));
  document.querySelectorAll('[data-category-link]').forEach(link => link.addEventListener('click', () => {
    state.category = link.dataset.categoryLink;
    state.newOnly = false;
    if (link.id === 'hero-cta') { state.query = ''; searchInput.value = ''; }
    renderProducts();
  }));
  document.querySelectorAll('[data-new-link]').forEach(link => link.addEventListener('click', () => {
    state.category = 'all';
    state.newOnly = true;
    renderProducts();
  }));
  searchInput.addEventListener('input', () => { state.query = searchInput.value.trim().toLocaleLowerCase(); renderProducts(); });
  searchPanel.addEventListener('submit', event => { event.preventDefault(); document.querySelector('#catalog').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); });

  document.addEventListener('change', event => {
    if (event.target.matches('.product-purchase select')) {
      event.target.removeAttribute('aria-invalid');
      event.target.closest('form').querySelector('.size-error').textContent = '';
    }
  });
  window.addEventListener('languagechange', () => {
    const selected = new Map(Array.from(document.querySelectorAll('.product-purchase select')).map(select => [select.id, { value: select.value, invalid: select.getAttribute('aria-invalid') === 'true' }]));
    const active = document.activeElement;
    const activeId = active.id;
    const activeFocus = active.dataset.focus;
    renderProducts();
    if (panel.open) renderPanel(activeFocus);
    selected.forEach((selection, id) => {
      const select = document.getElementById(id);
      if (!select) return;
      select.value = selection.value;
      if (selection.invalid) { select.setAttribute('aria-invalid', 'true'); select.closest('form').querySelector('.size-error').textContent = t('product.sizeRequired'); }
    });
    if (activeId && document.getElementById(activeId)) document.getElementById(activeId).focus({ preventScroll: true });
    updateShop();
    menuButton.setAttribute('aria-label', t(menu.hidden ? 'nav.menuOpen' : 'nav.menuClose'));
    searchButton.setAttribute('aria-label', t(searchPanel.hidden ? 'search.open' : 'search.close'));
    showSlide(slideIndex, false, false);
    scheduleSlide();
    if (lastNotice) {
      if (lastNotice.params.id) lastNotice.params.name = productName(productById.get(lastNotice.params.id));
      const message = t(lastNotice.key, lastNotice.params);
      document.querySelector('#shop-notification').textContent = panel.open ? '' : message;
      document.querySelector('#panel-status').textContent = panel.open ? message : '';
    }
  });

  // One countdown drives both the slide timeout and its visual progress.
  const hero = document.querySelector('.hero');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const slides = [
    { category: 'sneakers', image: 'images/hero.jpg' },
    { category: 'clothing', image: 'images/product-08.jpg' },
    { category: 'accessories', image: 'images/product-04.jpg' }
  ];
  slides.forEach(slide => { const preload = new Image(); preload.src = slide.image; });
  let slideIndex = 0;
  let slideTimer = null;
  let remaining = 5000;
  let startedAt = null;
  let progressAnimation = null;
  let pageAway = false;
  let touchStart = null;
  let ghost = null;
  let fade = null;
  let contentAnimations = [];
  let transitionTimer = null;
  const indicators = Array.from(hero.querySelectorAll('[data-slide-to]'));
  function updateIndicators() {
    indicators.forEach((button, index) => {
      button.setAttribute('aria-current', String(index === slideIndex));
      button.setAttribute('aria-label', t('hero.slide', { index: index + 1 }));
      if (index !== slideIndex) button.querySelector('.slide-progress').style.transform = 'scaleX(0)';
    });
  }
  function scheduleSlide(reset = false) {
    const now = performance.now();
    if (startedAt !== null) remaining = Math.max(0, remaining - (now - startedAt));
    startedAt = null;
    clearTimeout(slideTimer); slideTimer = null;
    progressAnimation?.cancel(); progressAnimation = null;
    if (reset === true) remaining = 5000;
    const fill = indicators[slideIndex].querySelector('.slide-progress');
    const fraction = motion.matches ? 1 : 1 - remaining / 5000;
    fill.style.transform = `scaleX(${fraction})`;
    const keyboardFocus = hero.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
    const paused = document.hidden || pageAway || keyboardFocus || panel.open || touchStart;
    hero.dataset.playback = motion.matches ? 'reduced' : paused ? 'paused' : 'running';
    if (motion.matches || paused) return;
    startedAt = now;
    progressAnimation = fill.animate([
      { transform: `scaleX(${fraction})` }, { transform: 'scaleX(1)' }
    ], { duration: remaining, easing: 'linear', fill: 'forwards' });
    slideTimer = setTimeout(() => {
      startedAt = null; slideTimer = null;
      showSlide(slideIndex + 1);
      scheduleSlide(true);
    }, remaining);
  }
  function finishTransition() {
    clearTimeout(transitionTimer); transitionTimer = null;
    if (fade) { fade.onfinish = null; fade.cancel(); fade = null; }
    ghost?.remove(); ghost = null;
    contentAnimations.forEach(animation => animation.cancel());
    contentAnimations = [];
  }
  function showSlide(index, announce = false, animate = true) {
    const nextIndex = (index + slides.length) % slides.length;
    const shouldAnimate = animate && nextIndex !== slideIndex && !motion.matches;
    finishTransition();
    if (shouldAnimate) {
      // Snapshot the entire outgoing composition; its background, photo, heading and CTA fade together.
      ghost = hero.cloneNode(true);
      ghost.classList.add('slider-ghost');
      ghost.removeAttribute('tabindex');
      ghost.removeAttribute('aria-labelledby');
      ghost.setAttribute('aria-hidden', 'true');
      ghost.inert = true;
      const sourceNodes = [hero, ...hero.querySelectorAll('*')];
      const snapshotNodes = [ghost, ...ghost.querySelectorAll('*')];
      snapshotNodes.forEach((node, index) => {
        const style = getComputedStyle(sourceNodes[index]);
        node.style.color = style.color;
        node.style.backgroundColor = style.backgroundColor;
        node.style.borderColor = style.borderColor;
      });
      for (const node of [ghost, ...ghost.querySelectorAll('*')]) {
        node.removeAttribute('id');
      }
      const ghostControls = ghost.querySelector('.slider-controls');
      ghostControls.style.height = `${hero.querySelector('.slider-controls').getBoundingClientRect().height}px`;
      ghostControls.replaceChildren();
    }
    slideIndex = nextIndex;
    const slide = slides[slideIndex];
    hero.dataset.slide = slideIndex;
    const title = document.querySelector('#hero-title');
    title.dataset.i18nHtml = `hero.${slideIndex}.title`;
    title.innerHTML = t(title.dataset.i18nHtml);
    const description = hero.querySelector('.hero-description');
    description.dataset.i18nHtml = `hero.${slideIndex}.description`;
    description.innerHTML = t(description.dataset.i18nHtml);
    const image = hero.querySelector('.hero-visual > img');
    image.src = slide.image;
    image.dataset.i18nAlt = `hero.${slideIndex}.alt`;
    image.alt = t(image.dataset.i18nAlt);
    image.classList.remove('image-fallback');
    const cta = document.querySelector('#hero-cta');
    cta.dataset.categoryLink = slide.category;
    cta.innerHTML = `${t(`hero.${slideIndex}.cta`)} <span aria-hidden="true">↗</span>`;
    updateIndicators();
    if (announce) document.querySelector('#hero-announcement').textContent = t('hero.announce', { index: slideIndex + 1, name: categoryName(slide.category) });
    else document.querySelector('#hero-announcement').textContent = '';
    if (shouldAnimate) {
      hero.append(ghost);
      fade = ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 750, easing: 'ease-in-out', fill: 'forwards' });
      fade.onfinish = finishTransition;
      transitionTimer = setTimeout(finishTransition, 750);
      contentAnimations = [hero.querySelector('.hero-copy'), image].map(element => element.animate([{ opacity: .3 }, { opacity: 1 }], { duration: 750, easing: 'ease-in-out' }));
    }
  }
  function manualSlide(delta) { showSlide(slideIndex + delta, true); scheduleSlide(true); }
  document.querySelector('#hero-prev').addEventListener('click', () => manualSlide(-1));
  document.querySelector('#hero-next').addEventListener('click', () => manualSlide(1));
  indicators.forEach(button => button.addEventListener('click', () => {
    showSlide(Number(button.dataset.slideTo), true);
    scheduleSlide(true);
  }));
  hero.addEventListener('focusin', scheduleSlide);
  hero.addEventListener('focusout', () => queueMicrotask(scheduleSlide));
  hero.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); manualSlide(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  hero.addEventListener('touchstart', event => {
    touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
    scheduleSlide();
  }, { passive: true });
  hero.addEventListener('touchend', event => {
    if (!touchStart || !event.changedTouches.length) { touchStart = null; scheduleSlide(); return; }
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.4) manualSlide(dx < 0 ? 1 : -1);
    else scheduleSlide();
  }, { passive: true });
  hero.addEventListener('touchcancel', () => { touchStart = null; scheduleSlide(); });
  document.addEventListener('visibilitychange', scheduleSlide);
  motion.addEventListener('change', () => { finishTransition(); scheduleSlide(true); });
  new MutationObserver(scheduleSlide).observe(panel, { attributes: true, attributeFilter: ['open'] });
  window.addEventListener('pagehide', () => { pageAway = true; scheduleSlide(); finishTransition(); });
  window.addEventListener('pageshow', () => { pageAway = false; scheduleSlide(); });
  showSlide(0, false, false);
  scheduleSlide();
  document.querySelector('#year').textContent = new Date().getFullYear();
  if (!products.length) document.querySelector('.phase-note').textContent = t('catalog.error');
  renderProducts();
  updateShop();
})();

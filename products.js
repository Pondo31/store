/* Демонстрационные данные. Названия моделей, цены и размеры не являются
   предложением о продаже. Изображения иллюстративные, источник — Unsplash.
   Стабильные id и отдельные поля подготовлены для будущих корзины и избранного. */
window.PONDO_PRODUCTS = Object.freeze([
  { id: 'p01', brand: 'NIKE', name: 'Air Everyday', price: 5490, category: 'sneakers', sizes: ['40', '41', '42', '43', '44'], image: 'images/product-01.jpg', isNew: true, createdAt: '2026-11-12', color: 'Белый / песочный' },
  { id: 'p02', brand: 'NEW BALANCE', name: 'City Runner 02', price: 6290, category: 'sneakers', sizes: ['38', '39', '40', '41', '42'], image: 'images/product-02.jpg', isNew: true, createdAt: '2026-11-11', color: 'Серый / молочный' },
  { id: 'p03', brand: 'PONDO CONCEPT', name: 'Essential Cotton Tee', price: 1490, category: 'clothing', sizes: ['XS', 'S', 'M', 'L', 'XL'], image: 'images/product-03.jpg', isNew: false, createdAt: '2026-10-20', color: 'Молочный' },
  { id: 'p04', brand: 'PONDO CONCEPT', name: 'Everyday Backpack', price: 2790, category: 'accessories', sizes: ['ONE SIZE'], image: 'images/product-04.jpg', isNew: false, createdAt: '2026-10-19', color: 'Графит' },
  { id: 'p05', brand: 'ADIDAS', name: 'Court Classic', price: 4790, category: 'sneakers', sizes: ['39', '40', '41', '42', '43'], image: 'images/product-05.jpg', isNew: true, createdAt: '2026-11-10', color: 'Белый / чёрный' },
  { id: 'p06', brand: 'PONDO CONCEPT', name: 'Relaxed Denim', price: 3290, category: 'clothing', sizes: ['S', 'M', 'L', 'XL'], image: 'images/product-06.jpg', isNew: false, createdAt: '2026-10-18', color: 'Синий' },
  { id: 'p07', brand: 'CONVERSE', name: 'Canvas High', price: 3990, category: 'sneakers', sizes: ['37', '38', '39', '40', '41'], image: 'images/product-07.jpg', isNew: false, createdAt: '2026-10-17', color: 'Чёрный / белый' },
  { id: 'p08', brand: 'PONDO CONCEPT', name: 'Weekend Hoodie', price: 2990, category: 'clothing', sizes: ['S', 'M', 'L', 'XL'], image: 'images/product-08.jpg', isNew: true, createdAt: '2026-11-09', color: 'Песочный' },
  { id: 'p09', brand: 'PONDO CONCEPT', name: 'Daily Cap', price: 990, category: 'accessories', sizes: ['ONE SIZE'], image: 'images/product-09.jpg', isNew: false, createdAt: '2026-10-16', color: 'Бежевый' },
  { id: 'p10', brand: 'PUMA', name: 'Street Motion', price: 4490, category: 'sneakers', sizes: ['40', '41', '42', '43', '44'], image: 'images/product-10.jpg', isNew: false, createdAt: '2026-10-15', color: 'Белый / красный' },
  { id: 'p11', brand: 'PONDO CONCEPT', name: 'Studio Sunglasses', price: 1890, category: 'accessories', sizes: ['ONE SIZE'], image: 'images/product-11.jpg', isNew: true, createdAt: '2026-11-08', color: 'Чёрный' },
  { id: 'p12', brand: 'PONDO CONCEPT', name: 'Layered Overshirt', price: 3590, category: 'clothing', sizes: ['S', 'M', 'L'], image: 'images/product-12.jpg', isNew: false, createdAt: '2026-10-14', color: 'Оливковый' }
].map(product => Object.freeze({ ...product, sizes: Object.freeze(product.sizes) })));

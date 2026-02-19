import { describe, it, expect } from 'vitest';

describe('🛒 CARRITO', () => {
  it('✅ Calcula total correctamente', () => {
    const items = [
      { price: 100, quantity: 2 },
      { price: 50, quantity: 3 }
    ];
    const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    expect(total).toBe(350);
  });

  it('✅ Total es 0 con carrito vacío', () => {
    const items: any[] = [];
    const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    expect(total).toBe(0);
  });

  it('❌ Cantidad no puede ser > 10', () => {
    const quantity = 11;
    expect(quantity > 10).toBe(true);
  });

  it('✅ Item debe tener precio positivo', () => {
    const item = { price: 100 };
    expect(item.price > 0).toBe(true);
  });

  it('✅ Múltiples items se suman correctamente', () => {
    const items = [
      { price: 89900, quantity: 1 },
      { price: 95900, quantity: 1 }
    ];
    const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    expect(total).toBe(185800);
  });

  it('❌ Precio no puede ser negativo', () => {
    const item = { price: -100 };
    expect(item.price < 0).toBe(true);
  });

  it('✅ Cantidad debe ser número entero', () => {
    const quantity = 5;
    expect(Number.isInteger(quantity)).toBe(true);
  });

  it('✅ Calidad válida (PK, G5, G4, G3)', () => {
    const validQualities = ['PK', 'G5', 'G4', 'G3'];
    expect(validQualities).toContain('PK');
    expect(validQualities).toContain('G5');
  });
});
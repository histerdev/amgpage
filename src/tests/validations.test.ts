import { describe, it, expect } from 'vitest';
import { 
  checkoutPayloadSchema,
  cartItemSchema,
  checkoutCustomerSchema,
  rutSchema,
  phoneSchema
} from '../utils/validation';

describe('✅ VALIDACIONES ZOD TESTS', () => {
  
  describe('RUT Schema', () => {
    it('✅ Debe aceptar RUT válido con formato', () => {
      const result = rutSchema.safeParse('23.222.469-K');
      expect(result.success).toBe(true);
    });

    it('❌ Debe rechazar RUT con dígito verificador inválido', () => {
      const result = rutSchema.safeParse('23.222.469-X');
      expect(result.success).toBe(false);
    });

    it('✅ Debe aceptar RUT sin puntos', () => {
      const result = rutSchema.safeParse('23222469-K');
      expect(result.success).toBe(true);
    });
  });

  describe('Phone Schema', () => {
    it('✅ Debe aceptar formato +56', () => {
      const result = phoneSchema.safeParse('+56995888474');
      expect(result.success).toBe(true);
    });

    it('✅ Debe aceptar 9 dígitos sin +56', () => {
      const result = phoneSchema.safeParse('995888474');
      expect(result.success).toBe(true);
    });

    it('❌ Debe rechazar teléfono muy corto', () => {
      const result = phoneSchema.safeParse('99588');
      expect(result.success).toBe(false);
    });

    it('❌ Debe rechazar teléfono que no empieza en 9', () => {
      const result = phoneSchema.safeParse('+56895888474');
      expect(result.success).toBe(false);
    });
  });

  describe('Cart Item Schema', () => {
    it('✅ Debe validar item de carrito correcto', () => {
      const item = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Jordan Retro 6',
        quality: 'PK',
        size: '44',
        quantity: 1,
        price: 89900,
        productId: 'jordan-6-retro-black-infrared'
      };
      
      const result = cartItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    });

    it('❌ Debe rechazar calidad inválida', () => {
      const item = {
        id: '123',
        name: 'Jordan',
        quality: 'INVALID',
        size: '44',
        quantity: 1,
        price: 100
      };
      
      const result = cartItemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });

    it('❌ Debe rechazar cantidad mayor a 10', () => {
      const item = {
        id: '123',
        name: 'Jordan',
        quality: 'PK',
        size: '44',
        quantity: 11,
        price: 100
      };
      
      const result = cartItemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });

    it('❌ Debe rechazar precio negativo', () => {
      const item = {
        id: '123',
        name: 'Jordan',
        quality: 'PK',
        size: '44',
        quantity: 1,
        price: -100
      };
      
      const result = cartItemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });

    it('❌ Debe rechazar sin nombre', () => {
      const item = {
        id: '123',
        name: '',
        quality: 'PK',
        size: '44',
        quantity: 1,
        price: 100
      };
      
      const result = cartItemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });
  });

  describe('Checkout Customer Schema', () => {
    it('✅ Debe validar cliente correcto', () => {
      const customer = {
        firstName: 'Alonso',
        lastName: 'Morales',
        email: 'test@example.com',
        rut: '23.222.469-K',
        phone: '+56995888474',
        region: 'Los Lagos',
        city: 'Puerto Varas',
        address: 'Calle Falsa 123'
      };
      
      const result = checkoutCustomerSchema.safeParse(customer);
      expect(result.success).toBe(true);
    });

    it('❌ Debe rechazar email inválido', () => {
      const customer = {
        firstName: 'Test',
        lastName: 'User',
        email: 'invalid-email',
        rut: '23.222.469-K',
        phone: '+56995888474',
        region: 'Region',
        city: 'City',
        address: 'Address'
      };
      
      const result = checkoutCustomerSchema.safeParse(customer);
      expect(result.success).toBe(false);
    });

    it('❌ Debe rechazar nombre muy corto', () => {
      const customer = {
        firstName: 'A',
        lastName: 'B',
        email: 'test@example.com',
        rut: '23.222.469-K',
        phone: '+56995888474',
        region: 'Region',
        city: 'City',
        address: 'Address'
      };
      
      const result = checkoutCustomerSchema.safeParse(customer);
      expect(result.success).toBe(false);
    });

    it('❌ Debe rechazar RUT inválido', () => {
      const customer = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        rut: 'INVALID',
        phone: '+56995888474',
        region: 'Region',
        city: 'City',
        address: 'Address'
      };
      
      const result = checkoutCustomerSchema.safeParse(customer);
      expect(result.success).toBe(false);
    });
  });

  describe('Checkout Payload Schema', () => {
    it('✅ Debe validar payload de checkout completo', () => {
      const payload = {
        items: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Jordan',
            quality: 'PK',
            size: '44',
            quantity: 1,
            price: 100,
            productId: 'jordan-1'
          }
        ],
        customer: {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          rut: '23.222.469-K',
          phone: '+56995888474',
          region: 'Region',
          city: 'City',
          address: 'Address'
        }
      };
      
      const result = checkoutPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('❌ Debe rechazar payload sin items', () => {
      const payload = {
        items: [],
        customer: {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          rut: '23.222.469-K',
          phone: '+56995888474',
          region: 'Region',
          city: 'City',
          address: 'Address'
        }
      };
      
      const result = checkoutPayloadSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('❌ Debe rechazar sin customer', () => {
      const payload = {
        items: [
          {
            id: '123',
            name: 'Jordan',
            quality: 'PK',
            size: '44',
            quantity: 1,
            price: 100
          }
        ]
      };
      
      const result = checkoutPayloadSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });
});
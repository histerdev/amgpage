interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  retryAfter?: number;
  message?: string;
}

// ✅ ALMACENAMIENTO EN MEMORIA
const rateLimitStore: RateLimitStore = {};

/**
 * ✅ LIMPIAR REGISTROS EXPIRADOS
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const key in rateLimitStore) {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  }
}

/**
 * ✅ RATE LIMIT GENÉRICO
 */
function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  cleanupExpiredEntries();

  const now = Date.now();

  // Si no existe el registro, crear uno nuevo
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = {
      count: 1,
      resetTime: now + windowMs * 1000,
    };

    return {
      success: true,
      remaining: maxRequests - 1,
      message: `Solicitud permitida (1/${maxRequests})`,
    };
  }

  const entry = rateLimitStore[key];

  // Si la ventana expiró, resetear
  if (entry.resetTime < now) {
    entry.count = 1;
    entry.resetTime = now + windowMs * 1000;

    return {
      success: true,
      remaining: maxRequests - 1,
      message: `Solicitud permitida (1/${maxRequests})`,
    };
  }

  // Incrementar contador
  entry.count++;

  // Si se excedió el límite
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

    return {
      success: false,
      remaining: 0,
      retryAfter,
      message: `Demasiados intentos. Intenta de nuevo en ${retryAfter} segundos.`,
    };
  }

  return {
    success: true,
    remaining: maxRequests - entry.count,
    message: `Solicitud permitida (${entry.count}/${maxRequests})`,
  };
}

/**
 * ✅ RATE LIMIT POR IP
 * 10 intentos cada 15 minutos
 */
export function checkRateLimitByIP(ip: string): RateLimitResult {
  const key = `rate-limit:ip:${ip}`;
  const maxRequests = 10;
  const windowMs = 15 * 60; // 15 minutos

  return checkRateLimit(key, maxRequests, windowMs);
}

/**
 * ✅ RATE LIMIT POR EMAIL
 * 5 intentos cada 1 hora
 */
export function checkRateLimitByEmail(email: string): RateLimitResult {
  const key = `rate-limit:email:${email.toLowerCase()}`;
  const maxRequests = 5;
  const windowMs = 60 * 60; // 1 hora

  return checkRateLimit(key, maxRequests, windowMs);
}

/**
 * ✅ LOG DE INTENTOS FALLIDOS (en memoria)
 */
const failedAttemptsLog: string[] = [];

export function logFailedAttempt(
  ip: string,
  email: string,
  reason: string,
): void {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] IP: ${ip} | Email: ${email} | Reason: ${reason}`;

  failedAttemptsLog.push(logEntry);

  // Guardar solo los últimos 1000 intentos fallidos
  if (failedAttemptsLog.length > 1000) {
    failedAttemptsLog.shift();
  }

  console.warn(`⚠️ Failed attempt logged: ${logEntry}`);
}

/**
 * ✅ OBTENER LOG DE INTENTOS FALLIDOS (para debugging)
 */
export function getFailedAttemptsLog(): string[] {
  return failedAttemptsLog;
}

/**
 * ✅ OBTENER ESTADO ACTUAL DE RATE LIMITS
 */
export function getRateLimitStatus(): RateLimitStore {
  cleanupExpiredEntries();
  return rateLimitStore;
}

/// <reference types="astro/client" />
interface ImportMetaEnv {
  // Supabase
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  
  // Site URL (para URLs dinámicas en API routes)
  readonly PUBLIC_SITE_URL: string;  // ✅ NUEVO
  
  // Backend only (server-side)
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  
  // Mercado Pago
  readonly MP_ACCESS_TOKEN: string;
  readonly MP_WEBHOOK_SECRET: string;
  
  // Telegram
  readonly TELEGRAM_BOT_TOKEN: string;
  readonly ADMIN_TELEGRAM_ID: string;
  
  // Cron Jobs
  readonly CRON_SECRET: string;
  
  // Email (opcional)
  readonly RESEND_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_DLYvvMNA.mjs';
import { manifest } from './manifest_DuSmnhHM.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/admin/pedido/_id_.astro.mjs');
const _page2 = () => import('./pages/admin.astro.mjs');
const _page3 = () => import('./pages/api/create-payment.astro.mjs');
const _page4 = () => import('./pages/api/cron/process-notifications.astro.mjs');
const _page5 = () => import('./pages/api/webhook.astro.mjs');
const _page6 = () => import('./pages/auth/callback.astro.mjs');
const _page7 = () => import('./pages/calidades.astro.mjs');
const _page8 = () => import('./pages/checkout.astro.mjs');
const _page9 = () => import('./pages/coleccion.astro.mjs');
const _page10 = () => import('./pages/faq.astro.mjs');
const _page11 = () => import('./pages/login.astro.mjs');
const _page12 = () => import('./pages/pago-error.astro.mjs');
const _page13 = () => import('./pages/pago-exitoso.astro.mjs');
const _page14 = () => import('./pages/pedidos.astro.mjs');
const _page15 = () => import('./pages/perfil.astro.mjs');
const _page16 = () => import('./pages/producto/_id_.astro.mjs');
const _page17 = () => import('./pages/registro.astro.mjs');
const _page18 = () => import('./pages/sobre-nosotros.astro.mjs');
const _page19 = () => import('./pages/sql-database.astro.mjs');
const _page20 = () => import('./pages/terminos-y-condiciones.astro.mjs');
const _page21 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/admin/pedido/[id].astro", _page1],
    ["src/pages/admin/index.astro", _page2],
    ["src/pages/api/create-payment.ts", _page3],
    ["src/pages/api/cron/process-notifications.ts", _page4],
    ["src/pages/api/webhook.ts", _page5],
    ["src/pages/auth/callback.ts", _page6],
    ["src/pages/calidades.astro", _page7],
    ["src/pages/checkout.astro", _page8],
    ["src/pages/coleccion.astro", _page9],
    ["src/pages/faq.astro", _page10],
    ["src/pages/login.astro", _page11],
    ["src/pages/pago-error.astro", _page12],
    ["src/pages/pago-exitoso.astro", _page13],
    ["src/pages/pedidos.astro", _page14],
    ["src/pages/perfil.astro", _page15],
    ["src/pages/producto/[id].astro", _page16],
    ["src/pages/registro.astro", _page17],
    ["src/pages/sobre-nosotros.astro", _page18],
    ["src/pages/sql-database.astro", _page19],
    ["src/pages/terminos-y-condiciones.astro", _page20],
    ["src/pages/index.astro", _page21]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_astro-internal_middleware.mjs')
});
const _args = {
    "middlewareSecret": "1ee51b12-e72a-4736-b46e-d14bcfddb9b1",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) ;

export { __astrojsSsrVirtualEntry as default, pageMap };

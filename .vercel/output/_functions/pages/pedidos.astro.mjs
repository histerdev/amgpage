/* empty css                                 */
import { f as createComponent, k as renderComponent, l as renderScript, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_C0Nqi1mF.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_CwmfnwTk.mjs';
export { renderers } from '../renderers.mjs';

const prerender = false;
const $$Pedidos = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Mis Pedidos | AMG" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="max-w-5xl mx-auto px-6 py-20 font-['Inter'] text-black"> <h1 class="text-5xl font-[900] uppercase italic tracking-tighter mb-12">Mis Pedidos</h1> <div id="orders-list" class="space-y-12"> <p class="font-black uppercase text-gray-400 animate-pulse text-sm tracking-widest">Cargando pedidos...</p> </div> </main> ` })} ${renderScript($$result, "C:/Users/h1495/Desktop/AMGWEB/src/pages/pedidos.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/h1495/Desktop/AMGWEB/src/pages/pedidos.astro", void 0);

const $$file = "C:/Users/h1495/Desktop/AMGWEB/src/pages/pedidos.astro";
const $$url = "/pedidos";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    default: $$Pedidos,
    file: $$file,
    prerender,
    url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

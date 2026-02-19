/* empty css                                 */
import { f as createComponent, k as renderComponent, l as renderScript, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_C0Nqi1mF.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_CwmfnwTk.mjs';
/* empty css                                  */
export { renderers } from '../renderers.mjs';

const prerender = false;
const $$Perfil = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Mi Perfil | Store", "data-astro-cid-7voezwz4": true }, { "default": async ($$result2) => renderTemplate` <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet"> ${maybeRenderHead()}<main class="max-w-6xl mx-auto px-6 py-12 md:py-24 font-['Inter',_sans-serif]" data-astro-cid-7voezwz4> <div class="grid grid-cols-1 lg:grid-cols-12 gap-12" data-astro-cid-7voezwz4> <div class="lg:col-span-4 space-y-8" data-astro-cid-7voezwz4> <div class="bg-black text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden group" data-astro-cid-7voezwz4> <div class="relative z-10" data-astro-cid-7voezwz4> <div class="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center text-3xl font-black mb-6 border border-zinc-700 uppercase" id="user-initial" data-astro-cid-7voezwz4>
--
</div> <h2 id="profile-email" class="text-sm font-bold opacity-60 tracking-widest uppercase mb-1" data-astro-cid-7voezwz4>Cargando...</h2> <p class="text-2xl font-[900] italic tracking-tighter leading-none mb-6" data-astro-cid-7voezwz4>MIEMBRO EXCLUSIVO</p> <button id="logout-btn" class="text-[10px] font-black uppercase tracking-[0.2em] bg-white text-black px-6 py-3 rounded-full hover:bg-zinc-200 transition-colors" data-astro-cid-7voezwz4>
Cerrar Sesión
</button> </div> <div class="absolute -right-10 -bottom-10 text-[120px] font-[900] italic text-zinc-900 select-none pointer-events-none" data-astro-cid-7voezwz4>
QC
</div> </div> <div class="bg-zinc-50 p-8 rounded-[40px] border border-zinc-100" data-astro-cid-7voezwz4> <h3 class="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-6" data-astro-cid-7voezwz4>Estadísticas</h3> <div class="grid grid-cols-2 gap-4" data-astro-cid-7voezwz4> <div class="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100" data-astro-cid-7voezwz4> <p class="text-[9px] font-black text-zinc-400 uppercase tracking-widest" data-astro-cid-7voezwz4>Pedidos</p> <p id="stats-orders" class="text-2xl font-[900] italic" data-astro-cid-7voezwz4>0</p> </div> <div class="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100" data-astro-cid-7voezwz4> <p class="text-[9px] font-black text-zinc-400 uppercase tracking-widest" data-astro-cid-7voezwz4>Inversión</p> <p id="stats-total" class="text-lg font-[900] italic leading-tight mt-1" data-astro-cid-7voezwz4>$0</p> </div> </div> </div> </div> <div class="lg:col-span-8 space-y-8" data-astro-cid-7voezwz4> <div class="flex items-end justify-between px-2" data-astro-cid-7voezwz4> <h3 class="text-4xl font-[900] uppercase italic tracking-tighter leading-none" data-astro-cid-7voezwz4>Historial de Pedidos</h3> </div> <div id="orders-container" class="space-y-4" data-astro-cid-7voezwz4> <div id="loading-state" class="p-20 text-center text-zinc-400 font-black uppercase tracking-widest animate-pulse" data-astro-cid-7voezwz4>
Sincronizando con base de datos...
</div> </div> </div> </div> </main> ` })}  ${renderScript($$result, "C:/Users/h1495/Desktop/AMGWEB/src/pages/perfil.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/h1495/Desktop/AMGWEB/src/pages/perfil.astro", void 0);

const $$file = "C:/Users/h1495/Desktop/AMGWEB/src/pages/perfil.astro";
const $$url = "/perfil";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    default: $$Perfil,
    file: $$file,
    prerender,
    url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

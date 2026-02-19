/* empty css                                       */
import { e as createAstro, f as createComponent, k as renderComponent, l as renderScript, r as renderTemplate, m as maybeRenderHead } from '../../../chunks/astro/server_C0Nqi1mF.mjs';
import 'piccolore';
import { $ as $$Layout } from '../../../chunks/Layout_CwmfnwTk.mjs';
export { renderers } from '../../../renderers.mjs';

const $$Astro = createAstro("https://amgpage.vercel.app");
const prerender = false;
const $$id = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$id;
  const { id } = Astro2.params;
  if (!id) return Astro2.redirect("/admin");
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": `Gesti\xF3n Pedido #${id?.slice(0, 5)}` }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="max-w-6xl mx-auto px-6 py-12 font-['Inter'] text-black"> <div class="flex justify-between items-center mb-8"> <h1 class="text-4xl font-[900] italic uppercase tracking-tighter">Control de Calidad (QC)</h1> <a href="/admin" class="text-[10px] font-black uppercase bg-gray-100 px-4 py-2 rounded-full hover:bg-black hover:text-white transition-all">Volver</a> </div> <div class="grid grid-cols-1 lg:grid-cols-3 gap-8"> <div class="lg:col-span-2 space-y-6" id="products-container"> <p class="font-black uppercase text-gray-400">Cargando expediente...</p> </div> <div class="space-y-6"> <div class="bg-black text-white p-8 rounded-[32px] sticky top-8 shadow-2xl"> <label class="block text-[10px] font-black uppercase text-zinc-500 mb-2">Estado General</label> <select id="global-status" class="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 text-white font-bold outline-none"> <option value="Procesando">Procesando</option> <option value="Esperando QC">Esperando QC</option> <option value="QC Listo">QC Listo</option> <option value="Enviado">Enviado</option> </select> <button id="save-all-btn" class="w-full bg-[#2ecc71] text-black py-5 rounded-2xl font-[900] uppercase italic tracking-widest hover:brightness-110">
Actualizar Pedido
</button> </div> </div> </div> </main> ` })} ${renderScript($$result, "C:/Users/h1495/Desktop/AMGWEB/src/pages/admin/pedido/[id].astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/h1495/Desktop/AMGWEB/src/pages/admin/pedido/[id].astro", void 0);

const $$file = "C:/Users/h1495/Desktop/AMGWEB/src/pages/admin/pedido/[id].astro";
const $$url = "/admin/pedido/[id]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$id,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

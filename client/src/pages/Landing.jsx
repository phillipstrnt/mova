import { ArrowRight, BarChart3, Boxes, Check, ChevronRight, Clock3, ShieldCheck, Smartphone, Sparkles, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const features = [
  { icon: Zap, title: "A faster checkout", description: "Search products, scan barcodes, apply discounts and complete a sale without slowing the queue." },
  { icon: Boxes, title: "Stock you can trust", description: "Keep an eye on stock, expiry dates and transfers across every branch from one workspace." },
  { icon: BarChart3, title: "Clear business picture", description: "See today’s sales, cashier activity, payment mix and product movement as work happens." },
  { icon: ShieldCheck, title: "The right access", description: "Give each cashier, manager and administrator the tools they need to do their work." },
];

const previewBars = [34, 47, 41, 62, 54, 78, 66, 92, 72, 100, 84, 96];

export default function Landing() {
  const { user } = useAuth();
  const actionPath = user ? "/app" : "/login";

  return (
    <main className="min-h-screen overflow-hidden bg-[#f8faff] text-slate-900">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link to="/" className="flex items-center gap-3" aria-label="MOVA home">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black tracking-tight text-white shadow-lg shadow-blue-600/20">M</span>
          <span><span className="block text-lg font-black tracking-tight">mova</span><span className="-mt-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Retail, in motion</span></span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
          <a href="#features" className="transition hover:text-blue-700">What MOVA does</a>
          <a href="#workflow" className="transition hover:text-blue-700">Built for your day</a>
        </nav>
        <Link to={actionPath} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700">
          {user ? "Open workspace" : "Sign in"}<ArrowRight size={16} />
        </Link>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 sm:px-8 md:pt-20 lg:grid-cols-[1.02fr_.98fr] lg:px-10 lg:pb-28 lg:pt-24">
        <div className="pointer-events-none absolute -left-40 top-6 h-96 w-96 rounded-full bg-blue-200/35 blur-3xl" />
        <div className="relative z-10 max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3.5 py-2 text-xs font-bold text-blue-700 shadow-sm"><Sparkles size={14} /> One calm place to run your store</div>
          <h1 className="text-[2.8rem] font-black leading-[1.04] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[4.3rem]">Your business,<br /><span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">running in rhythm.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">A clear, easy-to-use point of sale for the people behind every sale. Serve customers, keep stock moving and understand how your business is doing—all from one place.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to={actionPath} className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-extrabold text-white shadow-xl shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700">{user ? "Go to your workspace" : "Get started with MOVA"}<ArrowRight size={17} className="transition group-hover:translate-x-1" /></Link>
            <a href="#features" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:text-blue-700">Explore the features<ChevronRight size={16} /></a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-slate-500"><span className="inline-flex items-center gap-2"><Check size={15} className="text-emerald-500" /> Sales and inventory together</span><span className="inline-flex items-center gap-2"><Check size={15} className="text-emerald-500" /> Ready for multiple branches</span></div>
        </div>

        <div className="relative mx-auto w-full max-w-[590px] lg:ml-auto">
          <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-blue-200/55 via-indigo-100/40 to-violet-200/50 blur-2xl" />
          <div className="relative rotate-[1.2deg] rounded-[2rem] border border-white/80 bg-white p-3 shadow-[0_35px_90px_-35px_rgba(37,73,158,0.38)] sm:p-5">
            <div className="relative mb-3 h-36 overflow-hidden rounded-[1.4rem] sm:h-44">
              <img src="/images/market-hero.webp" alt="A colorful local produce market stall" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-950/20 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white sm:bottom-5 sm:left-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100">MOVA for your store</p><p className="mt-1 text-lg font-black tracking-tight sm:text-xl">Everyday retail, made clearer.</p></div>
              <span className="absolute right-4 top-4 rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur-sm">Made for real shops</span>
            </div>
            <div className="overflow-hidden rounded-[1.4rem] border border-slate-100 bg-[#f8faff]">
              <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">M</span><div><p className="text-sm font-extrabold">Good morning, Alex</p><p className="text-[11px] text-slate-400">Main branch · Today</p></div></div><span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live</span></div>
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5">
                <div className="col-span-2 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-4 text-white shadow-lg shadow-blue-600/15 sm:col-span-1"><div className="flex items-center justify-between text-blue-100"><span className="text-[11px] font-semibold">Today’s sales</span><BarChart3 size={16} /></div><p className="mt-3 text-2xl font-black tracking-tight">UGX 1.28M</p><p className="mt-1 text-[10px] text-blue-100">↑ 12.8% from yesterday</p></div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4"><p className="text-[11px] font-semibold text-slate-500">Transactions</p><p className="mt-3 text-2xl font-black">84</p><p className="mt-1 text-[10px] text-slate-400">Across this branch</p></div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4"><p className="text-[11px] font-semibold text-slate-500">Stock to watch</p><p className="mt-3 text-2xl font-black">6 <span className="text-sm font-bold text-slate-400">items</span></p><p className="mt-1 text-[10px] text-amber-600">Restock before they run out</p></div>
                <div className="col-span-2 rounded-2xl border border-slate-100 bg-white p-4 sm:col-span-3"><div className="flex items-start justify-between"><div><p className="text-xs font-extrabold">Sales through the week</p><p className="mt-1 text-[10px] text-slate-400">A quick view of the store’s rhythm</p></div><span className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">This week</span></div><div className="mt-5 flex h-24 items-end gap-2 sm:h-28 sm:gap-3">{previewBars.map((height, index) => <div key={index} className="group relative flex h-full flex-1 items-end"><div className={`w-full rounded-t-lg transition ${index === 9 ? "bg-indigo-600" : "bg-gradient-to-t from-blue-100 to-blue-300 group-hover:from-blue-300 group-hover:to-blue-400"}`} style={{ height: `${height}%` }} /></div>)}</div><div className="mt-2 flex justify-between text-[9px] font-semibold text-slate-400"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div>
                <div className="col-span-2 flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 sm:col-span-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Clock3 size={18} /></span><div className="min-w-0 flex-1"><p className="text-xs font-extrabold">Cash drawer balanced</p><p className="mt-0.5 text-[10px] text-slate-400">Sarah closed her shift · 2 minutes ago</p></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-extrabold text-emerald-700">Reconciled</span></div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-3 flex items-center gap-3 rounded-2xl border border-white bg-white px-4 py-3 shadow-xl shadow-slate-900/10 sm:-left-8"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Smartphone size={18} /></span><div><p className="text-xs font-extrabold">Keeps you moving</p><p className="text-[10px] text-slate-400">Works across your devices</p></div></div>
        </div>
      </section>

      <section id="features" className="border-y border-slate-100 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-2xl text-center"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600">Made for the whole store</p><h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Less juggling. More running your business.</h2><p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">The everyday tools your team needs, connected to the information you need to make good decisions.</p></div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{features.map(({ icon: Icon, title, description }, index) => <article key={title} className="group rounded-3xl border border-slate-100 bg-[#fbfcff] p-6 transition hover:-translate-y-1 hover:border-blue-100 hover:bg-white hover:shadow-xl hover:shadow-blue-900/5"><span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${index === 1 ? "bg-violet-50 text-violet-600" : index === 2 ? "bg-emerald-50 text-emerald-600" : index === 3 ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}><Icon size={21} /></span><h3 className="mt-5 text-base font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></article>)}</div>
        </div>
      </section>

      <section className="bg-[#f8faff] py-16 sm:py-20" aria-labelledby="store-gallery-title">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600">A more visual workspace</p><h2 id="store-gallery-title" className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">See the good things your store has to offer.</h2></div><p className="max-w-md text-sm leading-6 text-slate-500">Product photos help your team spot items faster at the till and give every catalogue a more welcoming feel.</p></div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[{ title: "Fresh picks", caption: "Produce, ready to move", image: "/images/market-produce.jpg" }, { title: "Everyday essentials", caption: "Pantry stock at a glance", image: "/images/product-pantry.jpg" }, { title: "Made fresh daily", caption: "A shelf full of favorites", image: "/images/product-bread.jpg" }].map((item) => <article key={item.title} className="group relative h-56 overflow-hidden rounded-3xl bg-slate-200 shadow-sm sm:h-64"><img src={item.image} alt={item.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" /><div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" /><div className="absolute bottom-0 p-5 text-white"><h3 className="text-lg font-extrabold">{item.title}</h3><p className="mt-1 text-xs text-white/80">{item.caption}</p></div></article>)}
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:px-10 lg:py-24">
        <div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600">From open to close</p><h2 className="mt-4 max-w-lg text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">A smoother day for every person on your team.</h2><p className="mt-5 max-w-lg text-sm leading-7 text-slate-500 sm:text-base">Cashiers get a welcoming point of sale. Managers get a live view of the business. Owners see what is working and where to focus next.</p><Link to={actionPath} className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-blue-700 hover:text-blue-900">{user ? "Open your workspace" : "Sign in to MOVA"}<ArrowRight size={16} /></Link></div>
        <div className="grid gap-3 sm:grid-cols-2">{[{ n: "01", title: "Serve customers", body: "A clean checkout makes it quick to find items and finish purchases." }, { n: "02", title: "Keep stock in view", body: "Know what is selling, what is running low and what needs attention." }, { n: "03", title: "Bring teams together", body: "Keep branch activity, schedules and responsibilities connected." }, { n: "04", title: "Make informed moves", body: "Turn day-to-day activity into helpful reports and clearer next steps." }].map((item) => <div key={item.n} className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><span className="pt-0.5 text-xs font-black tracking-widest text-blue-600">{item.n}</span><div><h3 className="text-sm font-extrabold">{item.title}</h3><p className="mt-1.5 text-xs leading-5 text-slate-500">{item.body}</p></div></div>)}</div>
      </section>

      <section className="px-5 pb-16 sm:px-8 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 px-7 py-9 text-white sm:px-10 sm:py-11 md:flex-row md:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">Make today flow better</p><h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Your next sale starts here.</h2><p className="mt-2 max-w-xl text-sm text-blue-100/75">Bring your sales, people and stock into one simple workspace.</p></div><Link to={actionPath} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-slate-900 transition hover:bg-blue-50">{user ? "Open workspace" : "Sign in to MOVA"}<ArrowRight size={16} /></Link></div></section>
      <footer className="border-t border-slate-100 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10"><span className="font-black tracking-tight text-slate-700">mova<span className="text-blue-600">.</span></span><span>Sales, stock and teams in one rhythm.</span><span>© {new Date().getFullYear()} MOVA</span></div></footer>
    </main>
  );
}

import { ArrowRight, BarChart3, Boxes, Check, ChevronRight, CreditCard, PackageCheck, ScanLine, ShoppingBasket, Smartphone, Store, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import InstallMovaButton from "../components/InstallMovaButton";

const features = [
  { icon: ScanLine, title: "Checkout without the scramble", description: "Find products quickly, scan codes, take payment and keep the queue moving.", tone: "blue" },
  { icon: PackageCheck, title: "Know what is on your shelves", description: "Track stock, spot low items and manage transfers between branches.", tone: "green" },
  { icon: BarChart3, title: "See how the store is doing", description: "Bring sales, payment methods and team activity into one clear view.", tone: "amber" },
];

const exampleItems = [
  { name: "Fresh bread", detail: "1 × UGX 4,000", price: "4,000", image: "/images/product-bread.jpg" },
  { name: "Whole milk", detail: "2 × UGX 3,500", price: "7,000", image: "/images/product-milk.jpg" },
  { name: "Red apples", detail: "1 × UGX 5,000", price: "5,000", image: "/images/product-apples.jpg" },
];

export default function Landing() {
  const { user } = useAuth();
  const actionPath = user ? "/app" : "/login";

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f8f5] text-slate-900">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link to="/" className="flex items-center gap-3" aria-label="MOVA home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-lg font-black tracking-tight text-white">M</span>
          <span><span className="block text-lg font-black tracking-tight">mova</span><span className="-mt-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Retail, in motion</span></span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex" aria-label="Main navigation">
          <a href="#features" className="transition-colors hover:text-blue-700">What MOVA does</a>
          <a href="#how-it-works" className="transition-colors hover:text-blue-700">For your team</a>
        </nav>
        <div className="flex items-center gap-2">
          <InstallMovaButton className="hidden sm:inline-flex" />
          <Link to={actionPath} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:border-blue-300 hover:text-blue-700">
            {user ? "Open workspace" : "Sign in"}<ArrowRight size={16} />
          </Link>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 md:pt-16 lg:grid-cols-[.9fr_1.1fr] lg:px-10 lg:pb-24 lg:pt-20">
        <div className="pointer-events-none absolute -left-56 top-0 h-[34rem] w-[34rem] rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="landing-reveal relative z-10 max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3.5 py-2 text-xs font-bold text-emerald-800"><Store size={15} /> Point of sale and stock, together</div>
          <h1 className="text-[2.8rem] font-extrabold leading-[1.04] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-[4.25rem]">A smoother day<br />for your <span className="text-blue-700">store.</span></h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">Serve customers, keep products moving and stay close to the numbers. MOVA brings everyday retail work into one straightforward workspace.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to={actionPath} className="group inline-flex items-center justify-center gap-3 rounded-xl bg-blue-700 px-6 py-4 text-sm font-bold text-white transition hover:bg-blue-800 active:translate-y-px">{user ? "Open your workspace" : "Get started with MOVA"}<ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></Link>
            <InstallMovaButton className="w-full rounded-xl px-6 py-4 sm:hidden" />
            <a href="#features" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-4 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700">See how it works<ChevronRight size={16} /></a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-slate-600"><span className="inline-flex items-center gap-2"><Check size={15} className="text-emerald-700" /> For small and growing teams</span><span className="inline-flex items-center gap-2"><Check size={15} className="text-emerald-700" /> Ready for multiple branches</span></div>
        </div>

        <div className="landing-reveal landing-reveal-later relative mx-auto w-full max-w-[620px] lg:ml-auto">
          <div className="absolute -bottom-5 left-12 right-12 h-12 rounded-full bg-slate-900/10 blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div><p className="text-sm font-bold">Checkout preview</p><p className="mt-0.5 text-xs text-slate-500">A sample sale at the till</p></div>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Ready</span>
            </div>
            <div className="grid md:grid-cols-[1.2fr_.8fr]">
              <div className="p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500"><ScanLine size={16} className="text-blue-700" /> Search or scan a product</div>
                <div className="space-y-3">
                  {exampleItems.map((item) => <div key={item.name} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5"><img src={item.image} alt="" className="h-12 w-12 rounded-md object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.name}</p><p className="text-xs text-slate-500">{item.detail}</p></div><span className="text-sm font-bold text-slate-800">{item.price}</span></div>)}
                </div>
              </div>
              <div className="border-t border-slate-200 bg-[#fafbf9] p-5 sm:p-6 md:border-l md:border-t-0">
                <div className="flex items-center gap-2 text-sm font-bold"><ShoppingBasket size={17} className="text-blue-700" /> Current sale</div>
                <div className="mt-5 space-y-3 text-sm"><div className="flex justify-between text-slate-500"><span>Items</span><span>4</span></div><div className="flex justify-between text-slate-500"><span>Subtotal</span><span>UGX 16,000</span></div><div className="border-t border-dashed border-slate-300 pt-3"><div className="flex justify-between font-extrabold"><span>Total</span><span>UGX 16,000</span></div></div></div>
                <div className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-3 text-sm font-bold text-white"><CreditCard size={16} /> Take payment</div>
                <p className="mt-3 text-center text-[10px] text-slate-500">Example screen · amounts are illustrative</p>
              </div>
            </div>
          </div>
          <div className="landing-status-chip absolute -bottom-5 -left-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg shadow-slate-900/10 sm:-left-6"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><PackageCheck size={18} /></span><div><p className="text-xs font-bold">Stock stays in sync</p><p className="text-[10px] text-slate-500">Across your branches</p></div></div>
        </div>
      </section>

      <section id="features" className="border-y border-slate-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">One workspace for the whole store</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">The essentials, working together.</h2><p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">Spend less time switching between tasks and more time looking after customers and the business.</p></div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">{features.map(({ icon: Icon, title, description, tone }, index) => <article key={title} style={{ "--landing-order": index }} className={`landing-feature-card rounded-xl border border-slate-200 bg-[#fbfcfa] p-6 transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:bg-white hover:shadow-lg ${tone}`}><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-blue-700 ring-1 ring-slate-200"><Icon size={20} /></span><h3 className="mt-5 text-base font-bold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></article>)}</div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:px-10 lg:py-20">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Made for the working day</p><h2 className="mt-3 max-w-lg text-3xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-4xl">From the first customer to closing time.</h2><p className="mt-4 max-w-lg text-sm leading-7 text-slate-600 sm:text-base">Give each person on your team a clear place to do their work, with the store’s activity connected behind the scenes.</p><Link to={actionPath} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900">{user ? "Open workspace" : "Sign in to MOVA"}<ArrowRight size={16} /></Link></div>
        <div className="grid gap-3 sm:grid-cols-2">{[{ icon: ShoppingBasket, title: "Serve customers", body: "Find products, scan codes and complete a sale." }, { icon: Boxes, title: "Keep shelves ready", body: "See stock levels and handle branch transfers." }, { icon: Users, title: "Bring the team together", body: "Set roles and keep staff activity organized." }, { icon: Smartphone, title: "Work where you are", body: "Use your workspace across supported devices." }].map(({ icon: Icon, title, body }, index) => <div key={title} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5"><span className="pt-0.5 text-xs font-black tracking-widest text-slate-400">0{index + 1}</span><div><Icon size={18} className="text-blue-700" /><h3 className="mt-3 text-sm font-bold">{title}</h3><p className="mt-1.5 text-xs leading-5 text-slate-600">{body}</p></div></div>)}</div>
      </section>

      <section className="px-5 pb-14 sm:px-8 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-2xl bg-slate-900 px-7 py-8 text-white sm:px-10 sm:py-10 md:flex-row md:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Make the day run smoother</p><h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Let MOVA handle the busywork.</h2><p className="mt-2 max-w-xl text-sm text-slate-300">Bring checkout, stock and your team into one practical workspace.</p></div><Link to={actionPath} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-emerald-50">{user ? "Open workspace" : "Get started"}<ArrowRight size={16} /></Link></div></section>
      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10"><span className="font-black tracking-tight text-slate-800">mova<span className="text-blue-700">.</span></span><span>Sales, stock and teams in one workspace.</span><span>© {new Date().getFullYear()} MOVA</span></div></footer>
    </main>
  );
}

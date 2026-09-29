import {
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

const Dashboard = () => {
  const stats = [
    {
      title: "Today's Sales",
      value: "UGX 2,450,000",
      change: "+12.5%",
      positive: true,
      icon: CircleDollarSign,
      description: "vs yesterday",
    },
    {
      title: "Transactions",
      value: "84",
      change: "+8.2%",
      positive: true,
      icon: ShoppingCart,
      description: "vs yesterday",
    },
    {
      title: "Gross Profit",
      value: "UGX 735,000",
      change: "+15.4%",
      positive: true,
      icon: TrendingUp,
      description: "vs yesterday",
    },
    {
      title: "Inventory Value",
      value: "UGX 18.6M",
      change: "-2.1%",
      positive: false,
      icon: Boxes,
      description: "vs last week",
    },
  ];

  const topProducts = [
    {
      name: "Premium Sugar 1KG",
      category: "Groceries",
      units: 42,
      revenue: "UGX 210,000",
    },
    {
      name: "Blue Band 500G",
      category: "Food",
      units: 31,
      revenue: "UGX 155,000",
    },
    {
      name: "Coca Cola 500ML",
      category: "Drinks",
      units: 27,
      revenue: "UGX 81,000",
    },
    {
      name: "Ariel Detergent",
      category: "Household",
      units: 19,
      revenue: "UGX 95,000",
    },
    {
      name: "Bread Large",
      category: "Bakery",
      units: 17,
      revenue: "UGX 68,000",
    },
  ];

  const lowStock = [
    {
      name: "Cooking Oil 1L",
      stock: 4,
      minimum: 10,
    },
    {
      name: "A4 Printing Paper",
      stock: 6,
      minimum: 15,
    },
    {
      name: "Laundry Soap",
      stock: 3,
      minimum: 12,
    },
    {
      name: "Mineral Water 1.5L",
      stock: 7,
      minimum: 20,
    },
  ];

  return (
    <div className="space-y-8">

      {/* Page heading */}
      <section className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-bold text-blue-600">
            Business Command Center
          </p>

          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
            Good morning 👋
          </h1>

          <p className="mt-2 text-slate-500">
            Here's what's happening with your business today.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
        >
          <ShoppingCart size={18} />
          Open POS
        </button>
      </section>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon size={21} />
                </div>

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                    stat.positive
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {stat.positive ? (
                    <ArrowUpRight size={13} />
                  ) : (
                    <ArrowDownRight size={13} />
                  )}

                  {stat.change}
                </span>
              </div>

              <p className="mt-5 text-sm font-medium text-slate-500">
                {stat.title}
              </p>

              <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                {stat.value}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {stat.description}
              </p>
            </div>
          );
        })}
      </section>

      {/* Sales overview */}
      <section className="grid gap-6 xl:grid-cols-3">

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-slate-950">
                Sales Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Revenue performance over the last 7 days.
              </p>
            </div>

            <select className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 outline-none">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>This year</option>
            </select>
          </div>

          {/* Temporary chart placeholder */}
          <div className="mt-8 flex h-72 items-end gap-3 rounded-xl bg-slate-50 p-5 sm:gap-5">
            {[
              { day: "Mon", value: 42 },
              { day: "Tue", value: 60 },
              { day: "Wed", value: 48 },
              { day: "Thu", value: 72 },
              { day: "Fri", value: 55 },
              { day: "Sat", value: 88 },
              { day: "Sun", value: 68 },
            ].map((item) => (
              <div
                key={item.day}
                className="flex h-full flex-1 flex-col items-center justify-end gap-3"
              >
                <div
                  className="w-full max-w-12 rounded-t-lg bg-blue-600 transition hover:bg-blue-700"
                  style={{
                    height: `${item.value}%`,
                  }}
                />

                <span className="text-xs font-bold text-slate-400">
                  {item.day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Business health */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-black text-slate-950">
            Business Health
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            A quick view of your business.
          </p>

          <div className="mt-8 flex justify-center">
            <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-[16px] border-blue-100">
              <div className="absolute inset-0 rounded-full border-[16px] border-transparent border-l-blue-600 border-t-blue-600" />

              <div className="text-center">
                <p className="text-3xl font-black text-slate-950">
                  82
                </p>

                <p className="text-xs font-bold text-slate-400">
                  HEALTH SCORE
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Sales performance
              </span>

              <span className="text-sm font-black text-green-600">
                Strong
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Inventory
              </span>

              <span className="text-sm font-black text-yellow-600">
                Watch
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Profitability
              </span>

              <span className="text-sm font-black text-green-600">
                Strong
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom sections */}
      <section className="grid gap-6 lg:grid-cols-2">

        {/* Top products */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-6">
            <div>
              <h2 className="font-black text-slate-950">
                Best Selling Products
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Your top performers today.
              </p>
            </div>

            <Package size={20} className="text-slate-400" />
          </div>

          <div className="divide-y divide-slate-100">
            {topProducts.map((product, index) => (
              <div
                key={product.name}
                className="flex items-center gap-4 px-6 py-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-black text-slate-600">
                  {index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {product.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {product.category} · {product.units} units
                  </p>
                </div>

                <p className="text-sm font-black text-slate-900">
                  {product.revenue}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Low stock */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-6">
            <div>
              <h2 className="font-black text-slate-950">
                Low Stock Alerts
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Products that need your attention.
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <AlertTriangle size={19} />
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {lowStock.map((product) => {
              const percentage =
                (product.stock / product.minimum) * 100;

              return (
                <div
                  key={product.name}
                  className="px-6 py-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {product.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {product.stock} remaining · minimum{" "}
                        {product.minimum}
                      </p>
                    </div>

                    <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">
                      Low stock
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{
                        width: `${Math.min(percentage, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Intelligence banner */}
      <section className="overflow-hidden rounded-2xl bg-slate-950 p-6 shadow-xl sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-400">
              <TrendingUp size={14} />
              MOVA Intelligence
            </div>

            <h2 className="text-2xl font-black text-white">
              Your business has opportunities waiting.
            </h2>

            <p className="mt-2 leading-7 text-slate-400">
              As MOVA learns your business patterns, it will help
              you identify sales opportunities, stock risks,
              profitability changes and actions worth taking.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
          >
            Explore insights
            <ArrowUpRight size={17} />
          </button>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
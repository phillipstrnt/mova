import { useEffect, useState } from "react";
import { Coffee, PackageOpen, Shirt, Sparkles } from "lucide-react";

const visuals = [
  { frame: "from-blue-100 via-sky-50 to-white", ink: "text-blue-500", icon: PackageOpen },
  { frame: "from-amber-100 via-orange-50 to-white", ink: "text-amber-600", icon: Coffee },
  { frame: "from-violet-100 via-fuchsia-50 to-white", ink: "text-violet-500", icon: Sparkles },
  { frame: "from-emerald-100 via-teal-50 to-white", ink: "text-emerald-600", icon: Shirt },
];

export default function ProductImage({ product, className = "", imageClassName = "", alt }) {
  const userImage = product?.image || product?.imageUrl || "";
  const seed = `${product?.category?.name || product?.categoryName || ""} ${product?.name || ""}`.toLowerCase();
  const productPhotos = ["/images/product-apples.jpg", "/images/product-bread.jpg", "/images/product-coffee.jpg", "/images/product-drink.jpg", "/images/product-milk.jpg", "/images/product-pantry.jpg"];
  const photoIndex = Math.abs(String(product?._id || product?.sku || product?.name || "mova").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % productPhotos.length;
  const source = userImage || (
    seed.includes("apple") || seed.includes("fruit") ? "/images/product-apples.jpg"
      : seed.includes("bread") || seed.includes("bakery") ? "/images/product-bread.jpg"
        : seed.includes("coffee") || seed.includes("tea") ? "/images/product-coffee.jpg"
          : seed.includes("beverage") || seed.includes("drink") || seed.includes("juice") || seed.includes("soda") ? "/images/product-drink.jpg"
            : seed.includes("milk") || seed.includes("dairy") || seed.includes("egg") ? "/images/product-milk.jpg"
              : seed.includes("sugar") || seed.includes("pantry") || seed.includes("grain") || seed.includes("rice") || seed.includes("bean") ? "/images/product-pantry.jpg"
                : seed.includes("produce") || seed.includes("vegetable") || seed.includes("market") ? "/images/market-produce.jpg"
                  : productPhotos[photoIndex]
  );
  const [failedSource, setFailedSource] = useState("");

  useEffect(() => setFailedSource(""), [userImage, source]);

  if (source && failedSource !== source) {
    return (
      <img
        src={source}
        alt={alt || product?.name || "Product"}
        loading="lazy"
        className={`${className} ${imageClassName}`.trim()}
        onError={() => setFailedSource(source)}
      />
    );
  }

  const visual = seed.includes("drink") || seed.includes("coffee") || seed.includes("tea") || seed.includes("soda")
    ? visuals[1]
    : seed.includes("beauty") || seed.includes("skin") || seed.includes("soap")
      ? visuals[2]
      : seed.includes("cloth") || seed.includes("shirt") || seed.includes("wear")
        ? visuals[3]
        : visuals[Math.abs(String(product?._id || product?.sku || product?.name || "mova").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % visuals.length];
  const Icon = visual.icon;
  const title = String(product?.name || "Product").trim();

  return (
    <div className={`${className} relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${visual.frame}`.trim()} aria-label={`${title} image placeholder`} role="img">
      <div className="absolute -right-5 -top-7 h-24 w-24 rounded-full bg-white/60 blur-2xl" />
      <div className="relative flex flex-col items-center gap-2 px-3 text-center">
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm ${visual.ink}`}><Icon size={25} strokeWidth={1.7} /></span>
        <span className="max-w-full truncate text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{title}</span>
      </div>
    </div>
  );
}

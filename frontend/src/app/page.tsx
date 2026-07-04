"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SearchX, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { useCart } from "@/context/CartContext";
import { db } from "@/lib/firebase";

const CATEGORY_IMAGES: Record<string, string> = {
  Electronics:
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=80",
  Fashion:
    "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=80",
  Shoes:
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
  Accessories:
    "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=900&q=80",
  "Home Decor":
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
  Beauty:
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
};

type Product = {
  id: string;
  title: string;
  price: number;
  rating: number;
  image: string;
  category: string;
};

type FirestoreProduct = {
  id: string;
  name?: unknown;
  price?: unknown;
  rating?: unknown;
  image?: unknown;
  imageUrl?: unknown;
  category?: unknown;
};

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80";

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getProductImageSrc(image?: string) {
  if (!image) {
    return FALLBACK_PRODUCT_IMAGE;
  }

  const trimmedImage = image.trim();

  if (!trimmedImage || !isValidHttpUrl(trimmedImage)) {
    return FALLBACK_PRODUCT_IMAGE;
  }

  return trimmedImage;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function normalizeCategory(value?: string) {
  if (!value) {
    return "Uncategorized";
  }

  const cleaned = value.trim().toLowerCase();
  if (!cleaned) {
    return "Uncategorized";
  }

  return cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeProductTitle(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeProductPrice(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsedPrice = Number(value);
    return Number.isFinite(parsedPrice) ? parsedPrice : null;
  }

  return null;
}

function toCartId(value: string) {
  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const shouldReduceMotion = useReducedMotion();
  const searchQuery = (searchParams.get("q") ?? "").trim().toLowerCase();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "products"));

        const products: FirestoreProduct[] = querySnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        } as FirestoreProduct));

        console.log(products);
        console.log("Firestore products:", products);
        console.log(
          "Product types:",
          products.map((p) => ({
            id: p.id,
            name: p.name,
            nameType: typeof p.name,
            price: p.price,
            priceType: typeof p.price,
            category: p.category,
            image: p.image,
            imageUrl: p.imageUrl,
          })),
        );

        const fetchedProducts: Product[] = products
          .map((product) => {
            const title = normalizeProductTitle(product.name);
            const price = normalizeProductPrice(product.price);

            if (!product.id || !title || price === null) {
              return null;
            }

            return {
              id: product.id,
              title,
              price,
              rating: typeof product.rating === "number" ? product.rating : 0,
              image:
                typeof product.image === "string"
                  ? product.image
                  : typeof product.imageUrl === "string"
                    ? product.imageUrl
                    : "",
              category:
                typeof product.category === "string"
                  ? normalizeCategory(product.category)
                  : "Uncategorized",
            };
          })
          .filter((product): product is Product => product !== null);

        setProducts(fetchedProducts);
      } catch (error) {
        console.error("Failed to fetch products", error);
        setProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  const handleAddToCart = (product: Product) => {
    const cartProduct = {
      id: toCartId(product.id),
      title: product.title,
      price: product.price,
      image: product.image,
    };

    addToCart(cartProduct);
    console.log("Added to cart:", cartProduct);
  };

  const cardInitial = shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 };
  const cardAnimate = { opacity: 1, y: 0 };
  const cardTransition = (index: number) => ({
    duration: 0.28,
    ease: "easeOut" as const,
    delay: shouldReduceMotion ? 0 : Math.min(index * 0.04, 0.3),
  });

  const allCategories = useMemo(() => {
    const dynamicCategories = Array.from(new Set(products.map((product) => product.category))).sort((a, b) =>
      a.localeCompare(b),
    );
    return ["All", ...dynamicCategories];
  }, [products]);

  const categoryCards = useMemo(
    () =>
      allCategories
        .filter((categoryName) => categoryName !== "All")
        .map((categoryName) => ({
          title: categoryName,
          image:
            CATEGORY_IMAGES[categoryName] ??
            products.find((product) => product.category === categoryName)?.image ??
            FALLBACK_PRODUCT_IMAGE,
        })),
    [allCategories, products],
  );

  const filteredProducts = useMemo(() => {
    const categoryFilteredProducts =
      selectedCategory === "All"
        ? products
        : products.filter((product) => product.category === selectedCategory);

    if (!searchQuery) {
      return categoryFilteredProducts;
    }

    return categoryFilteredProducts.filter((product) => product.title.toLowerCase().includes(searchQuery));
  }, [products, searchQuery, selectedCategory]);

  const handleClearFilters = () => {
    setSelectedCategory("All");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    const nextPath = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextPath, { scroll: false });
  };

  return (
    <div className="min-h-screen text-slate-900 dark:text-white">
      <main className="mx-auto w-full max-w-7xl space-y-14 px-4 py-8 lg:py-12">
        <motion.section
          className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-700/70 bg-gradient-to-br from-orange-100 via-amber-50 to-cyan-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 p-7 shadow-[0_24px_65px_-30px_rgba(15,23,42,0.45)] transition-all duration-300 sm:p-10 lg:p-14"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.55),transparent_38%),radial-gradient(circle_at_80%_0%,rgba(251,146,60,0.25),transparent_44%)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(148,163,184,0.2),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.15),transparent_44%)]" />
          <div className="absolute -right-12 top-0 h-48 w-48 rounded-full bg-orange-300/25 blur-3xl" />
          <div className="absolute -bottom-14 left-10 h-44 w-44 rounded-full bg-cyan-300/25 blur-3xl" />
          <div className="relative max-w-2xl">
            <p className="mb-4 inline-flex rounded-full border border-orange-200/80 dark:border-orange-800 bg-white/85 dark:bg-slate-700/85 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">
              Fresh arrivals
            </p>
            <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
              Shop Smart with Shopera
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-700 dark:text-slate-300 sm:text-lg">
              Best deals on top brands
            </p>
            <motion.button
              type="button"
              className="mt-7 inline-flex items-center rounded-full bg-slate-900 dark:bg-white px-7 py-3 text-sm font-semibold text-white dark:text-slate-900 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_10px_30px_rgba(249,115,22,0.35)] dark:hover:bg-slate-100 dark:hover:shadow-[0_10px_30px_rgba(56,189,248,0.2)]"
              whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              Shop Now
            </motion.button>
          </div>
        </motion.section>

        <section>
          <div className="mb-6 flex items-end justify-between gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Shop by Category</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Top picks for every style</p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 lg:gap-5">
            {categoryCards.map((category) => {
              const categoryName = category.title;
              const isActive = selectedCategory === categoryName;

              return (
                <button
                  key={categoryName}
                  type="button"
                  onClick={() => setSelectedCategory(categoryName)}
                  className={`group overflow-hidden rounded-2xl border bg-white text-left shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.45)] dark:bg-slate-800 ${
                    isActive
                      ? "border-orange-300 ring-1 ring-orange-300/80 dark:border-cyan-500 dark:ring-cyan-500/60"
                      : "border-slate-200 dark:border-slate-700 hover:ring-1 hover:ring-orange-200/80 dark:hover:ring-cyan-700/40"
                  }`}
                  aria-pressed={isActive}
                >
                  {category ? (
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={category.image}
                        alt={categoryName}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                        className="object-cover transition-all duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/35 via-transparent to-transparent" />
                    </div>
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-slate-100 to-white dark:from-slate-700 dark:to-slate-800">
                      <span className="rounded-full border border-slate-300 dark:border-slate-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 dark:text-slate-300">
                        {categoryName}
                      </span>
                    </div>
                  )}
                  <h3 className="px-3 py-3 text-center text-sm font-semibold text-slate-800 transition-all duration-300 dark:text-white sm:text-base">
                    {categoryName}
                  </h3>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-6 flex items-end justify-between gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Trending Products</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Handpicked quality deals</p>
          </div>
          {isLoadingProducts ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-md transition-all duration-300"
                >
                  <div className="skeleton-shimmer aspect-square w-full bg-slate-200 dark:bg-slate-700" />
                  <div className="space-y-3 p-4">
                    <div className="skeleton-shimmer h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="skeleton-shimmer h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="skeleton-shimmer h-10 w-full rounded-lg bg-slate-200 dark:bg-slate-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={selectedCategory}
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                {filteredProducts.length === 0 ? (
                  <div className="col-span-full flex justify-center px-2 py-6 sm:py-10">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-10 text-center shadow-sm">
                      <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                        <SearchX size={22} />
                      </div>
                      <p className="text-base font-medium text-slate-700 dark:text-slate-300">Sorry, item is not in stock</p>
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="mt-5 inline-flex items-center rounded-full border border-slate-300 dark:border-slate-600 px-5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-all duration-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        Clear filters
                      </button>
                    </div>
                  </div>
                ) : (
                filteredProducts.map((product, index) => (
                  <motion.article
                    key={product.id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_-20px_rgba(15,23,42,0.45)] hover:ring-1 hover:ring-orange-200/80 dark:hover:ring-cyan-700/40"
                    initial={cardInitial}
                    animate={cardAnimate}
                    transition={cardTransition(index)}
                    whileHover={
                      shouldReduceMotion
                        ? undefined
                        : {
                            scale: 1.03,
                            boxShadow: "0 20px 40px rgba(15, 23, 42, 0.16)",
                          }
                    }
                  >
                    <Link
                      href={`/product/${product.id}`}
                      onClick={() => {
                        if (!product.id) {
                          console.error("Product ID is undefined");
                          return;
                        }
                        console.log(product.id);
                      }}
                      className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-cyan-400 dark:focus-visible:ring-offset-slate-900"
                      aria-label={`View details for ${product.title}`}
                    >
                      <div className="overflow-hidden bg-slate-100 dark:bg-slate-700">
                        <Image
                          src={getProductImageSrc(product.image)}
                          alt={product.title}
                          width={500}
                          height={500}
                          className="aspect-square h-auto w-full object-cover rounded-t-xl transition duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="space-y-3 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="line-clamp-2 min-h-12 text-base font-semibold text-slate-800 dark:text-white">
                            {product.title}
                          </h3>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            {product.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Star
                                key={`${product.id}-${index}`}
                                size={15}
                                className={
                                  index < product.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-300 dark:text-slate-600"
                                }
                              />
                            ))}
                          </div>
                          <span className="text-sm text-slate-500 dark:text-slate-400">({product.rating}.0)</span>
                        </div>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {formatPrice(product.price)}
                        </p>
                      </div>
                    </Link>

                    <div className="px-5 pb-5">
                      <motion.button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        className="w-full rounded-lg bg-orange-500 px-3 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-orange-600 hover:shadow-[0_10px_30px_rgba(249,115,22,0.32)] dark:hover:bg-orange-500"
                        whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                        whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      >
                        Add to Cart
                      </motion.button>
                    </div>
                  </motion.article>
                )))}
              </motion.div>
            </AnimatePresence>
          )}
        </section>
      </main>
    </div>
  );
}

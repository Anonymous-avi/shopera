"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CreditCard, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";

const FALLBACK_PRODUCT_IMAGE =
	"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80";

function formatPrice(value: number) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(value);
}

function getSafeImageSrc(image?: string) {
	if (!image) {
		return FALLBACK_PRODUCT_IMAGE;
	}

	try {
		const url = new URL(image);
		if (url.hostname !== "images.unsplash.com") {
			return FALLBACK_PRODUCT_IMAGE;
		}
		return image;
	} catch {
		return FALLBACK_PRODUCT_IMAGE;
	}
}

export default function CartPage() {
	const shouldReduceMotion = useReducedMotion();
	const {
		cartItems,
		totalItemCount,
		totalPrice,
		increaseQuantity,
		decreaseQuantity,
		removeFromCart,
		clearCart,
	} = useCart();

	if (cartItems.length === 0) {
		return (
			<div className="min-h-screen px-4 py-10 bg-white dark:bg-slate-950">
				<motion.section
					className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-16 text-center shadow-md"
					initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3, ease: "easeOut" }}
				>
					<div className="mb-5 rounded-full bg-orange-100 dark:bg-orange-900/30 p-4 text-orange-600 dark:text-orange-400">
						<ShoppingBag size={28} />
					</div>
					<h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Your cart is empty</h1>
					<p className="mt-3 max-w-md text-sm text-slate-600 dark:text-slate-400 sm:text-base">
						Looks like you have not added anything yet. Explore products and add your favorites to cart.
					</p>
					<motion.div whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }} whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}>
						<Link
						href="/"
						className="mt-7 inline-flex items-center rounded-full bg-slate-900 dark:bg-white px-6 py-3 text-sm font-semibold text-white dark:text-slate-900 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800 dark:hover:bg-slate-100"
						>
							Continue Shopping
						</Link>
					</motion.div>
				</motion.section>
			</div>
		);
	}

	return (
		<div className="min-h-screen px-4 py-8 bg-white dark:bg-slate-950">
			<main className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.7fr_1fr]">
				<section className="space-y-4">
					<div className="flex items-center justify-between">
						<h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Shopping Cart</h1>
						<p className="text-sm font-medium text-slate-500 dark:text-slate-400">{totalItemCount} item(s)</p>
					</div>

					<AnimatePresence initial={false}>
					{cartItems.map((item) => (
						<motion.article
							key={item.id}
							className="flex flex-col gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-md transition-all duration-300 hover:shadow-xl sm:flex-row sm:items-center"
							layout
							initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
							animate={{ opacity: 1, y: 0 }}
							exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.98 }}
							transition={{ duration: 0.22, ease: "easeOut" }}
						>
							<div className="relative h-28 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 sm:h-24 sm:w-24">
								<Image
									src={getSafeImageSrc(item.image)}
									alt={item.title}
									fill
									sizes="(max-width: 640px) 100vw, 96px"
									className="object-cover"
								/>
							</div>

							<div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div className="min-w-0">
									<h2 className="truncate text-base font-semibold text-slate-800 dark:text-white sm:text-lg">{item.title}</h2>
									<div className="mt-2 inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1">
										<motion.button
											type="button"
											onClick={() => decreaseQuantity(item.id)}
											disabled={item.quantity === 1}
											className="flex h-8 w-8 items-center justify-center rounded-md text-lg font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
											aria-label={`Decrease quantity for ${item.title}`}
											whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
											whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
										>
											-
										</motion.button>
										<span className="min-w-9 px-3 text-center text-sm font-semibold text-slate-800 dark:text-white">
											{item.quantity}
										</span>
										<motion.button
											type="button"
											onClick={() => increaseQuantity(item.id)}
											className="flex h-8 w-8 items-center justify-center rounded-md text-lg font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
											aria-label={`Increase quantity for ${item.title}`}
											whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
											whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
										>
											+
										</motion.button>
									</div>
									<p className="mt-2 text-base font-bold text-slate-900 dark:text-white">{formatPrice(item.price)}</p>
								</div>

								<div className="flex items-center justify-end sm:justify-start">
									<motion.button
										type="button"
										onClick={() => removeFromCart(item.id)}
										className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-100 dark:hover:bg-red-900/30"
										whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
										whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
									>
										<Trash2 size={16} />
										Remove
									</motion.button>
								</div>
							</div>
						</motion.article>
					))}
					</AnimatePresence>
				</section>

				<aside className="h-fit rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-md lg:sticky lg:top-24">
					<h2 className="text-lg font-bold text-slate-900 dark:text-white">Order Summary</h2>
					<div className="mt-4 space-y-3 text-sm">
						<div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
							<span>Total Items</span>
							<span className="font-semibold text-slate-900 dark:text-white">{totalItemCount}</span>
						</div>
						<div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-3 text-slate-600 dark:text-slate-400">
							<span>Total Price</span>
							<span className="text-xl font-bold text-slate-900 dark:text-white">{formatPrice(totalPrice)}</span>
						</div>
					</div>

					<div className="mt-6 space-y-3">
						<motion.div whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }} whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}>
							<Link
							href="/checkout"
							className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-white px-4 py-3.5 text-base font-bold text-white dark:text-slate-900 transition-all duration-300 hover:bg-slate-800 dark:hover:bg-slate-100"
							>
								<CreditCard size={18} />
								Checkout
							</Link>
						</motion.div>
						<motion.button
							type="button"
							onClick={clearCart}
							className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800"
							whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
							whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
						>
							Clear Cart
						</motion.button>
					</div>
				</aside>
			</main>
		</div>
	);
}

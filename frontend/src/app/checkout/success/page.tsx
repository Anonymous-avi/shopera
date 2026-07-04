"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ShoppingBag } from "lucide-react";

export default function CheckoutSuccessPage() {
	const searchParams = useSearchParams();
	const orderId = searchParams.get("orderId");
	const paymentId = searchParams.get("paymentId");

	return (
		<div className="min-h-screen px-4 py-10 bg-white dark:bg-slate-950">
			<section className="mx-auto w-full max-w-3xl rounded-3xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-8 shadow-lg">
				<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300">
					<CheckCircle2 size={34} />
				</div>

				<h1 className="mt-5 text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
					Payment Successful
				</h1>
				<p className="mt-3 text-center text-sm text-slate-600 dark:text-slate-300 sm:text-base">
					Your order has been confirmed and marked as paid. Thank you for shopping with Shopera.
				</p>

				<div className="mt-7 space-y-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 p-4">
					<p className="text-sm text-slate-700 dark:text-slate-300">
						<span className="font-semibold text-slate-900 dark:text-white">Order ID:</span>{" "}
						{orderId ?? "Pending confirmation"}
					</p>
					<p className="text-sm text-slate-700 dark:text-slate-300">
						<span className="font-semibold text-slate-900 dark:text-white">Payment ID:</span>{" "}
						{paymentId ?? "Pending confirmation"}
					</p>
				</div>

				<div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
					<Link
						href="/orders"
						className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
					>
						View Orders
					</Link>
					<Link
						href="/"
						className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-300 dark:border-slate-600 px-6 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
					>
						<ShoppingBag size={16} />
						Continue Shopping
					</Link>
				</div>
			</section>
		</div>
	);
}
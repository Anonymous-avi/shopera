"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import jsPDF from "jspdf";
import { db, auth } from "@/lib/firebase";

type OrderItem = {
	id: string;
	title: string;
	price: number;
	quantity: number;
	image: string;
};

type Order = {
	id: string;
	userId: string;
	items: OrderItem[];
	total: number;
	createdAt: unknown;
	paymentId: string;
};

function formatPrice(value: number) {
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
	}).format(value);
}

function toOrderDate(value: unknown): Date {
	if (
		value &&
		typeof value === "object" &&
		"toDate" in value &&
		typeof (value as { toDate: unknown }).toDate === "function"
	) {
		return (value as { toDate: () => Date }).toDate();
	}

	if (value instanceof Date) {
		return value;
	}

	return new Date(value as string | number | Date);
}

function formatOrderDate(value: unknown) {
	return toOrderDate(value).toLocaleString();
}

function downloadReceipt(order: Order) {
	const doc = new jsPDF();

	doc.setFontSize(18);
	doc.text("Shopera Receipt", 20, 20);

	doc.setFontSize(12);
	doc.text(`Order ID: ${order.id}`, 20, 30);
	doc.text(`Date: ${toOrderDate(order.createdAt).toLocaleString()}`, 20, 40);

	let y = 60;

	order.items.forEach((item, index) => {
		doc.text(`${index + 1}. ${item.title} x${item.quantity} - INR ${item.price}`, 20, y);
		y += 10;
	});

	doc.text(`Total: INR ${order.total}`, 20, y + 10);

	doc.save(`receipt-${order.id}.pdf`);
}

const fetchOrders = async (userId: string): Promise<Order[]> => {
	const q = query(
		collection(db, "orders"),
		where("userId", "==", userId),
		orderBy("createdAt", "desc"),
	);

	const snapshot = await getDocs(q);

	const orders = snapshot.docs.map((doc) => ({
		id: doc.id,
		...doc.data(),
	})) as Order[];

	console.log("FETCHED ORDERS:", orders);

	return orders;
};

export default function OrdersPage() {
	const [user, setUser] = useState<User | null>(null);
	const [orders, setOrders] = useState<Order[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
			setUser(currentUser);
			if (!currentUser) {
				setOrders([]);
				setIsLoading(false);
			}
		});

		return () => unsubscribe();
	}, []);

	useEffect(() => {
		if (user?.uid) {
			console.log("CURRENT USER ID:", user.uid);
			setIsLoading(true);
			fetchOrders(user.uid)
				.then((fetchedOrders) => {
					setOrders(fetchedOrders);
					if (fetchedOrders.length === 0) {
						console.log("NO ORDERS FOUND");
					}
				})
				.catch((error) => {
					console.error("Failed to fetch orders", error);
					setOrders([]);
					console.log("NO ORDERS FOUND");
				})
				.finally(() => {
					setIsLoading(false);
				});
		}
	}, [user]);

	if (isLoading) {
		return (
			<div className="min-h-screen px-4 py-8 bg-white dark:bg-slate-950">
				<main className="mx-auto w-full max-w-7xl">
					<div className="mb-6 h-9 w-56 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
					<div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
						{Array.from({ length: 4 }).map((_, index) => (
							<div
								key={`order-skeleton-${index}`}
								className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-md"
							>
								<div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
								<div className="mt-4 h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
							</div>
						))}
					</div>
				</main>
			</div>
		);
	}

	if (orders.length === 0) {
		console.log("NO ORDERS FOUND");
		return (
			<div className="min-h-screen px-4 py-10 bg-white dark:bg-slate-950">
				<section className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-16 text-center shadow-md">
					<h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">No orders yet</h1>
					<p className="mt-3 max-w-md text-sm text-slate-600 dark:text-slate-400 sm:text-base">
						Place your first order to see your history here.
					</p>
				</section>
			</div>
		);
	}

	return (
		<div className="min-h-screen px-4 py-8 bg-white dark:bg-slate-950">
			<main className="mx-auto w-full max-w-7xl">
				<h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Order History</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Review all your recent orders in one place.</p>

				<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
					{orders.map((order) => (
						<article
							key={order.id}
							className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-md transition-all duration-300 hover:shadow-xl"
						>
							<div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
								<div>
									<p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Order Date</p>
									<p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">
										{formatOrderDate(order.createdAt)}
									</p>
								</div>
								<div className="text-right">
									<p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total</p>
									<p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{formatPrice(order.total)}</p>
								</div>
							</div>

							<div className="mt-4 space-y-2 rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
								<p className="text-sm font-semibold text-slate-800 dark:text-white">Items</p>
								{order.items.map((item, index) => (
									<div
										key={`${order.id}-${index}`}
										className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-700 px-3 py-2"
									>
										<span className="text-sm text-slate-700 dark:text-slate-300">{item.title}</span>
										<span className="text-sm font-medium text-slate-900 dark:text-white">x{item.quantity}</span>
									</div>
								))}
							</div>

							<div className="mt-4 flex justify-end">
								<button
									type="button"
									onClick={() => downloadReceipt(order)}
									className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-100 shadow-sm transition hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
								>
									Download Receipt
								</button>
							</div>
						</article>
					))}
				</div>
			</main>
		</div>
	);
}

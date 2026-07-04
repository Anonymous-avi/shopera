"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { CreditCard, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { auth } from "@/lib/firebase";

type ShippingFormState = {
	fullName: string;
	email: string;
	address: string;
	city: string;
	state: string;
	zipCode: string;
};

type OrderItemSnapshot = {
	id: string;
	title: string;
	price: number;
	quantity: number;
	image: string;
};

const initialFormState: ShippingFormState = {
	fullName: "",
	email: "",
	address: "",
	city: "",
	state: "",
	zipCode: "",
};

function formatPrice(value: number) {
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
	}).format(value);
}

const RAZORPAY_CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

async function loadRazorpayScript() {
	if (typeof window === "undefined") {
		return false;
	}

	if (window.Razorpay) {
		return true;
	}

	return new Promise<boolean>((resolve) => {
		const script = document.createElement("script");
		script.src = RAZORPAY_CHECKOUT_SCRIPT;
		script.async = true;
		script.onload = () => resolve(true);
		script.onerror = () => resolve(false);
		document.body.appendChild(script);
	});
}

export default function CheckoutPage() {
	const { cartItems, totalPrice, clearCart } = useCart();
	const router = useRouter();
	const [formData, setFormData] = useState<ShippingFormState>(initialFormState);
	const [isCheckingAuth, setIsCheckingAuth] = useState(true);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isPaying, setIsPaying] = useState(false);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			if (user) {
				setFormData((prev) => ({
					...prev,
					email: prev.email || user.email || "",
					fullName: prev.fullName || user.displayName || "",
				}));
				setIsAuthenticated(true);
				setIsCheckingAuth(false);
				return;
			}

			setIsAuthenticated(false);
			setIsCheckingAuth(false);
			router.replace("/login");
		});

		return () => unsubscribe();
	}, [router]);

	const totalItems = useMemo(
		() => cartItems.reduce((sum, item) => sum + item.quantity, 0),
		[cartItems],
	);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (cartItems.length === 0 || isPaying) {
			return;
		}

		try {
			setIsPaying(true);

			const user = auth.currentUser;

			if (!user) {
				throw new Error("Please log in before making payment.");
			}

			const scriptLoaded = await loadRazorpayScript();

			if (!scriptLoaded || !window.Razorpay) {
				throw new Error("Unable to load Razorpay checkout. Please try again.");
			}

			const createOrderResponse = await fetch("/api/create-order", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					amount: totalPrice,
					receipt: `shopera_${Date.now()}`,
				}),
			});

			if (!createOrderResponse.ok) {
				throw new Error("Could not create payment order.");
			}

			const createOrderData = (await createOrderResponse.json()) as {
				success: boolean;
				order?: {
					id: string;
					amount: number;
				};
				error?: string;
			};

			if (!createOrderData.success || !createOrderData.order) {
				throw new Error(createOrderData.error || "Could not create payment order.");
			}

			const checkoutItemsSnapshot: OrderItemSnapshot[] = cartItems.map((item) => ({
				id: String(item.id),
				title: item.title,
				price: item.price,
				quantity: item.quantity,
				image: item.image,
			}));

			const total = checkoutItemsSnapshot.reduce(
				(sum, item) => sum + item.price * item.quantity,
				0,
			);

			console.log("Cart:", checkoutItemsSnapshot);
			console.log("User:", user);

			const orderId = createOrderData.order.id;
			const amountInPaise = createOrderData.order.amount;

			const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

			if (!razorpayKey) {
				throw new Error("Razorpay key is missing on frontend.");
			}

			const options: RazorpayOptions = {
				key: razorpayKey,
				amount: amountInPaise,
				currency: "INR",
				name: "Shopera",
				description: "Secure checkout",
				order_id: orderId,
				prefill: {
					name: formData.fullName,
					email: formData.email,
				},
				notes: {
					address: `${formData.address}, ${formData.city}, ${formData.state} - ${formData.zipCode}`,
					userId: user.uid,
				},
				theme: {
					color: "#0f172a",
				},
				handler: async function (response) {
					try {
						console.log("PAYMENT SUCCESS", response);

						const verifyRes = await fetch("/api/verify-payment", {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								razorpay_order_id: response.razorpay_order_id,
								razorpay_payment_id: response.razorpay_payment_id,
								razorpay_signature: response.razorpay_signature,
								cartItems,
								totalAmount: total,
								userId: user.uid,
							}),
						});

						const data = (await verifyRes.json()) as { success?: boolean; error?: string };
						console.log("VERIFY RESPONSE:", data);

						if (data.success) {
							clearCart();
							setFormData(initialFormState);
							alert("Order placed successfully!");
							router.push("/orders");
						} else {
							const message = data.error || "Order saving failed";
							console.error("VERIFY ERROR:", message);
							alert("Order saving failed");
						}
					} catch (error) {
						console.error("VERIFY ERROR:", error);
						const message = error instanceof Error ? error.message : "Order saving failed";
						alert(message);
					} finally {
						setIsPaying(false);
					}
				},
				modal: {
					ondismiss: () => {
						setIsPaying(false);
					},
				},
			};

			const paymentObject = new window.Razorpay(options);
			paymentObject.open();

		} catch (error) {
			console.error("Failed to initialize payment", error);
			alert(error instanceof Error ? error.message : "Payment failed. Please try again.");
			setIsPaying(false);
		}
	};

	if (isCheckingAuth) {
		return (
			<div className="flex min-h-screen items-center justify-center px-4 py-10 bg-white dark:bg-slate-950">
				<div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-5 text-center shadow-md">
					<p className="text-base font-medium text-slate-700 dark:text-slate-300">Checking authentication...</p>
				</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return null;
	}

	if (cartItems.length === 0) {
		return (
			<div className="min-h-screen px-4 py-10 bg-white dark:bg-slate-950">
				<section className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-16 text-center shadow-md">
					<div className="mb-5 rounded-full bg-orange-100 dark:bg-orange-900/30 p-4 text-orange-600 dark:text-orange-400">
						<ShoppingBag size={28} />
					</div>
					<h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Your cart is empty</h1>
					<p className="mt-3 max-w-md text-sm text-slate-600 dark:text-slate-400 sm:text-base">
						Add products to your cart before proceeding to checkout.
					</p>
					<Link
						href="/"
						className="mt-7 inline-flex items-center rounded-full bg-slate-900 dark:bg-white px-6 py-3 text-sm font-semibold text-white dark:text-slate-900 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800 dark:hover:bg-slate-100"
					>
						Continue Shopping
					</Link>
				</section>
			</div>
		);
	}

	return (
		<div className="min-h-screen px-4 py-8 bg-white dark:bg-slate-950">
			<main className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.5fr_1fr]">
				<section className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white via-slate-50 to-orange-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-5 shadow-md sm:p-6">
					<h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Checkout</h1>
					<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Enter delivery details and complete secure payment with Razorpay.</p>

					<form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
						<label className="sm:col-span-2">
							<span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</span>
							<input
								type="text"
								required
								value={formData.fullName}
								onChange={(event) =>
									setFormData((prev) => ({ ...prev, fullName: event.target.value }))
								}
								className="h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white outline-none transition focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
								placeholder="John Doe"
							/>
						</label>

						<label className="sm:col-span-2">
							<span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</span>
							<input
								type="email"
								required
								value={formData.email}
								onChange={(event) =>
									setFormData((prev) => ({ ...prev, email: event.target.value }))
								}
								className="h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white outline-none transition focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
								placeholder="john@example.com"
							/>
						</label>

						<label className="sm:col-span-2">
							<span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Address</span>
							<input
								type="text"
								required
								value={formData.address}
								onChange={(event) =>
									setFormData((prev) => ({ ...prev, address: event.target.value }))
								}
								className="h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white outline-none transition focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
								placeholder="123 Main Street"
							/>
						</label>

						<label>
							<span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">City</span>
							<input
								type="text"
								required
								value={formData.city}
								onChange={(event) =>
									setFormData((prev) => ({ ...prev, city: event.target.value }))
								}
								className="h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white outline-none transition focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
								placeholder="New York"
							/>
						</label>

						<label>
							<span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">State</span>
							<input
								type="text"
								required
								value={formData.state}
								onChange={(event) =>
									setFormData((prev) => ({ ...prev, state: event.target.value }))
								}
								className="h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white outline-none transition focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
								placeholder="NY"
							/>
						</label>

						<label className="sm:col-span-2">
							<span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Zip Code</span>
							<input
								type="text"
								required
								value={formData.zipCode}
								onChange={(event) =>
									setFormData((prev) => ({ ...prev, zipCode: event.target.value }))
								}
								className="h-11 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white outline-none transition focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
								placeholder="10001"
							/>
						</label>

						<button
							type="submit"
							disabled={isPaying}
							className="sm:col-span-2 mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-white px-4 text-base font-bold text-white dark:text-slate-900 transition-all duration-300 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
						>
							<CreditCard size={18} />
							{isPaying ? "Processing..." : "Pay Now"}
						</button>
					</form>
				</section>

				<aside className="h-fit rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 p-5 shadow-md backdrop-blur-sm lg:sticky lg:top-24">
					<h2 className="text-lg font-bold text-slate-900 dark:text-white">Order Summary</h2>
					<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{totalItems} item(s) in cart</p>

					<div className="mt-4 space-y-3">
						{cartItems.map((item) => (
							<div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
								<p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{item.title}</p>
								<div className="mt-1 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
									<span>Qty: {item.quantity}</span>
									<span className="font-semibold text-slate-900 dark:text-white">
										{formatPrice(item.price * item.quantity)}
									</span>
								</div>
							</div>
						))}
					</div>

					<div className="mt-5 border-t border-slate-200 dark:border-slate-700 pt-4">
						<div className="flex items-center justify-between">
							<span className="text-sm text-slate-600 dark:text-slate-400">Total</span>
							<span className="text-xl font-bold text-slate-900 dark:text-white">{formatPrice(totalPrice)}</span>
						</div>
						<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Payment is securely processed via Razorpay.</p>
					</div>
				</aside>
			</main>
		</div>
	);
}


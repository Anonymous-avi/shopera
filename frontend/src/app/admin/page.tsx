"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type ProductFormState = {
	name: string;
	price: string;
	imageUrl: string;
	category: string;
	description: string;
};

type ProductListItem = {
	id: string;
	name: string;
	price: number;
	imageUrl: string;
	category: string;
	description: string;
};

const ADMIN_EMAIL = "clownalphareal11@gmail.com";
const FALLBACK_PRODUCT_IMAGE =
	"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80";

const initialFormState: ProductFormState = {
	name: "",
	price: "",
	imageUrl: "",
	category: "",
	description: "",
};

function getSafeImageSrc(imageUrl?: string) {
	if (!imageUrl) {
		return FALLBACK_PRODUCT_IMAGE;
	}

	try {
		const url = new URL(imageUrl);
		if (url.hostname !== "images.unsplash.com") {
			return FALLBACK_PRODUCT_IMAGE;
		}
		return imageUrl;
	} catch {
		return FALLBACK_PRODUCT_IMAGE;
	}
}

export default function AdminPage() {
	const [isCheckingAuth, setIsCheckingAuth] = useState(true);
	const [isAdmin, setIsAdmin] = useState(false);
	const [formData, setFormData] = useState<ProductFormState>(initialFormState);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [successMessage, setSuccessMessage] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const [products, setProducts] = useState<ProductListItem[]>([]);
	const [isLoadingProducts, setIsLoadingProducts] = useState(false);
	const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
	const [editingProductId, setEditingProductId] = useState<string | null>(null);

	const fetchProducts = useCallback(async () => {
		setIsLoadingProducts(true);

		try {
			const snapshot = await getDocs(collection(db, "products"));
			const fetchedProducts: ProductListItem[] = snapshot.docs
				.map((doc) => {
					const data = doc.data() as {
						name?: string;
						price?: number;
						imageUrl?: string;
						category?: string;
						description?: string;
					};

					if (typeof data.name !== "string" || typeof data.price !== "number") {
						return null;
					}

					return {
						id: doc.id,
						name: data.name,
						price: data.price,
						imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : "",
						category: typeof data.category === "string" ? data.category : "",
						description: typeof data.description === "string" ? data.description : "",
					};
				})
				.filter((product): product is ProductListItem => product !== null);

			setProducts(fetchedProducts);
		} catch (error) {
			console.error("Failed to fetch products", error);
			setProducts([]);
		} finally {
			setIsLoadingProducts(false);
		}
	}, []);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			const userEmail = user?.email?.toLowerCase() ?? "";
			setIsAdmin(Boolean(userEmail && ADMIN_EMAIL && userEmail === ADMIN_EMAIL));
			setIsCheckingAuth(false);
		});

		return () => unsubscribe();
	}, []);

	useEffect(() => {
		if (!isAdmin) {
			return;
		}

		void fetchProducts();
	}, [fetchProducts, isAdmin]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSuccessMessage("");
		setErrorMessage("");

		if (!isAdmin) {
			return;
		}

		const parsedPrice = Number(formData.price);

		if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
			setErrorMessage("Please enter a valid product price.");
			return;
		}

		setIsSubmitting(true);
		const payload = {
			name: formData.name.trim(),
			price: parsedPrice,
			imageUrl: formData.imageUrl.trim(),
			category: formData.category.trim(),
			description: formData.description.trim(),
		};

		try {
			if (editingProductId) {
				await updateDoc(doc(db, "products", editingProductId), payload);
				setSuccessMessage("Product updated successfully.");
			} else {
				await addDoc(collection(db, "products"), {
					...payload,
					createdAt: new Date(),
				});
				setSuccessMessage("Product added successfully.");
			}

			setFormData(initialFormState);
			setEditingProductId(null);
			await fetchProducts();
		} catch (error) {
			console.error("Failed to save product", error);
			setErrorMessage("Failed to save product. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleEditProduct = (product: ProductListItem) => {
		setSuccessMessage("");
		setErrorMessage("");
		setEditingProductId(product.id);
		setFormData({
			name: product.name,
			price: String(product.price),
			imageUrl: product.imageUrl,
			category: product.category,
			description: product.description,
		});
	};

	const handleCancelEdit = () => {
		setEditingProductId(null);
		setFormData(initialFormState);
	};

	const handleDeleteProduct = async (product: ProductListItem) => {
		const shouldDelete = window.confirm(`Delete "${product.name}"? This action cannot be undone.`);

		if (!shouldDelete) {
			return;
		}

		setSuccessMessage("");
		setErrorMessage("");
		setDeletingProductId(product.id);

		try {
			await deleteDoc(doc(db, "products", product.id));
			setSuccessMessage("Product deleted successfully.");
			await fetchProducts();
		} catch (error) {
			console.error("Failed to delete product", error);
			setErrorMessage("Failed to delete product. Please try again.");
		} finally {
			setDeletingProductId(null);
		}
	};

	if (isCheckingAuth) {
		return (
			<div className="flex min-h-screen items-center justify-center px-4 py-10 bg-white dark:bg-slate-950">
				<div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-5 text-center shadow-md">
					<p className="text-base font-medium text-slate-700 dark:text-slate-300">Checking admin access...</p>
				</div>
			</div>
		);
	}

	if (!isAdmin) {
		return (
			<div className="flex min-h-screen items-center justify-center px-4 py-10 bg-white dark:bg-slate-950">
				<div className="rounded-2xl border border-red-200 dark:border-red-800 bg-white dark:bg-slate-900 px-8 py-8 text-center shadow-md">
					<h1 className="text-2xl font-bold text-red-600 dark:text-red-400">Access Denied</h1>
					<p className="mt-2 text-sm text-slate-600 dark:text-slate-400">You do not have admin access for this page.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen px-4 py-10 bg-white dark:bg-slate-950">
			<section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-7 shadow-md sm:p-8">
				<h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Admin Dashboard</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Create and manage product inventory.</p>
				{editingProductId && (
					<p className="mt-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 text-sm text-blue-700 dark:text-blue-400">
						Editing selected product
					</p>
				)}

				<form onSubmit={handleSubmit} className="mt-7 space-y-4">
					<label className="block">
						<span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Product Name</span>
						<input
							type="text"
							required
							value={formData.name}
							onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
							className="h-11 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white outline-none transition focus:border-orange-400 dark:focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:focus:ring-orange-900/30"
							placeholder="Wireless Headphones"
						/>
					</label>

					<label className="block">
						<span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Price</span>
						<input
							type="number"
							required
							min="0"
							step="0.01"
							value={formData.price}
							onChange={(event) => setFormData((prev) => ({ ...prev, price: event.target.value }))}
							className="h-11 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white outline-none transition focus:border-orange-400 dark:focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:focus:ring-orange-900/30"
							placeholder="99.99"
						/>
					</label>

					<label className="block">
						<span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Image URL</span>
						<input
							type="url"
							required
							value={formData.imageUrl}
							onChange={(event) => setFormData((prev) => ({ ...prev, imageUrl: event.target.value }))}
							className="h-11 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white outline-none transition focus:border-orange-400 dark:focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:focus:ring-orange-900/30"
							placeholder="https://example.com/image.jpg"
						/>
					</label>

					<label className="block">
						<span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Category</span>
						<input
							type="text"
							required
							value={formData.category}
							onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}
							className="h-11 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white outline-none transition focus:border-orange-400 dark:focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:focus:ring-orange-900/30"
							placeholder="Electronics"
						/>
					</label>

					<label className="block">
						<span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Description (Optional)</span>
						<textarea
							value={formData.description}
							onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
							rows={4}
							className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition focus:border-orange-400 dark:focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:focus:ring-orange-900/30"
							placeholder="Write a short product description"
						/>
					</label>

					{successMessage && (
						<p className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
							{successMessage}
						</p>
					)}

					{errorMessage && (
						<p className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
							{errorMessage}
						</p>
					)}

					<button
						type="submit"
						disabled={isSubmitting}
						className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 dark:bg-white px-4 text-sm font-semibold text-white dark:text-slate-900 transition hover:bg-slate-800 dark:hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isSubmitting ? "Saving..." : editingProductId ? "Update Product" : "Add Product"}
					</button>
					{editingProductId && (
						<button
							type="button"
							onClick={handleCancelEdit}
							className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
						>
							Cancel Edit
						</button>
					)}
				</form>
			</section>

			<section className="mx-auto mt-8 w-full max-w-7xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-md sm:p-8">
				<div className="mb-5 flex items-end justify-between">
					<h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">All Products</h2>
					<p className="text-sm text-slate-500 dark:text-slate-400">Fetched from Firestore</p>
				</div>

				{successMessage && (
					<p className="mb-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
						{successMessage}
					</p>
				)}

				{errorMessage && (
					<p className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
						{errorMessage}
					</p>
				)}

				{isLoadingProducts ? (
					<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 6 }).map((_, index) => (
							<div
								key={`admin-skeleton-${index}`}
								className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md"
							>
								<div className="h-52 animate-pulse bg-slate-200 dark:bg-slate-700" />
								<div className="space-y-2 p-4">
									<div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
									<div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
								</div>
							</div>
						))}
					</div>
				) : products.length === 0 ? (
					<div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-6 text-center">
						<p className="text-sm font-medium text-slate-600 dark:text-slate-400">No products found in Firestore.</p>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{products.map((product) => (
							<article
								key={product.id}
								className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md transition-all duration-300 hover:shadow-xl"
							>
								<div className="overflow-hidden bg-slate-100 dark:bg-slate-800">
									<Image
										src={getSafeImageSrc(product.imageUrl)}
										alt={product.name}
										width={500}
										height={500}
										className="h-52 w-full object-cover"
									/>
								</div>
								<div className="space-y-2 p-4">
									<h3 className="line-clamp-2 text-base font-semibold text-slate-800 dark:text-white">{product.name}</h3>
									<p className="text-sm font-medium text-slate-600 dark:text-slate-400">${product.price.toFixed(2)}</p>
									<p className="text-xs text-slate-500 dark:text-slate-500">{product.category || "Uncategorized"}</p>
									<div className="mt-2 flex items-center gap-2">
										<button
											type="button"
											onClick={() => handleEditProduct(product)}
											className="inline-flex h-9 items-center justify-center rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-blue-700 dark:text-blue-400 transition hover:bg-blue-50 dark:hover:bg-slate-800"
										>
											Edit
										</button>
										<button
											type="button"
											onClick={() => void handleDeleteProduct(product)}
											disabled={deletingProductId === product.id}
											className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-red-700 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
										>
											{deletingProductId === product.id ? "Deleting..." : "Delete"}
										</button>
									</div>
								</div>
							</article>
						))}
					</div>
				)}
			</section>
		</div>
	);
}

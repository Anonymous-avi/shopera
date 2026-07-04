"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { KeyboardEvent, useEffect, useState } from "react";
import { Menu, Moon, Search, ShoppingCart, Sun, User, X } from "lucide-react";
import { onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth";
import { useCart } from "@/context/CartContext";
import { auth } from "@/lib/firebase";
import { Suspense } from "react";

const ADMIN_EMAIL = "[clownalphareal11@gmail.com](mailto:clownalphareal11@gmail.com)";
const THEME_STORAGE_KEY = "shopera-theme";

function getAdminEmailValue(adminEmail: string) {
	const match = adminEmail.match(/mailto:([^\)]+)/i);
	if (match?.[1]) {
		return match[1].toLowerCase();
	}

	return adminEmail.toLowerCase();
}

type NavbarProps = {
	onSearch?: (query: string) => void;
};

type NavbarSearchProps = {
	onSearch?: (query: string) => void;
	variant: "desktop" | "mobile";
};

function NavbarSearch({ onSearch, variant }: NavbarSearchProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			onSearch?.(searchQuery.trim());
		}, 220);

		return () => window.clearTimeout(timeoutId);
	}, [onSearch, searchQuery]);

	const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter") {
			onSearch?.(searchQuery.trim());

			const params = new URLSearchParams(searchParams.toString());
			if (searchQuery.trim()) {
				params.set("q", searchQuery.trim());
			} else {
				params.delete("q");
			}

			const nextPath = params.toString() ? `${pathname}?${params.toString()}` : pathname;
			router.replace(nextPath, { scroll: false });
		}
	};

	if (variant === "desktop") {
		return (
			<div
				role="search"
				className="hidden flex-1 items-center md:flex"
			>
				<div className="group relative w-full">
					<Search
						size={18}
						className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400"
					/>
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						onKeyDown={handleSearchKeyDown}
						placeholder="Search for products, brands and more"
						className="h-11 w-full rounded-full border border-slate-300/90 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 pl-11 pr-4 text-sm text-slate-900 dark:text-white outline-none transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-300 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500/30"
					/>
				</div>
			</div>
		);
	}

	return (
		<div role="search" className="mb-4">
			<div className="group relative">
				<Search
					size={18}
					className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400"
				/>
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					onKeyDown={handleSearchKeyDown}
					placeholder="Search products"
					className="h-11 w-full rounded-full border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 pl-11 pr-4 text-sm text-slate-900 dark:text-white outline-none transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-300 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500/30"
				/>
			</div>
		</div>
	);
}

function NavbarContent({ onSearch }: NavbarProps) {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [theme, setTheme] = useState<"light" | "dark">(() => {
		if (typeof window === "undefined") {
			return "light";
		}

		const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
		return savedTheme === "dark" || savedTheme === "light" ? savedTheme : "light";
	});
	const [user, setUser] = useState<FirebaseUser | null>(null);
	const { totalItemCount } = useCart();

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			setUser(user);
		});

		return () => unsubscribe();
	}, []);

	useEffect(() => {
		document.documentElement.classList.toggle("dark", theme === "dark");
		localStorage.setItem(THEME_STORAGE_KEY, theme);
	}, [theme]);

	const handleLogout = async () => {
		try {
			await signOut(auth);
		} catch (error) {
			console.error("Logout failed", error);
		}
	};

	const handleThemeToggle = () => {
		setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
	};

	const userLabel = user?.displayName || user?.email || "Signed in";
	const normalizedAdminEmail = getAdminEmailValue(ADMIN_EMAIL);
	const isAdminUser =
		user?.email === ADMIN_EMAIL ||
		Boolean(user?.email && user.email.toLowerCase() === normalizedAdminEmail);

	return (
		<header className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 shadow-sm backdrop-blur">
			<nav className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:gap-4 lg:px-8">
				<Link
					href="/"
					className="shrink-0 text-2xl font-black tracking-tight text-slate-900 dark:text-white transition duration-200 hover:scale-[1.01] hover:text-orange-600"
					aria-label="Go to homepage"
				>
					Shopera
				</Link>

				<Suspense fallback={null}>
					<NavbarSearch onSearch={onSearch} variant="desktop" />
				</Suspense>

				<div className="ml-auto hidden items-center gap-2 md:flex">
					<button
						type="button"
						onClick={handleThemeToggle}
						className="inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 p-2.5 text-slate-700 dark:text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-300 dark:hover:border-blue-500 hover:bg-amber-50 dark:hover:bg-slate-800 hover:text-amber-700 hover:shadow-[0_10px_24px_rgba(251,146,60,0.25)] dark:hover:text-blue-300 dark:hover:shadow-[0_10px_24px_rgba(56,189,248,0.15)]"
						aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
					>
						{theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
					</button>

					{user ? (
						<>
							<Link
								href="/orders"
								className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-700 hover:shadow-[0_10px_24px_rgba(59,130,246,0.18)] dark:hover:text-blue-300"
							>
								Orders
							</Link>
							{isAdminUser && (
								<Link
									href="/admin"
									className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-700 hover:shadow-[0_10px_24px_rgba(59,130,246,0.18)] dark:hover:text-blue-300"
								>
									Admin
								</Link>
							)}
							<div className="max-w-44 truncate rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300">
								{userLabel}
							</div>
							<button
								type="button"
								onClick={handleLogout}
								className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-red-300 dark:hover:border-red-600 hover:bg-red-50 dark:hover:bg-slate-800 hover:text-red-700 hover:shadow-[0_10px_24px_rgba(248,113,113,0.2)] dark:hover:text-red-300"
							>
								Logout
							</button>
						</>
					) : (
						<Link
							href="/login"
							className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-700 hover:shadow-[0_10px_24px_rgba(59,130,246,0.18)] dark:hover:text-blue-300"
						>
							<User size={17} />
							Login / Sign In
						</Link>
					)}

					<Link
						href="/cart"
						className="relative inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 p-2.5 text-slate-700 dark:text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-300 dark:hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-slate-800 hover:text-orange-700 hover:shadow-[0_10px_24px_rgba(249,115,22,0.22)] dark:hover:text-orange-300"
						aria-label="Open cart"
					>
						<ShoppingCart size={20} />
						<span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-semibold text-white shadow-sm">
							{totalItemCount}
						</span>
					</Link>
				</div>

				<button
					type="button"
					onClick={handleThemeToggle}
					className="ml-auto inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-700 dark:text-slate-300 transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-800 md:hidden"
					aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
				>
					{theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
				</button>

				<button
					type="button"
					onClick={() => setIsMobileMenuOpen((prev) => !prev)}
					className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-700 dark:text-slate-300 transition-all duration-300 hover:bg-slate-50 hover:shadow-[0_8px_20px_rgba(148,163,184,0.2)] dark:hover:bg-slate-800 md:hidden"
					aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
					aria-expanded={isMobileMenuOpen}
				>
					{isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
				</button>
			</nav>

			{isMobileMenuOpen && (
				<div className="border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-4 md:hidden">
					<Suspense fallback={null}>
						<NavbarSearch onSearch={onSearch} variant="mobile" />
					</Suspense>

					<div className="space-y-2">
						{user ? (
							<div className="space-y-2">
								<div className="min-w-0 truncate rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300">
									{userLabel}
								</div>
								<div className="grid grid-cols-2 gap-2">
									<Link
										href="/orders"
										className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-2 text-center text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:border-blue-200 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-300"
									>
										Orders
									</Link>
									{isAdminUser && (
										<Link
											href="/admin"
											className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-2 text-center text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:border-blue-200 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-300"
										>
											Admin
										</Link>
									)}
								</div>
								<div className="flex items-center justify-between gap-2">
									<button
										type="button"
										onClick={handleLogout}
										className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:border-red-300 dark:hover:border-red-600 hover:bg-red-50 dark:hover:bg-slate-800 hover:text-red-700 dark:hover:text-red-300"
									>
										Logout
									</button>
									<Link
										href="/cart"
										className="relative inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 p-2.5 text-slate-700 dark:text-slate-300 transition hover:border-orange-300 dark:hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-slate-800 hover:text-orange-700 dark:hover:text-orange-300"
										aria-label="Open cart"
									>
										<ShoppingCart size={20} />
										<span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-semibold text-white shadow-sm">
											{totalItemCount}
										</span>
									</Link>
								</div>
							</div>
						) : (
							<Link
								href="/login"
								className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:border-blue-200 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-300"
							>
								<User size={17} />
								Login / Sign In
							</Link>
						)}
					</div>

					{!user && (
						<div className="mt-2 flex items-center justify-end">
							<Link
								href="/cart"
								className="relative inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 p-2.5 text-slate-700 dark:text-slate-300 transition hover:border-orange-300 dark:hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-slate-800 hover:text-orange-700 dark:hover:text-orange-300"
								aria-label="Open cart"
							>
								<ShoppingCart size={20} />
								<span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-semibold text-white shadow-sm">
									{totalItemCount}
								</span>
							</Link>
						</div>
					)}
				</div>
			)}
		</header>
	);
}

export default function Navbar(props: NavbarProps) {
	return (
		<Suspense fallback={null}>
			<NavbarContent {...props} />
		</Suspense>
	);
}

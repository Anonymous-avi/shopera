"use client";

import {
	useCallback,
	createContext,
	useEffect,
	ReactNode,
	useContext,
	useMemo,
	useState,
} from "react";

export type CartItem = {
	id: number;
	title: string;
	price: number;
	image: string;
	quantity: number;
};

export type CartProductInput = {
	id: number;
	title: string;
	price: number;
	image: string;
	quantity?: number;
};

type CartContextValue = {
	cartItems: CartItem[];
	addToCart: (product: CartProductInput) => void;
	increaseQuantity: (id: number) => void;
	decreaseQuantity: (id: number) => void;
	removeFromCart: (id: number) => void;
	clearCart: () => void;
	totalItemCount: number;
	totalPrice: number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);
const CART_STORAGE_KEY = "shopera-cart-items";

function isCartItemArray(value: unknown): value is CartItem[] {
	if (!Array.isArray(value)) {
		return false;
	}

	return value.every((item) => {
		if (!item || typeof item !== "object") {
			return false;
		}

		const candidate = item as Partial<CartItem>;

		return (
			typeof candidate.id === "number" &&
			typeof candidate.title === "string" &&
			typeof candidate.price === "number" &&
			typeof candidate.image === "string" &&
			typeof candidate.quantity === "number"
		);
	});
}

export function CartProvider({ children }: { children: ReactNode }) {
	const [cartItems, setCartItems] = useState<CartItem[]>(() => {
		if (typeof window === "undefined") {
			return [];
		}

		try {
			const storedCart = window.localStorage.getItem(CART_STORAGE_KEY);

			if (!storedCart) {
				return [];
			}

			const parsedCart: unknown = JSON.parse(storedCart);

			if (isCartItemArray(parsedCart)) {
				return parsedCart;
			}
		} catch (error) {
			console.error("Failed to load cart from localStorage", error);
		}

		return [];
	});

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		try {
			window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
		} catch (error) {
			console.error("Failed to save cart to localStorage", error);
		}
	}, [cartItems]);

	const addToCart = useCallback((product: CartProductInput) => {
		const quantityToAdd = product.quantity && product.quantity > 0 ? product.quantity : 1;

		setCartItems((prevItems) => {
			const existingItem = prevItems.find((item) => item.id === product.id);

			if (existingItem) {
				return prevItems.map((item) =>
					item.id === product.id
						? { ...item, quantity: item.quantity + quantityToAdd }
						: item,
				);
			}

			return [...prevItems, { ...product, quantity: quantityToAdd }];
		});
	}, []);

	const increaseQuantity = useCallback((id: number) => {
		setCartItems((prevItems) =>
			prevItems.map((item) =>
				item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
			),
		);
	}, []);

	const decreaseQuantity = useCallback((id: number) => {
		setCartItems((prevItems) =>
			prevItems
				.map((item) =>
					item.id === id ? { ...item, quantity: item.quantity - 1 } : item,
				)
				.filter((item) => item.quantity > 0),
		);
	}, []);

	const removeFromCart = useCallback((id: number) => {
		setCartItems((prevItems) => prevItems.filter((item) => item.id !== id));
	}, []);

	const clearCart = useCallback(() => {
		setCartItems([]);
	}, []);

	const totalItemCount = useMemo(
		() => cartItems.reduce((total, item) => total + item.quantity, 0),
		[cartItems],
	);

	const totalPrice = useMemo(
		() =>
			cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
		[cartItems],
	);

	const value = useMemo(
		() => ({
			cartItems,
			addToCart,
			increaseQuantity,
			decreaseQuantity,
			removeFromCart,
			clearCart,
			totalItemCount,
			totalPrice,
		}),
		[
			cartItems,
			addToCart,
			increaseQuantity,
			decreaseQuantity,
			removeFromCart,
			clearCart,
			totalItemCount,
			totalPrice,
		],
	);

	return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
	const context = useContext(CartContext);

	if (!context) {
		throw new Error("useCart must be used within a CartProvider");
	}

	return context;
}

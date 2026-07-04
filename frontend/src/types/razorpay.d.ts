declare global {
	type RazorpayPaymentResponse = {
		razorpay_payment_id: string;
		razorpay_order_id: string;
		razorpay_signature: string;
	};

	type RazorpayOptions = {
		key: string;
		amount: number;
		currency: string;
		name: string;
		description?: string;
		order_id: string;
		prefill?: {
			name?: string;
			email?: string;
			contact?: string;
		};
		notes?: Record<string, string>;
		theme?: {
			color?: string;
		};
		handler: (response: RazorpayPaymentResponse) => void | Promise<void>;
		modal?: {
			ondismiss?: () => void;
		};
	};

	type RazorpayInstance = {
		open: () => void;
	};

	type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

	interface Window {
		Razorpay?: RazorpayConstructor;
	}
}

export {};
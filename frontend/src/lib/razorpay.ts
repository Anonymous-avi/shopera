import "server-only";
import Razorpay from "razorpay";

export function getRazorpayInstance() {
	const keyId = process.env.RAZORPAY_KEY_ID;
	const keySecret = process.env.RAZORPAY_KEY_SECRET;

	console.log("[razorpay] Env presence", {
		hasKeyId: Boolean(keyId),
		hasKeySecret: Boolean(keySecret),
	});

	if (!keyId || !keySecret) {
		throw new Error(
			"Missing Razorpay configuration. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server environment variables.",
		);
	}

	return new Razorpay({
		key_id: keyId,
		key_secret: keySecret,
	});
}
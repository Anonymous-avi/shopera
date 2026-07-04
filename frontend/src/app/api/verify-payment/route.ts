import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
	try {
		console.log("VERIFY API HIT");
		console.log(req.body);

		const body = await req.json();
		console.log(body);

		const {
			razorpay_order_id,
			razorpay_payment_id,
			razorpay_signature,
			cartItems,
			totalAmount,
			userId,
		} = body as {
			razorpay_order_id?: string;
			razorpay_payment_id?: string;
			razorpay_signature?: string;
			cartItems?: Array<{
				id?: string | number;
				title?: string;
				price?: number;
				quantity?: number;
				image?: string;
			}>;
			totalAmount?: number;
			userId?: string;
		};

		console.log("Incoming:", body);

		if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
			return NextResponse.json(
				{ success: false, error: "Missing Razorpay payment verification fields" },
				{ status: 400 },
			);
		}

		if (!userId) {
			throw new Error("Missing userId in verify-payment payload");
		}

		if (!Array.isArray(cartItems) || cartItems.length === 0) {
			return NextResponse.json(
				{ success: false, error: "cartItems must be a non-empty array" },
				{ status: 400 },
			);
		}

		const secret = process.env.RAZORPAY_KEY_SECRET;

		if (!secret) {
			return NextResponse.json(
				{ success: false, error: "Missing RAZORPAY_KEY_SECRET on server" },
				{ status: 500 },
			);
		}

		const generatedSignature = crypto
			.createHmac("sha256", secret)
			.update(razorpay_order_id + "|" + razorpay_payment_id)
			.digest("hex");

		console.log("Generated:", generatedSignature);
		console.log("Received:", razorpay_signature);

		if (generatedSignature !== razorpay_signature) {
			return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 400 });
		}

		console.log("[verify-payment] Before saving order");

		const docRef = await db.collection("orders").add({
			userId,
			items: cartItems.map((item) => ({
				id: item.id,
				title: item.title,
				price: item.price,
				quantity: item.quantity,
				image: item.image,
			})),
			total: totalAmount,
			paymentId: razorpay_payment_id,
			createdAt: new Date(),
		});

		console.log("ORDER SAVED SUCCESSFULLY", docRef.id);

		return NextResponse.json({ success: true, orderId: docRef.id });
	} catch (error) {
		console.error("[verify-payment] Error", error);
		const message = error instanceof Error ? error.message : "Failed to verify payment and save order";
		return NextResponse.json({ success: false, error: message }, { status: 500 });
	}
}
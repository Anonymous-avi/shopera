import { NextRequest, NextResponse } from "next/server";
import { getRazorpayInstance } from "@/lib/razorpay";

type CreateOrderBody = {
	amount: number;
	receipt?: string;
};

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
	try {
		const hasKeyId = Boolean(process.env.RAZORPAY_KEY_ID);
		const hasKeySecret = Boolean(process.env.RAZORPAY_KEY_SECRET);
		console.log("[create-order] Razorpay env presence", {
			hasKeyId,
			hasKeySecret,
		});

		let body: CreateOrderBody;
		try {
			body = (await request.json()) as CreateOrderBody;
		} catch (parseError) {
			console.error("[create-order] Invalid JSON body", parseError);
			return NextResponse.json(
				{ success: false, error: "Invalid JSON body" },
				{ status: 400 },
			);
		}

		console.log("[create-order] Request body", body);

		const amountInRupees = Number(body.amount);

		if (!Number.isFinite(amountInRupees) || amountInRupees <= 0) {
			return NextResponse.json(
				{ success: false, error: "Invalid amount. Provide amount > 0 in INR." },
				{ status: 400 },
			);
		}

		const amountInPaise = Math.round(amountInRupees * 100);

		const razorpay = getRazorpayInstance();

		const order = await razorpay.orders.create({
			amount: amountInPaise,
			currency: "INR",
			receipt: body.receipt ?? "receipt_" + Date.now(),
		});

		console.log("[create-order] Created Razorpay order", order);

		return NextResponse.json({ success: true, order });
	} catch (error) {
		console.error("[create-order] Failed to create Razorpay order", error);
		const errorMessage = error instanceof Error ? error.message : "Could not create payment order";
		return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
	}
}
import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

console.log("[firebase-admin] Env presence", {
	hasProjectId: Boolean(projectId),
	hasClientEmail: Boolean(clientEmail),
	hasPrivateKey: Boolean(privateKey),
	privateKeyPreview: privateKey ? privateKey.slice(0, 24) + "..." : "missing",
});

if (!projectId || !clientEmail || !privateKey) {
	throw new Error(
		"Missing Firebase Admin environment variables. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.",
	);
}

const serviceAccount = {
	projectId,
	clientEmail,
	privateKey,
};

if (!getApps().length) {
	initializeApp({
		credential: cert(serviceAccount),
	});
}

export const db = getFirestore();
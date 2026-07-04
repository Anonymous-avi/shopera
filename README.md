This repository contains a Next.js e-commerce app with Razorpay checkout and Firebase-backed order storage.

## Getting Started

1. Move to the frontend app:

```bash
cd frontend
```

2. Create your environment file:

```bash
cp .env.example .env.local
```

3. Fill all required Razorpay and Firebase variables in `.env.local`.

4. Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Payment API Routes

- `POST /api/create-order`: Creates a Razorpay order in INR paise.
- `POST /api/verify-payment`: Verifies payment signature and stores order in Firestore with `status: "paid"`.

### Checkout Flow

- User enters shipping details in checkout.
- App creates Razorpay order from backend.
- Razorpay modal opens with user prefill and order details.
- Success callback sends payment IDs + signature to backend verification route.
- Verified payments are saved in Firestore and user is redirected to success page.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

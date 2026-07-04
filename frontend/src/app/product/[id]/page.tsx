"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { ShoppingCart, Star } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { useCart } from "@/context/CartContext";
import { auth, db } from "@/lib/firebase";

type ProductRecord = {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
};

type ReviewRecord = {
  id: string;
  userEmail: string;
  rating: number;
  comment: string;
  createdAt: unknown;
};

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80";

const DEFAULT_DESCRIPTION =
  "This product is crafted with quality materials and designed for everyday comfort and long-term durability.";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function toCartId(value: string) {
  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

function normalizeCategory(value?: unknown) {
  if (typeof value !== "string") {
    return "Uncategorized";
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : "Uncategorized";
}

function toMillis(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return 0;
}

function formatReviewDate(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toLocaleDateString();
  }

  if (value instanceof Date) {
    return value.toLocaleDateString();
  }

  return "Just now";
}

export default function Page() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : undefined;

  const { addToCart } = useCart();
  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMessage, setReviewSuccessMessage] = useState("");
  const [reviewErrorMessage, setReviewErrorMessage] = useState("");
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);

  const fetchReviewsForProduct = useCallback(async (productId: string) => {
    setIsLoadingReviews(true);

    try {
      const reviewsRef = collection(db, "reviews");
      const reviewsQuery = query(reviewsRef, where("productId", "==", productId));
      const snapshot = await getDocs(reviewsQuery);

      const fetchedReviews = snapshot.docs
        .map((reviewDoc) => {
          const data = reviewDoc.data() as {
            userEmail?: unknown;
            rating?: unknown;
            comment?: unknown;
            createdAt?: unknown;
          };

          return {
            id: reviewDoc.id,
            userEmail: typeof data.userEmail === "string" && data.userEmail.trim() ? data.userEmail : "Anonymous",
            rating: typeof data.rating === "number" ? Math.min(Math.max(data.rating, 1), 5) : 1,
            comment: typeof data.comment === "string" ? data.comment : "",
            createdAt: data.createdAt,
          };
        })
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

      setReviews(fetchedReviews);
    } catch (error) {
      console.error("Failed to fetch reviews", error);
      setReviews([]);
    } finally {
      setIsLoadingReviews(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!id) {
      setProduct(null);
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const rawProduct = { id: docSnap.id, ...docSnap.data() } as {
            id: string;
            name?: unknown;
            price?: unknown;
            image?: unknown;
            imageUrl?: unknown;
            category?: unknown;
            description?: unknown;
          };

          setProduct({
            id: rawProduct.id,
            name: typeof rawProduct.name === "string" ? rawProduct.name : "Untitled product",
            price: typeof rawProduct.price === "number" ? rawProduct.price : 0,
            image:
              typeof rawProduct.image === "string"
                ? rawProduct.image
                : typeof rawProduct.imageUrl === "string"
                  ? rawProduct.imageUrl
                  : FALLBACK_PRODUCT_IMAGE,
            category: normalizeCategory(rawProduct.category),
            description:
              typeof rawProduct.description === "string" && rawProduct.description.trim()
                ? rawProduct.description
                : DEFAULT_DESCRIPTION,
          });
        } else {
          setProduct(null);
        }
      } catch (error) {
        console.error(error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchProduct();
  }, [id]);

  useEffect(() => {
    if (!product?.id) {
      setReviews([]);
      setIsLoadingReviews(false);
      return;
    }

    void fetchReviewsForProduct(product.id);
  }, [fetchReviewsForProduct, product?.id]);

  const cartItemId = useMemo(() => (product ? toCartId(product.id) : 0), [product]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) {
      return 0;
    }

    const totalRating = reviews.reduce((total, review) => total + review.rating, 0);
    return totalRating / reviews.length;
  }, [reviews]);

  const roundedAverageRating = useMemo(() => Math.round(averageRating), [averageRating]);

  const handleAddToCart = () => {
    if (!product) {
      return;
    }

    addToCart({
      id: cartItemId,
      title: product.name,
      price: product.price,
      image: product.image,
    });
  };

  const handleSubmitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReviewSuccessMessage("");
    setReviewErrorMessage("");

    if (!currentUser) {
      setReviewErrorMessage("Please sign in to submit a review.");
      return;
    }

    if (!product) {
      setReviewErrorMessage("Product not found.");
      return;
    }

    const trimmedComment = comment.trim();
    if (!trimmedComment) {
      setReviewErrorMessage("Please write a comment before submitting.");
      return;
    }

    if (rating < 1 || rating > 5) {
      setReviewErrorMessage("Rating must be between 1 and 5.");
      return;
    }

    setIsSubmittingReview(true);

    try {
      await addDoc(collection(db, "reviews"), {
        productId: product.id,
        userId: currentUser.uid,
        userEmail: currentUser.email ?? "",
        rating,
        comment: trimmedComment,
        createdAt: serverTimestamp(),
      });

      setReviewSuccessMessage("Review submitted successfully.");
      setComment("");
      setRating(5);
      await fetchReviewsForProduct(product.id);
    } catch (error) {
      console.error("Failed to submit review", error);
      setReviewErrorMessage("Failed to submit review. Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!product) {
    return <div>Product not found</div>;
  }

  return (
    <div className="min-h-screen px-4 py-8 lg:py-10">
      <main className="mx-auto w-full max-w-6xl rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm sm:p-8">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
            <Image
              src={product.image}
              alt={product.name}
              width={900}
              height={900}
              className="aspect-square h-auto w-full object-cover"
              priority
            />
          </div>

          <div className="flex flex-col justify-center">
            <p className="inline-flex w-fit rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
              {product.category}
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              {product.name}
            </h1>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex items-center gap-0.5" aria-label={`Average rating ${averageRating.toFixed(1)} out of 5`}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={`average-rating-star-${index + 1}`}
                    size={18}
                    className={
                      index < roundedAverageRating ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"
                    }
                  />
                ))}
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{averageRating.toFixed(1)}</p>
            </div>
            <p className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{formatPrice(product.price)}</p>
            <p className="mt-5 text-base leading-relaxed text-slate-600 dark:text-slate-300">{product.description}</p>

            <button
              type="button"
              onClick={handleAddToCart}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-base font-semibold text-white transition-all duration-300 hover:bg-orange-600 hover:shadow-[0_10px_30px_rgba(249,115,22,0.32)] sm:w-fit"
            >
              <ShoppingCart size={18} />
              Add to Cart
            </button>
          </div>
        </div>

        <section className="mt-10 border-t border-slate-200 pt-8 dark:border-slate-700">
          <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Write a Review</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Share your experience with this product.
            </p>

            {!currentUser && (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                Please sign in to submit a review.
              </p>
            )}

            <form onSubmit={handleSubmitReview} className="mt-5 space-y-4">
              <div>
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Rating</span>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const starValue = index + 1;
                    const isActive = starValue <= rating;

                    return (
                      <button
                        key={`rating-star-${starValue}`}
                        type="button"
                        onClick={() => setRating(starValue)}
                        className="inline-flex items-center justify-center rounded-md p-1 transition-all duration-300 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                        aria-label={`Rate ${starValue} star${starValue > 1 ? "s" : ""}`}
                        disabled={!currentUser || isSubmittingReview}
                      >
                        <Star
                          size={22}
                          className={isActive ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"}
                        />
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">Selected: {rating}/5</p>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Comment</span>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={4}
                  required
                  minLength={5}
                  maxLength={1000}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition-all duration-300 focus:border-orange-400 dark:focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:focus:ring-orange-900/30"
                  placeholder="Tell others what you liked or disliked"
                  disabled={!currentUser || isSubmittingReview}
                />
              </label>

              {reviewSuccessMessage && (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
                  {reviewSuccessMessage}
                </p>
              )}

              {reviewErrorMessage && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                  {reviewErrorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={!currentUser || isSubmittingReview}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 dark:bg-white px-5 text-sm font-semibold text-white dark:text-slate-900 transition-all duration-300 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
              >
                {isSubmittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </form>

            <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-700">
              <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Customer Reviews</h3>

              {isLoadingReviews ? (
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Loading reviews...</p>
              ) : reviews.length === 0 ? (
                <p className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                  No reviews yet
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {reviews.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{review.userEmail}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{formatReviewDate(review.createdAt)}</p>
                      </div>

                      <div className="mt-2 flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={`${review.id}-rating-star-${index + 1}`}
                            size={16}
                            className={
                              index < review.rating ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"
                            }
                          />
                        ))}
                      </div>

                      <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{review.comment}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

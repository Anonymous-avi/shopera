"use client";

import { FormEvent, useState } from "react";
import { auth } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("CLICK WORKING"); // DEBUG

    try {
      if (isLogin) {
        const user = await signInWithEmailAndPassword(auth, email, password);
        alert("Login successful");
        console.log(user);
      } else {
        const user = await createUserWithEmailAndPassword(auth, email, password);
        alert("Signup successful");
        console.log(user);
      }
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("Something went wrong");
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="p-6 border rounded-xl shadow-md w-[350px]">
        <h2 className="text-2xl font-bold mb-4 text-center">
          {isLogin ? "Login" : "Sign Up"}
        </h2>

        <form onSubmit={handleAuth}>
          <input
            type="email"
            placeholder="Email"
            required
            className="w-full p-2 mb-3 border rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            required
            minLength={6}
            className="w-full p-2 mb-3 border rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800"
          >
            {isLogin ? "Login" : "Sign Up"}
          </button>
        </form>

        <p
          className="mt-4 text-sm text-center cursor-pointer text-blue-500"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin
            ? "Don't have an account? Sign Up"
            : "Already have an account? Login"}
        </p>
      </div>
    </div>
  );
}
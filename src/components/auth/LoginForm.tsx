"use client";

import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGoogle, faWindows } from "@fortawesome/free-brands-svg-icons";
// Lazy-load react-hot-toast and Firebase auth at runtime to avoid DOM access during server prerender
import { useRouter, useSearchParams } from "next/navigation";

enum FormMode {
  Login,
  Register,
}

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const clearErrorOnChange = () => {
    if (error) setError(null);
  };
  const [formMode, setFormMode] = useState<FormMode>(FormMode.Login);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/app/dashboard";

  const handleGoogleAuth = async () => {
    try {
      const signInModule = await import("@/lib/firebase/signin");
      const { signIn, SignInMethod } = signInModule as any;
      const { user, error } = await signIn(SignInMethod.Google, {
        signupCallback: async (userCredential: any) => {
          const idToken = await userCredential.user.getIdToken();
          await fetch("/api/users/signup", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              uid: userCredential.user.uid,
              email: userCredential.user.email,
              name: userCredential.user.displayName,
            }),
          });
        },
      });
      if (user) {
        router.push(returnUrl);
      } else if (error) {
        const { toast } = await import("react-hot-toast");
        toast.error(error);
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
      const { toast } = await import("react-hot-toast");
      toast.error("An unexpected error occurred during Google sign-in");
    }
  };

  const handleMicrosoftAuth = async () => {
    try {
      const signInModule = await import("@/lib/firebase/signin");
      const { signIn, SignInMethod } = signInModule as any;
      const { user, error } = await signIn(SignInMethod.Microsoft, {
        signupCallback: async (userCredential: any) => {
          const idToken = await userCredential.user.getIdToken();
          await fetch("/api/users/signup", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              uid: userCredential.user.uid,
              email: userCredential.user.email,
              name: userCredential.user.displayName,
            }),
          });
        },
      });
      if (user) {
        router.push(returnUrl);
      } else if (error) {
        const { toast } = await import("react-hot-toast");
        toast.error(error);
      }
    } catch (err) {
      console.error("Microsoft sign-in error:", err);
      const { toast } = await import("react-hot-toast");
      toast.error("An unexpected error occurred during Microsoft sign-in");
    }
  };

  const handleLogin = async () => {
    try {
      setError(null);
      setInfoMessage(null);
      const signInModule = await import("@/lib/firebase/signin");
      const { signIn, SignInMethod } = signInModule as any;
      const { user, error } = await signIn(SignInMethod.EmailPassword, {
        credentials: {
          email,
          password,
        },
        signupCallback: async (userCredential: any) => {
          const idToken = await userCredential.user.getIdToken();
          await fetch("/api/users/signup", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              uid: userCredential.user.uid,
              email: userCredential.user.email,
              name: userCredential.user.displayName,
            }),
          });
        },
      });
      if (user) {
        router.push(returnUrl);
      } else if (error) {
        const { toast } = await import("react-hot-toast");
        toast.error(error);
        if (error.toLowerCase().includes("verify your email")) {
          setInfoMessage("Please verify your email first, then sign in again.");
        }
      }
    } catch (err) {
      console.error("Email/password sign-in error:", err);
      const { toast } = await import("react-hot-toast");
      toast.error("An unexpected error occurred during login");
    }
  };

  const handleRegister = async () => {
    setError(null);
    setInfoMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const signUpModule = await import("@/lib/firebase/signup");
      const signUp = signUpModule.default as any;
      const { user, error } = await signUp(
        email,
        password,
        async (userCredential: any) => {
          // Ensure a Firestore user document is created for newly registered users.
          // Pass the ID token directly — the __session cookie hasn't been set yet
          // (AuthContext.onAuthStateChanged fires asynchronously after this callback).
          const idToken = await userCredential.user.getIdToken();
          await fetch("/api/users/signup", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              uid: userCredential.user.uid,
              email: userCredential.user.email,
              name: userCredential.user.displayName,
            }),
          });
        },
      );
      if (user) {
        setFormMode(FormMode.Login);
        setPassword("");
        setConfirmPassword("");
        setInfoMessage(
          "Account created. Check your inbox for a verification email before signing in.",
        );
      } else if (error) {
        setError(error.message);
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("An unexpected error occurred during registration");
    }
  };

  return (
    <div
      className="relative min-h-screen text-[--text] overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(52,211,153,0.06) 0%, transparent 50%), #0a141f",
      }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="absolute inset-6 neon-grid" />
      </div>

      <div className="relative w-full max-w-6xl mx-auto px-6 lg:px-12 py-12 lg:py-16">
        <div className="flex flex-col lg:flex-row gap-10 items-center">
          <div className="flex-1 space-y-4 text-center lg:text-left">
            <div className="inline-flex items-center gap-3 neon-badge-muted px-3 py-2 rounded-xl">
              Secure access
            </div>
            <h1 className="text-3xl lg:text-5xl font-light leading-tight">
              Launch a Pentest in 5 Minutes.
            </h1>
            <p className="text-base lg:text-lg neon-subtle max-w-xl">
              Join the teams already trusting Affordable Pentesting to run fast,
              AI-powered autonomous pentests.
            </p>
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start text-sm text-[var(--text-muted)]">
              <span className="neon-chip">AI-Powered Pentesting</span>
              <span className="neon-chip">Anthropic Claude Agents</span>
              <span className="neon-chip">Compliance Ready Reports</span>
            </div>
          </div>

          <div className="flex-1 w-full max-w-xl">
            <div className="p-6 lg:p-7 space-y-6 rounded-[18px] bg-[rgba(255,255,255,0.06)] border border-white/10 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)] mb-1">
                    {formMode === FormMode.Login
                      ? "Welcome back"
                      : "Create account"}
                  </p>
                  <h2 className="text-2xl font-light">
                    {formMode === FormMode.Login ? "Sign in" : "Sign up"}
                  </h2>
                </div>
                <button
                  className="text-sm neon-outline-btn px-3 py-2"
                  onClick={() =>
                    setFormMode(
                      formMode === FormMode.Login
                        ? FormMode.Register
                        : FormMode.Login,
                    )
                  }
                >
                  {formMode === FormMode.Login
                    ? "New here?"
                    : "Have an account?"}
                </button>
              </div>

              {error && (
                <div className="text-[var(--danger)] text-sm">{error}</div>
              )}
              {infoMessage && (
                <div className="text-gray-300 text-sm">{infoMessage}</div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-normal text-[var(--text)]">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder=" you@company.com"
                    className="neon-input w-full py-3"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearErrorOnChange();
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-normal text-[var(--text)]">
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder=" Enter password"
                    className="neon-input w-full py-3"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearErrorOnChange();
                    }}
                  />
                </div>

                {formMode === FormMode.Register && (
                  <div className="space-y-2">
                    <label className="text-sm font-normal text-[var(--text)]">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      placeholder=" Repeat password"
                      className="neon-input w-full py-3"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {formMode === FormMode.Login ? (
                  <button
                    disabled={!email || !password}
                    onClick={handleLogin}
                    className="neon-primary-btn w-full py-3 font-normal disabled:opacity-60"
                  >
                    Sign in
                  </button>
                ) : (
                  <button
                    disabled={!email || !password || !confirmPassword}
                    onClick={handleRegister}
                    className="neon-primary-btn w-full py-3 font-normal disabled:opacity-60"
                  >
                    Create account
                  </button>
                )}

                <button
                  className="neon-outline-btn w-full py-3 font-normal flex items-center justify-center gap-2"
                  onClick={handleGoogleAuth}
                >
                  <FontAwesomeIcon icon={faGoogle} className="text-lg" />{" "}
                  Continue with Google
                </button>

                <button
                  className="neon-outline-btn w-full py-3 font-normal flex items-center justify-center gap-2"
                  onClick={handleMicrosoftAuth}
                >
                  <FontAwesomeIcon icon={faWindows} className="text-lg" />{" "}
                  Continue with Microsoft
                </button>
              </div>

              <div className="text-xs neon-subtle text-center">
                By continuing you agree to our{" "}
                <a
                  href="/trust-safety#terms"
                  className="underline hover:text-[#34D399] transition-colors"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="/trust-safety#privacy"
                  className="underline hover:text-[#34D399] transition-colors"
                >
                  Privacy Policy
                </a>
                .
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

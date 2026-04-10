"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { DefaultCookieManager } from "../cookies/DefaultCookieManager";
import { AuthService } from "../auth/AuthService";

type UserClaims = {
  [key: string]: any;
};

interface AuthContextType {
  currentUser: User | null;
  userClaims: UserClaims | null;
  isLoadingAuth: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userClaims: null,
  isLoadingAuth: true,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
  authService: AuthService;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  authService,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userClaims, setUserClaims] = useState<UserClaims | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);

      if (user) {
        const claims = await authService.getUserClaims(user);
        setUserClaims(claims);
        // Set httpOnly __session cookie (verified server-side by API routes)
        try {
          const idToken = await user.getIdToken(true);
          await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
        } catch (e) {
          console.error("Failed to set session cookie:", e);
        }
        DefaultCookieManager.addAuthCookie(user.uid);
      } else {
        setUserClaims(null);
        // Clear httpOnly session cookie
        fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
        DefaultCookieManager.removeAuthCookie();
      }
    });

    return () => unsubscribe();
  }, [authService]);

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!currentUser && pathname.startsWith("/app")) {
      router.push("/login");
    } else if (currentUser && pathname.startsWith("/login")) {
      router.push("/app/dashboard");
    }
  }, [currentUser, pathname, router, isLoadingAuth]);

  const value = {
    currentUser,
    userClaims,
    isLoadingAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

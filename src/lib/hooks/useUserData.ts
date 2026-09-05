"use client";

import useSWR from "swr";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firebaseClient";
import { useAuth } from "@/lib/context/AuthContext";
import { UserDocument } from "@/lib/types/user";

export function useUserData() {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;

  const { data, isLoading } = useSWR(
    uid ? `users/${uid}` : null,
    async () => {
      const snapshot = await getDoc(doc(getDb(), "users", uid!));
      return snapshot.exists() ? (snapshot.data() as UserDocument) : null;
    },
    { refreshInterval: 30_000 },
  );

  return { userData: data ?? null, loading: isLoading };
}
import { User, onIdTokenChanged } from "firebase/auth";
import { getFirebaseAuth } from "../firebase/firebaseClient";

export class AuthService {
  onAuthStateChanged(callback: (user: User | null) => void) {
    return onIdTokenChanged(getFirebaseAuth(), callback);
  }

  async getUserClaims(user: User): Promise<{ [key: string]: any }> {
    await user.getIdToken(true);
    const tokenResult = await user.getIdTokenResult();
    return tokenResult.claims;
  }
}

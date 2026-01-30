// auth.js - Firebase Authentication for ChatFlow
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ✅ YOUR ACTUAL FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCaEr10IUsw_RBjGY_LODpFKWH0pjV8gho",
  authDomain: "chatflow-df777.firebaseapp.com",
  projectId: "chatflow-df777",
  storageBucket: "chatflow-df777.firebasestorage.app",
  messagingSenderId: "1065402960315",
  appId: "1:1065402960315:web:48a4b91c6269d7d4be5c9e",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.userData = null;
    this.init();
  }

  async init() {
    // Load user from localStorage if available
    this.loadUserFromStorage();

    // Listen for auth state changes
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        await this.handleAuthenticatedUser(user);
      } else {
        this.handleUserSignedOut();
      }
    });
  }

  async handleAuthenticatedUser(firebaseUser) {
    // Get or create user document in Firestore
    const userRef = doc(db, "users", firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      // User exists in Firestore
      this.userData = userSnap.data();
    } else {
      // Create new user document
      this.userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email.split("@")[0],
        photoURL:
          firebaseUser.photoURL ||
          this.generateDefaultAvatar(firebaseUser.email),
        plan: localStorage.getItem("selectedPlan") || "free",
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        messagesUsed: 0,
        messagesLimit: this.getPlanLimit("free"),
      };

      await setDoc(userRef, this.userData);
    }

    // Update last login
    await updateDoc(userRef, {
      lastLogin: new Date().toISOString(),
    });

    this.currentUser = {
      ...firebaseUser,
      ...this.userData,
    };

    this.saveUserToStorage();

    // Dispatch event for other parts of app
    window.dispatchEvent(
      new CustomEvent("authStateChanged", {
        detail: { user: this.currentUser, isAuthenticated: true },
      }),
    );

    console.log("User authenticated:", this.currentUser);
    window.dispatchEvent(new CustomEvent("showChatInterface"));

    return this.currentUser;
  }

  handleUserSignedOut() {
    this.currentUser = null;
    this.userData = null;
    localStorage.removeItem("chatflow_user");
    localStorage.removeItem("chatflow_user_data");

    window.dispatchEvent(
      new CustomEvent("authStateChanged", {
        detail: { user: null, isAuthenticated: false },
      }),
    );

    console.log("User signed out");
  }

  // Email/Password Authentication
  async signInWithEmail(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      return {
        success: true,
        user: userCredential.user,
      };
    } catch (error) {
      console.error("Sign in error:", error);
      return {
        success: false,
        error: this.getErrorMessage(error.code),
      };
    }
  }

  async signUpWithEmail(name, email, password) {
    try {
      // Create user with email/password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // Update profile with name
      await updateProfile(userCredential.user, {
        displayName: name,
      });

      // Get selected plan from localStorage
      const selectedPlan = localStorage.getItem("selectedPlan") || "free";

      // Create user document in Firestore
      const userRef = doc(db, "users", userCredential.user.uid);
      await setDoc(userRef, {
        uid: userCredential.user.uid,
        email: email,
        name: name,
        photoURL: null,
        plan: selectedPlan,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        messagesUsed: 0,
        messagesLimit: this.getPlanLimit(selectedPlan),
      });

      return {
        success: true,
        user: userCredential.user,
      };
    } catch (error) {
      console.error("Sign up error:", error);
      return {
        success: false,
        error: this.getErrorMessage(error.code),
      };
    }
  }

  // Google Authentication
  async signInWithGoogle() {
    try {
      // Add additional scopes if needed
      googleProvider.addScope("profile");
      googleProvider.addScope("email");

      const result = await signInWithPopup(auth, googleProvider);
      return {
        success: true,
        user: result.user,
      };
    } catch (error) {
      console.error("Google sign in error:", error);
      return {
        success: false,
        error: this.getErrorMessage(error.code),
      };
    }
  }

  // Get current user
  getUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return !!this.currentUser;
  }

  getPlan() {
    return this.userData?.plan || "free";
  }

  // Get user's message limits based on plan
  getPlanLimit(plan) {
    const limits = {
      free: 100,
      standard: 2000,
      premium: 10000,
    };
    return limits[plan] || 100;
  }

  // Check if user can send more messages
  canSendMessage() {
    if (!this.userData) return false;

    const limit = this.getPlanLimit(this.userData.plan);
    return this.userData.messagesUsed < limit;
  }

  // Increment message count
  async incrementMessageCount() {
    if (!this.currentUser?.uid) return;

    const userRef = doc(db, "users", this.currentUser.uid);
    await updateDoc(userRef, {
      messagesUsed: (this.userData.messagesUsed || 0) + 1,
    });

    // Update local data
    this.userData.messagesUsed = (this.userData.messagesUsed || 0) + 1;
    this.saveUserToStorage();
  }

  // Upgrade user's plan
  async upgradePlan(newPlan) {
    if (!this.currentUser?.uid) {
      return { success: false, error: "No user found" };
    }

    try {
      const userRef = doc(db, "users", this.currentUser.uid);
      await updateDoc(userRef, {
        plan: newPlan,
        messagesLimit: this.getPlanLimit(newPlan),
      });

      // Update local data
      this.userData.plan = newPlan;
      this.userData.messagesLimit = this.getPlanLimit(newPlan);
      this.saveUserToStorage();

      // Dispatch event for UI updates
      window.dispatchEvent(
        new CustomEvent("planUpdated", {
          detail: { newPlan },
        }),
      );

      return { success: true, newPlan };
    } catch (error) {
      console.error("Upgrade error:", error);
      return { success: false, error: error.message };
    }
  }

  // Logout
  async logout() {
    try {
      await signOut(auth);
      this.handleUserSignedOut();
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      return { success: false, error: error.message };
    }
  }

  // Password reset
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error("Password reset error:", error);
      return {
        success: false,
        error: this.getErrorMessage(error.code),
      };
    }
  }

  // Helper methods
  saveUserToStorage() {
    if (this.currentUser) {
      localStorage.setItem("chatflow_user", JSON.stringify(this.currentUser));
      localStorage.setItem("chatflow_user_data", JSON.stringify(this.userData));
    }
  }

  loadUserFromStorage() {
    const userStr = localStorage.getItem("chatflow_user");
    const userDataStr = localStorage.getItem("chatflow_user_data");

    if (userStr && userDataStr) {
      this.currentUser = JSON.parse(userStr);
      this.userData = JSON.parse(userDataStr);
    }
  }

  generateDefaultAvatar(email) {
    // Generate a colorful avatar based on email
    const colors = ["#2E7D32", "#1565C0", "#6A1B9A", "#C62828", "#FF8F00"];
    const color = colors[email.length % colors.length];
    const initials = email.substring(0, 2).toUpperCase();

    return `https://ui-avatars.com/api/?name=${initials}&background=${color.substring(1)}&color=fff&size=150`;
  }

  getErrorMessage(errorCode) {
    const errorMessages = {
      "auth/invalid-email": "Invalid email address",
      "auth/user-disabled": "This account has been disabled",
      "auth/user-not-found": "No account found with this email",
      "auth/wrong-password": "Incorrect password",
      "auth/email-already-in-use": "Email already in use",
      "auth/weak-password": "Password should be at least 6 characters",
      "auth/operation-not-allowed": "Email/password accounts are not enabled",
      "auth/account-exists-with-different-credential":
        "Account exists with different sign-in method",
      "auth/popup-blocked": "Sign-in popup was blocked by your browser",
      "auth/popup-closed-by-user": "Sign-in popup was closed",
      "auth/cancelled-popup-request":
        "Only one popup request is allowed at a time",
      "auth/network-request-failed": "Network error occurred",
    };

    return errorMessages[errorCode] || "An error occurred. Please try again.";
  }
}

// Create and export auth manager
window.authManager = new AuthManager();

// Export for use in other files
export { auth, db };
export default window.authManager;

// Instead of targeting the old button:
// document.getElementById('google-signin-btn').addEventListener('click', ...);

// Target both new buttons:
document
  .getElementById("google-signin-btn")
  ?.addEventListener("click", handleGoogleAuth);
document
  .getElementById("google-signup-btn")
  ?.addEventListener("click", handleGoogleAuth);

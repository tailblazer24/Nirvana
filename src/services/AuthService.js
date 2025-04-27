import { auth } from "@/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from "firebase/auth";
import { ref, computed } from "vue";

// Reactive state
const user = ref(null);
const authReady = ref(false);
const error = ref(null);

// Utilities
const clearError = () => (error.value = null);

const parseAuthError = (err) => {
  const errorMap = {
    'auth/invalid-email': 'Please enter a valid email address',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use': 'This email is already registered',
    'auth/operation-not-allowed': 'This operation is not allowed',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/too-many-requests': 'Too many attempts. Please try again later',
    'auth/popup-closed-by-user': 'Sign in cancelled',
    'auth/network-request-failed': 'Network error. Please check your connection'
  };

  return {
    code: err.code,
    message: errorMap[err.code] || err.message,
    original: err
  };
};

let unsubscribeFn = null;

// Auth init
const initializeAuth = () => {
  if (authReady.value) return Promise.resolve(user.value);

  return new Promise((resolve) => {
    unsubscribeFn = onAuthStateChanged(auth, (currentUser) => {
      user.value = currentUser;
      if (!authReady.value) {
        authReady.value = true;
      }
      resolve(currentUser);
    });
  });
};

initializeAuth();

// Computed exports
const isAuthenticated = computed(() => !!user.value);
const userDisplayName = computed(() => user.value?.displayName || null);
const userEmail = computed(() => user.value?.email || null);
const userPhotoURL = computed(() => user.value?.photoURL || null);

// Auth actions
const authActions = {
  async googleSignIn() {
    try {
      clearError();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      user.value = result.user;
      return result.user;
    } catch (err) {
      error.value = parseAuthError(err);
      throw error.value;
    }
  },

  async emailSignIn(email, password) {
    try {
      clearError();
      const result = await signInWithEmailAndPassword(auth, email, password);
      user.value = result.user;
      return result.user;
    } catch (err) {
      error.value = parseAuthError(err);
      throw error.value;
    }
  },

  async emailSignUp(email, password, displayName = null) {
    try {
      clearError();
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      user.value = result.user;
      return result.user;
    } catch (err) {
      error.value = parseAuthError(err);
      throw error.value;
    }
  },

  async logout() {
    try {
      clearError();
      await signOut(auth);
      user.value = null;
      return true;
    } catch (err) {
      error.value = parseAuthError(err);
      throw error.value;
    }
  },

  async updateUserProfile(updates) {
    try {
      clearError();
      if (!auth.currentUser) throw new Error("No authenticated user");
      await updateProfile(auth.currentUser, updates);
      user.value = { ...(user.value || {}), ...updates };
      return user.value;
    } catch (err) {
      error.value = parseAuthError(err);
      throw error.value;
    }
  },

  async sendPasswordReset(email) {
    try {
      clearError();
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (err) {
      error.value = parseAuthError(err);
      throw error.value;
    }
  },

  async getCurrentUser() {
    await initializeAuth();
    return user.value;
  }
};

// Cleanup (if needed manually)
export const stopAuthListener = () => {
  if (unsubscribeFn) {
    unsubscribeFn();
    unsubscribeFn = null;
  }
};

// Composable export
export const useAuth = () => ({
  user,
  error,
  authReady,
  isAuthenticated,
  userDisplayName,
  userEmail,
  userPhotoURL,
  ...authActions
});

// Named exports
export const {
  googleSignIn,
  emailSignIn,
  emailSignUp,
  logout,
  updateUserProfile,
  sendPasswordReset,
  getCurrentUser
} = authActions;

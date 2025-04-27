<template>
  <div class="auth-wrapper">
    <div class="auth-card">
      <div class="welcome-text">
        <h2>{{ isSignUp ? "Join us!" : "Hi, Welcome back" }}</h2>
        <p>{{ isSignUp ? "Create an account" : "Log in" }}</p>
        <p v-if="errorMessage" class="error-message" aria-live="polite">{{ errorMessage }}</p>
      </div>

      <button 
        @click="signInWithGoogle" 
        class="google-button"
        :disabled="isLoading"
      >
        <img src="@/assets/google-icon.svg" alt="Google Logo" class="google-icon" />
        <span v-if="isLoading">Loading...</span>
        <span v-else>Continue with Google</span>
      </button>

      <div class="divider"><hr /><span>or</span><hr /></div>

      <form @submit.prevent="handleAuth">
        <input
          v-if="isSignUp"
          type="text"
          v-model="name"
          placeholder="Full Name"
          required
          class="auth-input"
        />
        <input
          type="email"
          v-model="email"
          placeholder="Email"
          required
          class="auth-input"
        />
        <input
          type="password"
          v-model="password"
          :placeholder="isSignUp ? 'Create a password' : 'Enter your password'"
          required
          class="auth-input"
        />

        <button type="submit" class="auth-button" :disabled="isLoading">
          <span v-if="isLoading">Processing...</span>
          <span v-else>{{ isSignUp ? "Sign Up" : "Log In" }}</span>
        </button>
      </form>

      <p class="signup-text">
        {{ isSignUp ? "Already have an account?" : "Don't have an account?" }}
        <span @click="toggleAuthMode" class="signup-link">
          {{ isSignUp ? "Log in" : "Sign up" }}
        </span>
      </p>
    </div>
  </div>
</template>

<script>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { auth } from "@/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";

export default {
  setup() {
    const router = useRouter();
    const name = ref("");
    const email = ref("");
    const password = ref("");
    const isSignUp = ref(false);
    const errorMessage = ref("");
    const isLoading = ref(false);

    const redirectToDashboard = () => router.push("/dashboard");

    const handleAuth = async () => {
      errorMessage.value = "";
      isLoading.value = true;

      try {
        let userCredential;
        if (isSignUp.value) {
          if (!name.value.trim()) throw { code: "auth/missing-name" };
          if (password.value.length < 6) throw { code: "auth/weak-password" };

          userCredential = await createUserWithEmailAndPassword(auth, email.value.trim(), password.value.trim());
          await updateProfile(userCredential.user, { displayName: name.value.trim() });
        } else {
          userCredential = await signInWithEmailAndPassword(auth, email.value.trim(), password.value.trim());
        }

        redirectToDashboard();
      } catch (error) {
        const code = error.code;
        errorMessage.value =
          code === "auth/email-already-in-use" ? "Email already exists."
          : code === "auth/invalid-email" ? "Invalid email."
          : code === "auth/weak-password" ? "Password too weak."
          : code === "auth/user-not-found" ? "Account not found."
          : code === "auth/wrong-password" ? "Wrong password."
          : code === "auth/missing-name" ? "Name is required."
          : "Authentication failed.";
      } finally {
        isLoading.value = false;
      }
    };

    const signInWithGoogle = async () => {
      isLoading.value = true;
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);

        if (!auth.currentUser.displayName) {
          await updateProfile(auth.currentUser, { displayName: "Google User" });
        }

        redirectToDashboard();
      } catch {
        errorMessage.value = "Google sign-in failed.";
      } finally {
        isLoading.value = false;
      }
    };

    const toggleAuthMode = () => {
      isSignUp.value = !isSignUp.value;
      errorMessage.value = "";
    };

    return {
      name,
      email,
      password,
      isSignUp,
      errorMessage,
      isLoading,
      handleAuth,
      signInWithGoogle,
      toggleAuthMode,
    };
  },
};
</script>

<style scoped>
.auth-wrapper {
  min-height: 100vh;
  background-image: url('/src/assets/Signin.png');
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.auth-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.welcome-text h2 {
  font-size: 1.8rem;
  margin-bottom: 0.25rem;
  color: #333;
}

.welcome-text p {
  color: #666;
  margin-bottom: 1rem;
}

.google-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 12px;
  margin-bottom: 1rem;
  background-color: white;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
}

.google-icon {
  width: 20px;
  height: 20px;
  margin-right: 10px;
}

.divider {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1rem 0;
  color: #999;
}

.divider hr {
  flex-grow: 1;
  border: none;
  border-top: 1px solid #ddd;
}

.divider span {
  padding: 0 10px;
}

.auth-input {
  width: 100%;
  padding: 12px;
  margin-bottom: 1rem;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
}

.auth-button {
  width: 100%;
  padding: 12px;
  background: #ffc107;
  color: black;
  border: none;
  border-radius: 5px;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
}

.auth-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.signup-text {
  margin-top: 1rem;
  color: #666;
}

.signup-link {
  color: #007bff;
  cursor: pointer;
}

.signup-link:hover {
  text-decoration: underline;
}

.error-message {
  color: #d32f2f;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}
</style>

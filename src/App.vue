<template>
  <div :class="['app-container', { 'dark-mode': darkMode }]">
    <header class="app-header">
      <h1 class="app-title">NIRVANA</h1>
      <div class="app-controls">
        <button
          class="theme-toggle"
          @click="toggleDarkMode"
          :aria-label="darkMode ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          {{ darkMode ? "☀️" : "🌙" }}
        </button>

        <Profile v-if="isAuthenticated" />

        <button
          v-if="isAuthenticated"
          @click="handleLogout"
          class="auth-button"
        >
          Sign Out
        </button>

        <button
          v-else-if="authChecked"
          @click="showAuthForm = true"
          class="auth-button"
        >
          Sign In
        </button>
      </div>
    </header>

    <div v-if="!authChecked" class="loading-state">
      <div class="spinner"></div>
      <p>Loading your wellness journey...</p>
    </div>

    <main v-else class="app-main">
      <Transition name="fade" mode="out-in">
        <component
          :is="currentComponent"
          @auth-requested="showAuthForm = true"
          @close="showAuthForm = false"
        />
      </Transition>
    </main>

    <footer v-if="isAuthenticated" class="app-footer">
      <p class="motivational-quote">🧠 {{ randomQuote }}</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/firebase';
import { useAuth } from '@/services/AuthService';

import LandingPage from '@/components/LandingPage.vue';
import AuthForm from '@/components/AuthForm.vue';
import Dashboard from '@/views/Dashboard.vue';
import Profile from '@/components/Profile.vue';

const { user } = useAuth();

const authChecked = ref(false);
const showAuthForm = ref(false);
const randomQuote = ref('');

const quotes = [
  "Progress, not perfection.",
  "Your habits shape your future.",
  "Small steps lead to big change.",
  "Self-care is productive.",
  "Discipline is freedom.",
  "A small step now, helps a long way"
];

const darkMode = ref(
  localStorage.getItem('darkMode') === 'true' ||
  window.matchMedia('(prefers-color-scheme: dark)').matches
);

const isAuthenticated = computed(() => !!user.value);
const currentComponent = computed(() => {
  if (isAuthenticated.value) return Dashboard;
  return showAuthForm.value ? AuthForm : LandingPage;
});

const toggleDarkMode = () => {
  darkMode.value = !darkMode.value;
  localStorage.setItem('darkMode', darkMode.value);
  document.body.classList.toggle('dark-mode', darkMode.value);
};

const handleLogout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
  }
};

let unsubscribe = null;

onMounted(() => {
  document.body.classList.toggle('dark-mode', darkMode.value);

  unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    user.value = currentUser;
    authChecked.value = true;

    if (currentUser) {
      randomQuote.value = quotes[Math.floor(Math.random() * quotes.length)];
    }
  });
});

onUnmounted(() => {
  if (typeof unsubscribe === 'function') unsubscribe();
});

watch(user, (newUser) => {
  if (newUser) {
    showAuthForm.value = false;
    if (!randomQuote.value) {
      randomQuote.value = quotes[Math.floor(Math.random() * quotes.length)];
    }
  }
});
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family: 'Segoe UI', system-ui, sans-serif;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.dark-mode {
  background-color: #1a1a1a;
  color: #ffffff;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: #2c3e50;
  color: white;
  position: sticky;
  top: 0;
  z-index: 100;
}

.app-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 1px;
}

.app-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.theme-toggle {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: transform 0.2s;
}

.theme-toggle:hover {
  transform: scale(1.1);
}

.auth-button {
  width: 100%;
  padding: 0.75rem;
  background-color: #ffc107;
  color: black;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
  transition: background-color 0.2s;
}

.auth-button:hover {
  background-color: #e0a800;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
  gap: 1rem;
}

.spinner {
  width: 3rem;
  height: 3rem;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #3498db;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.app-main {
  flex-grow: 1;
  padding: 1rem;
}

.app-footer {
  padding: 1rem;
  text-align: center;
}

.motivational-quote {
  font-style: italic;
  color: #7f8c8d;
  margin: 0;
}

.dark-mode .motivational-quote {
  color: #bdc3c7;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .app-header {
    padding: 0.75rem 1rem;
    flex-direction: column;
    gap: 0.75rem;
  }

  .app-title {
    font-size: 1.25rem;
  }

  .app-controls {
    width: 100%;
    justify-content: space-between;
  }
}
</style>

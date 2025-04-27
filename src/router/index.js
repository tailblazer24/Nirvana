import { createRouter, createWebHistory } from 'vue-router';
import LandingPage from "@/components/LandingPage.vue";
import AuthForm from "@/components/AuthForm.vue";
import Dashboard from "@/views/Dashboard.vue";
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Lazy-loaded views
const MeditationTracker = () => import('@/components/Meditation.vue');
const MoodTracker = () => import('@/components/MoodTracker.vue');
const SleepTracker = () => import('@/components/SleepTracker.vue');
const WorkoutTracker = () => import('@/components/Workout_n_Grooming.vue');
const Profile = () => import('@/components/Profile.vue');

// Route types
const RouteMeta = {
  PUBLIC: 'public',
  AUTH_REQUIRED: 'auth',
  GUEST_ONLY: 'guest'
};

const TITLE_SUFFIX = ' | Your Wellness Companion';

const routes = [
  {
    path: '/',
    component: LandingPage,
    meta: {
      type: RouteMeta.PUBLIC,
      title: 'Welcome to SelfCare'
    }
  },
  {
    path: '/auth',
    component: AuthForm,
    meta: {
      type: RouteMeta.GUEST_ONLY,
      title: 'Sign In / Register'
    }
  },
  {
    path: '/dashboard',
    component: Dashboard,
    meta: {
      type: RouteMeta.AUTH_REQUIRED,
      title: 'Dashboard'
    },
    children: [
      { path: '', redirect: '/dashboard/meditation' },
      {
        path: 'meditation',
        component: MeditationTracker,
        meta: { title: 'Meditation Tracker' }
      },
      {
        path: 'mood',
        component: MoodTracker,
        meta: { title: 'Mood Tracker' }
      },
      {
        path: 'sleep',
        component: SleepTracker,
        meta: { title: 'Sleep Tracker' }
      },
      {
        path: 'workout',
        component: WorkoutTracker,
        meta: { title: 'Workout Tracker' }
      },
      {
        path: 'profile',
        component: Profile,
        meta: { title: 'Profile Settings' }
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else if (to.hash) {
      return { el: to.hash, behavior: 'smooth' };
    } else {
      return { top: 0 };
    }
  }
});

// Auth state cache
let authInitialized = false;
let currentUser = null;
let unsubscribeAuth = null;
const authListeners = new Set();

const initializeAuth = () => {
  return new Promise((resolve) => {
    if (authInitialized) {
      resolve(currentUser);
      return;
    }

    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      currentUser = user;
      authInitialized = true;

      // Notify all listeners
      authListeners.forEach(callback => callback(user));
      resolve(user);
    });
  });
};

// Global route guard
router.beforeEach(async (to, from, next) => {
  try {
    const user = await initializeAuth();
    document.title = `${to.meta?.title || 'SelfCare'}${TITLE_SUFFIX}`;

    switch (to.meta?.type) {
      case RouteMeta.AUTH_REQUIRED:
        if (!user) {
          next({ path: '/auth', query: { redirect: to.fullPath } });
          return;
        }
        break;

      case RouteMeta.GUEST_ONLY:
        if (user) {
          next({ path: '/dashboard' });
          return;
        }
        break;
    }

    next();
  } catch (err) {
    console.error("Router error:", err);
    next('/');
  }
});

// Public method to watch auth state
export const onAuthChange = (callback) => {
  if (authInitialized) {
    callback(currentUser);
  }
  authListeners.add(callback);

  return () => authListeners.delete(callback);
};

// Optional cleanup method if needed
export const destroyAuthListener = () => {
  if (unsubscribeAuth) {
    unsubscribeAuth();
    unsubscribeAuth = null;
    authInitialized = false;
    currentUser = null;
    authListeners.clear();
  }
};

export default router;

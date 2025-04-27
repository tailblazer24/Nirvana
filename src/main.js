import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

// Firebase
import { auth, db } from '@/firebase';

const app = createApp(App);

// Global error handler
app.config.errorHandler = (err, vm, info) => {
  console.error('Global error:', err, 'Info:', info);
};

// Global filters (legacy-style)
app.config.globalProperties.$filters = {
  formatDate(value) {
    return value ? new Date(value).toLocaleDateString() : '';
  },
  capitalize(value) {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
  }
};

app.use(router);
app.mount('#app');

// Expose app in dev
if (process.env.NODE_ENV === 'development') {
  window.app = app;
}

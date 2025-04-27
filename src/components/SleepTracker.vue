<template>
  <section class="sleep-tracker" aria-labelledby="sleep-tracker-heading">
    <h2 id="sleep-tracker-heading">Sleep Tracker</h2>
    <p class="description">Track your sleep patterns and quality</p>

    <form @submit.prevent="submitSleepEntry" class="sleep-form">
      <div class="form-group">
        <label for="sleep-hours">Hours Slept:</label>
        <input
          id="sleep-hours"
          v-model.number="sleep.hours"
          type="number"
          min="0"
          max="24"
          step="0.25"
          required
          class="form-input"
          aria-describedby="hours-help"
        >
        <p id="hours-help" class="help-text">Enter value between 0–24 hours</p>
      </div>

      <div class="form-group">
        <label for="sleep-quality">Sleep Quality:</label>
        <div class="quality-rating">
          <button
            v-for="n in 5"
            :key="n"
            type="button"
            class="quality-star"
            :class="{ active: sleep.quality >= n }"
            @click="sleep.quality = n"
            :aria-label="`Rate ${n} out of 5`"
          >
            {{ sleepQualityIcons[n] }}
          </button>
        </div>
        <input
          id="sleep-quality"
          v-model.number="sleep.quality"
          type="range"
          min="1"
          max="5"
          required
          class="visually-hidden"
          aria-hidden="true"
        >
      </div>

      <button
        type="submit"
        class="submit-button"
        :disabled="isSubmitting || !isFormValid"
        aria-live="polite"
      >
        <span v-if="isSubmitting">
          <span class="spinner" aria-hidden="true"></span>
          Saving...
        </span>
        <span v-else>Log Sleep</span>
      </button>

      <p v-if="errorMessage" class="error-message" role="alert">
        {{ errorMessage }}
      </p>
    </form>

    <div v-if="sleepData.length" class="sleep-history">
      <h3>Your Sleep History</h3>

      <div class="chart-container">
        <canvas id="sleepChart" width="400" height="200"></canvas>
      </div>

      <ul class="sleep-list">
        <li
          v-for="entry in sleepData"
          :key="entry._id"
          class="sleep-entry"
          :class="`quality-${entry.quality}`"
        >
          <span class="date">{{ formatDate(entry.date) }}</span>
          <span class="hours">{{ entry.hours }} hour{{ entry.hours !== 1 ? 's' : '' }}</span>
          <span class="quality">{{ sleepQualityIcons[entry.quality] }} ({{ entry.quality }}/5)</span>
        </li>
      </ul>

      <button 
        v-if="hasMore" 
        @click="loadMore" 
        class="submit-button"
        style="margin-top: 1rem;"
      >
        Load More
      </button>
    </div>
    <p v-else class="no-data">No sleep entries yet</p>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';
import { Chart, registerables } from 'chart.js';
import authedFetch from '@/utils/authedFetch';

Chart.register(...registerables);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const sleepQualityIcons = {
  1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😊'
};

const sleep = ref({ hours: null, quality: 3 });
const sleepData = ref([]);
const isSubmitting = ref(false);
const errorMessage = ref('');
const socket = ref(null);
const page = ref(1);
const limit = 10;
const hasMore = ref(true);

// Chart instance
let sleepChart = null;

const isFormValid = computed(() =>
  sleep.value.hours > 0 && sleep.value.quality >= 1
);

const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

const handleError = (error, fallback) => {
  console.error(error);
  errorMessage.value = error?.message || fallback;
};

const renderSleepChart = () => {
  const ctx = document.getElementById('sleepChart');
  if (!ctx) return;
  if (sleepChart) sleepChart.destroy();

  const labels = sleepData.value.map(entry => formatDate(entry.date)).reverse();
  const data = sleepData.value.map(entry => entry.hours).reverse();

  sleepChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Hours Slept',
        data,
        fill: false,
        borderColor: '#4CAF50',
        tension: 0.4,
        pointRadius: 4
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          max: 10
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
};

const fetchSleepData = async () => {
  try {
    const res = await authedFetch(`${API_URL}/sleep?page=${page.value}&limit=${limit}`);
    const json = await res.json();
    sleepData.value = json.data;
    hasMore.value = json.data.length === limit;
    page.value++;
    setTimeout(() => renderSleepChart(), 100);
  } catch (err) {
    handleError(err, 'Failed to load sleep history');
  }
};

const loadMore = async () => {
  try {
    const res = await authedFetch(`${API_URL}/sleep?page=${page.value}&limit=${limit}`);
    const json = await res.json();
    if (json.data.length < limit) hasMore.value = false;
    sleepData.value.push(...json.data);
    page.value++;
    setTimeout(() => renderSleepChart(), 100);
  } catch (err) {
    handleError(err, 'Failed to load more sleep data');
  }
};

const submitSleepEntry = async () => {
  try {
    isSubmitting.value = true;
    errorMessage.value = '';

    const today = new Date().toDateString();
    const alreadyLogged = sleepData.value.some(
      (entry) => new Date(entry.date).toDateString() === today
    );

    if (alreadyLogged) throw new Error('You already logged sleep for today');

    const newEntry = {
      date: new Date().toISOString(),
      hours: +parseFloat(sleep.value.hours).toFixed(2),
      quality: sleep.value.quality
    };

    const res = await authedFetch(`${API_URL}/sleep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry)
    });

    const { data } = await res.json();
    sleepData.value.unshift(data);
    sleepData.value.sort((a, b) => new Date(b.date) - new Date(a.date));
    sleep.value = { hours: null, quality: 3 };
    setTimeout(() => renderSleepChart(), 100);
  } catch (err) {
    handleError(err, 'Failed to save sleep data');
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(async () => {
  await fetchSleepData();

  socket.value = io(API_URL.replace('/api', ''));
  socket.value.on('sleepUpdate', (change) => {
    const newDoc = change.fullDocument || change;
    if (newDoc?.date && !sleepData.value.some(e => e._id === newDoc._id)) {
      sleepData.value.unshift(newDoc);
      sleepData.value.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTimeout(() => renderSleepChart(), 100);
    }
  });
});

onUnmounted(() => {
  if (socket.value) {
    socket.value.off?.('sleepUpdate');
    socket.value.disconnect?.();
  }
});
</script>


<style scoped>
.sleep-tracker {
  max-width: 500px;
  margin: 0 auto;
  padding: 1.5rem;
}

.description {
  color: #666;
  margin-bottom: 1.5rem;
  text-align: center;
}

.sleep-form {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.2rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

.help-text {
  font-size: 0.75rem;
  color: #666;
  margin-top: 0.25rem;
}

.quality-rating {
  display: flex;
  gap: 0.5rem;
  margin: 0.5rem 0;
}

.quality-star {
  font-size: 1.5rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  transition: transform 0.2s;
}

.quality-star:hover {
  transform: scale(1.2);
}

.quality-star.active {
  transform: scale(1.2);
  filter: drop-shadow(0 0 2px rgba(0,0,0,0.2));
}

.submit-button {
  width: 100%;
  padding: 0.75rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 1rem;
}

.submit-button:hover:not(:disabled) {
  background-color: #388E3C;
}

.submit-button:disabled {
  background-color: #A5D6A7;
  cursor: not-allowed;
}

.spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
  margin-right: 0.5rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  color: #D32F2F;
  margin-top: 1rem;
  padding: 0.5rem;
  background-color: #FFEBEE;
  border-radius: 4px;
}

.sleep-history {
  margin-top: 2rem;
}

.sleep-list {
  list-style: none;
  padding: 0;
}

.sleep-entry {
  padding: 1rem;
  margin-bottom: 0.75rem;
  border-radius: 6px;
  background: #f5f5f5;
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 1rem;
  align-items: center;
}

.sleep-entry .date {
  font-weight: 500;
}

.sleep-entry .hours {
  font-weight: bold;
  color: #1976D2;
}

.sleep-entry .quality {
  font-size: 1.2rem;
}

/* Quality level colors */
.quality-1 { border-left: 4px solid #D32F2F; }
.quality-2 { border-left: 4px solid #FF9800; }
.quality-3 { border-left: 4px solid #FFC107; }
.quality-4 { border-left: 4px solid #4CAF50; }
.quality-5 { border-left: 4px solid #2196F3; }

.no-data {
  text-align: center;
  color: #666;
  margin-top: 2rem;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

@media (max-width: 600px) {
  .sleep-tracker {
    padding: 1rem;
  }
  
  .sleep-form {
    padding: 1rem;
  }
  
  .sleep-entry {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .sleep-entry .hours,
  .sleep-entry .quality {
    justify-self: start;
  }
}
</style>
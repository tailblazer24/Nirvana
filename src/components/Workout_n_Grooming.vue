<template>
  <section class="workout-tracker" aria-labelledby="workout-tracker-heading">
    <h2 id="workout-tracker-heading">Workout Tracker</h2>
    <p class="description">Log your exercise sessions and track progress</p>

    <form @submit.prevent="submitWorkoutEntry" class="workout-form">
      <div class="form-group">
        <label for="workout-duration">Duration (minutes):</label>
        <input
          id="workout-duration"
          v-model.number="workout.duration"
          type="number"
          min="1"
          max="300"
          step="1"
          required
          class="form-input"
          aria-describedby="duration-help"
        >
        <p id="duration-help" class="help-text">Enter minutes (1–300)</p>
      </div>

      <div class="form-group">
        <label for="workout-type">Workout Type:</label>
        <select
          id="workout-type"
          v-model="workout.type"
          required
          class="form-input"
        >
          <option value="" disabled>Select workout type</option>
          <option v-for="type in workoutTypes" :key="type" :value="type">
            {{ type }}
          </option>
        </select>
      </div>

      <div class="form-group" v-if="workout.type === 'Other'">
        <label for="custom-type">Custom Workout:</label>
        <input
          id="custom-type"
          v-model="workout.customType"
          type="text"
          placeholder="Enter workout name"
          class="form-input"
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
        <span v-else>Log Workout</span>
      </button>

      <p v-if="errorMessage" class="error-message" role="alert">
        {{ errorMessage }}
      </p>
    </form>

    <div v-if="workoutData.length" class="workout-history">
      <h3>Your Workout History</h3>
      <ul class="workout-list">
        <li
          v-for="entry in workoutData"
          :key="entry._id"
          class="workout-entry"
          :class="`intensity-${entry.intensity || 'medium'}`"
        >
          <span class="date">{{ formatDate(entry.date) }}</span>
          <span class="duration">{{ entry.duration }} min</span>
          <span class="type">{{ getWorkoutType(entry) }}</span>
          <button
            @click="removeWorkout(entry._id)"
            class="delete-button"
            aria-label="Delete workout entry"
          >
            ×
          </button>
        </li>
      </ul>
    </div>
    <p v-else class="no-data">No workouts logged yet</p>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';
import authedFetch from '@/utils/authedFetch';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const workoutTypes = [
  'Cardio',
  'Weight Training',
  'Yoga',
  'Pilates',
  'HIIT',
  'Cycling',
  'Running',
  'Swimming',
  'Other'
];

const workout = ref({
  duration: null,
  type: '',
  customType: '',
  intensity: 'medium'
});
const workoutData = ref([]);
const isSubmitting = ref(false);
const errorMessage = ref('');
const socket = ref(null);

const isFormValid = computed(() =>
  workout.value.duration > 0 &&
  workout.value.type &&
  (workout.value.type !== 'Other' || workout.value.customType.trim().length > 0)
);

const fetchWorkoutData = async () => {
  try {
    const res = await authedFetch(`${API_URL}/workout?page=1&limit=100`);
    const json = await res.json();
    workoutData.value = json.data.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (err) {
    handleError(err, 'Failed to load workout history');
  }
};

const submitWorkoutEntry = async () => {
  try {
    isSubmitting.value = true;
    errorMessage.value = '';

    const newWorkout = {
      date: new Date().toISOString(),
      duration: +workout.value.duration,
      type: workout.value.type === 'Other'
        ? workout.value.customType.trim()
        : workout.value.type,
      intensity: workout.value.intensity
    };

    const res = await authedFetch(`${API_URL}/workout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newWorkout)
    });

    const { data } = await res.json();
    workoutData.value.unshift(data);
    workoutData.value.sort((a, b) => new Date(b.date) - new Date(a.date));

    workout.value = {
      duration: null,
      type: '',
      customType: '',
      intensity: 'medium'
    };
  } catch (err) {
    handleError(err, 'Failed to save workout');
  } finally {
    isSubmitting.value = false;
  }
};

const removeWorkout = async (id) => {
  try {
    await authedFetch(`${API_URL}/workout/${id}`, {
      method: 'DELETE'
    });

    workoutData.value = workoutData.value.filter(entry => entry._id !== id);
  } catch (err) {
    handleError(err, 'Failed to delete workout');
  }
};

const getWorkoutType = (entry) => entry.type || 'Workout';

const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

const handleError = (err, fallback) => {
  console.error(err);
  errorMessage.value = err?.message || fallback;
};

onMounted(async () => {
  await fetchWorkoutData();

  socket.value = io(API_URL.replace('/api', ''));
  socket.value.on('workoutUpdate', (change) => {
    const newDoc = change.fullDocument || change;
    if (newDoc && !workoutData.value.some(e => e._id === newDoc._id)) {
      workoutData.value.unshift(newDoc);
      workoutData.value.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
  });
});

onUnmounted(() => {
  socket.value?.off('workoutUpdate');
  socket.value?.disconnect();
});
</script>


<style scoped>
.workout-tracker {
  max-width: 500px;
  margin: 0 auto;
  padding: 1.5rem;
}

.description {
  color: #666;
  margin-bottom: 1.5rem;
  text-align: center;
}

.workout-form {
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

.submit-button {
  width: 100%;
  padding: 0.75rem;
  background-color: #FF9800;
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
  background-color: #F57C00;
}

.submit-button:disabled {
  background-color: #FFCC80;
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

.workout-history {
  margin-top: 2rem;
}

.workout-list {
  list-style: none;
  padding: 0;
}

.workout-entry {
  padding: 1rem;
  margin-bottom: 0.75rem;
  border-radius: 6px;
  background: #f5f5f5;
  display: grid;
  grid-template-columns: 120px auto 1fr auto;
  gap: 1rem;
  align-items: center;
  position: relative;
}

.workout-entry .date {
  font-weight: 500;
  color: #555;
}

.workout-entry .duration {
  font-weight: bold;
  color: #1976D2;
}

.workout-entry .type {
  font-weight: 500;
}

.delete-button {
  background: none;
  border: none;
  color: #D32F2F;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0 0.5rem;
}

/* Intensity indicators */
.intensity-low { border-left: 4px solid #4CAF50; }
.intensity-medium { border-left: 4px solid #FFC107; }
.intensity-high { border-left: 4px solid #F44336; }

.no-data {
  text-align: center;
  color: #666;
  margin-top: 2rem;
}

@media (max-width: 600px) {
  .workout-tracker {
    padding: 1rem;
  }
  
  .workout-form {
    padding: 1rem;
  }
  
  .workout-entry {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .workout-entry .duration,
  .workout-entry .type {
    justify-self: start;
  }
}
</style>

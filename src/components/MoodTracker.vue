<template>
  <section class="mood-tracker" aria-labelledby="mood-tracker-heading">
    <h2 id="mood-tracker-heading">Mood Tracker</h2>

    <form @submit.prevent="submitMood" class="mood-form">
      <div class="form-group">
        <label for="mood">How are you feeling today?</label>
        <select 
          id="mood" 
          v-model="mood"
          aria-describedby="mood-description"
          :aria-invalid="!mood"
          class="mood-select"
        >
          <option value="1">😞 Very Bad</option>
          <option value="2">😕 Bad</option>
          <option value="3">😐 Neutral</option>
          <option value="4">🙂 Good</option>
          <option value="5">😁 Very Good</option>
        </select>
        <p id="mood-description" class="sr-only">
          Select your current mood from 1 (worst) to 5 (best)
        </p>
      </div>

      <div class="form-group">
        <label for="notes">Notes (optional):</label>
        <textarea 
          id="notes"
          v-model="notes" 
          placeholder="What's affecting your mood today?"
          rows="3"
          class="notes-input"
        ></textarea>
      </div>

      <button 
        type="submit" 
        :disabled="isSubmitting || !mood"
        class="submit-button"
        aria-live="polite"
      >
        <span v-if="isSubmitting">
          <span class="spinner" aria-hidden="true"></span>
          {{ editingId ? 'Updating...' : 'Saving...' }}
        </span>
        <span v-else>{{ editingId ? "Update Mood" : "Save Mood" }}</span>
      </button>

      <button 
        v-if="editingId" 
        type="button" 
        class="cancel-button" 
        @click="cancelEdit"
      >
        Cancel Edit
      </button>

      <p v-if="errorMessage" class="error-message" role="alert">
        {{ errorMessage }}
      </p>
    </form>

    <div v-if="moodData.length" class="mood-history">
      <h3>Your Mood History</h3>
      <ul class="mood-list">
        <li 
          v-for="entry in moodData" 
          :key="entry._id" 
          class="mood-entry"
          :class="`mood-${entry.moodLevel}`"
        >
          <div>
            <span class="date">{{ formatDate(entry.date) }}</span>
            <span class="mood">{{ getMoodLabel(entry.moodLevel) }}</span>
            <span v-if="entry.notes" class="notes">"{{ entry.notes }}"</span>
          </div>
          <div class="actions">
            <button class="edit-button" @click="startEdit(entry)">✏️</button>
            <button class="delete-button" @click="deleteMood(entry._id)">🗑️</button>
          </div>
        </li>
      </ul>

      <button 
        v-if="hasMore" 
        @click="loadMore" 
        class="load-more"
      >
        Load More
      </button>
    </div>

    <div class="chart-container" v-if="moodData.length">
      <h3 style="margin-bottom: 0.5rem;">Mood Trend (Last 7 Days)</h3>
      <canvas ref="chartRef" class="mood-chart" aria-label="Mood trend chart" role="img"></canvas>
    </div>

    <p v-else class="no-data">No mood entries yet</p>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { io } from "socket.io-client";
import { Chart, registerables } from "chart.js";
import authedFetch from "@/utils/authedFetch";

Chart.register(...registerables);

const mood = ref(3);
const notes = ref("");
const moodData = ref([]);
const errorMessage = ref("");
const isSubmitting = ref(false);
const editingId = ref(null);
const chartRef = ref(null);
const socket = io(import.meta.env.VITE_API_BASE || location.origin);

const page = ref(1);
const limit = 10;
const hasMore = ref(true);

const MOOD_OPTIONS = {
  1: "😞 Very Bad",
  2: "😕 Bad",
  3: "😐 Neutral",
  4: "🙂 Good",
  5: "😁 Very Good"
};

const MOOD_EMOJIS = {
  1: "😞", 2: "😕", 3: "😐", 4: "🙂", 5: "😁"
};

const updateDashboardEmoji = (moodLevel) => {
  const dashboardMoodIcon = document.getElementById("dashboard-mood-icon");
  if (dashboardMoodIcon && MOOD_EMOJIS[moodLevel]) {
    dashboardMoodIcon.textContent = MOOD_EMOJIS[moodLevel];
  }
};

const fetchMoodData = async () => {
  try {
    const res = await authedFetch(`/api/mood?page=1&limit=${limit}`);
    const data = await res.json();
    moodData.value = data.data;
    hasMore.value = data.data.length === limit;
    page.value = 2;

    if (moodData.value.length > 0) {
      updateDashboardEmoji(moodData.value[0].moodLevel);
    }
  } catch (err) {
    handleError(err, "Failed to load mood history");
  }
};

const loadMore = async () => {
  try {
    const res = await authedFetch(`/api/mood?page=${page.value}&limit=${limit}`);
    const data = await res.json();
    if (data.data.length < limit) hasMore.value = false;
    moodData.value.push(...data.data);
    page.value++;
  } catch (err) {
    handleError(err, "Failed to load more moods");
  }
};

const submitMood = async () => {
  isSubmitting.value = true;
  errorMessage.value = "";

  try {
    if (editingId.value) {
      const res = await authedFetch(`/api/mood/${editingId.value}`, {
        method: "PATCH",
        body: JSON.stringify({
          moodLevel: mood.value,
          notes: notes.value.trim()
        }),
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();

      const index = moodData.value.findIndex(e => e._id === editingId.value);
      if (index !== -1) {
        moodData.value[index] = data.data;
        updateDashboardEmoji(data.data.moodLevel);
      }
      cancelEdit();
      return;
    }

    const today = new Date().toDateString();
    if (moodData.value.some(e => new Date(e.date).toDateString() === today)) {
      throw new Error("You've already logged your mood today");
    }

    const res = await authedFetch("/api/mood", {
      method: "POST",
      body: JSON.stringify({
        date: new Date().toISOString(),
        moodLevel: mood.value,
        notes: notes.value.trim()
      }),
      headers: { "Content-Type": "application/json" }
    });

    const data = await res.json();
    moodData.value.unshift(data.data);
    updateDashboardEmoji(mood.value);
    notes.value = "";
  } catch (err) {
    handleError(err, "Failed to save mood");
  } finally {
    isSubmitting.value = false;
  }
};

const startEdit = (entry) => {
  editingId.value = entry._id;
  mood.value = entry.moodLevel;
  notes.value = entry.notes || "";
};

const cancelEdit = () => {
  editingId.value = null;
  notes.value = "";
  mood.value = 3;
};

const deleteMood = async (id) => {
  try {
    const res = await authedFetch(`/api/mood/${id}`, {
      method: "DELETE"
    });
    if (res.ok) {
      moodData.value = moodData.value.filter(entry => entry._id !== id);
    } else {
      const err = await res.json();
      throw new Error(err.message || "Failed to delete mood");
    }
  } catch (err) {
    handleError(err, "Failed to delete mood");
  }
};

socket.on("moodUpdate", ({ action, data }) => {
  if (action === "create") {
    moodData.value.unshift(data);
    updateDashboardEmoji(data.moodLevel);
  } else if (action === "update") {
    const index = moodData.value.findIndex(e => e._id === data._id);
    if (index !== -1) moodData.value[index] = data;
    updateDashboardEmoji(data.moodLevel);
  } else if (action === "delete") {
    moodData.value = moodData.value.filter(e => e._id !== data._id);
  }
});

let moodChart = null;

const fetchStatsAndRenderChart = async () => {
  try {
    const res = await authedFetch("/api/mood/stats");
    const data = await res.json();
    const trend = data.data.trend;

    const ctx = chartRef.value.getContext("2d");
    if (moodChart) moodChart.destroy();

    moodChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: trend.map(d => formatChartLabel(d._id)),
        datasets: [{
          label: "Mood Level",
          data: trend.map(d => d.avg.toFixed(2)),
          fill: false,
          tension: 0.3,
          pointRadius: 5
        }]
      },
      options: {
        scales: {
          y: {
            min: 1,
            max: 5,
            ticks: {
              stepSize: 1,
              callback: val => MOOD_OPTIONS[val]
            }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  } catch (err) {
    console.error("Chart failed", err);
  }
};

const formatChartLabel = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short"
  });

const getMoodLabel = (val) => MOOD_OPTIONS[val] || "Unknown";

const formatDate = (d) => new Date(d).toLocaleDateString("en-US", {
  weekday: "short", month: "short", day: "numeric"
});

const handleError = (err, msg) => {
  console.error(err);
  errorMessage.value = err.response?.data?.message || err.message || msg;
};

onMounted(() => {
  fetchMoodData();
  fetchStatsAndRenderChart();
});
onUnmounted(() => socket.disconnect());
</script>

<style scoped>
.mood-tracker {
  max-width: 500px;
  margin: 0 auto;
  padding: 1.5rem;
}

/* === Form Styles === */
.mood-form {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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

.mood-select,
.notes-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

.mood-select {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;
}

.notes-input {
  min-height: 80px;
  resize: vertical;
}

.submit-button,
.cancel-button,
.load-more {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 0.5rem;
}

.submit-button {
  background-color: #5e35b1;
  color: white;
  border: none;
  transition: background-color 0.2s;
}

.submit-button:hover:not(:disabled) {
  background-color: #4527a0;
}

.submit-button:disabled {
  background-color: #b0a8c0;
  cursor: not-allowed;
}

.cancel-button {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ccc;
}

.cancel-button:hover {
  background: #eee;
}

/* === Spinner === */
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

/* === Error === */
.error-message {
  color: #d32f2f;
  margin-top: 1rem;
  padding: 0.5rem;
  background-color: #fce4ec;
  border-radius: 4px;
}

/* === Mood History === */
.mood-history {
  margin-top: 2rem;
}

.mood-list {
  list-style: none;
  padding: 0;
}

.mood-entry {
  padding: 1rem;
  margin-bottom: 0.75rem;
  border-radius: 6px;
  background: #f5f5f5;
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 0.5rem;
}

.mood-entry .date {
  font-weight: 500;
  color: #555;
}

.mood-entry .mood {
  font-weight: 500;
}

.mood-entry .notes {
  grid-column: span 2;
  color: #666;
  font-style: italic;
  margin-top: 0.5rem;
}

.edit-button,
.delete-button {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 0.5rem;
  color: #5e35b1;
}

.delete-button {
  color: #f44336;
}

/* Mood level colors */
.mood-1 { border-left: 4px solid #d32f2f; }
.mood-2 { border-left: 4px solid #ff9800; }
.mood-3 { border-left: 4px solid #ffc107; }
.mood-4 { border-left: 4px solid #4caf50; }
.mood-5 { border-left: 4px solid #2196f3; }

.load-more {
  margin-top: 1rem;
  background: #eee;
  color: #333;
  border: 1px solid #ccc;
}

.load-more:hover {
  background: #ddd;
}

/* === Chart === */
.chart-container {
  height: 300px;
  margin-top: 2rem;
}

.mood-chart {
  padding: 1rem;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  max-width: 600px;
  height: 300px;
  margin: 0 auto;
}

/* === Utility === */
.no-data {
  text-align: center;
  color: #666;
  margin-top: 2rem;
}

.sr-only {
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
  .mood-tracker {
    padding: 1rem;
  }

  .mood-form {
    padding: 1rem;
  }

  .mood-entry {
    grid-template-columns: 1fr;
  }
}
</style>

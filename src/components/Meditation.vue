<template>
  <section class="meditation-container" aria-labelledby="meditation-heading">
    <h2 id="meditation-heading">Meditation Tracker</h2>
    <p class="description">Track your mindfulness journey</p>

    <div v-if="!isLogging" class="controls">
      <button class="log-button" @click="startLogging">
        <span class="icon">🧘</span> New Session
      </button>
      <div v-if="sessions.length" class="stats">
        <p>Today: {{ todaysSessions }} sessions</p>
        <p>Total: {{ sessions.length }} sessions</p>
      </div>
    </div>

    <div v-else class="session-active">
      <div class="timer">{{ formatTime(currentDuration) }}</div>
      <button class="action-button stop-button" @click="stopSession">
        {{ editingId ? "Update Session" : "Complete Session" }}
      </button>
    </div>

    <div class="chart-container" v-if="sessions.length">
      <h3 style="margin-bottom: 0.5rem;">Meditation Duration Chart</h3>
      <canvas ref="chartRef" class="mood-chart"></canvas>
    </div>

    <ul v-if="sessions.length" class="session-list">
      <li v-for="session in sortedSessions" :key="session._id" class="session-item">
        <div>
          <span class="date">{{ formatDate(session.date) }}</span>
          <span class="duration">{{ formatTime(session.duration) }}</span>
        </div>
        <div>
          <button class="edit-button" @click="startEdit(session)">✏️</button>
          <button class="delete-button" @click="deleteSession(session._id)">🗑️</button>
        </div>
      </li>
    </ul>

    <p v-else class="no-data">No meditation sessions yet.</p>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { io } from 'socket.io-client';
import { Chart, registerables } from 'chart.js';
import authedFetch from '@/utils/authedFetch';

Chart.register(...registerables);

const isLogging = ref(false);
const currentDuration = ref(0);
const startTime = ref(null);
const timer = ref(null);
const sessions = ref([]);
const editingId = ref(null);
const chartRef = ref(null);
let chartInstance = null;
const socket = io(import.meta.env.VITE_API_BASE || location.origin);

const todaysSessions = computed(() => {
  const today = new Date().toDateString();
  return sessions.value.filter(s => new Date(s.date).toDateString() === today).length;
});

const sortedSessions = computed(() =>
  [...sessions.value].sort((a, b) => new Date(b.date) - new Date(a.date))
);

const startLogging = () => {
  clearInterval(timer.value);
  isLogging.value = true;
  startTime.value = Date.now();
  currentDuration.value = 0;
  timer.value = setInterval(() => {
    currentDuration.value = Math.floor((Date.now() - startTime.value) / 1000);
  }, 1000);
};

const stopSession = async () => {
  clearInterval(timer.value);
  isLogging.value = false;

  const payload = {
    date: new Date().toISOString(),
    duration: currentDuration.value,
  };

  try {
    if (editingId.value) {
      await authedFetch(`/api/meditation/${editingId.value}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });
      editingId.value = null;
    } else {
      await authedFetch('/api/meditation', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await fetchSessions();
  } catch (err) {
    console.error('Error saving session', err);
  }
};

const startEdit = (session) => {
  clearInterval(timer.value);
  editingId.value = session._id;
  currentDuration.value = session.duration;
  startLogging();
};

const deleteSession = async (id) => {
  try {
    await authedFetch(`/api/meditation/${id}`, {
      method: 'DELETE'
    });
    await fetchSessions();
  } catch (err) {
    console.error("Delete failed", err);
  }
};

const fetchSessions = async () => {
  try {
    const res = await authedFetch('/api/meditation');
    const data = await res.json();
    sessions.value = data.data;
    renderChart();
  } catch (err) {
    console.error("Fetch failed", err);
  }
};

let renderTimeout = null;
const renderChart = () => {
  if (!chartRef.value) return;
  clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => {
    const ctx = chartRef.value.getContext("2d");
    if (chartInstance) chartInstance.destroy();

    const sortedByDate = [...sessions.value].sort((a, b) => new Date(a.date) - new Date(b.date));
    chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sortedByDate.map(s =>
          new Date(s.date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })
        ),
        datasets: [{
          label: "Session Duration (min)",
          data: sortedByDate.map(s => Math.floor(s.duration / 60)),
          backgroundColor: "#5e35b1"
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: val => `${val} min`
            }
          }
        }
      }
    });
  }, 100);
};

const formatTime = (secs) => {
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const formatDate = (date) =>
  new Date(date).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  });

onMounted(() => {
  fetchSessions();
  socket.on("meditationUpdate", fetchSessions);
});

onUnmounted(() => {
  clearInterval(timer.value);
  socket.disconnect();
});
</script>

<style scoped>

.chart-container {
  margin: 2rem auto;
  max-width: 100%;
}

.meditation-container {
  max-width: 500px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

h2 {
  color: #5e35b1;
  margin-bottom: 0.5rem;
  font-size: 1.8rem;
}

.description {
  color: #666;
  margin-bottom: 2rem;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.log-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.8rem 1.5rem;
  background: #5e35b1;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.log-button:hover {
  background: #4527a0;
  transform: translateY(-2px);
}

.icon {
  font-size: 1.2rem;
}

.stats {
  display: flex;
  justify-content: space-around;
  color: #555;
}

.session-active {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  margin: 1.5rem 0;
}

.timer {
  font-size: 2.5rem;
  font-family: monospace;
  color: #5e35b1;
  font-weight: bold;
}

.action-button {
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.stop-button {
  background: #f44336;
  color: white;
}

.stop-button:hover {
  background: #d32f2f;
}

.session-list {
  margin-top: 2rem;
  list-style: none;
  padding: 0;
}

.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 1rem;
  margin-bottom: 0.5rem;
  background: #f5f5f5;
  border-radius: 6px;
}

.date {
  color: #333;
}

.duration {
  font-family: monospace;
  font-weight: bold;
  color: #5e35b1;
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

@media (max-width: 600px) {
  .meditation-container {
    padding: 1.5rem;
    border-radius: 0;
  }
  h2 {
    font-size: 1.5rem;
  }
}
</style>

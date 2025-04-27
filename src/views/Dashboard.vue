<template>
  <div class="dashboard">
    <header class="dashboard-header">
      <h1>Your Wellness Dashboard</h1>
      <p class="welcome-message">Welcome back, {{ userName }}!</p>
    </header>

    <div class="stats-overview">
      <div class="stat-card" v-for="stat in quickStats" :key="stat.title">
        <div class="stat-icon">{{ stat.icon }}</div>
        <div class="stat-content">
          <h3>{{ stat.title }}</h3>
          <p>{{ stat.value }}</p>
        </div>
      </div>
    </div>

    <section class="recent-activity">
      <h2>Recent Activity</h2>
      <div class="activity-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="{ active: activeTab === tab.id }"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="activity-content">
        <div v-if="loading" class="loading-spinner">
          <div class="spinner"></div>
        </div>
        <template v-else>
          <SleepActivity v-if="activeTab === 'sleep'" :entries="sleepData" />
          <WorkoutActivity v-if="activeTab === 'workouts'" :entries="workoutData" />
          <MoodActivity v-if="activeTab === 'mood'" :entries="moodData" />
          <MeditationActivity v-if="activeTab === 'meditation'" :entries="meditationData" />
        </template>
      </div>
    </section>

    <div class="action-buttons">
      <button
        v-for="action in quickActions"
        :key="action.label"
        @click="handleAction(action)"
        class="action-button"
      >
        <span class="action-icon">{{ action.icon }}</span>
        {{ action.label }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuth } from '@/services/AuthService';
import {
  getSleepData,
  getWorkoutData,
  getMoodData,
  getMeditationData
} from '@/services/DataService';

import SleepActivity from '@/components/SleepTracker.vue';
import WorkoutActivity from '@/components/Workout_n_Grooming.vue';
import MoodActivity from '@/components/MoodTracker.vue';
import MeditationActivity from '@/components/Meditation.vue';

const { userDisplayName } = useAuth();
const loading = ref(true);

const sleepData = ref([]);
const workoutData = ref([]);
const moodData = ref([]);
const meditationData = ref([]);

const activeTab = ref('sleep');
const userName = computed(() => userDisplayName.value || 'there');

const tabs = [
  { id: 'sleep', label: 'Sleep' },
  { id: 'workouts', label: 'Workouts' },
  { id: 'mood', label: 'Mood' },
  { id: 'meditation', label: 'Meditation' }
];

const quickActions = [
  { icon: '➕', label: 'Log Sleep', action: 'logSleep' },
  { icon: '🏋️', label: 'Add Workout', action: 'logWorkout' },
  { icon: '📊', label: 'View Trends', action: 'viewTrends' }
];

const calculateAvgSleep = () => {
  if (!sleepData.value.length) return '--';
  const total = sleepData.value.reduce((sum, entry) => sum + entry.hours, 0);
  return `${(total / sleepData.value.length).toFixed(1)}h`;
};

const calculateAvgMood = () => {
  if (!moodData.value.length) return '--';
  const total = moodData.value.reduce((sum, entry) => sum + entry.moodLevel, 0);
  return `${(total / moodData.value.length).toFixed(1)}/5`;
};

const quickStats = computed(() => [
  { icon: '🛌', title: 'Avg Sleep', value: calculateAvgSleep() },
  { icon: '💪', title: 'Workouts', value: `${workoutData.value.length} this week` },
  { icon: '😊', title: 'Mood Avg', value: calculateAvgMood() },
  { icon: '🧘', title: 'Sessions', value: `${meditationData.value.length} this week` }
]);

const fetchAllData = async () => {
  try {
    loading.value = true;
    const [sleep, workouts, mood, meditation] = await Promise.all([
      getSleepData({ limit: 5 }),
      getWorkoutData({ limit: 5 }),
      getMoodData({ limit: 7 }),
      getMeditationData({ limit: 5 })
    ]);
    sleepData.value = sleep;
    workoutData.value = workouts;
    moodData.value = mood;
    meditationData.value = meditation;
  } catch (error) {
    console.error('Dashboard fetch failed:', error);
  } finally {
    loading.value = false;
  }
};

const handleAction = (action) => {
  // Placeholder: implement routing or modals here
  console.log('Quick Action Clicked:', action.action);
};

onMounted(fetchAllData);
</script>


<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;

  background-image: url('@/assets/sky.png');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  border-radius: 12px;
}

.dashboard-header {
  text-align: center;
  margin-bottom: 2rem;
}

.dashboard-header h1 {
  font-size: 2.5rem;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.welcome-message {
  font-size: 1.2rem;
  color: #7f8c8d;
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-icon {
  font-size: 2rem;
  margin-right: 1rem;
}

.stat-content h3 {
  font-size: 1rem;
  color: #7f8c8d;
  margin-bottom: 0.25rem;
}

.stat-content p {
  font-size: 1.5rem;
  font-weight: bold;
  color: #2c3e50;
}

.recent-activity {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.recent-activity h2 {
  font-size: 1.5rem;
  color: #2c3e50;
  margin-bottom: 1.5rem;
}

.activity-tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #ecf0f1;
  padding-bottom: 1rem;
}

.activity-tabs button {
  background: none;
  border: none;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 1rem;
  color: #7f8c8d;
  border-radius: 6px;
  transition: all 0.2s;
}

.activity-tabs button:hover {
  background: #f8f9fa;
}

.activity-tabs button.active {
  background: #3498db;
  color: white;
}

.loading-spinner {
  display: flex;
  justify-content: center;
  padding: 2rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #3498db;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.action-button {
  background: #3498db;
  color: white;
  border: none;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: transform 0.2s, background 0.2s;
}

.action-button:hover {
  background: #2980b9;
  transform: translateY(-2px);
}

.action-icon {
  font-size: 1.2rem;
}

@media (max-width: 768px) {
  .dashboard {
    padding: 1rem;
  }

  .stats-overview {
    grid-template-columns: 1fr 1fr;
  }

  .activity-tabs {
    overflow-x: auto;
    padding-bottom: 0.5rem;
  }

  .action-buttons {
    flex-direction: column;
  }
}
</style>
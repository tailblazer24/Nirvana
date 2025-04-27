<template>
  <div class="profile-info" v-if="user">
    <div class="profile-content">
      <p class="welcome-message">
        <strong>Welcome,</strong> 
        <span class="user-name">{{ name }}</span>
      </p>
      <div class="email-wrapper">
        <p class="email" :title="email">{{ truncatedEmail }}</p>
      </div>

      <img 
        v-if="photoURL && !imageError" 
        :src="photoURL" 
        :alt="name ? `${name}'s profile picture` : 'User profile picture'"
        class="profile-picture"
        @error="handleImageError"
      />
      <div v-else class="profile-fallback" title="No profile photo">👤</div>
    </div>
  </div>

  <!-- Skeleton loader while auth state initializes -->
  <div v-else class="profile-skeleton">
    <div class="skeleton-line short"></div>
    <div class="skeleton-line shorter"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { auth } from "@/firebase";

const user = ref(null);
const photoURL = ref("");
const imageError = ref(false);

const name = computed(() => user.value?.displayName || "Anonymous User");
const email = computed(() => user.value?.email || "");

const truncatedEmail = computed(() => {
  if (!email.value) return "";
  const [username, domain] = email.value.split("@");
  return `${username.substring(0, 3)}***@${domain}`;
});

const handleImageError = () => {
  imageError.value = true;
  photoURL.value = "";
};

onMounted(() => {
  const unsubscribe = auth.onAuthStateChanged((authUser) => {
    user.value = authUser;
    imageError.value = false;
    if (authUser?.photoURL) {
      photoURL.value = authUser.photoURL;
    }
  });

  onUnmounted(() => unsubscribe());
});
</script>

<style scoped>
.profile-info {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
}

.profile-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.welcome-message {
  margin: 0;
  font-size: 0.9rem;
  color: white;
  line-height: 1.3;
}

.user-name {
  font-weight: 500;
}

.email-wrapper {
  max-width: 150px;
  overflow: hidden;
}

.email {
  margin: 0;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.email:hover {
  white-space: normal;
  overflow: visible;
  background-color: rgba(255, 255, 255, 0.05);
  padding: 2px;
  border-radius: 4px;
}

.profile-picture {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-top: 0.25rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  object-fit: cover;
}

.profile-fallback {
  width: 32px;
  height: 32px;
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  margin-top: 0.25rem;
}

/* Skeleton loading state */
.profile-skeleton {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  padding: 0.5rem;
}

.skeleton-line {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-line.short {
  width: 100px;
  height: 14px;
}

.skeleton-line.shorter {
  width: 80px;
  height: 12px;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.3; }
}

@media (max-width: 768px) {
  .profile-info {
    padding: 0.25rem;
  }

  .welcome-message {
    font-size: 0.8rem;
  }

  .email {
    font-size: 0.7rem;
  }

  .profile-picture,
  .profile-fallback {
    width: 28px;
    height: 28px;
  }
}
</style>

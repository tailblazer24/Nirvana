<template>
  <main 
    class="landing-container"
    aria-label="Nirvana landing page with call to action"
  >
    <h1>Your One Destination for All Things Health ❤️</h1>
    <button 
      type="button"
      class="button" 
      @click="emit('auth-requested')" 
      aria-label="Try Nirvana"
      aria-live="polite"
    >
      Try Nirvana
    </button>
  </main>
</template>

<script setup>
const emit = defineEmits(["auth-requested"]);
</script>

<style scoped>
.landing-container {
  margin-top: -1px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100dvh;
  height: 100vh;
  text-align: center;
  color: white;
  padding: 20px;
  background-image: url('@/assets/bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  will-change: transform;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 30px;
  font-weight: 600;
  max-width: 800px;
  line-height: 1.2;
  text-shadow: 2px 2px 4px rgba(229, 215, 215, 0.5);
  min-height: calc(2.5rem * 1.2 * 3);
}

@media (max-width: 600px) {
  h1 {
    font-size: 2rem;
    min-height: calc(2rem * 1.2 * 4);
  }
}

.button {
  padding: 12px 30px;
  background: white;
  color: black;
  border: 2px solid white;
  border-radius: 15px;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  transition: 
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease,
    transform 0.2s ease,
    box-shadow 0.3s ease;
}

.button:hover,
.button:focus {
  background: #ffcc00;
  color: black;
  outline: none;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.button:active {
  transform: translateY(0);
}
</style>

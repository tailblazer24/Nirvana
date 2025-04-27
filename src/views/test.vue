
<template>
  <div>
    <h2>Firebase Connection Test</h2>
    <button @click="testFirestore">Test Firestore</button>
  </div>
</template>

<script>
import { db } from '../firebase';
import { doc, getDoc } from "firebase/firestore";

export default {
  methods: {
    async testFirestore() {
      try {
        const docRef = doc(db, "testCollection", "testDoc");
        const docSnap = await getDoc(docRef);
        console.log("Firestore Document:", docSnap.data());
      } catch (error) {
        console.error("Error fetching Firestore document:", error);
      }
    },
  },
};
</script>

import { db } from "@/firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  writeBatch,
  limit as limitFn
} from "firebase/firestore";
import { useAuth } from "@/services/AuthService";

const { user } = useAuth();

const collectionRef = collection(db, "userData");

const normalizeDoc = (doc) => ({
  id: doc.id,
  ...doc.data(),
  createdAt: doc.data()?.createdAt?.toDate?.() || null,
  updatedAt: doc.data()?.updatedAt?.toDate?.() || null
});

const handleError = (error, fallback) => {
  console.error(fallback, error);
  const errorMap = {
    'permission-denied': 'You do not have permission to perform this action',
    'not-found': 'Document not found',
    'unavailable': 'Network error. Please check your connection'
  };
  return {
    code: error.code || 'unknown',
    message: errorMap[error.code] || fallback,
    original: error
  };
};

const userService = {
  async add(data) {
    try {
      if (!user.value) throw new Error("Authentication required");
      const docRef = await addDoc(collectionRef, {
        ...data,
        userId: user.value.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      throw handleError(error, "Failed to add user data");
    }
  },

  async getAll(options = {}) {
    try {
      if (!user.value) return [];

      const { limit, sortBy = 'createdAt', sortDirection = 'desc' } = options;
      let q = query(
        collectionRef,
        where("userId", "==", user.value.uid),
        orderBy(sortBy, sortDirection)
      );

      if (limit) q = query(q, limitFn(limit));

      const snapshot = await getDocs(q);
      return snapshot.docs.map(normalizeDoc);
    } catch (error) {
      throw handleError(error, "Failed to fetch user data");
    }
  },

  subscribe(callback, options = {}) {
    if (!user.value) return () => {};

    const { sortBy = 'createdAt', sortDirection = 'desc' } = options;
    const q = query(
      collectionRef,
      where("userId", "==", user.value.uid),
      orderBy(sortBy, sortDirection)
    );

    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(normalizeDoc);
      callback(data);
    });
  },

  async update(docId, updates) {
    try {
      const docRef = doc(db, "userData", docId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      throw handleError(error, "Failed to update user document");
    }
  },

  async delete(docId) {
    try {
      const docRef = doc(db, "userData", docId);
      await deleteDoc(docRef);
    } catch (error) {
      throw handleError(error, "Failed to delete user document");
    }
  },

  async batchDelete(docIds) {
    try {
      const batch = writeBatch(db);
      docIds.forEach(id => {
        const docRef = doc(db, "userData", id);
        batch.delete(docRef);
      });
      await batch.commit();
    } catch (error) {
      throw handleError(error, "Failed to batch delete user documents");
    }
  }
};

export default userService;

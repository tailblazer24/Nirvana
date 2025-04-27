import authedFetch from "@/utils/authedFetch";

const dataService = {
  async add(resource, data) {
    const res = await authedFetch(`/api/${resource}`, {
      method: "POST",
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Failed to create entry");
    return result.data;
  },

  async getAll(resource, { page = 1, limit = 30, startDate, endDate } = {}) {
    const query = new URLSearchParams({ page, limit });
    if (startDate) query.append("startDate", startDate);
    if (endDate) query.append("endDate", endDate);

    const res = await authedFetch(`/api/${resource}?${query.toString()}`);
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Failed to fetch data");
    return result.data;
  },

  async update(resource, id, data) {
    const res = await authedFetch(`/api/${resource}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Failed to update entry");
    return result.data;
  },

  async delete(resource, id) {
    const res = await authedFetch(`/api/${resource}/${id}`, {
      method: "DELETE",
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Failed to delete entry");
    return result.message;
  },

  async getStats(resource, period = "week") {
    const res = await authedFetch(`/api/${resource}/stats?period=${period}`);
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Failed to fetch stats");
    return result.data;
  },
};

// Named wrappers
export const addMoodData = (data) => dataService.add("mood", data);
export const getMoodData = (options) => dataService.getAll("mood", options);
export const updateMoodData = (id, data) => dataService.update("mood", id, data);
export const deleteMoodData = (id) => dataService.delete("mood", id);
export const getMoodStats = (period) => dataService.getStats("mood", period);

export const addSleepData = (data) => dataService.add("sleep", data);
export const getSleepData = (options) => dataService.getAll("sleep", options);
export const updateSleepData = (id, data) => dataService.update("sleep", id, data);
export const deleteSleepData = (id) => dataService.delete("sleep", id);
export const getSleepStats = (period) => dataService.getStats("sleep", period);

export const addWorkoutData = (data) => dataService.add("workout", data);
export const getWorkoutData = (options) => dataService.getAll("workout", options);
export const getWorkoutStats = (period) => dataService.getStats("workout", period);

export const getMeditationData = (options) => dataService.getAll('meditationData', options);


export default dataService;

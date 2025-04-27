const setupChangeStreams = (db, io) => {
  console.log(' Change streams setup initialized');

  const collections = ['moods', 'sleep', 'workouts']; // Adjust based on your collection names

  collections.forEach((name) => {
    const collection = db.collection(name);

    const changeStream = collection.watch();

    changeStream.on('change', (change) => {
      // You can refine logic based on `change.operationType`
      const eventType = `${name}Update`;

      io.emit(eventType, {
        action: change.operationType,
        data: change.fullDocument || change.documentKey,
      });

      console.log(`📡 ${eventType} - ${change.operationType}`);
    });

    changeStream.on('error', (err) => {
      console.error(`Change stream error on ${name}:`, err);
    });
  });
};

export default setupChangeStreams;

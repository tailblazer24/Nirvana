import { getAuth } from 'firebase-admin/auth';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Unauthorized: No token provided'));
    }

    const decodedToken = await getAuth().verifyIdToken(token);
    socket.user = { ...decodedToken, uid: decodedToken.uid };
    
    next();
  } catch (error) {
    console.error('Socket auth error:', error.message);
    next(new Error('Unauthorized'));
  }
};

export default authenticateSocket;

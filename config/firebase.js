const fcm = require('firebase-admin');
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

if (!fcm.apps.length) {
  fcm.initializeApp({
    credential: fcm.credential.cert(serviceAccount),
  });
}



module.exports = fcm;
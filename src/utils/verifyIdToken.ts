import firebase from '../config/firebase';

export const verifyIdToken = async (idToken: string): Promise<firebase.auth.DecodedIdToken | undefined> => {
  try {
    return await firebase.auth().verifyIdToken(idToken);
  } catch (error) {
    return;
  }
};

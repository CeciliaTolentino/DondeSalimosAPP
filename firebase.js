import firebase from '@react-native-firebase/app';
import '@react-native-firebase/auth';
import { GoogleSignin,statusCodes } from '@react-native-google-signin/google-signin';

const firebaseConfig = {
  apiKey: "AIzaSyBmWBroIFLQQgCWaVk2MyDBDlQYjN8oBVo",
  authDomain: "dondesalimos-bfe2b.firebaseapp.com",
  projectId: "dondesalimos-bfe2b",
  storageBucket: "dondesalimos-bfe2b.appspot.com",
  messagingSenderId: "620861653759",
  appId: "1:279280321644:android:4c94d00062298481c0c449"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

GoogleSignin.configure({
  webClientId: '279280321644-liu8o3o8imlgpcmffog559tijjuekusu.apps.googleusercontent.com',

  scopes: ['openid', 'email', 'profile'] // Añada esta línea
});

export default firebase;
export { GoogleSignin,statusCodes };
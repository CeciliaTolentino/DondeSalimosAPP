import firebase from '@react-native-firebase/app';
import '@react-native-firebase/auth';
import { GoogleSignin,statusCodes } from '@react-native-google-signin/google-signin';

const firebaseConfig = {
  apiKey: "AIzaSyBmWBroIFLQQgCWaVk2MyDBDlQYjN8oBVo",
  authDomain: "dondesalimos-bfe2b.firebaseapp.com",
  projectId: "dondesalimos-bfe2b",
  storageBucket: "dondesalimos-bfe2b.appspot.com",
  messagingSenderId: "620861653759",
  appId: "1:620861653759:android:92085f70e1e7e8e1ab02ca"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

GoogleSignin.configure({
  webClientId: '620861653759-n7la2q029vi8vjl2r53v2g18lo8s0rlh.apps.googleusercontent.com',

  scopes: ['openid', 'email', 'profile'] // Añada esta línea
});

export default firebase;
export { GoogleSignin,statusCodes };
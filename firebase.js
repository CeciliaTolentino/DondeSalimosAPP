
import { GoogleSignin,statusCodes } from '@react-native-google-signin/google-signin';


GoogleSignin.configure({
  webClientId: '279280321644-liu8o3o8imlgpcmffog559tijjuekusu.apps.googleusercontent.com',

  scopes: ['openid', 'email', 'profile'] 
});


export { GoogleSignin,statusCodes };
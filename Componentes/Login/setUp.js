export default function onGoogleButtonPress() {
    // Tu lógica de autenticación de Google aquí
    return {
      promptAsync: async () => {
        // Implementa aquí la lógica para iniciar sesión con Google
        console.log('Iniciando sesión con Google...');
      }
    };
  }
export async function googleSignOut(){
    console.log("should sign out and user: null")
}
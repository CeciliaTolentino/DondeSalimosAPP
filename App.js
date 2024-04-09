import { Text, View } from 'react-native';

import Headers from './components/Headers';
import Footer from './components/Footers';
import Home from './components/Home'
export default function App() {
  return (
    <>
   <View style={{
    flex:1, backgroundColor:'#0000'
   }}>
      
       <Headers/>
       </View>
       <View style={{
    flex:1
   }}>
      
       <Home/>
       </View>
       <View style={{
    flex:0.5, justifyContent:"flex-end",backgroundColor:'#0000'
   }}>
       <Footer/>
    </View>
    </>
  );
}




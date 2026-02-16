import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Header from './Header';

function App() {
    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.wrapper}>
                {/* <Header />
                <Text style={[styles.text1, styles.text2]}>Project-1</Text>
                <Text style={styles.text2}>Cofinex</Text> */}
            </SafeAreaView>
        </SafeAreaProvider>
    )
}
const styles = StyleSheet.create({
    // text1: {
    //     color: 'red'
    // },
    // text2: {
    //     fontSize: 20,
    //     fontWeight: 'bold',

    // }
    wrapper: {
        flex: 1,
        backgroundColor: '#1ee5e8',
        alignItems: 'center',
        justifyContent: 'center',
    }
});

export default App;

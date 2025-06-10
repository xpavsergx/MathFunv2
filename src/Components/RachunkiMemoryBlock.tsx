import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';

export default function RachunkiMemoryBlock() {
    const a = 45;
    const b = 23;
    const tens = Math.floor(b / 10) * 10; // 20
    const ones = b % 10; // 3
    const step1 = a - tens; // 25
    const step2 = step1 - ones; // 22

    const [step, setStep] = useState(0);

    const getSteps = () => {
        const steps = [
            <Text key="intro" style={styles.intro}>
                🤓 Zobaczmy, jak policzyć 45 - 23 krok po kroku!
            </Text>,
            <Text key="step1" style={styles.stepText}>
                🔍 Rozdzielamy 23 na <Text style={styles.highlight}>20</Text> i{' '}
                <Text style={styles.highlight}>3</Text>
            </Text>,
            <Text key="step2" style={styles.stepText}>
                ➤ Najpierw: 45 - 20 = <Text style={styles.answer}>{step1}</Text>
            </Text>,
            <Text key="step3" style={styles.stepText}>
                ➤ Teraz: {step1} - 3 = <Text style={styles.answer}>{step2}</Text>
            </Text>,
            <>
                <Text key="finalResult" style={styles.finalResult}>✅ Odpowiedź: {step2}</Text>
                <Text key="tip" style={styles.tip}>Najpierw odejmij dziesiątki, potem jedności!</Text>
            </>,
        ];

        return steps.slice(0, step + 1);
    };

    const handleNextStep = () => {
        setStep((prev) => (prev < 4 ? prev + 1 : prev));
    };

    return (
        <View style={styles.wrapper}>
            <View style={styles.container}>
                <Text style={styles.title}>Rachunki pamięciowe</Text>
                <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
                    {getSteps()}
                </ScrollView>
                {step < 4 && (
                    <TouchableOpacity style={styles.button} onPress={handleNextStep}>
                        <Text style={styles.buttonText}>Dalej ➜</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        backgroundColor: '#FFF8E1',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        width: '90%',
        elevation: 3,
    },
    scrollArea: {
        maxHeight: 300,
        width: '100%',
    },
    scrollContent: {
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FF8F00',
        marginBottom: 20,
        textAlign: 'center',
    },
    intro: {
        fontSize: 18,
        color: '#424242',
        textAlign: 'center',
        marginBottom: 10,
    },
    stepText: {
        fontSize: 20,
        textAlign: 'center',
        marginVertical: 8,
        color: '#5D4037',
    },
    highlight: {
        color: '#1976D2',
        fontWeight: 'bold',
        fontSize: 20,
    },
    answer: {
        color: '#388E3C',
        fontWeight: 'bold',
    },
    finalResult: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#D84315',
        textAlign: 'center',
        marginTop: 15,
    },
    tip: {
        fontSize: 16,
        marginTop: 10,
        color: '#00796B',
        fontStyle: 'italic',
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#FFD54F',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 25,
        marginTop: 20,
    },
    buttonText: {
        fontSize: 18,
        color: '#5D4037',
        fontWeight: 'bold',
    },
});

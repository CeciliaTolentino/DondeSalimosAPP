import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { getPendingApprovals, updateApprovalStatus } from './../../Componentes/utils/auth';

export default function AdminPanel() {
  const [pendingBars, setPendingBars] = useState([]);

  useEffect(() => {
    loadPendingBars();
  }, []);

  const loadPendingBars = async () => {
    try {
      const pendingApprovals = await getPendingApprovals();
      setPendingBars(pendingApprovals);
    } catch (error) {
      console.error('Error al cargar los bares pendientes:', error);
      Alert.alert('Error', 'No se pudieron cargar los bares pendientes.');
    }
  };

  const handleBarAction = async (item, isApproved) => {
    try {
      await updateApprovalStatus(item.googleId, isApproved);
      Alert.alert('Éxito', `${item.barName} ha sido ${isApproved ? 'aprobado' : 'rechazado'}.`);
      loadPendingBars();
    } catch (error) {
      console.error('Error al procesar la solicitud del bar:', error);
      Alert.alert('Error', `No se pudo ${isApproved ? 'aprobar' : 'rechazar'} el bar.`);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.barName}</Text>
        <Text style={styles.itemSubtitle}>{item.barType}</Text>
        <Text style={styles.itemDetails}>CUIT: {item.barCuit}</Text>
        <Text style={styles.itemDetails}>Dirección: {item.barAddress}</Text>
        <Text style={styles.itemDetails}>Horario: {item.openingHours} - {item.closingHours}</Text>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.approveButton]} 
          onPress={() => handleBarAction(item, true)}
        >
          <Text style={styles.buttonText}>Aprobar</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.rejectButton]} 
          onPress={() => handleBarAction(item, false)}
        >
          <Text style={styles.buttonText}>Rechazar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Panel de Administración</Text>
      {pendingBars.length > 0 ? (
        <FlatList
          data={pendingBars}
          renderItem={renderItem}
          keyExtractor={(item) => item.googleId}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No hay bares pendientes de aprobación.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
container: {
  flex: 1,
  padding: 20,
},
title: {
  fontSize: 24,
  fontWeight: 'bold',
  marginBottom: 20,
},
item: {
  backgroundColor: '#f9f9f9',
  padding: 20,
  marginVertical: 8,
  borderRadius: 5,
},
itemText: {
  fontSize: 18,
  marginBottom: 10,
},
buttonContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
},
button: {
  padding: 10,
  borderRadius: 5,
  width: '48%',
},
approveButton: {
  backgroundColor: 'green',
},
rejectButton: {
  backgroundColor: 'red',
},
buttonText: {
  color: 'white',
  textAlign: 'center',
},
noApprovals: {
  fontSize: 18,
  textAlign: 'center',
},
});
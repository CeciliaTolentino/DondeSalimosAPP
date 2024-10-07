import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { getPendingApprovals, updateApprovalStatus, saveUserData } from './../../Componentes/utils/auth';
import ComercioInfoModal from './../../Componentes/Home/ComercioInfoModal';

export default function AdminPanel() {
  const [pendingBars, setPendingBars] = useState([]);
  const [selectedBar, setSelectedBar] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

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
      
      // Actualizar los datos del usuario
      const updatedUserData = {
        ...item,
        approved: isApproved,
        userType: 'barOwner'
      };
      await saveUserData(updatedUserData);

      Alert.alert('Éxito', `${item.barName} ha sido ${isApproved ? 'aprobado' : 'rechazado'}.`);
      loadPendingBars();
      setModalVisible(false);
    } catch (error) {
      console.error('Error al procesar la solicitud del bar:', error);
      Alert.alert('Error', `No se pudo ${isApproved ? 'aprobar' : 'rechazar'} el bar.`);
    }
  };

  const handleBarPress = (item) => {
    setSelectedBar(item);
    setModalVisible(true);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.item} onPress={() => handleBarPress(item)}>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.barName}</Text>
        <Text style={styles.itemSubtitle}>{item.barType}</Text>
        <Text style={styles.itemDetails}>CUIT: {item.barCuit}</Text>
        <Text style={styles.itemDetails}>Dirección: {item.barAddress}</Text>
        <Text style={styles.itemDetails}>Horario: {item.openingHours} - {item.closingHours}</Text>
      </View>
    </TouchableOpacity>
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
      <ComercioInfoModal
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        barInfo={selectedBar}
        onApprove={() => selectedBar && handleBarAction(selectedBar, true)}
        onReject={() => selectedBar && handleBarAction(selectedBar, false)}
      />
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
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  itemSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  itemDetails: {
    fontSize: 14,
    color: '#888',
  },
  listContainer: {
    flexGrow: 1,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 18,
    color: '#666',
  },
});
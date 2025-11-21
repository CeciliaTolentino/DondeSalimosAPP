import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

const ComercioInfoModal = ({ isVisible, onClose, barInfo, onApprove, onReject }) => {
  if (!barInfo) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <ScrollView>
            <Text style={styles.modalTitle}>{barInfo.barName}</Text>
            <Text style={styles.modalText}>Tipo: {barInfo.barType}</Text>
            <Text style={styles.modalText}>Dirección: {barInfo.barAddress}</Text>
            <Text style={styles.modalText}>CUIT: {barInfo.barCuit}</Text>
            <Text style={styles.modalText}>Horario de apertura: {barInfo.openingHours}</Text>
            <Text style={styles.modalText}>Horario de cierre: {barInfo.closingHours}</Text>
            <Text style={styles.modalText}>Email: {barInfo.email}</Text>
            <Text style={styles.modalText}>Nombre del dueño: {barInfo.name} {barInfo.lastName}</Text>
          </ScrollView>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.buttonApprove]}
              onPress={() => {
                onApprove(barInfo.googleId);
                onClose();
              }}
            >
              <Text style={styles.textStyle}>Aprobar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonReject]}
              onPress={() => {
                onReject(barInfo.googleId);
                onClose();
              }}
            >
              <Text style={styles.textStyle}>Rechazar</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.button, styles.buttonClose]}
            onPress={onClose}
          >
            <Text style={styles.textStyle}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'left',
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    minWidth: 100,
  },
  buttonApprove: {
    backgroundColor: '#4CAF50',
  },
  buttonReject: {
    backgroundColor: '#F44336',
  },
  buttonClose: {
    backgroundColor: '#2196F3',
    marginTop: 10,
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ComercioInfoModal;
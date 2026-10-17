import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ImageAspectFrame } from '@/src/components/image-aspect-frame';
import { EVENT_DAY_LABEL_KEYS } from '@/src/constants/event-days';

type ProgramDetails = {
  id?: string; // Hozzáadtuk az ID-t a törléshez
  title?: string;
  time?: string;
  helyszín?: string;
  day?: string;
  image?: string;
  description?: string;
};

type ProgramDetailsScreenProps = {
  program: ProgramDetails;
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onBack: () => void;
  image?: string;
  isImageLoading?: boolean;
};

export function ProgramDetailsScreen({
  program,
  isAdmin,
  onDelete,
  onEdit,
  onBack,
  image,
  isImageLoading,
}: ProgramDetailsScreenProps) {
  const { t } = useTranslation();
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const dayLabel = program.day && program.day in EVENT_DAY_LABEL_KEYS
    ? t(EVENT_DAY_LABEL_KEYS[program.day as keyof typeof EVENT_DAY_LABEL_KEYS])
    : program.day;

  const handleDeleteConfirm = () => {
    setIsDeleteModalVisible(false);
    if (program.id && onDelete) {
      onDelete(program.id);
    }
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <View style={styles.webWrapper}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← {t('programs.backToSchedule', 'Vissza a programokhoz')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{program.title}</Text>
          <Text style={styles.programDetail}>{dayLabel} · {program.time}</Text>
          <Text style={styles.programDetail}>📍 {program.helyszín || t('programs.locationComing')}</Text>

          {isImageLoading ? (
            <View style={styles.imageLoading}><ActivityIndicator color="#EC2127" /></View>
          ) : (image ?? program.image) ? (
            <ImageAspectFrame source={{ uri: (image ?? program.image)! }} style={styles.programImageFrame} />
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('programs.details', 'Részletek')}</Text>
            <Text style={styles.cardText}>{program.description || t('programs.noDetails', 'Nincsenek további részletek megadva.')}</Text>
          </View>

          {isAdmin && (
            <View style={styles.adminActions}>
              {program.id && onEdit && (
                <TouchableOpacity style={styles.editButton} onPress={() => onEdit(program.id!)}>
                  <Text style={styles.editButtonText}>✏️ {t('programs.editEvent')}</Text>
                </TouchableOpacity>
              )}
              {program.id && onDelete && (
                <TouchableOpacity style={styles.deleteButton} onPress={() => setIsDeleteModalVisible(true)}>
                  <Text style={styles.deleteButtonText}>🗑️ {t('programs.deleteEvent')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>

        <Modal transparent={true} visible={isDeleteModalVisible} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('programs.deleteConfirmTitle', 'Biztosan törlöd?')}</Text>
              <Text style={styles.modalText}>
                {t('programs.deleteConfirmText', 'Ez a művelet nem vonható vissza, az esemény végleg törlődik.')}
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => setIsDeleteModalVisible(false)}>
                  <Text style={styles.modalCancelText}>{t('common.cancel', 'Mégsem')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalDeleteButton} onPress={handleDeleteConfirm}>
                  <Text style={styles.modalDeleteText}>{t('common.delete', 'Törlés')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  webWrapper: { width: '100%', maxWidth: 1200, flex: 1, padding: 24, alignSelf: 'flex-start' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  backButton: { paddingVertical: 5 },
  backButtonText: { color: '#EC2127', fontSize: 16, fontWeight: 'bold' },
  scrollContent: { paddingBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 10, textAlign: 'left', letterSpacing: 1 },
  programDetail: { fontSize: 14, color: '#aaa', marginBottom: 6 },
  programImageFrame: { borderRadius: 10, marginVertical: 15 },
  imageLoading: { height: 180, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6 },
  cardText: { fontSize: 14, color: '#aaa', lineHeight: 20 },
  
  adminActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  editButton: { flex: 1, backgroundColor: '#1A2A3A', borderWidth: 1, borderColor: '#2980B9', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  editButtonText: { color: '#5DADE2', fontWeight: 'bold' },
  deleteButton: { flex: 1, backgroundColor: 'rgba(236, 33, 39, 0.1)', borderWidth: 1, borderColor: '#EC2127', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  deleteButtonText: { color: '#EC2127', fontWeight: 'bold', letterSpacing: 1 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1E1E1E', width: '100%', maxWidth: 350, borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#333' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 10, textAlign: 'center' },
  modalText: { fontSize: 14, color: '#aaa', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  modalCancelButton: { flex: 1, backgroundColor: '#333', paddingVertical: 12, borderRadius: 8, marginRight: 8, alignItems: 'center' },
  modalCancelText: { color: '#FFF', fontWeight: 'bold' },
  modalDeleteButton: { flex: 1, backgroundColor: '#EC2127', paddingVertical: 12, borderRadius: 8, marginLeft: 8, alignItems: 'center' },
  modalDeleteText: { color: '#FFF', fontWeight: 'bold' },
});
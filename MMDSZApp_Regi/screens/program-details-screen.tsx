import React, { useState } from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';

import { EVENT_DAY_LABEL_KEYS } from '@/constants/event-days';

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
  onBack: () => void;
};

export function ProgramDetailsScreen({ program, isAdmin, onDelete, onBack }: ProgramDetailsScreenProps) {
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
    <SafeAreaView style={styles.container}>
      <View style={styles.webWrapper}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← {t('programs.backToSchedule', 'Vissza a programokhoz')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{program.title}</Text>
          <View style={styles.timeBadge}>
            <Text style={styles.timeText}>{program.time}</Text>
          </View>
          <Text style={styles.programDetail}>📍 {program.helyszín || t('programs.locationComing')} | {dayLabel}</Text>

          {program.image ? (
            <Image source={{ uri: program.image }} style={styles.programImage} resizeMode="cover" />
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('programs.details', 'Részletek')}</Text>
            <Text style={styles.cardText}>{program.description || t('programs.noDetails', 'Nincsenek további részletek megadva.')}</Text>
          </View>

          {/* Törlés gomb - Csak adminoknak látszik */}
          {isAdmin && (
            <TouchableOpacity style={styles.deleteButton} onPress={() => setIsDeleteModalVisible(true)}>
              <Text style={styles.deleteButtonText}>🗑️ {t('programs.deleteEvent', 'Esemény törlése')}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Egyedi megerősítő Modal (Alert helyett) */}
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
  webWrapper: { width: '100%', maxWidth: 450, flex: 1, padding: 20, justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  backButton: { paddingVertical: 5 },
  backButtonText: { color: '#EC2127', fontSize: 16, fontWeight: 'bold' },
  scrollContent: { paddingBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 10, textAlign: 'left', letterSpacing: 1 },
  timeBadge: { alignSelf: 'flex-start', backgroundColor: '#EC2127', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 10, alignItems: 'center', justifyContent: 'center' },
  timeText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  programDetail: { fontSize: 13, color: '#aaa', marginBottom: 4 },
  programImage: { width: '100%', height: 220, borderRadius: 10, marginVertical: 15 },
  card: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6 },
  cardText: { fontSize: 14, color: '#aaa', lineHeight: 20 },
  
  // Törlés gomb stílusai
  deleteButton: { backgroundColor: 'rgba(236, 33, 39, 0.1)', borderWidth: 1, borderColor: '#EC2127', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  deleteButtonText: { color: '#EC2127', fontWeight: 'bold', letterSpacing: 1 },
  
  // Modal stílusok
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
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { TeamManagementScreen } from '@/src/screens/team-management-screen';
import { useAuth } from '@/src/context/AuthContext';
import { db } from '@/src/config/firebase';
import { useTeams } from '@/src/hooks/use-teams';
import { canRole } from '@/src/constants/roles';

import { UserRole } from '@/src/types/auth';
import { goBackOrHome } from '@/src/utils/navigation';
import { processImage } from '@/src/services/images';
import { normalizeTeamName } from '@/src/utils/team-name';

type InviteRole = UserRole.CSAPATTAG | UserRole.ALCSAPATKAPITANY;

export default function TeamManagementRoute() {
  const router = useRouter();
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { getTeam, saveTeam } = useTeams();
  const canInviteMembers = canRole(profile?.role, 'inviteMembers');
  const teamName = normalizeTeamName(profile?.team ?? '');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamVideoLink, setTeamVideoLink] = useState('');
  const [teamLogo, setTeamLogo] = useState<string | null>(null);
  const [teamFlag, setTeamFlag] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>(UserRole.CSAPATTAG);
  const [uploadingImage, setUploadingImage] = useState<'logo' | 'flag' | null>(null);

  const refresh = useCallback(async () => {
    if (!teamName) return;
    const team = await getTeam(teamName);
    setTeamDescription(team?.description ?? '');
    setTeamVideoLink(team?.videoLink ?? '');
    setTeamLogo(team?.logo ?? null);
    setTeamFlag(team?.flag ?? null);
  }, [getTeam, teamName]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);

    return () => clearTimeout(timer);
  }, [refresh]);

  const uploadTeamImage = async (type: 'logo' | 'flag') => {
    if (!teamName) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('alerts.permissionRequired'));
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        base64: false,
      });
      const uri = result.canceled ? undefined : result.assets[0]?.uri;
      if (!uri) return;

      setUploadingImage(type);
      const { dataUrl } = await processImage(uri, {
        maxSide: type === 'logo' ? 512 : 768,
        quality: 0.8,
        maxBytes: 700000,
      });

      await saveTeam(teamName, { [type]: dataUrl });
      if (type === 'logo') setTeamLogo(dataUrl);
      else setTeamFlag(dataUrl);
    } catch (error) {
      if (error instanceof Error && error.message === 'image-too-large') {
        Alert.alert(t('alerts.imageTooLarge'));
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert(t('alerts.generic', { message }));
    } finally {
      setUploadingImage(null);
    }
  };

  const handleInvite = async () => {
    if (!canInviteMembers) {
      Alert.alert(t('alerts.inviteNotAllowed'));
      return;
    }
    if (!inviteEmail.trim() || !teamName) {
      Alert.alert(t('alerts.inviteEmailRequired'));
      return;
    }

    try {
      const normalizedEmail = inviteEmail.trim().toLowerCase();
      const translatedRole = inviteRole === UserRole.CSAPATTAG ? t('roles.member') : t('roles.deputy');
      const normalizedTeamName = normalizeTeamName(teamName);
      const body = t('teamManagement.inviteEmailBody', { teamName: normalizedTeamName, role: translatedRole });
      await setDoc(doc(db, 'invites', normalizedEmail), {
        email: normalizedEmail,
        team: normalizedTeamName,
        role: inviteRole,
        invitedBy: profile?.name || UserRole.CSAPATKAPITANY,
        createdAt: new Date(),
        status: 'Függőben',
      });
      await addDoc(collection(db, 'mail'), {
        to: normalizedEmail,
        message: {
          subject: t('teamManagement.inviteEmailSubject'),
          text: `${t('teamManagement.inviteEmailGreeting')} ${body} ${t('teamManagement.inviteEmailAction')}`,
          html: `<h3>${t('teamManagement.inviteEmailGreeting')}</h3><p>${body}</p><p>${t('teamManagement.inviteEmailAction')}</p>`,
        },
      });
      setInviteEmail('');
      Alert.alert(t('alerts.inviteSent', { email: normalizedEmail }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert(t('alerts.generic', { message }));
    }
  };

  const handleSave = async () => {
    if (!teamName) {
      Alert.alert(t('alerts.teamNameRequired'));
      return;
    }

    try {
      await saveTeam(teamName, { description: teamDescription, videoLink: teamVideoLink });
      Alert.alert(t('alerts.teamSaved'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert(t('alerts.generic', { message }));
    }
  };

  return (
    <TeamManagementScreen
      teamName={teamName}
      teamDescription={teamDescription}
      teamVideoLink={teamVideoLink}
      teamLogo={teamLogo}
      teamFlag={teamFlag}
      uploadingImage={uploadingImage}
      inviteEmail={inviteEmail}
      inviteRole={inviteRole}
      onBack={() => goBackOrHome(router)}
      onRefresh={() => void refresh()}
      onDescriptionChange={setTeamDescription}
      onVideoLinkChange={setTeamVideoLink}
      onUploadTeamImage={(type) => void uploadTeamImage(type)}
      onSaveTeamData={() => void handleSave()}
      onInviteEmailChange={setInviteEmail}
      onInviteRoleChange={setInviteRole}
      onSendTeamInvite={() => void handleInvite()}
    />
  );
}

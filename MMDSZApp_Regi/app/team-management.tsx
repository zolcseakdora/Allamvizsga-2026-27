import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { TeamManagementScreen } from '@/src/screens/team-management-screen';
import { useAuth } from '@/src/context/AuthContext';
import { db } from '@/src/config/firebase';
import { useTeams } from '@/src/hooks/use-teams';

import { UserRole } from '@/src/types/auth';

type InviteRole = UserRole.CSAPATTAG | UserRole.ALCSAPATKAPITANY;

export default function TeamManagementRoute() {
  const router = useRouter();
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { getTeam, saveTeam } = useTeams();
  const teamName = profile?.team ?? '';
  const [teamDescription, setTeamDescription] = useState('');
  const [teamVideoLink, setTeamVideoLink] = useState('');
  const [teamLogo, setTeamLogo] = useState<string | null>(null);
  const [teamFlag, setTeamFlag] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>(UserRole.CSAPATTAG);

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
        quality: 0.15,
        base64: true,
      });
      const base64 = result.canceled ? undefined : result.assets[0]?.base64;
      if (!base64) return;

      const image = `data:image/jpeg;base64,${base64}`;
      if (image.length > 1000000) {
        Alert.alert(t('alerts.teamImageTooLarge'));
        return;
      }

      await saveTeam(teamName, { [type]: image });
      if (type === 'logo') setTeamLogo(image);
      else setTeamFlag(image);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert(t('alerts.generic', { message }));
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !teamName) {
      Alert.alert(t('alerts.inviteEmailRequired'));
      return;
    }

    try {
      const translatedRole = inviteRole === UserRole.CSAPATTAG ? t('roles.member') : t('roles.deputy');
      const body = t('teamManagement.inviteEmailBody', { teamName, role: translatedRole });
      await addDoc(collection(db, 'invites'), {
        email: inviteEmail,
        team: teamName,
        role: inviteRole,
        invitedBy: profile?.name || UserRole.CSAPATKAPITANY,
        createdAt: new Date(),
        status: 'Függőben',
      });
      await addDoc(collection(db, 'mail'), {
        to: inviteEmail,
        message: {
          subject: t('teamManagement.inviteEmailSubject'),
          text: `${t('teamManagement.inviteEmailGreeting')} ${body} ${t('teamManagement.inviteEmailAction')}`,
          html: `<h3>${t('teamManagement.inviteEmailGreeting')}</h3><p>${body}</p><p>${t('teamManagement.inviteEmailAction')}</p>`,
        },
      });
      setInviteEmail('');
      Alert.alert(t('alerts.inviteSent', { email: inviteEmail }));
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
      inviteEmail={inviteEmail}
      inviteRole={inviteRole}
      onBack={() => router.back()}
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

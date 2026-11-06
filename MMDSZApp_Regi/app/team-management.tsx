import * as ImagePicker from 'expo-image-picker';
import { httpsCallable } from 'firebase/functions';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/src/context/ToastContext';

import { TeamManagementScreen } from '@/src/screens/team-management-screen';
import { useAuth } from '@/src/context/AuthContext';
import { functions } from '@/src/config/firebase';
import { useTeams } from '@/src/hooks/use-teams';
import { canRole } from '@/src/constants/roles';

import { UserRole } from '@/src/types/auth';
import { goBackOrHome } from '@/src/utils/navigation';
import { processImage } from '@/src/services/images';
import { normalizeTeamName } from '@/src/utils/team-name';
import { useSponsors } from '@/src/hooks/use-sponsors';
import type { Sponsor } from '@/src/types/sponsor';

type InviteRole = UserRole.CSAPATTAG | UserRole.ALCSAPATKAPITANY;

export default function TeamManagementRoute() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { profile, isLoading } = useAuth();
  const { getTeam, saveTeam } = useTeams();
  const { sponsors, refreshSponsors, addSponsor, updateSponsor, deleteSponsor } = useSponsors();
  const canManageTeam = profile?.isVerified === true && canRole(profile?.role, 'inviteMembers');
  const teamName = normalizeTeamName(profile?.team ?? '');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamVideoLink, setTeamVideoLink] = useState('');
  const [teamLogo, setTeamLogo] = useState<string | null>(null);
  const [teamFlag, setTeamFlag] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>(UserRole.CSAPATTAG);
  const [uploadingImage, setUploadingImage] = useState<'logo' | 'flag' | null>(null);
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorLogo, setSponsorLogo] = useState<string>();
  const [editingSponsorId, setEditingSponsorId] = useState<string>();
  const [isManagingSponsors, setIsManagingSponsors] = useState(false);

  useEffect(() => {
    if (!isLoading && !canManageTeam) router.replace('/');
  }, [canManageTeam, isLoading, router]);

  const refresh = useCallback(async () => {
    if (!canManageTeam || !teamName) return;
    const [team] = await Promise.all([getTeam(teamName), refreshSponsors()]);
    setTeamDescription(team?.description ?? '');
    setTeamVideoLink(team?.videoLink ?? '');
    setTeamLogo(team?.logo ?? null);
    setTeamFlag(team?.flag ?? null);
  }, [canManageTeam, getTeam, refreshSponsors, teamName]);

  useEffect(() => {
    if (!canManageTeam) return;
    const timer = setTimeout(() => {
      void refresh().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        Alert.alert(t('alerts.generic', { message }));
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [canManageTeam, refresh, t]);

  const handleRefresh = () => {
    void refresh().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert(t('alerts.generic', { message }));
    });
  };

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

  const handlePickSponsorLogo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('alerts.permissionRequired'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        base64: false,
      });
      const uri = result.canceled ? undefined : result.assets[0]?.uri;
      if (!uri) return;

      setIsManagingSponsors(true);
      const { dataUrl } = await processImage(uri, {
        maxSide: 256,
        quality: 0.7,
        maxBytes: 200000,
      });
      setSponsorLogo(dataUrl);
    } catch (error) {
      if (error instanceof Error && error.message === 'image-too-large') {
        Alert.alert(t('alerts.imageTooLarge'));
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert(t('alerts.generic', { message }));
    } finally {
      setIsManagingSponsors(false);
    }
  };

  const clearSponsorForm = () => {
    setSponsorName('');
    setSponsorLogo(undefined);
    setEditingSponsorId(undefined);
  };

  const handleSaveSponsor = async () => {
    if (!sponsorName.trim() || !sponsorLogo) {
      Alert.alert(t('teamManagement.sponsorFieldsRequired'));
      return;
    }

    setIsManagingSponsors(true);
    try {
      const sponsor = { name: sponsorName, logo: sponsorLogo };
      if (editingSponsorId) {
        await updateSponsor(editingSponsorId, sponsor);
        Alert.alert(t('teamManagement.sponsorUpdated'));
      } else {
        await addSponsor(sponsor);
        Alert.alert(t('teamManagement.sponsorAdded'));
      }
      clearSponsorForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert(t('alerts.generic', { message }));
    } finally {
      setIsManagingSponsors(false);
    }
  };

  const handleEditSponsor = (sponsor: Sponsor) => {
    setEditingSponsorId(sponsor.id);
    setSponsorName(sponsor.name);
    setSponsorLogo(sponsor.logo);
  };

  const handleDeleteSponsor = (sponsor: Sponsor) => {
    const remove = () => {
      setIsManagingSponsors(true);
      void deleteSponsor(sponsor.id)
        .then(() => {
          if (editingSponsorId === sponsor.id) clearSponsorForm();
          Alert.alert(t('teamManagement.sponsorDeleted'));
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          Alert.alert(t('alerts.generic', { message }));
        })
        .finally(() => setIsManagingSponsors(false));
    };

    const title = t('teamManagement.deleteSponsor');
    const message = t('teamManagement.confirmDeleteSponsor', { name: sponsor.name });
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) remove();
      return;
    }
    Alert.alert(title, message, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('teamManagement.deleteSponsor'), style: 'destructive', onPress: remove },
    ]);
  };

  const handleInvite = async () => {
    if (!canManageTeam) {
      Alert.alert(t('alerts.inviteNotAllowed'));
      return;
    }
    if (!inviteEmail.trim() || !teamName) {
      Alert.alert(t('alerts.inviteEmailRequired'));
      return;
    }

    try {
      const normalizedEmail = inviteEmail.trim().toLowerCase();
      // Meghívót kizárólag a szerver hozhat létre. A szerver ellenőrzi,
      // hogy a meghívó a kapitány/alkapitány SAJÁT csapatába szól-e.
      const createInvite = httpsCallable<
        { email: string; role: InviteRole; team: string },
        { status: string }
      >(functions, 'createInvite');
      await createInvite({
        email: normalizedEmail,
        role: inviteRole,
        team: normalizeTeamName(teamName),
      });
      setInviteEmail('');
      showToast(t('teamManagement.inviteQueued'), 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(t('alerts.generic', { message }), 'error');
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
      sponsors={sponsors.filter((sponsor) => sponsor.team === teamName)}
      teamDescription={teamDescription}
      teamVideoLink={teamVideoLink}
      teamLogo={teamLogo}
      teamFlag={teamFlag}
      uploadingImage={uploadingImage}
      inviteEmail={inviteEmail}
      inviteRole={inviteRole}
      sponsorName={sponsorName}
      sponsorLogo={sponsorLogo}
      editingSponsor={Boolean(editingSponsorId)}
      isManagingSponsors={isManagingSponsors}
      onBack={() => goBackOrHome(router)}
      onRefresh={handleRefresh}
      onDescriptionChange={setTeamDescription}
      onVideoLinkChange={setTeamVideoLink}
      onUploadTeamImage={(type) => void uploadTeamImage(type)}
      onSaveTeamData={() => void handleSave()}
      onInviteEmailChange={setInviteEmail}
      onInviteRoleChange={setInviteRole}
      onSendTeamInvite={() => void handleInvite()}
      onSponsorNameChange={setSponsorName}
      onPickSponsorLogo={() => void handlePickSponsorLogo()}
      onSaveSponsor={() => void handleSaveSponsor()}
      onCancelSponsorEdit={clearSponsorForm}
      onEditSponsor={handleEditSponsor}
      onDeleteSponsor={handleDeleteSponsor}
    />
  );
}

import process from 'node:process';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const [activeEventType] = process.argv.slice(2);
if (!['auto', 'februtalis', 'diaknapok'].includes(activeEventType)) {
  throw new Error('Usage: npm run events:override -- auto|februtalis|diaknapok');
}

initializeApp({ credential: applicationDefault() });
await getFirestore().doc('appConfig/eventSelection').set({
  activeEventType: activeEventType === 'auto' ? null : activeEventType,
  updatedAt: new Date(),
});

console.log(`Active event selection set to ${activeEventType}.`);

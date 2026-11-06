# MMDSZ Cloud Functions

The callable functions are the trusted write path for captain registration codes, captain registration review, invitations, invitation redemption, and membership activation. They use server-side transactions and Admin SDK validation; client writes for those workflows are denied by `firestore.rules`.

Build locally with `npm run build` from this directory. The configured runtime is Node.js 22 and functions are assigned to `europe-west1`.

The Expo app has not yet been migrated to call these functions. Do not deploy these functions or the accompanying Firestore rules until the app registration, invitation, and approval screens use the callable endpoints and the complete workflow has been tested in an approved local Emulator environment. No data migration is included.

Registration codes and invitations currently expire after 30 days. Codes are stored as SHA-256 hashes and can be redeemed once. Invitation expiration and membership assignment are checked and updated transactionally.

`createInvite` queues email through the Firebase Trigger Email extension's `mail` collection; verify that the extension is configured for the project before enabling this workflow.

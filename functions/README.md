# MMDSZ Cloud Functions

The callable functions are the trusted write path for captain registration codes, captain registration review, invitations, invitation redemption, and membership activation. They use server-side transactions and Admin SDK validation; client writes for those workflows are denied by `firestore.rules`.

Build locally with `npm run build` from this directory. The configured runtime is Node.js 22 and functions are assigned to `europe-west1`.

The Expo app now calls these functions for registration, invitations and approvals. The FebruTális / event functions live in a second codebase (`MMDSZApp_Regi/functions`, codebase `events`); both codebases run in `europe-west1`. See `KITELEPITES.md` in the repository root for the deployment steps.

`createInvite` needs `MMDSZ_APP_URL` (or `MMDSZ_INSTALL_URL`) in `functions/.env`; see `functions/.env.example`.

Registration codes and invitations currently expire after 30 days. Codes are stored as SHA-256 hashes and can be redeemed once. Invitation expiration and membership assignment are checked and updated transactionally.

`createInvite` queues email through the Firebase Trigger Email extension's `mail` collection; verify that the extension is configured for the project before enabling this workflow.

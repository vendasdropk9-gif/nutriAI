# Firestore Security Specification - NutriAI

## Data Invariants
1.  Users MUST only access documents within `/users/{userId}/**` where `userId == request.auth.uid`.
2.  Global data (e.g., `/recipes`, `/medicinalHerbs`) MUST be read-only for authenticated users.
3.  System collections (e.g., `/presence`) MUST be authenticated.
4.  All document IDs MUST be strictly validated strings (alphanumeric, underscores, dashes, <= 128 chars).
5.  All write operations MUST validate schema and strict key presence.

## The "Dirty Dozen" Threat Payloads (Draft)
1.  Attempt to write to `/users/{otherUserId}`.
2.  Attempt to read PII from another user's profile.
3.  Attempt to update `createdAt` field on an existing document.
4.  Attempt to create a document with an ID longer than 128 characters.
5.  Attempt to inject a 1MB string into a `name` field.
6.  Attempt to read a document without `request.auth` being present.
7.  Attempt to delete a global recipe document.
8.  Attempt to set an `isAdmin` field in the user's own profile.
9.  Attempt to set `status` to 'finished' on a document already marked as 'finished'.
10. Attempt to create a document with missing mandatory fields.
11. Attempt to write a float into an integer-only field (if applicable).
12. Attempt to update a user's `email_verified` status to `true`.

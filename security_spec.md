# Security Specification - NutriAI

## Data Invariants
1. A user can only access their own profile and logs.
2. Intake, Progress, Workout, and Hydration logs must belong to the authenticated user (`userId` check).
3. Recipes can be public or private.
4. Timestamps must be validated using `request.time`.
5. String lengths must be constrained to prevent resource exhaustion.

## The Dirty Dozen Payloads (Target: Rejection)

1. **Identity Spoofing**: Attempting to set `userId` to a target user's UID when creating an intake log.
   - Payload: `{ "userId": "victim_uid", "recipeName": "Steal Data", "date": "..." }`
2. **Ghost Field Injection**: Adding `isVerified: true` to a profile update.
   - Payload: `{ "name": "Hack", "isVerified": true }`
3. **Privilege Escalation**: Trying to modify `points` directly.
   - Payload: `{ "points": 999999 }`
4. **ID Poisoning**: Using a massive string as a document ID.
   - Action: `CREATE /users/[1.5KB_STRING]`
5. **PII Leak**: Authenticated user trying to read another user's profile.
   - Action: `GET /users/victim_uid`
6. **Orphaned Record**: Creating a recipe referencing a non-existent `authorId`.
   - Payload: `{ "authorId": "non_existent", "name": "Fake" }`
7. **Negative Nutrition**: Setting calories to -500.
   - Payload: `{ "nutrition": { "calories": -500 } }`
8. **Shadow Update**: Updating an intake log's `userId` to transfer it to another account.
   - Payload: `{ "userId": "attacker_uid" }` on an existing log.
9. **Massive Array**: Sending an array of 50,000 `restrictions`.
   - Payload: `{ "restrictions": ["a", "b", ... x 50000] }`
10. **Timestamp Bypass**: Providing a backdated `createdAt` timestamp.
    - Payload: `{ "createdAt": "2020-01-01..." }` (Server expects `request.time`).
11. **Blanket Read Scam**: Querying for ALL user profiles without a UID filter.
    - Action: `LIST /users`
12. **Malicious ID Content**: Using special characters or path separators in a custom ID if the app allows it.
    - Action: `CREATE /users/../malicious/path`

## Test Runner (Conceptual)
All the above payloads MUST result in `PERMISSION_DENIED` when targeting the Firestore rules.

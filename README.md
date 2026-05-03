# Rocca Wallet Sample

This project demonstrates an onboarding flow for a white-label identity solution.

## White-Label Configuration

The application is designed as a white-label solution. You can customize the branding and features by modifying the `extra.provider` section in `app.json`:

```json
{
  "extra": {
    "provider": {
      "name": "Aura",
      "primaryColor": "#3B82F6",
      "secondaryColor": "#E1EFFF",
      "accentColor": "#10B981",
      "welcomeMessage": "Your identity, rewarded."
    }
  }
}
```

These values are consumed by the app via `expo-constants`.

## Screen Flow

The application uses `expo-router` for navigation. The flow is automatically determined by the presence of cryptographic keys:

1. **Index (`/`)**: Initial entry point that redirects to either Onboarding or Landing based on the wallet's initialization state.
2. **Onboarding (`/onboarding`)**: A multi-step flow for new users:
   - **Welcome**: Introduction to the white-label provider.
   - **Generate**: Creation of the 24-word recovery phrase and initial DID keys.
   - **Backup**: Secure display of the recovery phrase for user backup.
   - **Verify**: Verification step to ensure the user has correctly backed up their phrase.
3. **Landing (`/landing`)**: The main dashboard for onboarded users, featuring:
   - Identity (DID) management.

   > [!NOTE]
   > The landing dashboard currently contains placeholder data and UI components as a mock for future implementation.

## Architecture

The application is built on the `@algorandfoundation/wallet-provider` architecture, which uses a modular `Extension` system to augment a `Provider` with specific capabilities.

```typescript
import { Provider } from '@algorandfoundation/wallet-provider';

export class MyProvider extends Provider<typeof MyProvider.EXTENSIONS> {
  static EXTENSIONS = [
    WithKeyStore,
    WithAccountStore,
    // ... other extensions
  ] as const;
}
```

## Extensions

The following extensions are used to provide the wallet's functionality:

### 1. KeyStore Extension (`@algorandfoundation/react-native-keystore`)

- **Purpose**: Securely manage private keys and cryptographic material using device-native security (Keychain/Keystore).
- **Functionality**:
  - `keys`: List of available keys.
  - `key.store.generate(options: GenerateOptions)`: Create new keys (e.g., Ed25519).
  - `key.store.sign(keyId: string, data: Uint8Array)`: Sign transactions or challenges.
  - `key.store.exportPublicKey(keyId: string)`: Retrieve public keys.

### 2. AccountStore Extension (`@/extensions/accounts`)

- **Purpose**: Manages a list of user accounts and their metadata.
- **Functionality**:
  - `accounts`: List of available accounts.
  - `account.store.addAccount(account: Account)`: Register a new account.
  - `account.store.getAccount(address: string)`: Retrieve an account by address.
  - `account.store.removeAccount(address: string)`: Remove an account.
  - `account.store.clear()`: Remove all accounts.

### 3. AccountsKeystore Extension (`@/extensions/accounts-keystore`)

- **Purpose**: Bridges the AccountStore and KeyStore.
- **Functionality**:
  - Automatically populates the AccountStore when keys are added to the KeyStore.
  - Provides a `sign` method on account objects that leverages the KeyStore backend.

### 4. LogStore Extension (`@algorandfoundation/log-store`)

- **Purpose**: Provides a centralized store for application logs and events.
- **Functionality**:
  - `logs`: List of application logs.
  - `log.info(message: string)`: Add an information log entry.
  - `log.warn(message: string)`: Add a warning log entry.
  - `log.error(message: string)`: Add an error log entry.
  - `log.clear()`: Remove all log entries.

## Suggested Extensions (New)

To further integrate with identity primitives, the following extensions are suggested:

### 1. DID Extension

- **Purpose**: Handle Decentralized Identifier operations.
- **Functionality**:
  - `createDID(publicKey: string)`: Generate a DID string (e.g., `did:key:z...`).
  - `resolveDID(did: string)`: Fetch the DID Document associated with an identifier.

### 2. Provider Extension

- **Purpose**: Interface with the centralized "Provider" for rewards and fee delegation.
- **Functionality**:
  - `getRewards(account: string)`: Fetch pending rewards for the user.
  - `requestFeeDelegation(transaction: Transaction)`: Submit a transaction to the provider for co-signing/fee payment.
  - `onboard(did: string)`: Register the new DID with the provider's white-label system.

## Key Architecture

> Where "account", "DID", and "identity public key" come from in Rocca, and how they relate.

### Onboarding generates four keys

The verify-success step of the onboarding wizard ([`app/onboarding.tsx`](app/onboarding.tsx), the `VERIFY_SUCCESS` branch) makes four `key.store.*` calls in this order:

```ts
// 1. Import the BIP-39 seed bytes (raw, derive-only).
const seedId = await key.store.import({
  type: 'hd-seed',
  algorithm: 'raw',
  extractable: true,
  keyUsages: ['deriveKey', 'deriveBits'],
  privateKey: await mnemonicToSeed(recoveryPhrase.join(' ')),
}, 'bytes');

// 2. Derive HD root key from the seed (raw, derive-only). Used by the
//    passkey autofill activity via setHdRootKeyId so any future passkey
//    is HD-derived from this same root.
const rootKeyId = await key.store.generate({
  type: 'hd-root-key',
  algorithm: 'raw',
  extractable: true,
  keyUsages: ['deriveKey', 'deriveBits'],
  params: { parentKeyId: seedId },
});
await ReactNativePasskeyAutofill.setHdRootKeyId(rootKeyId);

// 3. Account Ed25519 — what signs transactions. context=0.
await key.store.generate({
  type: 'hd-derived-ed25519',
  algorithm: 'EdDSA',
  extractable: true,
  keyUsages: ['sign', 'verify'],
  params: { parentKeyId: rootKeyId, context: 0, account: 0, index: 0, derivation: 9 },
});

// 4. Identity Ed25519 — what signs DID-bound things. context=1.
await key.store.generate({
  type: 'hd-derived-ed25519',
  algorithm: 'EdDSA',
  extractable: true,
  keyUsages: ['sign', 'verify'],
  params: { parentKeyId: rootKeyId, context: 1, account: 0, index: 0, derivation: 9 },
});
```

The five fields in `params` carry the load:

| Field | Role |
|---|---|
| `parentKeyId` | Which HD root to derive from. |
| `context` | **Domain separator.** `0` = account / spending; `1` = identity / DID-signing. Same root, different domain → cryptographically independent keys. |
| `account`, `index` | BIP44-style positional indices. Currently `0` / `0` for both keys (only one account and one identity at onboarding). |
| `derivation: 9` | Selects BIP32-Ed25519 / [ARC-52](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0052.md) derivation in the keystore. |

So onboarding doesn't *create* accounts or identities — it creates **keys**. Two extensions watch the keystore and react:

| Extension | Trigger | Side effect |
|---|---|---|
| `WithAccountsKeystore` | new key with `type === 'hd-derived-ed25519'` AND `metadata.context === 0` | auto-creates an Account with `address = base64(publicKey)` |
| `WithIdentitiesKeystore` | new key with `type === 'hd-derived-ed25519'` AND `metadata.context === 1` | auto-creates an Identity with `did = generateDidKey(publicKey)` |

This is why `account.balance` is hardcoded `BigInt(0)` at creation — the bridge extension only knows about keys, not chain state. Real balance comes later when wallet plumbing lands.

### Account ↔ DID ↔ Identity public key ↔ Passkeys

Four user-visible artifacts, all live, all derived from the **same HD root**:

```
24-word mnemonic
       │
       ▼
   HD seed ──► HD root ──┬──► [context=0] Ed25519 keypair  ←─ ACCOUNT key
                         │           │
                         │           Surfaces as:
                         │             • account.address    = base64(pubkey)
                         │             • Algorand address   = encodeAddress(pubkey)  (base32 form)
                         │             • signs transactions
                         │
                         ├──► [context=1] Ed25519 keypair  ←─ IDENTITY key
                         │           │
                         │           Surfaces as:
                         │             • identity.address  = generateDidKey(pubkey)
                         │             • identity.did      = same value (did:key:z…)
                         │             • signs DID assertions, AC2 SigningRequests
                         │               on key_type="identity", VCs (AP2 mandate, etc.)
                         │
                         └──► [via passkey autofill activity, on demand]
                                  P-256 keypair per service ←─ PASSKEY
                                            │
                                            Surfaces as:
                                              • one row per service in Passkeys list
                                              • passkey.publicKey = derived P-256 pubkey
                                              • passkey.metadata.userHandle = Algorand
                                                address bound to the credential (Liquid
                                                Auth extension)
                                              • signs WebAuthn assertion challenges
                                                during FIDO2 authentication flows
```

Concretely:

- [`extensions/accounts-keystore/extension.ts:110`](extensions/accounts-keystore/extension.ts) — `address = base64.encode(k.publicKey)`
- [`extensions/identities-keystore/extension.ts:160`](extensions/identities-keystore/extension.ts) — `did = generateDidKey(k.publicKey)`
- Passkeys: created on demand by `@algorandfoundation/react-native-passkey-autofill` when a service requests `navigator.credentials.create(…)`. The autofill activity derives the P-256 keypair from the HD root via `setHdRootKeyId(rootKeyId)` set during onboarding, so passkeys are deterministically recoverable from the same 24-word mnemonic.

**Account and identity keys share a parent (HD root) but are cryptographically independent** because of the `context` domain separator at derivation time. A signature from the account key is unrelated to a signature from the identity key — you cannot derive one from the other after creation. That's why the AC2 spec's `key_type: "account" | "identity"` field on `SigningRequest` is meaningful — when an agent asks Rocca to sign, the wallet picks the correct key based on `key_type`. Passkeys form a third, parallel domain: they're P-256 (FIDO2 standard, NOT Ed25519) and one is created per service the user authenticates with, all HD-derived from the same root.

### What's NOT currently visible

- Account doesn't show its own DID (it would be `did:key:z…(of context-0 pubkey)`, distinct from the identity's DID). Accounts intentionally project to chain identity (Algorand address), not DID identity.
- Identity doesn't show an Algorand address (it would be a different one than the account's). It projects to DID identity, not chain identity.
- Account, identity, and passkeys share a derivation path — could conceptually be displayed as "Account #0 / Identity #0 / Passkey-for-X" all under one HD-tree view — but Rocca treats them as separate UI entities (Accounts list, Identities list, Passkeys list).
- Passkeys' bound Algorand address (via the Liquid Auth WebAuthn extension's `userHandle`) isn't shown alongside the credential ID by default; surfaces only on the passkey-details screen.

### Recovery

The 24-word mnemonic regenerates seed → root → all derived keys deterministically. One backup phrase recovers:

- The Ed25519 **account** key (signs transactions).
- The Ed25519 **identity** key (signs DID-bound things, VCs).
- Every **passkey** ever created on the device (P-256 keypairs HD-derived per-service).

The HD root being the single recovery anchor for all three families is why `setHdRootKeyId(rootKeyId)` is called during onboarding — it tells the autofill activity which root to derive future passkeys from.

## Getting Started

> [!IMPORTANT]
> When this Rocca is checked out as a submodule of the [ac2-sdk](https://github.com/GoPlausible/ac2-sdk) repo, **build it from the parent repo, not from here.** The parent repo owns the orchestration scripts and resolves the AC2 SDK / Liquid Auth deps for you.
>
> From `ac2-sdk/` root:
>
> ```bash
> npm run rocca:install      # install Rocca's deps
> npm run rocca:prebuild     # regenerates android/ + writes android/local.properties
> npm run rocca:build:apk    # release APK
> ```
>
> See the [parent README's "Building Rocca" section](../../README.md#building-rocca-android-apk) for the full lifecycle (clean / incremental / full-reset flows + the `local.properties` story).

### Standalone (clone of just this repo)

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app on Android

> [!IMPORTANT]
> This project contains native dependencies (like `react-native-quick-crypto` and `@algorandfoundation/react-native-keystore`) that require running on a physical Android device. It may not function correctly on an emulator.
>
> Ensure you have your Android device connected and authorized via ADB, then run:
>
> ```bash
> npm run android
> ```
>
> If gradle complains *"SDK location not found"*, create `android/local.properties` with one line:
>
> ```
> sdk.dir=/path/to/your/Android/sdk
> ```
>
> (Default on macOS: `$HOME/Library/Android/sdk`.) The file is gitignored and gets wiped on every `expo prebuild --clean`.

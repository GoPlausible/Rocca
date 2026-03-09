import { Stack } from "expo-router";
import { install } from 'react-native-quick-crypto'
import { keyStore } from '@/stores/keystore'
import { keyStoreHooks } from '@/stores/before-after'
import { fetchSecret, getMasterKey, storage } from '@algorandfoundation/react-native-keystore'
import { initializeKeyStore, Key, KeyData, KeyStoreState, setStatus } from '@algorandfoundation/keystore'
import { Store } from '@tanstack/store'
import { accountsStore } from '@/stores/accounts'
import { ReactNativeProvider, WalletProvider } from '@/providers/ReactNativeProvider'
import {identitiesStore} from "@/stores/identities";
import { passkeysStore } from '@/stores/passkeys'
import {registerGlobals} from "react-native-webrtc";
import { globalPolyfill, setupNavigatorPolyfill } from "@/lib/polyfill";

globalPolyfill()
registerGlobals()
install()


const provider = new ReactNativeProvider(
    {
      id: 'react-native-wallet',
      name: 'React Native Wallet',
    },
    {
      logs: true,
      accounts: {
        store: accountsStore,
        keystore: {
          autoPopulate: true,
        },
      },
      identities: {
        store: identitiesStore,
        keystore: {
          autoPopulate: true,
        }
      },
      passkeys: {
        store: passkeysStore,
        keystore: {
          autoPopulate: true,
        }
      },
      keystore: {
        store: keyStore,
        hooks: keyStoreHooks,
      },
    }
)

setupNavigatorPolyfill(provider)

async function bootstrap() {
  setStatus({ store: keyStore as unknown as Store<KeyStoreState>, status: 'loading' })
  const secrets = await Promise.all(
    storage.getAllKeys().map(async (keyId) => fetchSecret<KeyData>({ keyId, masterKey: await getMasterKey() }))
  )
  const keys = secrets.filter((k) => k !== null).map(({ privateKey, ...rest }: KeyData) => rest) as Key[]
  initializeKeyStore({
    store: keyStore as unknown as Store<KeyStoreState>,
    keys,
  })
  if (keys.length > 0) {
    setStatus({ store: keyStore as unknown as Store<KeyStoreState>, status: 'ready' })
  } else {
    setStatus({ store: keyStore as unknown as Store<KeyStoreState>, status: 'idle' })
  }
}
bootstrap()

export default function RootLayout() {
  return (
    <WalletProvider
      provider={provider}
    >
      <Stack />
    </WalletProvider>
  )
}

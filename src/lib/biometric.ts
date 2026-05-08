export const isBiometricAvailable = async () => {
  if (window.PublicKeyCredential) {
    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
      return false;
    }
  }
  return false;
};

// Generates a random buffer
const generateRandomBuffer = (length = 32) => {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return array;
};

// Base64Url encode/decode for localStorage
const bufferToBase64Url = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const base64UrlToBuffer = (base64Url: string) => {
  const padding = '='.repeat((4 - base64Url.length % 4) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    buffer[i] = rawData.charCodeAt(i);
  }
  return buffer.buffer;
};

export const registerBiometric = async (userEmail: string): Promise<boolean> => {
  try {
    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge: generateRandomBuffer(),
      rp: {
        name: "NutriAI",
      },
      user: {
        id: generateRandomBuffer(16),
        name: userEmail,
        displayName: userEmail,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform", // Request local biometric
        userVerification: "required",
      },
      timeout: 60000,
    };

    const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential;
    if (credential) {
      localStorage.setItem('nutri-biometric-id', bufferToBase64Url(credential.rawId));
      localStorage.setItem('nutri-biometric-enabled', 'true');
      return true;
    }
    return false;
  } catch (error) {
    console.error("Biometric registration failed:", error);
    return false;
  }
};

export const verifyBiometric = async (): Promise<boolean> => {
  try {
    const credentialIdStr = localStorage.getItem('nutri-biometric-id');
    if (!credentialIdStr) return false;

    const credentialId = base64UrlToBuffer(credentialIdStr);

    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge: generateRandomBuffer(),
      allowCredentials: [
        {
          type: "public-key",
          id: credentialId,
        }
      ],
      userVerification: "required",
      timeout: 60000,
    };

    const assertion = await navigator.credentials.get({ publicKey });
    return !!assertion;
  } catch (error) {
    console.error("Biometric verification failed:", error);
    return false;
  }
};

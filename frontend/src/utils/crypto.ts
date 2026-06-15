export function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToArrayBuffer(base64: string) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export const generateKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const exportedPublicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const exportedPrivateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  return {
    publicKey: arrayBufferToBase64(exportedPublicKey),
    privateKey: arrayBufferToBase64(exportedPrivateKey),
  };
};

export const importPublicKey = async (pem: string) => {
  const binaryDer = base64ToArrayBuffer(pem);
  return await window.crypto.subtle.importKey(
    "spki",
    binaryDer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
};

export const importPrivateKey = async (pem: string) => {
  const binaryDer = base64ToArrayBuffer(pem);
  return await window.crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
};

export const generateAESKey = async () => {
  return await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

export const exportAESKey = async (key: CryptoKey) => {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(exported);
};

export const importAESKey = async (base64Key: string) => {
  const raw = base64ToArrayBuffer(base64Key);
  return await window.crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
};

export const encryptAES = async (message: string, key: CryptoKey) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(message);
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  return {
    iv: arrayBufferToBase64(iv.buffer),
    ciphertext: arrayBufferToBase64(ciphertext)
  };
};

export const decryptAES = async (ivBase64: string, ciphertextBase64: string, key: CryptoKey) => {
  const iv = base64ToArrayBuffer(ivBase64);
  const ciphertext = base64ToArrayBuffer(ciphertextBase64);
  
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
};

export const encryptRSA = async (data: string, publicKeyPem: string) => {
  const publicKey = await importPublicKey(publicKeyPem);
  const encoded = new TextEncoder().encode(data);
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    encoded
  );
  return arrayBufferToBase64(ciphertext);
};

export const decryptRSA = async (encryptedBase64: string, privateKeyPem: string) => {
  const privateKey = await importPrivateKey(privateKeyPem);
  const ciphertext = base64ToArrayBuffer(encryptedBase64);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
};

// High-level E2EE utility
export const encryptMessageForParticipants = async (message: string, publicKeys: string[]) => {
  const aesKey = await generateAESKey();
  const { iv, ciphertext } = await encryptAES(message, aesKey);
  const aesKeyBase64 = await exportAESKey(aesKey);

  const encryptedKeys: Record<string, string> = {};
  for (const pubKey of publicKeys) {
    if (pubKey) {
      encryptedKeys[pubKey] = await encryptRSA(aesKeyBase64, pubKey);
    }
  }

  return JSON.stringify({
    v: 1, // version
    iv,
    ciphertext,
    keys: encryptedKeys // { publicKey: encryptedAesKey }
  });
};

export const decryptMessageWithPrivateKey = async (payloadString: string, myPublicKey: string, myPrivateKey: string) => {
  try {
    const payload = JSON.parse(payloadString);
    if (payload.v !== 1) return payloadString; // not encrypted or unknown version
    
    const encryptedAesKey = payload.keys[myPublicKey];
    if (!encryptedAesKey) return "[Message not encrypted for this device]";

    const aesKeyBase64 = await decryptRSA(encryptedAesKey, myPrivateKey);
    const aesKey = await importAESKey(aesKeyBase64);

    return await decryptAES(payload.iv, payload.ciphertext, aesKey);
  } catch (err) {
    console.error("Decryption failed", err);
    return payloadString; // fallback to showing raw
  }
};

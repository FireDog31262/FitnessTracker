import { Injectable, inject } from '@angular/core';
import { Auth, signInWithCustomToken } from '@angular/fire/auth';
import { Firestore, doc, setDoc, collection, getDocs, query, where } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { from, Observable, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class BiometricService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  // private functions = inject(Functions); // Uncomment when functions are set up

  // Helper to convert ArrayBuffer to Base64URL
  private bufferToBase64URL(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let string = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      string += String.fromCharCode(bytes[i]);
    }
    return btoa(string).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  // Helper to convert Base64URL to Uint8Array
  private base64URLToBuffer(base64URL: string): Uint8Array {
    const base64 = base64URL.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (base64.length % 4)) % 4;
    const padded = base64.padEnd(base64.length + padLen, '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  async registerBiometric(): Promise<void> {
    console.log('Starting biometric registration...');
    const user = this.auth.currentUser;
    if (!user) throw new Error('User must be logged in to register biometrics.');

    // Check for IP address usage which often fails with WebAuthn
    if (window.location.hostname !== 'localhost' && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(window.location.hostname)) {
      console.warn('WebAuthn may fail when using an IP address. Please use localhost or a valid domain with HTTPS.');
    }

    // 1. Create Challenge
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    // 2. Create Credential Options
    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'Fitness Tracker',
        id: window.location.hostname
      },
      user: {
        id: this.base64URLToBuffer(btoa(user.uid)) as any, // Encode UID as buffer
        name: user.email || user.uid,
        displayName: user.displayName || 'User'
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // TouchID, FaceID, Windows Hello
        userVerification: 'required',
        residentKey: 'required' // Discoverable credential
      },
      timeout: 60000,
      attestation: 'none'
    };

    // 3. Create Credential
    const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential;

    if (!credential) throw new Error('Failed to create credential');

    const response = credential.response as AuthenticatorAttestationResponse;

    // 4. Save Public Key to Firestore
    // In a real app, you send the attestation object to the server to verify and store.
    // Here we store the ID and rawId for lookup.
    const credentialData = {
      credentialId: this.bufferToBase64URL(credential.rawId),
      userId: user.uid,
      created: new Date(),
      // We would normally store the publicKey here after parsing attestationObject on server
      // For this demo, we just mark it as registered.
      platform: 'web'
    };

    await setDoc(doc(this.firestore, `users/${user.uid}/credentials/${credentialData.credentialId}`), credentialData);
  }

  async loginWithBiometric(): Promise<void> {
    console.log('Starting biometric login...');
    // 1. Create Challenge
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    // 2. Request Credential (Discoverable)
    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge,
      timeout: 60000,
      userVerification: 'required',
      rpId: window.location.hostname
      // No allowCredentials means we ask for any discoverable credential for this RP
    };

    try {
      const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential;
      if (!credential) throw new Error('No credential received');

      // 3. Verify & Sign In
      // The credential.response.userHandle contains the user ID we stored during registration
      const response = credential.response as AuthenticatorAssertionResponse;
      const userHandle = response.userHandle;
      if (!userHandle) throw new Error('No user handle returned. Is this a discoverable credential?');

      // Decode UID
      const decoder = new TextDecoder();
      // We encoded it as btoa(uid) -> buffer. So decode buffer -> atob -> uid.
      // Actually, let's just use the raw bytes if we can, but we need to match how we stored it.
      // In register: id: this.base64URLToBuffer(btoa(user.uid))
      // So here:
      const uidEncoded = String.fromCharCode(...new Uint8Array(userHandle));
      const uid = atob(uidEncoded);

      console.log('Biometric identified user:', uid);

      // 4. Call Backend to Verify & Mint Token
      // const verifyFn = httpsCallable(this.functions, 'verifyBiometricLogin');
      // const result = await verifyFn({
      //   credentialId: credential.id,
      //   authenticatorData: this.bufferToBase64URL((credential.response as AuthenticatorAssertionResponse).authenticatorData),
      //   clientDataJSON: this.bufferToBase64URL(credential.response.clientDataJSON),
      //   signature: this.bufferToBase64URL((credential.response as AuthenticatorAssertionResponse).signature),
      //   userHandle: uid
      // });

      // if (result.data.token) {
      //   await signInWithCustomToken(this.auth, result.data.token);
      // }

      // MOCK IMPLEMENTATION FOR DEMO (Since no backend)
      alert(`Biometric success! Identified User ID: ${uid}.\n\nTo complete login, a Cloud Function is required to verify the signature and mint a custom token.`);

    } catch (error) {
      console.error('Biometric login failed', error);
      throw error;
    }
  }

  async isBiometricAvailable(): Promise<boolean> {
    if (!window.PublicKeyCredential) {
      console.warn('WebAuthn is not supported in this browser.');
      return false;
    }

    // WebAuthn requires a secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
      console.warn('WebAuthn requires a secure context (HTTPS or localhost).');
      return false;
    }

    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        console.warn('No platform authenticator available. Ensure you have a screen lock (PIN/Pattern/Biometric) set up. If using an Emulator, enable biometric support.');
      }
      return available;
    } catch (e) {
      console.error('Error checking biometric availability:', e);
      return false;
    }
  }
}

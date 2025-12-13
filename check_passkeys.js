
try {
    const auth = require('firebase/auth');
    console.log('Checking firebase/auth exports...');
    console.log('WebAuthnAuthProvider:', auth.WebAuthnAuthProvider);

    // Check keys to see if there is anything similar
    const keys = Object.keys(auth);
    const passkeyRelated = keys.filter(k => k.toLowerCase().includes('webauthn') || k.toLowerCase().includes('passkey'));
    console.log('Related exports:', passkeyRelated);
} catch (e) {
    console.error('Error:', e.message);
}

/**
 * Caesar Cipher implementation with fixed shift of 4
 * Encrypts and decrypts text by shifting characters
 */

const SHIFT_KEY = 4; // Fixed key as requested

/**
 * Encrypt text using Caesar cipher with shift of 4
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted text
 */
export function encryptCaesar(text) {
  if (!text) return text;
  
  return text.split('').map(char => {
    const code = char.charCodeAt(0);
    
    // Uppercase letters (A-Z)
    if (code >= 65 && code <= 90) {
      return String.fromCharCode(((code - 65 + SHIFT_KEY) % 26) + 65);
    }
    // Lowercase letters (a-z)
    else if (code >= 97 && code <= 122) {
      return String.fromCharCode(((code - 97 + SHIFT_KEY) % 26) + 97);
    }
    // Numbers (0-9)
    else if (code >= 48 && code <= 57) {
      return String.fromCharCode(((code - 48 + SHIFT_KEY) % 10) + 48);
    }
    // Leave other characters unchanged
    else {
      return char;
    }
  }).join('');
}

/**
 * Decrypt text using Caesar cipher with shift of 4
 * @param {string} text - Encrypted text to decrypt
 * @returns {string} - Decrypted text
 */
export function decryptCaesar(text) {
  if (!text) return text;
  
  return text.split('').map(char => {
    const code = char.charCodeAt(0);
    
    // Uppercase letters (A-Z)
    if (code >= 65 && code <= 90) {
      return String.fromCharCode(((code - 65 - SHIFT_KEY + 26) % 26) + 65);
    }
    // Lowercase letters (a-z)
    else if (code >= 97 && code <= 122) {
      return String.fromCharCode(((code - 97 - SHIFT_KEY + 26) % 26) + 97);
    }
    // Numbers (0-9)
    else if (code >= 48 && code <= 57) {
      return String.fromCharCode(((code - 48 - SHIFT_KEY + 10) % 10) + 48);
    }
    // Leave other characters unchanged
    else {
      return char;
    }
  }).join('');
}

/**
 * Get the encryption key being used
 * @returns {number} - The shift key (always 4)
 */
export function getEncryptionKey() {
  return SHIFT_KEY;
}

// Test the cipher
console.log("🔐 Caesar Cipher initialized with key:", SHIFT_KEY);
console.log("📝 Test encryption: 'Hello' ->", encryptCaesar('Hello'));
console.log("🔓 Test decryption:", decryptCaesar(encryptCaesar('Hello')));

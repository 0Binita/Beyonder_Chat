const SHIFT_KEY = 4;

export function encryptCaesar(text) {
  if (!text) return text;
  
  return text.split('').map(char => {
    const code = char.charCodeAt(0);
    
    if (code >= 65 && code <= 90) {
      return String.fromCharCode(((code - 65 + SHIFT_KEY) % 26) + 65);
    }
    else if (code >= 97 && code <= 122) {
      return String.fromCharCode(((code - 97 + SHIFT_KEY) % 26) + 97);
    }
    else if (code >= 48 && code <= 57) {
      return String.fromCharCode(((code - 48 + SHIFT_KEY) % 10) + 48);
    }
    else {
      return char;
    }
  }).join('');
}

export function decryptCaesar(text) {
  if (!text) return text;
  
  return text.split('').map(char => {
    const code = char.charCodeAt(0);
    
    if (code >= 65 && code <= 90) {
      return String.fromCharCode(((code - 65 - SHIFT_KEY + 26) % 26) + 65);
    }
    else if (code >= 97 && code <= 122) {
      return String.fromCharCode(((code - 97 - SHIFT_KEY + 26) % 26) + 97);
    }
    else if (code >= 48 && code <= 57) {
      return String.fromCharCode(((code - 48 - SHIFT_KEY + 10) % 10) + 48);
    }
    else {
      return char;
    }
  }).join('');
}

export const CAESAR_KEY = SHIFT_KEY;

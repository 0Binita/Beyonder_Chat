import crypto from "crypto";

class E2EEncryption {
  constructor() {
    this.algorithm = {
      rsa: {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      },
      aes: "aes-256-gcm",
    };
  }

  // ✅ Generate RSA key pair for encryption
  generateKeyPair() {
    try {
      console.log("🔑 Generating RSA key pair...");
      
      const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: this.algorithm.rsa.modulusLength,
        publicKeyEncoding: this.algorithm.rsa.publicKeyEncoding,
        privateKeyEncoding: this.algorithm.rsa.privateKeyEncoding,
      });

      const keyId = `key_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;

      console.log("✅ RSA key pair generated successfully");
      console.log(`🔑 Key ID: ${keyId}`);

      return {
        publicKey,
        privateKey,
        keyId,
      };
    } catch (error) {
      console.error("❌ Error generating key pair:", error);
      throw new Error(`Key pair generation failed: ${error.message}`);
    }
  }

  // ✅ Encrypt message with AES
  encryptMessageWithAES(message, aesKey) {
    try {
      const messageString = JSON.stringify(message);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm.aes, aesKey, iv);
      
      let encrypted = cipher.update(messageString, "utf8", "hex");
      encrypted += cipher.final("hex");
      
      const authTag = cipher.getAuthTag();

      return {
        encryptedData: encrypted,
        iv: iv.toString("hex"),
        authTag: authTag.toString("hex"),
        algorithm: this.algorithm.aes,
      };
    } catch (error) {
      console.error("❌ AES encryption error:", error);
      throw new Error(`AES encryption failed: ${error.message}`);
    }
  }

  // ✅ Decrypt message with AES
  decryptMessageWithAES(encryptedMessage, aesKey) {
    try {
      const { encryptedData, iv, authTag, algorithm } = encryptedMessage;

      const decipher = crypto.createDecipheriv(
        algorithm || this.algorithm.aes,
        aesKey,
        Buffer.from(iv, "hex")
      );
      
      if (authTag) {
        decipher.setAuthTag(Buffer.from(authTag, "hex"));
      }

      let decrypted = decipher.update(encryptedData, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return JSON.parse(decrypted);
    } catch (error) {
      console.error("❌ AES decryption error:", error);
      throw new Error(`AES decryption failed: ${error.message}`);
    }
  }

  // ✅ Encrypt message (hybrid RSA + AES)
  async encryptMessage(message, recipientPublicKey, keyId) {
    try {
      const aesKey = crypto.randomBytes(32);
      const encryptedMessage = this.encryptMessageWithAES(message, aesKey);
      
      const encryptedKey = crypto.publicEncrypt(
        {
          key: recipientPublicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        },
        aesKey
      );

      return {
        encryptedMessage,
        encryptedKey: encryptedKey.toString("base64"),
        keyId,
        algorithm: "hybrid-rsa-aes",
      };
    } catch (error) {
      console.error("❌ Message encryption error:", error);
      throw new Error(`Message encryption failed: ${error.message}`);
    }
  }

  // ✅ Decrypt message (hybrid RSA + AES)
  async decryptMessage(encryptedData, recipientPrivateKey) {
    try {
      const aesKey = crypto.privateDecrypt(
        {
          key: recipientPrivateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        },
        Buffer.from(encryptedData.encryptedKey, "base64")
      );

      return this.decryptMessageWithAES(encryptedData.encryptedMessage, aesKey);
    } catch (error) {
      console.error("❌ Message decryption error:", error);
      throw new Error(`Message decryption failed: ${error.message}`);
    }
  }
}

// ✅ Export a single instance
const e2eEncryption = new E2EEncryption();
export default e2eEncryption;
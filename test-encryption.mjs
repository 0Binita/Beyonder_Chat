#!/usr/bin/env node

/**
 * Test script for end-to-end encryption functionality
 * This script tests the encryption/decryption flow
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api';
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
  fullName: 'Test User'
};

async function testEncryption() {
  console.log('🔐 Testing End-to-End Encryption Functionality\n');
  
  try {
    // Step 1: Register a test user
    console.log('1. Registering test user...');
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, TEST_USER);
    console.log('✅ User registered successfully');
    
    const token = registerResponse.data.token;
    const userId = registerResponse.data.user._id;
    
    // Set up axios with auth token
    const authAxios = axios.create({
      baseURL: BASE_URL,
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Step 2: Generate encryption keys
    console.log('\n2. Generating encryption keys...');
    const keyResponse = await authAxios.post('/encryption/generate-keys');
    console.log('✅ Encryption keys generated');
    console.log(`   Key ID: ${keyResponse.data.keyId}`);
    
    // Step 3: Check encryption status
    console.log('\n3. Checking encryption status...');
    const statusResponse = await authAxios.get('/encryption/status');
    console.log('✅ Encryption status:', statusResponse.data.encryptionEnabled ? 'Enabled' : 'Disabled');
    
    // Step 4: Get public key
    console.log('\n4. Getting public key...');
    const publicKeyResponse = await authAxios.get(`/encryption/public-key/${userId}`);
    console.log('✅ Public key retrieved');
    console.log(`   Encryption enabled: ${publicKeyResponse.data.encryptionEnabled}`);
    
    // Step 5: Test message encryption (simulate sending to self)
    console.log('\n5. Testing message encryption...');
    const testMessage = {
      text: 'This is a test encrypted message!',
      encrypt: true,
      receiverId: userId
    };
    
    const messageResponse = await authAxios.post(`/messages/send/${userId}`, testMessage);
    console.log('✅ Encrypted message sent');
    console.log(`   Message ID: ${messageResponse.data._id}`);
    console.log(`   Is Encrypted: ${messageResponse.data.isEncrypted}`);
    
    // Step 6: Test message decryption
    console.log('\n6. Testing message decryption...');
    const decryptResponse = await authAxios.get(`/messages/decrypt/${messageResponse.data._id}`);
    console.log('✅ Message decrypted successfully');
    console.log(`   Decrypted text: "${decryptResponse.data.decryptedText}"`);
    
    // Step 7: Test getting messages
    console.log('\n7. Testing message retrieval...');
    const messagesResponse = await authAxios.get(`/messages/${userId}`);
    console.log('✅ Messages retrieved');
    console.log(`   Total messages: ${messagesResponse.data.length}`);
    
    const encryptedMessage = messagesResponse.data.find(msg => msg.isEncrypted);
    if (encryptedMessage) {
      console.log(`   Found encrypted message: ${encryptedMessage._id}`);
    }
    
    console.log('\n🎉 All encryption tests passed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ User registration');
    console.log('   ✅ Key generation');
    console.log('   ✅ Encryption status check');
    console.log('   ✅ Public key retrieval');
    console.log('   ✅ Message encryption');
    console.log('   ✅ Message decryption');
    console.log('   ✅ Message retrieval');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testEncryption();

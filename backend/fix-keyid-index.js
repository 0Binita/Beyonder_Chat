import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixKeyIdIndex() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Check existing indexes
    console.log('\n📊 Current indexes on users collection:');
    const indexes = await db.collection('users').indexes();
    console.log(indexes);
    
    // Drop the keyId_1 index if it exists
    try {
      console.log('\n🗑️ Attempting to drop keyId_1 index...');
      await db.collection('users').dropIndex('keyId_1');
      console.log('✅ Successfully dropped keyId_1 index');
    } catch (error) {
      if (error.code === 27 || error.codeName === 'IndexNotFound') {
        console.log('ℹ️ Index keyId_1 does not exist (already removed)');
      } else {
        throw error;
      }
    }
    
    // Verify the index is gone
    console.log('\n📊 Updated indexes on users collection:');
    const updatedIndexes = await db.collection('users').indexes();
    console.log(updatedIndexes);
    
    console.log('\n✅ Index fix completed successfully!');
    console.log('✅ You can now create new users without the duplicate key error');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing index:', error);
    process.exit(1);
  }
}

fixKeyIdIndex();

const { MongoClient } = require('mongodb');

async function checkMongoDB() {
    try {
        const client = await MongoClient.connect('mongodb://localhost:27017', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000 // 5 second timeout
        });
        
        console.log('✓ MongoDB is running');
        await client.close();
        return true;
    } catch (err) {
        console.error('✗ MongoDB is not running');
        console.error('Error details:', err.message);
        console.log('\nPlease make sure MongoDB is installed and running:');
        console.log('1. Install MongoDB: https://www.mongodb.com/try/download/community');
        console.log('2. Start MongoDB service:');
        console.log('   - Windows: Open Services app and start MongoDB');
        console.log('   - macOS: brew services start mongodb-community');
        console.log('   - Linux: sudo systemctl start mongod');
        return false;
    }
}

checkMongoDB(); 
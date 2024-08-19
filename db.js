import { MongoClient } from 'mongodb'
import 'dotenv/config';

let dbConnection


//local service for Mongo DB
// let uri = 'mongodb://localhost:27017/patientsstore'
let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_db';

export const connectToDb = async (callback) => {
    try {
        const client = await MongoClient.connect(uri); // No need for useNewUrlParser or useUnifiedTopology
        dbConnection = client.db();
        console.log('Connected to MongoDB');
        callback();
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
        return callback(err);
    }
}

// Function to get the database connection
export const getDb = () => {
    if (!dbConnection) {
        throw new Error('Database connection is not established yet');
    }
    return dbConnection;
};
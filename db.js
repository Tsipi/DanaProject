const { MongoClient } = require('mongodb')

let dbConnection




//local service for Mongo DB
// let uri = 'mongodb://localhost:27017/patientsstore'
let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_db';

module.exports = {
    connectToDb: (callBack) => {
        MongoClient.connect(uri)
            .then((client)=>{
                dbConnection = client.db()
                console.log('Connected to MongoDB')                
                return callBack()
            })
            .catch(err=>{
                console.error('Failed to connect to MongoDB:', err)
                return callBack(err)
            })
    },
    getDb: () => {
        if (!dbConnection) {
            throw new Error('Database connection is not established yet')
        }
        return dbConnection
    }
}
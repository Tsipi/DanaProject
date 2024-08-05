const { MongoClient } = require('mongodb')

let dbConnection

//Mongo Atlas - WEB-Service-DB
// let uri = 'mongodb+srv://DanaGi:LIrVmu6wF2UmBMUa@cluster0.mdt0yqz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'

//local service for Mongo DB
let uri = 'mongodb://localhost:27017/patientsstore'

module.exports = {
    connectToDb: (callBack) => {
        MongoClient.connect(uri)
            .then((client)=>{
                dbConnection = client.db()
                return callBack()
            })
            .catch(err=>{
                console.log(err)
                return callBack(err)
            })
    },
    getDb: () => dbConnection
}
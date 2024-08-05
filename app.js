const express = require('express')
const { connectToDb, getDb } = require('./db')
const { ObjectId } = require('mongodb')

//init app & middleware
const app = express()

//register to view engine
app.set('view engine', 'ejs')
// app.set('views','myViews') //for different name folder


//db connection
let db

//listen to requests
connectToDb((err) => {
    if(!err){
        app.listen(3000, () => {
            console.log("app listening on port 3000")
        })
        db = getDb()
    }
})


//routes
app.get('/', (req,res) => {
   res.render('index')
})


app.get('/patients', (req,res) => {
    let patients = []

    db.collection('patients')
        .find() //cursor toArray, forEach
        .forEach(patient => patients.push(patient)) //async
        .then (()=>{
            res.render('patients',{patients: patients}) //res.status(200).json(patients)
        })
        .catch((err)=>{
            res.status(500).json({error: "Could not fetch the documents/data"})
        })
   
   //To show the specific page - if only want to show the data - remove this line
  
})

app.get('/patients/create', (req,res) => {
    res.render('create')
 })

app.get('/patients/:id', (req, res) => {
    if(ObjectId.isValid(req.params.id)) {
        db.collection('patients')
        .findOne({_id: ObjectId(req.params.id)})         
        .then ((doc)=>{
            res.status(200).json(doc)
        })
        .catch((err)=>{
            res.status(500).json({error: "Could not fetch the document"})
        })
    }  else {
        res.status(500).json({error: "Not a valid patient id"})
    }  
})

app.post('/patients', (req, res) => {
    const patient = req.body
    
    db.collection('patients')
    .insertOne(patient)         
    .then ((result)=>{
        res.status(200).json(result)
    })
    .catch((err)=>{
        res.status(500).json({error: "Could not create the patient document"})
    })
   
})


 
app.use((req, res) => {
    res.status(404).render('404')
})
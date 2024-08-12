const express = require('express')
const { connectToDb, getDb } = require('./db')
const { ObjectId } = require('mongodb')
const bodyParser = require('body-parser');

//init app & middleware
const app = express()

const patients = []; // Example patient data storage

app.use(bodyParser.urlencoded({ extended: true }));


//register to view engine
app.set('view engine', 'ejs')
// app.set('views','myViews') //for different name folder

app.use(express.static('public'))

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
    patients.length = 0;

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


// Route to display the form to create a new patient
app.get('/patients/create', (req, res) => {
    res.render('create');
});

// Route to handle the form submission for creating a new patient
app.post('/patients/create', (req, res) => {
    const newPatient = req.body;
    patients.push(newPatient); // Add the new patient to the array (you would typically save this to a database)
    res.redirect('/patients');
});

// Route to handle deleting a patient
app.post('/patients/delete/:id', (req, res) => {
    const patientId = req.params.id;
    // Implement logic to remove patient from the array or database using the id
    res.redirect('/patients');
});

// Route to display the edit form
app.get('/patients/edit/:id', (req, res) => {
    const patientId = req.params.id;
    const patient = patients.find(p => p._id == patientId);
    res.render('edit', { patient });
});

// Route to handle the form submission for editing a patient
app.post('/patients/edit/:id', (req, res) => {
    const patientId = req.params.id;
    const updatedPatient = req.body;
    // Implement logic to update the patient in the array or database using the id
    res.redirect('/patients');
});


// const mongoose = require('mongoose');

// // Route to display the edit form
// app.get('/patients/edit/:id', async (req, res) => {
//     const patientId = req.params.id;
    
//     try {
//         const patient = await Patient.findById(mongoose.Types.ObjectId(patientId));
        
//         if (!patient) {
//             return res.status(404).send('Patient not found');
//         }
        
//         res.render('edit', { patient });
//     } catch (error) {
//         res.status(500).send('Error retrieving patient data');
//     }
// });

// // Route to handle the form submission for editing a patient
// app.post('/patients/edit/:id', async (req, res) => {
//     const patientId = req.params.id;
    
//     try {
//         await Patient.findByIdAndUpdate(mongoose.Types.ObjectId(patientId), req.body);
//         res.redirect('/patients');
//     } catch (error) {
//         res.status(500).send('Error updating patient data');
//     }
// });


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
require('dotenv').config(); //Store sensitive data such as the MongoDB URI in environment variables
const express = require('express')
const { connectToDb, getDb } = require('./db')
const { ObjectId } = require('mongodb')
const bodyParser = require('body-parser');
const multer = require('multer'); //Handle the file upload on the server side
const path = require('path')
const fs = require('fs')

// Initialize app & middleware
const app = express()
app.use(bodyParser.urlencoded({ extended: true }))

//init ejs templates that generate HTML
app.set('view engine', 'ejs') // app.set('views','myViews') //for different name folder
app.use(express.static('public'))

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static('uploads'));

// Ensure the uploads directory exists
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Set up storage engine for multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Specify the directory to save the uploaded files
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
});

// Initialize upload variable
const upload = multer({ storage: storage });

//db connection
let db

let patients = []; // patients data storage

//listen to requests
connectToDb((err) => {
    if(!err){
        app.listen(3000, () => {
            console.log("app listening on port 3000")
        })
        db = getDb()
    }
})


/* routes 
*****************/

//Home page
app.get('/', (req,res) => {
   res.render('home')
})

//Patients List
app.get('/patients', (req,res) => {
    db.collection('patients')
    .find().toArray() //cursor toArray, forEach
    .then (patients => {
        res.render('patients', { patients: patients }); //res.status(200).json(patients)
    })
    .catch((err)=>{
        res.status(500).json({error: "Could not fetch the documents/data"})
    })
})


// Display the form to CREATE a new patient
app.get('/patients/create', (req, res) => {
    res.render('create');
});

// Route to handle the form submission for creating a new patient
app.post('/patients/create', upload.single('image'), (req, res) => {
    const newPatient = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        gender: req.body.gender,
        phone: req.body.phone,
        email: req.body.email,
        pregnant: req.body.pregnant === 'on' || false, // Adjust as necessary based on your form
        nursing: req.body.nursing === 'on' || false,   // Adjust as necessary based on your form
        chronicalCondition: req.body.chronicalCondition || '',
        medications: req.body.medications || '',
    };

    // Handle optional image upload
    if (req.file) {
        newPatient.image = `/uploads/${req.file.filename}`;
    }
    db.collection('patients')
        .insertOne(newPatient)
        .then(() => {
            res.redirect('/patients');
        })
        .catch((err) => {
            console.error("Failed to create patient:", err);
            res.status(500).json({ error: "Could not create the patient document" });
        });
});

// Route to handle deleting a patient
app.post('/patients/delete/:id', (req, res) => {
    const patientId = req.params.id;

    if (ObjectId.isValid(patientId)) {
        db.collection('patients')
            .deleteOne({ _id: new ObjectId(patientId) })
            .then(() => {
                res.redirect('/patients');
            })
            .catch((err) => {
                console.error("Failed to delete patient:", err);
                res.status(500).json({ error: "Could not delete the patient" });
            });
    } else {
        res.status(500).json({ error: "Not a valid patient id" });
    }
});

// Route to display the edit form
app.get('/patients/edit/:id', (req, res) => {
    const patientId = req.params.id;

    if (ObjectId.isValid(patientId)) {
        db.collection('patients')
            .findOne({ _id: new ObjectId(patientId) })
            .then(patient => {
                if (patient) {
                    res.render('edit', { patient: patient });
                } else {
                    res.status(404).send('Patient not found');
                }
            })
            .catch((err) => {
                console.error("Failed to fetch patient:", err);
                res.status(500).send('Error fetching patient data');
            });
    } else {
        res.status(400).send('Invalid patient ID');
    }
});

// Route to handle the form submission for editing a patient
app.post('/patients/edit/:id', upload.single('image'), upload.single('image'), (req, res) => {
    const patientId = req.params.id;

    const updateData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
        email: req.body.email,
        gender: req.body.gender,
        pregnant: req.body.gender === 'female' && req.body.pregnant === 'on', // : false,
        nursing: req.body.gender === 'female' && req.body.nursing === 'on',// : false,
        chronicalCondition: req.body.chronicalCondition || [],
        medications: req.body.medications,
    };

    // Check if an image was uploaded
    if (req.file) {
        updateData.image = `/uploads/${req.file.filename}`;
    }

    if (ObjectId.isValid(patientId)) {
        db.collection('patients')
            .updateOne(
                { _id: new ObjectId(patientId) },
                { $set: updateData }
            )
            .then(() => {
                res.redirect('/patients');
            })
            .catch((err) => {
                console.error("Failed to update patient:", err);
                res.status(500).json({ error: "Could not update the patient document" });
            });
    } else {
        res.status(500).json({ error: "Not a valid patient id" });
    }
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
import express from 'express';
import { connectToDb, getDb } from './db.js';
import { calculateAge } from './public/js/calculateAge.js';
import { formatDate } from './util.js';
import { ObjectId } from 'mongodb';
import bodyParser from 'body-parser';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import got from 'got'; // Import got for HTTP requests
import FormData from 'form-data'; // Import FormData to handle file uploads
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import 'dotenv/config';


// Define __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/* Image Ditection
******************/
const apiKey = process.env.IMAGGAAPIKEY
const apiSecret = process.env.IMAGGAAPISECRET

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
let medications = [];
const conditions = ['Heart disease', 'Kidneys', 'Digestion', 'Diabetes', 'Asthma'];

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

// medication list and their interactions
app.get('/medications', (req, res) => {
    db.collection('medications')
        .find().toArray()
        .then(medications => {
            res.render('medications', { medications: medications });
        })
        .catch((err) => {
            console.error("Failed to fetch medications:", err);
            res.status(500).json({ error: "Could not fetch the medications data" });
        });
});

// Patients List
app.get('/patients', (req, res) => {
    db.collection('patients')
        .find().toArray()
        .then(patients => {
            // Calculate age for each patient and add it to the patient object
            patients.forEach(patient => {
                patient.age = calculateAge(patient.dob);
            });

            res.render('patients', { patients: patients, formatDate: formatDate });
        })
        .catch((err) => {
            res.status(500).json({ error: "Could not fetch the documents/data" });
        });
});

// Display the form to CREATE a new patient
app.get('/patients/create', (req, res) => {
    db.collection('medications')
    .find().toArray()
    .then(medications => {
        res.render('create', { conditions, medications });
    })
    .catch(err => {
        console.error("Failed to fetch medications:", err);
        res.status(500).json({ error: "Could not fetch the medications data" });
    });
});

// Route to handle the form submission for creating a new patient
app.post('/patients/create', upload.single('image'), async (req, res) => {
    const newMedications = req.body.medications || [];
    const newConditions = req.body.chronicalCondition || [];
    
    const newPatient = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        gender: req.body.gender,
        phone: req.body.phone,
        email: req.body.email,
        pregnant: req.body.pregnant === 'on' || false, 
        nursing: req.body.nursing === 'on' || false,
        dob: req.body.dob ? new Date(req.body.dob) : null,
        chronicalCondition: req.body.chronicalCondition || null,
        medications: req.body.medications || null,
    };

    // Check if an image was uploaded
    if (req.file) {
        const imgPath = path.join(__dirname, req.file.path);
        const formData = new FormData();
        formData.append('image', fs.createReadStream(imgPath));

        try {
            const response = await got.post('https://api.imagga.com/v2/faces/detections', {
                body: formData,
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(apiKey + ':' + apiSecret).toString('base64')
                }
            });

            const result = JSON.parse(response.body);
            const faces = result.result.faces;

            if (faces && faces.length > 0) {
                newPatient.image = `/uploads/${req.file.filename}`;
            } else {
                fs.unlinkSync(imgPath);
                return res.render('create', { 
                    errorMessage: "No face detected. Please upload an image with a clear face.", 
                    formatDate: formatDate, 
                    conditions: conditions,
                    medications: medications,
                });
            }
        } catch (error) {
            console.error("Imagga API error:", error.response?.body || error.message);
            return res.status(500).send("Error processing the image.");
        }
    }

    try {
        const medications = await db.collection('medications').find().toArray();

        let conflicts = [];
        let conflictDetails = {}; // Object to store conflict details per medication

        newMedications.forEach(medicationName => {
            const medication = medications.find(med => med.drugName === medicationName);
            if (medication) {
                medication.relatedConditions.forEach(condition => {
                    if (newConditions.includes(condition)) {
                        conflicts.push(`Medication ${medicationName} conflicts with your condition: ${condition}`);
                        if (!conflictDetails[medicationName]) {
                            conflictDetails[medicationName] = [];
                        }
                        conflictDetails[medicationName].push(`Conflicts with your condition: ${condition}`);
                    }
                });

                medication.interactions.forEach(interaction => {
                    if (newMedications.includes(interaction.withDrug)) {
                        conflicts.push(`Medication ${medicationName} interacts with ${interaction.withDrug}: ${interaction.interactionDescription}`);
                        if (!conflictDetails[medicationName]) {
                            conflictDetails[medicationName] = [];
                        }
                        conflictDetails[medicationName].push(`Interacts with ${interaction.withDrug}: ${interaction.interactionDescription}`);
                    }
                });
            }
        });

        if (conflicts.length > 0) {
            return res.render('create', {
                errorMessage: conflicts.join('<br>'),
                formatDate,
                conditions,
                medications,
                patient: newPatient,
                conflictDetails, // Pass the conflict details to the view
            });
        }

        await db.collection('patients').insertOne(newPatient);
        res.redirect('/patients');
    } catch (err) {
        console.error("Failed to create patient:", err);
        res.status(500).json({ error: "Could not create the patient document" });
    }
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
                    db.collection('medications')
                        .find().toArray()
                        .then(medications => {
                            patient.medications = patient.medications || []; // Default to an empty array if null
                            patient.chronicalCondition = patient.chronicalCondition || []; // Default to an empty array if null
                            patient.dob = patient.dob || ''; // Ensure dob is a string or empty if null
                            res.render('edit', { patient, formatDate, conditions, medications });
                        })
                        .catch(err => {
                            console.error("Failed to fetch medications:", err);
                            res.status(500).send('Error fetching medications');
                        });
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
app.post('/patients/edit/:id', upload.single('image'),(req, res) => {
    const patientId = req.params.id;
    const updatedMedications = req.body.medications || [];
    const updatedConditions = req.body.chronicalCondition || [];

    const updateData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
        email: req.body.email,
        gender: req.body.gender,
        pregnant: req.body.gender === 'female' && req.body.pregnant === 'on', // : false,
        nursing: req.body.gender === 'female' && req.body.nursing === 'on',// : false,
        dob: req.body.dob ? new Date(req.body.dob) : null,
        chronicalCondition: req.body.chronicalCondition || [],
        medications: req.body.medications || [],
    };

    // Check if an image was uploaded
    if (req.file) {
        updateData.image = `/uploads/${req.file.filename}`;
    }

    if (ObjectId.isValid(patientId)) {
        db.collection('medications')
        .find().toArray()
        .then(medications => {
            let conflicts = [];

            // Check for condition conflicts
            updatedMedications.forEach(medicationName => {
                const medication = medications.find(med => med.drugName === medicationName);
                if (medication) {
                    medication.relatedConditions.forEach(condition => {
                        if (updatedConditions.includes(condition)) {
                            conflicts.push(`Medication ${medicationName} conflicts with your condition: ${condition}`);
                        }
                    });

                    // Check for interactions with other medications
                    medication.interactions.forEach(interaction => {
                        if (updatedMedications.includes(interaction.withDrug)) {
                            conflicts.push(`Medication ${medicationName} interacts with ${interaction.withDrug}: ${interaction.interactionDescription}`);
                        }
                    });
                }
            });

            if (conflicts.length > 0) {
                // Return to the form with conflicts displayed
                db.collection('patients')
                    .findOne({ _id: new ObjectId(patientId) })
                    .then(patient => {
                        res.render('edit', {
                            patient: { ...patient, ...updateData }, // Merge current patient data with update data
                            medications,
                            conditions: updatedConditions,
                            formatDate,
                            errorMessage: conflicts.join('<br>'),
                        });
                    })
                    .catch(err => {
                        console.error("Failed to fetch patient:", err);
                        res.status(500).send('Error fetching patient data');
                    });
            } else {
                // Proceed with saving the data if no conflicts
                db.collection('patients')
                    .updateOne({ _id: new ObjectId(patientId) }, { $set: updateData })
                    .then(() => res.redirect('/patients'))
                    .catch(err => {
                        console.error("Failed to update patient:", err);
                        res.status(500).json({ error: "Could not update the patient document" });
                    });
            }
        })
        .catch(err => {
            console.error("Failed to fetch medications:", err);
            res.status(500).send('Error fetching medications');
        });
    } else {
        res.status(500).json({ error: "Not a valid patient id" });
    }
});



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


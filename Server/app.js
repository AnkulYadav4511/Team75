// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// require('dotenv').config();

// // Models
// const Note = require('./models/Note');
// const User = require('./models/User');
// const Shift = require('./models/Shift');

// const app = express();
// app.use(cors());
// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ limit: '50mb', extended: true }));

// // 1. MongoDB Connection
// mongoose.connect('mongodb+srv://bharatsharma:India%406427@users.zhyvuoo.mongodb.net/tracking?retryWrites=true&w=majority')
//     .then(() => console.log("✅ Connected to MongoDB"))
//     .catch((err) => console.error("❌ MongoDB connection error:", err));

// // ==========================================
// //                 ROUTES
// // ==========================================

// app.get('/api/auth/profile/:userId', async (req, res) => {
//     try {
//         const user = await User.findById(req.params.userId).select('-password');
//         if (!user) return res.status(404).json({ message: "User not found" });
//         const userObj = user.toObject();
//         if (user.profileImage && user.profileImage.data) {
//             userObj.profileImage.data = user.profileImage.data.toString('base64');
//         }
//         res.json(userObj);
//     } catch (error) { res.status(500).json({ message: "Internal Server Error" }); }
// });

// app.post('/api/auth/signup', async (req, res) => {
//     try {
//         const { name, email, password, profileImage } = req.body;
//         const existingUser = await User.findOne({ email });
//         if (existingUser) return res.status(400).json({ message: "Email already in use" });

//         const newUser = new User({ name, email, password });
//         if (profileImage) {
//             newUser.profileImage = {
//                 data: Buffer.from(profileImage, 'base64'),
//                 contentType: 'image/jpeg'
//             };
//         }
//         await newUser.save();
//         res.status(201).json({ userId: newUser._id });
//     } catch (e) { res.status(500).json({ message: "Signup failed" }); }
// });

// app.post('/api/auth/login', async (req, res) => {
//     try {
//         const { email, password } = req.body;
//         const user = await User.findOne({ email, password });
//         if (!user) return res.status(400).json({ message: "Invalid credentials" });
//         res.json({ userId: user._id, name: user.name, isShiftActive: user.isShiftActive });
//     } catch (err) { res.status(500).json({ error: "Server Error" }); }
// });

// app.post('/api/shift/start', async (req, res) => {
//     try {
//         const { userId } = req.body;
//         const cleanId = userId.trim().replace(/['"]+/g, '');

//         // 1. Mark User as Active
//         await User.findByIdAndUpdate(cleanId, { isShiftActive: true });

//         // 2. Create the "Ongoing" Shift document immediately
//         const newShift = new Shift({
//             userId: cleanId,
//             startTime: new Date(),
//             date: new Date().toLocaleDateString('en-IN'),
//             path: [],
//             notes: [],
//             // Use a custom field or check logoutTime to identify active shifts
//             logoutTime: "Ongoing" 
//         });

//         await newShift.save();
//         res.status(201).json({ startTime: newShift.startTime, shiftId: newShift._id });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

// // --- TRACKING (The Background Task calls this) ---
// app.post('/api/track', async (req, res) => {
//     try {
//         const { userId, latitude, longitude } = req.body;
//         const cleanId = userId.trim().replace(/['"]+/g, '');

//         // Find the one "Ongoing" shift for this user
//         const activeShift = await Shift.findOne({ userId: cleanId, logoutTime: "Ongoing" });

//         if (!activeShift) {
//             return res.status(404).json({ message: "No active shift found to track." });
//         }

//         // Push to the Shift path
//         activeShift.path.push({ latitude, longitude, timestamp: new Date() });
//         await activeShift.save();

//         res.status(200).send("Point Recorded");
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

// // --- SHIFT END ---
// app.post('/api/shift/end', async (req, res) => {
//     try {
//         const { userId } = req.body;
//         const cleanId = userId.trim().replace(/['"]+/g, '');

//         const activeShift = await Shift.findOne({ userId: cleanId, logoutTime: "Ongoing" });
//         if (!activeShift) return res.status(404).json({ message: "No active session" });

//         const now = new Date();
//         activeShift.endTime = now;
//         activeShift.logoutTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

//         await activeShift.save();
//         await User.findByIdAndUpdate(cleanId, { isShiftActive: false });

//         res.status(200).json({ message: "Shift Ended" });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

// app.post('/api/notes', async (req, res) => {
//     try {
//         const { userId, text, latitude, longitude } = req.body;
//         const newNote = new Note({
//             userId: userId.trim().replace(/['"]+/g, ''),
//             text, latitude, longitude
//         });
//         await newNote.save();
//         res.status(201).json({ message: "Note saved successfully", note: newNote });
//     } catch (err) { res.status(500).json({ error: err.message }); }
// });

// app.get('/api/history/:userId', async (req, res) => {
//     try {
//         const userId = req.params.userId.trim().replace(/['"]+/g, '');

//         // 1. Find all archived shifts for this user, sorted by newest first
//         // We use .populate('notes') to get the actual note details (text, coords)
//         const archivedShifts = await Shift.find({ userId })
//             .sort({ createdAt: -1 })
//             .populate('notes'); 

//         // 2. Map the data into the format your React Native cards expect
//         const historyLog = archivedShifts.map(s => ({
//             _id: s._id,
//             date: s.date, // e.g., "18/02/2026"
//             loginTime: s.startTime ? new Date(s.startTime).toLocaleTimeString() : "N/A",
//             logoutTime: s.endTime ? new Date(s.endTime).toLocaleTimeString() : "N/A",
//             path: s.path || [],
//             dayNotes: s.notes || [] // Populated notes array
//         }));

//         res.status(200).json(historyLog);
//     } catch (err) {
//         console.error("❌ History Error:", err);
//         res.status(500).json({ error: err.message });
//     }
// });

// // // GET /api/shift-details/:shiftId
// app.get('/api/shift-details/:shiftId', async (req, res) => {
//     try {
//         const { shiftId } = req.params;
//         console.log("🔍 Fetching details for ID:", shiftId);

//         // .lean() makes the query much faster
//         const shift = await Shift.findById(shiftId).populate('notes').lean();

//         if (!shift) {
//             console.log("❌ Shift not found");
//             return res.status(404).json({ message: "Shift not found" });
//         }

//         console.log("✅ Sending data for shift date:", shift.date);
//         res.status(200).json({
//             date: shift.date,
//             path: shift.path || [],
//             notes: shift.notes || []
//         });
//     } catch (err) {
//         console.error("🔥 Server Error:", err);
//         res.status(500).json({ error: err.message });
//     }
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, "0.0.0.0", () => {
//     console.log(`🚀 Server running on port ${PORT}`);
// });





const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const { Parser } = require('json2csv');

const User = require('./models/User');
const Shift = require('./models/Shift');
const Note = require('./models/Note');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ✅ MongoDB Connection
mongoose.connect('mongodb+srv://bharatsharma:India%406427@users.zhyvuoo.mongodb.net/tracking?retryWrites=true&w=majority')
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ CRITICAL FIX: cleanId returns a real Mongoose ObjectId for queries
const cleanId = (id) => {
    if (!id) return null;
    const cleaned = id.toString().replace(/['"]+/g, '').trim();
    if (!mongoose.Types.ObjectId.isValid(cleaned)) return null;
    return new mongoose.Types.ObjectId(cleaned);
};

app.get('/api/auth/profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        // Clean ID logic
        const id = userId.replace(/['"]+/g, '').trim();
        console.log("🔍 API Called: Fetching Profile for ID:", id);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.log("❌ Invalid ID Format");
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const user = await User.findById(id).select('-password');
        
        if (!user) {
            console.log("❌ User not found in DB");
            return res.status(404).json({ message: "User not found" });
        }

        const userObj = user.toObject();
        if (user.profileImage && user.profileImage.data) {
            userObj.profileImage.data = user.profileImage.data.toString('base64');
        }

        console.log("✅ Sending data for:", user.name);
        res.json(userObj);

    } catch (error) {
        console.error("🔥 Server Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user by credentials
        const user = await User.findOne({ email, password });
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        // Check for active shifts (useful for workers)
        const activeShift = await Shift.findOne({ userId: user._id, logoutTime: 'Ongoing' });

        // IMPORTANT: Return the role ('admin' or 'worker_manager')
        res.json({
            userId: user._id.toString(),
            name: user.name,
            role: user.role, 
            isShiftActive: !!activeShift,
        });
    } catch (err) { 
        res.status(500).json({ message: err.message }); 
    }
});

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password, profileImage, role, adminKey } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Email already in use" });

        // Logic to prevent unauthorized Admin creation
        let finalRole = 'worker'; 
        if (role === 'admin') {
            const SECRET_ADMIN_PHRASE = "admin"; // Change this!
            if (adminKey !== SECRET_ADMIN_PHRASE) {
                return res.status(403).json({ message: "Invalid Admin Key. Cannot register as Admin." });
            }
            finalRole = 'admin';
        }

        const newUser = new User({ 
            name, 
            email, 
            password, 
            role: finalRole 
        });

        if (profileImage) {
            newUser.profileImage = {
                data: Buffer.from(profileImage, 'base64'),
                contentType: 'image/jpeg'
            };
        }

        await newUser.save();
        res.status(201).json({ userId: newUser._id });
    } catch (e) { 
        res.status(500).json({ message: "Signup failed: " + e.message }); 
    }
});

app.post('/api/shift/start', async (req, res) => {
    try {
        const userId = cleanId(req.body.userId);
        const existing = await Shift.findOne({ userId, logoutTime: 'Ongoing' });
        if (existing) return res.status(200).json({ startTime: existing.startTime });

        const shift = await Shift.create({
            userId,
            startTime: new Date(),
            date: new Date().toLocaleDateString('en-IN'),
            logoutTime: 'Ongoing',
            path: [],
            notes: []
        });
        await User.findByIdAndUpdate(userId, { isShiftActive: true });
        res.status(201).json({ startTime: shift.startTime });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/shift-details/:shiftId', async (req, res) => {
    try {
        const { shiftId } = req.params;
        console.log("🔍 Fetching details for ID:", shiftId);

        // .lean() makes the query much faster
        const shift = await Shift.findById(shiftId).populate('notes').lean();

        if (!shift) {
            console.log("❌ Shift not found");
            return res.status(404).json({ message: "Shift not found" });
        }

        console.log("✅ Sending data for shift date:", shift.date);
        res.status(200).json({
            date: shift.date,
            path: shift.path || [],
            notes: shift.notes || []
        });
    } catch (err) {
        console.error("🔥 Server Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/track', async (req, res) => {
    try {
        const rawId = req.body.userId;
        const userId = cleanId(rawId);

        // ✅ FIX: Guard against null userId (invalid ObjectId)
        if (!userId) {
            console.error('❌ /api/track: Invalid userId received:', rawId);
            return res.status(400).json({ message: "Invalid userId" });
        }

        const { latitude, longitude } = req.body;

        // ✅ FIX: Ensure coords are numbers, not strings
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);

        if (isNaN(lat) || isNaN(lng)) {
            console.error('❌ /api/track: Invalid coordinates:', { latitude, longitude });
            return res.status(400).json({ message: "Invalid coordinates" });
        }

        const shift = await Shift.findOneAndUpdate(
            { userId, logoutTime: 'Ongoing' },
            { $push: { path: { latitude: lat, longitude: lng, timestamp: new Date() } } },
            { new: true }
        );

        if (!shift) {
            console.warn('⚠️ /api/track: No active shift found for userId:', userId.toString());
            return res.status(404).json({ message: "No active shift" });
        }

        console.log(`✅ Tracked point for ${userId}: [${lat}, ${lng}] | Total: ${shift.path.length}`);
        res.status(200).json({ count: shift.path.length });
    } catch (err) {
        console.error('❌ /api/track error:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// app.post('/api/notes', async (req, res) => {
//     try {
//         const userId = cleanId(req.body.userId);
//         const { text, latitude, longitude } = req.body;
//         const newNote = new Note({ userId, text, latitude, longitude });
//         await newNote.save();

//         const shift = await Shift.findOneAndUpdate(
//             { userId, logoutTime: 'Ongoing' },
//             { $push: { notes: newNote._id } },
//             { new: true }
//         );
//         if (!shift) return res.status(404).json({ message: "Shift not found" });
//         res.status(201).json({ message: "Note linked" });
//     } catch (err) { res.status(500).json({ message: err.message }); }
// });

app.post('/api/notes', async (req, res) => {
    try {
        const { 
            userId, 
            className, 
            directorName, 
            directorNumber, 
            address, 
            contactPersonName, 
            contactPersonNumber, 
            studentCount,
            classCount,
            latitude, 
            longitude 
        } = req.body;

        // 1. Create the new note
        const newNote = new Note({ 
            userId, 
            className, 
            directorName, 
            directorNumber, 
            address, 
            contactPersonName, 
            contactPersonNumber, 
            studentCount,
            classCount,
            latitude, 
            longitude 
        });

        await newNote.save();

        // 2. Push note ID to active shift
        const shift = await Shift.findOneAndUpdate(
            { userId, logoutTime: 'Ongoing' }, // Finds active shift
            { $push: { notes: newNote._id } },
            { new: true }
        );

        if (!shift) return res.status(404).json({ message: "No active shift found" });
        
        res.status(201).json({ message: "Note recorded and linked to shift" });
    } catch (err) { 
        res.status(500).json({ message: err.message }); 
    }
});

app.post('/api/shift/end', async (req, res) => {
    try {
        const userId = cleanId(req.body.userId);
        const now = new Date();
        const logoutTimeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

        const shift = await Shift.findOneAndUpdate(
            { userId, logoutTime: 'Ongoing' },
            { endTime: now, logoutTime: logoutTimeStr },
            { new: true }
        );
        await User.findByIdAndUpdate(userId, { isShiftActive: false });
        if (!shift) return res.status(200).json({ message: "Already ended" });

        res.json({
            message: "Shift ended",
            summary: { pointsTracked: shift.path.length, notesCaptured: shift.notes.length }
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/shift/active/:userId', async (req, res) => {
    try {
        const userId = cleanId(req.params.userId);
        const shift = await Shift.findOne({ userId, logoutTime: 'Ongoing' }).lean();
        if (!shift) return res.status(404).json({ message: "No active shift" });
        res.json(shift);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/history/:userId', async (req, res) => {
    try {
        // Use your cleanId function to ensure it's a valid Mongo ID
        const userId = cleanId(req.params.userId);

        if (!userId) {
            return res.status(400).json({ message: "Invalid User ID format" });
        }

        const archivedShifts = await Shift.find({ userId })
            .sort({ createdAt: -1 })
            .populate('notes');

        const historyLog = archivedShifts.map(s => ({
            _id: s._id,
            date: s.date,
            // Added "Ongoing" check for display logic
            loginTime: s.startTime ? new Date(s.startTime).toLocaleTimeString() : "N/A",
            logoutTime: s.logoutTime === 'Ongoing' ? 'Ongoing' : (s.endTime ? new Date(s.endTime).toLocaleTimeString() : "N/A"),
            path: s.path || [],
            dayNotes: s.notes || []
        }));

        res.status(200).json(historyLog);
    } catch (err) {
        console.error("❌ History Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/ongoing-shifts', async (req, res) => {
    try {
        // Find shifts where logoutTime is 'Ongoing'
        // .populate('userId') gets the name and profile photo of the worker
        const shifts = await Shift.find({ logoutTime: 'Ongoing' })
                                  .populate('userId', 'name profileImage')
                                  .sort({ startTime: -1 });
        
        res.json(shifts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/admin/shift/:id', async (req, res) => {
    try {
        const shift = await Shift.findById(req.params.id);
        res.json(shift);
    } catch (err) {
        res.status(500).json({ message: "Error fetching path" });
    }
});

app.get('/api/admin/all-workers', async (req, res) => {
    try {
        const workers = await User.find({ role: 'worker' })
            .select('name email profileImage role')
            .sort({ name: 1 });

        // Transform the data so the frontend can display the image
        const formattedWorkers = workers.map(worker => {
            const workerObj = worker.toObject();
            if (worker.profileImage && worker.profileImage.data) {
                // Convert Buffer to Base64 string
                const base64Flag = `data:${worker.profileImage.contentType};base64,`;
                const imageStr = worker.profileImage.data.toString('base64');
                workerObj.profileImage = base64Flag + imageStr;
            }
            return workerObj;
        });

        res.status(200).json(formattedWorkers);
    } catch (err) {
        res.status(500).json({ message: "Error formatting worker data" });
    }
});

app.get('api/export-monthly-notes', async (req, res) => {
  try {
    const { month, year } = req.query; // e.g. month=2, year=2026
    
    // Create a regex to match the date format "D/M/YYYY" or "DD/M/YYYY"
    // Since your DB stores dates as strings like "19/2/2026"
    const datePattern = new RegExp(`\\/${month}\\/${year}$`);

    const shifts = await Shift.find({ date: { $regex: datePattern } }).lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Monthly Report');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Start Time', key: 'startTime', width: 12 },
      { header: 'Logout Time', key: 'logoutTime', width: 12 },
      { header: 'Class Name', key: 'className', width: 20 },
      { header: 'Director', key: 'director', width: 15 },
      { header: 'Address', key: 'address', width: 35 },
      { header: 'Contact', key: 'contact', width: 15 }
    ];

    shifts.forEach(shift => {
      // If notes exist in this shift, add a row for each note
      if (shift.notes && shift.notes.length > 0) {
        shift.notes.forEach(note => {
          worksheet.addRow({
            date: shift.date,
            startTime: shift.startTime,
            logoutTime: shift.logoutTime,
            className: note.className,
            director: note.directorName,
            address: note.address,
            contact: note.directorNumber
          });
        });
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Report_${month}_${year}.xlsx`);

    await workbook.xlsx.write(res);
    res.status(200).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/download-shift-report/:shiftId', async (req, res) => {
    try {
        const { shiftId } = req.params;
        
        // Populate 'notes' to get the details from the Note collection
        const shift = await Shift.findById(shiftId).populate('notes');

        if (!shift) {
            return res.status(404).json({ message: "Shift not found" });
        }

        const reportData = shift.notes.length > 0 ? shift.notes.map(note => ({
            'Date': shift.date,
            'Shift Login': shift.startTime ? new Date(shift.startTime).toLocaleTimeString() : 'N/A',
            'Shift Logout': shift.logoutTime,
            'Class Name': note.className,
            'Director': note.directorName,
            'Phone': note.directorNumber,
            'Address': note.address,
            'Student Count': note.studentCount,
            'Class Count': note.classCount,
            'Latitude': note.latitude,
            'Longitude': note.longitude,
            'Created At': new Date(note.createdAt).toLocaleString()
        })) : [{
            'Date': shift.date,
            'Shift Login': shift.startTime ? new Date(shift.startTime).toLocaleTimeString() : 'N/A',
            'Shift Logout': shift.logoutTime,
            'Notes': 'No notes recorded for this shift'
        }];

        const fields = [
            'Date', 'Shift Login', 'Shift Logout', 'Class Name', 
            'Director', 'Phone', 'Address', 'Student Count', 
            'Class Count', 'Latitude', 'Longitude', 'Created At'
        ];
        
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(reportData);

        const fileName = `Report_${shift.date.replace(/\//g, '-')}.csv`;
        
        res.header('Content-Type', 'text/csv');
        res.attachment(fileName);
        return res.send(csv);

    } catch (error) {
        console.error("Export Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

const PORT = 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server on port ${PORT}`));
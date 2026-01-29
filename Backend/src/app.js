
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const connectToSocket = require('./controllers/socketManager');
const userRoutes = require('./routes/user.route');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '40kb' }));
app.use(express.urlencoded({ limit: '40kb', extended: true }));

app.use('/api/v1/users', userRoutes);

app.get('/', (req, res) => {
    res.send('Hello World! - ZOOM CLONE BACKEND SERVER');
});

const start = async () => {
    try {
        const connectionDb = await mongoose.connect(process.env.DB_URL);
        console.log(`MongoDB Connected: ${connectionDb.connection.host}`);
        const server = http.createServer(app);
        connectToSocket(server);
        server.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
    }
};

start();

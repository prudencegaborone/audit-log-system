const express=require('express');

const cors=require('cors');

require('dotenv').config();

const app=express();

app.use(express.json());

app.use(cors());

const authRoutes = require('./routes/auth');
const logRoutes = require('./routes/logs');
const patientRoutes = require('./routes/patients');

app.use('/api/auth' ,authRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/patients', patientRoutes);


app.get('/', (req, res) => {
  res.json({ message: 'Audit Log System API is running!' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
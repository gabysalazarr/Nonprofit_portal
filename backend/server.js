const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/templates',     require('./routes/templates'));
app.use('/api/submissions',   require('./routes/submissions'));
app.use('/api/reports',       require('./routes/reports'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/organizations', require('./routes/organizations'));

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
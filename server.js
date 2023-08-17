const indexRouter = require('./src/routes/index');
const apiRouter = require('./src/routes/api');
const express = require("express");
const fileupload = require('express-fileupload')

const app = express();
require('dotenv').config();
const port = process.env.PORT || 3000;
app.set('port', port);

app.use(express.json({ limit: "50mb", extended: true, parameterLimit: 100000 }))
app.use(express.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }))

const cors = require('cors');
app.use(cors());
app.use(fileupload());
app.use('/', indexRouter);
app.use('/api', apiRouter);

app.listen(port, () => {
    console.log("Starting node.js at port " + port);
});

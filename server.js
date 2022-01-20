const express = require('express');
const path = require('path');
const cors = require('cors');
const port = process.env.PORT || 8080;

try {
    express()
        .use(cors())
        .use(express.static(path.join(__dirname, 'out')))
        .listen(port);
    console.log(`> Read on http://localhost:${port}`);
} catch (e) {
    console.error(e.stack);
    process.exit(1);
}
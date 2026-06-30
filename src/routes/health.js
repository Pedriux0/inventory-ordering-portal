const express = require('express');

const router = express.Router();

// simple endpoint to check if the server is running, dont need much here
router.get('/', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = router;

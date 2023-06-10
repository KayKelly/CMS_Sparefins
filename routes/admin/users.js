const express = require('express');
const router = express.Router();
const User = require('../../models/User');

router.all('/*', (req, res, next)=>{
    req.app.locals.layout = 'admin';
    next();
});

router.get('/', (req, res)=>{
    User.find({})
    .then(user=>{
    res.render('admin/users', {user: user});
});
});

module.exports = router;
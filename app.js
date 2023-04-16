const express = require('express');
const app = express();
const path = require('path');
const exphbs = require('express-handlebars');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const {allowInsecurePrototypeAccess} = require('@handlebars/allow-prototype-access');
const Handlebars = require('handlebars');
const methodOverride = require('method-override');
const upload = require('express-fileupload');
const session = require('express-session');
const flash = require('connect-flash');
const {mongoDbUrl} = require('./config/database');
const passport = require('passport');
require('dotenv').config();


// Deprecation of strictQuery. Remove when Mongoose v7
mongoose.set('strictQuery', false);

// Connect to database
mongoose.connect(mongoDbUrl, {useNewUrlParser: true}).then((db)=> {
    console.log('Connected to database');
}).catch(error => console.log(error));

// Set directory for staic files like CSS, JS etc
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
const { select, generateTime, paginate } = require('./helpers/handlebars-helpers');
app.engine('handlebars', exphbs.engine({handlebars: allowInsecurePrototypeAccess(Handlebars), defaultLayout: 'home', helpers: { select: select, generateTime: generateTime, paginate: paginate }}));
app.set('view engine', 'handlebars');

app.use(session({
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: false
}))

// Express File Upload
app.use(upload());

// Body Parser
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// Method Override
app.use(methodOverride('_method'));


// Viewer for success/error messages
app.use(flash());

// Passport
app.use(passport.initialize());
app.use(passport.session());

// local variables using middleware
app.use((req, res, next)=>{
    res.locals.user = req.user || null;
    res.locals.success_message = req.flash('success_message');
    res.locals.error_message = req.flash('error_message');
    res.locals.delete_message = req.flash('delete_message');
    res.locals.error = req.flash('error');
    next();
});

// Load routes
const home = require('./routes/home/index');
const admin = require('./routes/admin/index');
const posts = require('./routes/admin/posts');
const categories = require('./routes/admin/categories');
const comments = require('./routes/admin/comments');
const fins = require('./routes/home/fins');
const messages = require('./routes/home/messages');

// Use routes
app.use('/', home);
app.use('/admin', admin);
app.use('/admin/posts', posts);
app.use('/admin/categories', categories);
app.use('/admin/comments', comments);
app.use('/listings', fins);
app.use('/messages', messages);

// Use variable enovirement port or static port 4500
const port = process.env.PORT || 4500;

app.listen(port, ()=>{
    console.log(`Listening on port ${port}`);
});
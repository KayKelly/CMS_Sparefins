const express = require('express');
const router = express.Router();
const Post = require('../../models/Post');
const Category = require('../../models/Category');
const User = require('../../models/User');
const bcryptjs = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const Message = require('../../models/Message');
const { body, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');

// Middleware function to retrieve the number of unread messages for the current user
router.use(async (req, res, next) => {
    if (req.user) { // Check if user is authenticated
      const unreadCount = await Message.count({ recipient: req.user._id, read: false });
      res.locals.unreadCount = unreadCount;
    }
    next(); // Call next middleware
  });

router.all('/*', (req, res, next)=>{
    req.app.locals.layout = 'home';
    next();
});
router.get('/', (req, res)=>{
    const perPage = 12;
    const page = req.query.page || 1;
    Post.find({})
    .skip((perPage * page) - perPage)
    .limit(perPage)
    .populate('user').then(posts =>{
        Post.count().then(postCount=>{
            Category.find({}).then(categories=>{
                res.render('home/index', {
                    posts: posts,
                    categories: categories,
                    current: parseInt(page),
                    pages: Math.ceil(postCount / perPage),
                    userId: req.user ? req.user.id : null,
                    user: req.user || null,
                });
                    });
        });
    });
});
  
router.get('/filter', (req, res) => {
    const finType = req.query.finType;
    const finSize = req.query.finSize;
    const finSetup = req.query.finSetup;
    const finPosition = req.query.finPosition;
    let query = {};
    if (finType) { query.type = finType; }
    if (finSize) { query.size = finSize; }
    if (finSetup) { query.setup = finSetup; }
    if (finPosition) { query.position = finPosition; }
    Post.find(query)
        .populate('user')
        .then((filteredListings) => {
        console.log(filteredListings);
        res.render('home/index', { filteredListings });
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error retrieving filtered listings');
      });
  });
  

  

router.get('/post/:slug', (req, res)=>{
    Post.findOne({slug: req.params.slug}).populate({path: 'user', model: 'users'})
    .then(post=>{
        Category.find({}).then(categories=>{
        res.render('home/post', {post: post, categories: categories});
    })
    .catch(error => console.log(error));
});
});
router.get('/about', (req, res)=>{
    res.render('home/about');
});

router.get('/password-reset', (req, res)=>{
    res.render('home/password-reset');
});

router.get('/your-profile/:id', (req, res)=>{
    User.findOne({_id: req.params.id})
        .then(foundUser => {
            if (!foundUser) {
                req.flash('error_message', 'User not found');
                return res.redirect('/');
            }
            if (req.user.id.toString() !== foundUser.id.toString()) {
                req.flash('error_message','You are not authorized to change this profile');
                return res.redirect('back');
            }
            Post.find({user: req.params.id})
                .then(posts =>{
                    res.render('home/your-profile', { user: foundUser, posts: posts });
                })
        })
        .catch(error => {
            console.error(error);
            req.flash('error', 'An error occurred while trying to retrieve the user');
            res.redirect('/');
        });
});

router.get('/profile/:id', (req, res) => {
    User.findOne({_id: req.params.id})
        .then(foundUser => {
            if (!foundUser) {
                req.flash('error', 'User not found');
                return res.redirect('/');
            }
            Post.find({user: req.params.id})
                .then(posts =>{
                    res.render('home/profile', { user: foundUser, posts: posts });
                })
        })
        .catch(error => {
            console.error(error);
            req.flash('error', 'An error occurred while trying to retrieve the user');
            res.redirect('/');
        });
});

passport.use(new LocalStrategy({usernameField: 'email'}, (email, password, done)=>{
    User.findOne({email: email}).then(user=>{
        if(!user) return done(null, false, {message: 'No user found'});
        bcryptjs.compare(password, user.password, (err, matched)=>{
            if(err) return err;
            if(matched){
                return done(null, user);
            } else {
                return done(null, false, { message: 'Incorrect password.' });
            }
        })
    })
}));

passport.serializeUser((user, done) =>{
    done(null, user.id);
});
passport.deserializeUser((id, done) =>{
    User.findById(id, (err, user) =>{
        done(err, user);
    });
});

router.post('/login', [
  body('email')
    .notEmpty().withMessage('Please enter an email address')
    .isEmail().withMessage('Please enter a valid email address')
    .trim()
    .normalizeEmail()
    .customSanitizer(value => sanitizeHtml(value)),
  body('password')
    .notEmpty().withMessage('Please enter a password')
    .trim()
    .customSanitizer(value => sanitizeHtml(value)),
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.xhr || req.headers.accept.includes('json')) {
      return res.status(400).json({ success: false, errors: errors.array()})
    } else {
      return res.render('home/index', {loginErrors: errors.array() });
    }
  }

  passport.authenticate('local', (err, user, info) => {
    if (err) {
      // Handle authentication error
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
    if (!user) {
      // Handle login failure
      if (req.xhr || req.headers.accept.includes('json')) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      } else {
        // Pass the loginErrors variable to the template
        return res.render('home/index', { loginErrors: [{ message: 'Invalid email or password' }] });
      }
    }
    // Handle successful login
    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Internal server error' });
      }
      req.flash('success_message', 'Login successful');
      res.render('home/index');
      });
  })(req, res, next);
});


  
  router.get('/listings/add-listing', (req, res) => {
    if (!req.user) {
      req.session.returnTo = req.originalUrl;
      console.log('returnTo set to:', req.session.returnTo);
      req.flash('error', 'You have to be logged in to add a listing');
      return res.redirect('/');
    } else {
        res.render('home/listings/add-listing');
    }
  });
  
router.get('/logout', (req, res, next)=>{
    req.logout((err)=>{
        if(err) return next(err);
    });
    res.redirect('/');
});

router.post('/register', [
  body('firstName').notEmpty().withMessage('Please enter a first name'),
  body('lastName').notEmpty().withMessage('Please enter a last name'),
  body('email').notEmpty().withMessage('Please enter an email address').isEmail().withMessage('Please enter a valid email address'),
  body('password').notEmpty().withMessage('Please enter a password'),
  body('passwordConfirm').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error(`The passwords don't match`);
    }
    return true;
  }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.xhr || req.headers.accept.includes('json')) {
      return res.status(400).json({ success: false, errors: errors.array() });
    } else {
      return res.render('home/index', {
        registerErrors: errors.array().map(error => error.msg), // Access error messages using error.msg
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        errors: errors.array().map(error => error.msg) // Access error messages using error.msg
      });
    }
  } else {
    User.findOne({ email: req.body.email }).then(user => {
      if (!user) {
        const newUser = new User({
          firstName: sanitizeHtml(req.body.firstName),
          lastName: sanitizeHtml(req.body.lastName),
          email: sanitizeHtml(req.body.email),
          password: sanitizeHtml(req.body.password)
        });

        bcryptjs.genSalt(10, (err, salt) => {
          bcryptjs.hash(newUser.password, salt, (err, hash) => {
            newUser.password = hash;
            newUser.save().then(savedUser => {
              req.flash('success_message', 'You are now registered. Please login');
              res.status(200).json({ success: true, message: `Welcome ${savedUser.firstName}, you are now registered` });
            });
          });
        });
      } else {
        if (req.xhr || req.headers.accept.includes('json')) {
          return res.status(400).json({ success: false, message: 'Email already registered. Please login' });
        } else {
          req.flash('error_message', 'Email already registered. Please login');
          return res.render('home/index', {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            errors: []
          });
        }
      }
    });
  }
});



  

module.exports = router;
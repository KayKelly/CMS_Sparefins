const express = require('express');
const router = express.Router();
const Post = require('../../models/Post');
const Category = require('../../models/Category');
const User = require('../../models/User');
const bcryptjs = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const Message = require('../../models/Message');

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
                    userId: req.user ? req.user.id : null
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

router.get('/login', (req, res)=>{
    res.render('home/login');
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

router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
      successRedirect: req.session.returnTo || '/',
      failureRedirect: 'home/login',
      failureFlash: true
    })(req, res, next);
  });  
  
  router.get('/listings/add-listing', (req, res) => {
    if (!req.user) {
      req.session.returnTo = req.originalUrl;
      console.log('returnTo set to:', req.session.returnTo);
      req.flash('error', 'You have to be logged in to add a listing');
      return res.redirect('/login');
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
router.get('/register', (req, res)=>{
    res.render('home/register');
});
router.post('/register', (req, res)=>{
    let errors = [];
    
    if(!req.body.firstName){
        errors.push({message: 'Please enter a first name'});
    }
    if(!req.body.lastName){
        errors.push({message: 'Please enter a last name'});
    }
    if(!req.body.email){
        errors.push({message: 'Please enter an email address'});
    }
    if(!req.body.password){
        errors.push({message: 'Please enter a password'});
    }
    if(req.body.password !== req.body.passwordConfirm){
        errors.push({message: "The passwords don't match"});
    }
    if(errors.length > 0){
        res.render('home/register', {
            errors: errors,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
        })
    } else {
        User.findOne({email: req.body.email}).then(user=>{
            if(!user){
                const newUser = new User({
                    firstName: req.body.firstName,
                    lastName: req.body.lastName,
                    email: req.body.email,
                    password: req.body.password
                });
        
                bcryptjs.genSalt(10, (err, salt)=>{
                    bcryptjs.hash(newUser.password, salt, (err, hash)=>{
                        newUser.password = hash;
                        newUser.save().then(savedUser=>{
                            req.flash('success_message', 'You are now registered. Please login');
                            res.redirect('/login');
                        });
                    });
                });
            } else {
                req.flash('error_message', 'That email is already registered. Please login')
                res.redirect('/login');
            }
        });
    };
});

module.exports = router;
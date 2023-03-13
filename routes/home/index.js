const express = require('express');
const router = express.Router();
const Post = require('../../models/Post');
const Category = require('../../models/Category');
const User = require('../../models/User');
const bcryptjs = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

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
                    pages: Math.ceil(postCount / perPage)
                });
                    });
        });
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

router.get('/edit-profile/:id', (req, res)=>{
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
                    res.render('home/edit-profile', { user: foundUser, posts: posts });
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

router.post('/login', passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true
  }), (req, res) => {
    const redirectTo = req.session.returnTo || '/';
    console.log('redirectTo:', redirectTo);
    delete req.session.returnTo;
    res.redirect(redirectTo);
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
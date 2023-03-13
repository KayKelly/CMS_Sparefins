const express = require('express');
const router = express.Router();
const Post = require('../../models/Post'); 
const Category = require('../../models/Category'); 
const Comment = require('../../models/Comment'); 
const User = require('../../models/User'); 
const faker = require('faker');
const {userAuthenticated} = require('../../helpers/authentication');

router.all('/*', (req, res, next)=>{
   if(req.user && req.user.admin){
    req.app.locals.layout = 'admin';
    next();
   } else {
    req.flash('error_message', 'You are not allowed to view this page');
    res.redirect('back');
   }
});

router.get('/', (req, res)=>{
    const promises = [
        Post.count().exec(),
        Category.count().exec(),
        Comment.count().exec()
    ];
    Promise.all(promises).then(([postCount, categoryCount, commentCount])=>{
        res.render('admin/index', {postCount: postCount, categoryCount: categoryCount, commentCount: commentCount});
    })
    // Post.count({}).then(postCount=>{

    //     res.render('admin/index', {postCount: postCount});
    // })
});

router.post('/generate-fake-posts', userAuthenticated, (req, res)=>{
    for(let i = 0; i < req.body.amount; i++){
        let post = new Post();
        post.title = faker.name.title();
        post.status = 'Public';
        post.allowComments = faker.datatype.boolean();
        post.body = faker.lorem.sentence();

        post.save().then(savedPost=>{});
    }
    res.redirect('/admin/posts');
});


module.exports = router;
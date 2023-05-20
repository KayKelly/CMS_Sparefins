const express = require('express');
const router = express.Router();
const Post = require('../../models/Post');
const AWS = require('aws-sdk');
const sharp = require('sharp');

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();

router.post('/add-listing', (req, res)=>{
    let errors = [];

    if(!req.body.listingTitle){
        errors.push({message: 'please add a title'});
    }
    if(errors.length > 0){
        res.render('home/listings/add-listing', {
            errors: errors
        })
    } else {
        let filename = '';

    if (req.files && req.files.file && req.files.file.size > 0) {
        let file = req.files.file;
        filename = `${Date.now()}-${file.name}`;

        console.log('File received:', filename);

        sharp(file.data)
            .toBuffer()
            .then(data =>{
                
                const params = {
                    Bucket: process.env.S3_BUCKET,
                    Key: filename,
                    Body: data,
                    ContentType: file.mimetype,
                };
                
                console.log('S3 upload params:', params);
                console.log(process.env.TEST);
                
                s3.upload(params, (err, data)=> {
                    if (err) {
                        console.log(`Could not upload file because ${err}`);
                        return;
                    }
                    console.log(`File uploaded successfully. Location: ${data.Location}`);
                });
            })
            .catch(error =>{
                console.log('Error compressing the image:', error);
            });
            
            } else {
                console.log('No file received');
            };

        const newPost = new Post({
            user: req.user.id,
            title: req.body.listingTitle,
            description: req.body.description,
            file: filename,
            type: req.body.finType,
            size: req.body.finSize,
            setup: req.body.finSetup
        })
        newPost.save().then(savedPost =>{
            console.log(savedPost);
            req.flash('success_message', `Post ${savedPost.title} was created successfully`);
            res.redirect('/');
        }).catch(error =>{
            console.log(`Could not save the post because ${error}`);
        });   
    }
});

router.get('/edit/:id', (req, res)=>{
    Post.findOne({_id: req.params.id}).then(post=>{
         res.render('home/listings/edit-listing', {post: post});
    })
    .catch(error => console.log(error));
});

router.put('/edit/:id', (req, res)=>{

    let filename = '';

    if (req.files && req.files.file && req.files.file.size > 0) {
        let file = req.files.file;
        filename = `${Date.now()}-${file.name}`;

        console.log('File received:', filename);

        sharp(file.data)
            .toBuffer()
            .then(data =>{
                
                const params = {
                    Bucket: process.env.S3_BUCKET,
                    Key: filename,
                    Body: data,
                    ContentType: file.mimetype,
                };
                
                console.log('S3 upload params:', params);
                console.log(process.env.TEST);
                
                s3.upload(params, (err, data)=> {
                    if (err) {
                        console.log(`Could not upload file because ${err}`);
                        return;
                    }
                    console.log(`File uploaded successfully. Location: ${data.Location}`);
                });
            })
            .catch(error =>{
                console.log('Error compressing the image:', error);
            });
            
            } else {
                filename = req.body.existingFile;
                console.log('No file received');
            };
    
    Post.findOne({_id: req.params.id}).then(post=>{
        post.user = req.user.id;
        post.title = req.body.title;
        post.body = req.body.description;
        post.file = filename;
        post.type = req.body.finType;
        post.size = req.body.finSize;
        post.setup = req.body.finSetup;

        post.save().then(updatedPost=>{
            req.flash('success_message', `Post ${updatedPost.title} was updated successfully`);
            res.redirect(`/edit-profile/${post.user}`);
        });
    });
});

router.delete('/:id', (req, res)=>{
    Post.findOne({_id: req.params.id})
        .then(post=>{
                post.remove().then(postRemoved=>{
                    req.flash('delete_message', `${postRemoved.title} was deleted successfully`);
                    res.redirect(req.get('referer'));
                });
            });
        });

module.exports = router;

const express = require('express');
const router = express.Router();
const Post = require('../../models/Post');
const AWS = require('aws-sdk');
const sharp = require('sharp');
const { body, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');

AWS.config.update({
  accessKeyId: process.env.AMAZ_ACCESS_KEY_ID,
  secretAccessKey: process.env.AMAZ_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();

router.post(
    '/add-listing',
    [
        body('listingTitle').trim().notEmpty().withMessage('Please add a title'),
        body('description').trim().notEmpty().withMessage('Please add a description'),
        body('price').trim().notEmpty().withMessage('Please add a price')
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(error => error.msg);
            res.render('home/listings/add-listing', { error_message: errorMessages });
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
            title: sanitizeHtml(req.body.listingTitle),
            description: sanitizeHtml(req.body.description),
            price: sanitizeHtml(req.body.price),
            file: filename,
            type: req.body.finType,
            size: req.body.finSize,
            setup: req.body.finSetup,
            position: req.body.finPosition
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
        post.title = sanitizeHtml(req.body.title);
        post.body = sanitizeHtml(req.body.description);
        post.price = sanitizeHtml(req.body.price);
        post.file = filename;
        post.type = req.body.finType;
        post.size = req.body.finSize;
        post.setup = req.body.finSetup;
        post.position = req.body.finPosition;

        post.save().then(updatedPost=>{
            req.flash('success_message', `Post ${updatedPost.title} was updated successfully`);
            res.redirect(`/your-profile/${post.user}`);
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

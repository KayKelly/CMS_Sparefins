const express = require('express');
const router = express.Router();
const Message = require('../../models/Message');
const User = require('../../models/User');
const Post = require('../../models/Post');

router.get('/:id', (req, res) => {
    Message.find({ recipient: req.user._id })
      .populate('sender', 'firstName')
      .populate('recipient', 'firstName')
      .populate('originalPost', 'title')
      .sort({ createdAt: 'desc' })
      .then(messages => {
        messages.forEach(message =>{
        if (!message.read) {
          message.read = true;
          message.save();
        }
      })
        res.render('home/messages', { messages: messages, senderName: req.user.firstName });
      })
      .catch(error => {
        console.log(`Could not get the messages because ${error}`);
        res.redirect('/');
      })
  })
  

  router.post('/send-message/:recipientId/:slug', async (req, res) => {
    try {
      const sender = await User.findById(req.user.id);
  
      const recipient = await User.findById(req.params.recipientId);

      const post = await Post.findOne({ slug: req.params.slug });

      console.log(post);
      console.log(sender);
      console.log(recipient);
  
      const newMessage = new Message({
        sender: sender._id,
        senderName: sender.firstName,
        recipient: recipient._id,
        recipientName: recipient.firstName,
        messageBody: req.body.message,
        originalPost: post._id,
        originalPostTitle: post.title
      });
  
      // Save the message to the database
      const savedMessage = await newMessage.save();
  
      console.log(savedMessage);
      req.flash('success_message', 'Message sent!');
      res.redirect('/');
    } catch (error) {
      console.log(`Could not send message because ${error}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  }); 

  router.post('/delete-message/:id', async (req, res) => {
    try {
      const deletedMessage = await Message.findByIdAndDelete(req.params.id);
      if (!deletedMessage) {
        req.flash('error_message', 'Message not found');
        return res.redirect('/messages');
      }
      req.flash('success_message', 'Message deleted successfully');
      res.redirect(req.get('referer'));
    } catch (error) {
      console.log(`Could not delete message because ${error}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  



module.exports = router;
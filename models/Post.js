const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const URLSlugs = require('mongoose-url-slugs');
const PostSchema = new Schema({
    category: {
        type: Schema.Types.ObjectId,
        ref: 'categories'
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'users'
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    type: {
        type: String,
    },
    size: {
        type: String,
    },
    setup: {
        type: String,
    },
    file: {
        type: String,
    },
    date: {
        type: Date,
        default: Date.now()
    },
    slug: {
        type: String
    },
    messages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    }]
});

PostSchema.plugin(URLSlugs('title', {field: 'slug'}));

module.exports = mongoose.model('Post', PostSchema);

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const FinSchema = new Schema({
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
    }
});


module.exports = mongoose.model('Fin', FinSchema);

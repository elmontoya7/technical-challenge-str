// libraries
const { Schema, model } = require('mongoose');

const schema = new Schema({
  type: {
    type: String,
    required: true,
    // unique: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  // soft-delete properties
  is_deleted: {
    type: Boolean,
    default: false
  },
  deleted_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

const Model = model("Transaction", schema);
module.exports = Model;
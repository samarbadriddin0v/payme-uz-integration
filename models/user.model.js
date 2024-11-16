const { Schema, model } = require('mongoose')

const userSchema = new Schema({ fullName: String }, { timestamps: true })

module.exports = model('User', userSchema)

require('dotenv').config()

const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')

const errorMiddleware = require('./middlewares/error.middleware')

const app = express()

app.use(cors({ credentials: true, origin: process.env.CLIENT_URL }))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use('/api', require('./routes/index'))

app.use(errorMiddleware)

const bootstrap = async () => {
	try {
		const PORT = process.env.PORT || 8080
		mongoose.connect(process.env.MONOGO_URI).then(() => console.log('Connected DB'))
		app.listen(PORT, () => console.log(`Listening on - http://localhost:${PORT}`))
	} catch (error) {
		console.log(`Error connecting with DB: ${error}`)
	}
}

bootstrap()

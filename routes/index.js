const transactionController = require('../controllers/transaction.controller')
const { paymeCheckToken } = require('../middlewares/payme.middleware')

const router = require('express').Router()

router.post('/transaction/payme', paymeCheckToken, transactionController.payme)

module.exports = router

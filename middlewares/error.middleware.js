const BaseError = require('../errors/base.error')

module.exports = function (err, req, res, next) {
	if (err.isTransactionError) {
		return res.json({
			error: { code: err.transactionErrorCode, message: err.transactionErrorMessage, data: err.transactionData },
			id: err.transactionId,
		})
	}

	if (err instanceof BaseError) {
		return res.status(err.status).json({ message: err.message, errors: err.errors })
	}

	return res.status(500).json({ message: err.message })
}

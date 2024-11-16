const { default: mongoose } = require('mongoose')
const TransactionError = require('../errors/transaction.error')
const { PaymeError, PaymeData, TransactionState } = require('../enum/transaction.enum')

const userModel = require('../models/user.model')
const productModel = require('../models/product.model')
const transactionModel = require('../models/transaction.model')

class TransactionService {
	async checkPerformTransaction(params, id) {
		let { account, amount } = params

		if (!mongoose.Types.ObjectId.isValid(account.user_id)) {
			throw new TransactionError(PaymeError.UserNotFound, id, PaymeData.UserId)
		}
		if (!mongoose.Types.ObjectId.isValid(account.product_id)) {
			throw new TransactionError(PaymeError.ProductNotFound, id, PaymeData.ProductId)
		}

		amount = Math.floor(amount / 100)
		const user = await userModel.findById(account.user_id)
		if (!user) {
			throw new TransactionError(PaymeError.UserNotFound, id, PaymeData.UserId)
		}
		const product = await productModel.findById(account.product_id)
		if (!product) {
			throw new TransactionError(PaymeError.ProductNotFound, id, PaymeData.ProductId)
		}
		if (amount !== product.price) {
			throw new TransactionError(PaymeError.InvalidAmount, id)
		}
	}

	async checkTransaction(params, id) {
		const transaction = await transactionModel.findOne({ id: params.id })
		if (!transaction) {
			throw new TransactionError(PaymeError.TransactionNotFound, id)
		}
		return {
			create_time: transaction.create_time,
			perform_time: transaction.perform_time,
			cancel_time: transaction.cancel_time,
			transaction: transaction.id,
			state: transaction.state,
			reason: transaction.reason,
		}
	}

	async createTransaction(params, id) {
		let { account, time, amount } = params

		amount = Math.floor(amount / 100)

		await this.checkPerformTransaction(params, id)

		let transaction = await transactionModel.findOne({ id: params.id })
		if (transaction) {
			if (transaction.state !== TransactionState.Pending) {
				throw new TransactionError(PaymeError.CantDoOperation, id)
			}
			const currentTime = Date.now()
			const expirationTime = (currentTime - transaction.create_time) / 60000 < 12
			if (!expirationTime) {
				await transactionModel.findOneAndUpdate({ id: params.id }, { state: TransactionState.PendingCanceled, reason: 4 })
				throw new TransactionError(PaymeError.CantDoOperation, id)
			}
			return {
				create_time: transaction.create_time,
				transaction: transaction.id,
				state: TransactionState.Pending,
			}
		}

		transaction = await transactionModel.findOne({ user: account.user_id, product: account.product_id, provider: 'payme' })
		if (transaction) {
			if (transaction.state === TransactionState.Paid) throw new TransactionError(PaymeError.AlreadyDone, id)
			if (transaction.state === TransactionState.Pending) throw new TransactionError(PaymeError.Pending, id)
		}

		const newTransaction = await transactionModel.create({
			id: params.id,
			state: TransactionState.Pending,
			amount,
			user: account.user_id,
			product: account.product_id,
			create_time: time,
			provider: 'payme',
		})

		return {
			transaction: newTransaction.id,
			state: TransactionState.Pending,
			create_time: newTransaction.create_time,
		}
	}

	async performTransaction(params, id) {
		const currentTime = Date.now()

		const transaction = await transactionModel.findOne({ id: params.id })
		if (!transaction) {
			throw new TransactionError(PaymeError.TransactionNotFound, id)
		}
		if (transaction.state !== TransactionState.Pending) {
			if (transaction.state !== TransactionState.Paid) {
				throw new TransactionError(PaymeError.CantDoOperation, id)
			}
			return {
				perform_time: transaction.perform_time,
				transaction: transaction.id,
				state: TransactionState.Paid,
			}
		}
		const expirationTime = (currentTime - transaction.create_time) / 60000 < 12
		if (!expirationTime) {
			await transactionModel.findOneAndUpdate(
				{ id: params.id },
				{ state: TransactionState.PendingCanceled, reason: 4, cancel_time: currentTime }
			)
			throw new TransactionError(PaymeError.CantDoOperation, id)
		}

		await transactionModel.findOneAndUpdate({ id: params.id }, { state: TransactionState.Paid, perform_time: currentTime })

		return {
			perform_time: currentTime,
			transaction: transaction.id,
			state: TransactionState.Paid,
		}
	}

	async cancelTransaction(params, id) {
		const transaction = await transactionModel.findOne({ id: params.id })

		if (!transaction) {
			throw new TransactionError(PaymeError.TransactionNotFound, id)
		}

		const currentTime = Date.now()

		if (transaction.state > 0) {
			await transactionModel.findOneAndUpdate(
				{ id: params.id },
				{ state: -Math.abs(transaction.state), reason: params.reason, cancel_time: currentTime }
			)
		}

		return {
			cancel_time: transaction.cancel_time || currentTime,
			transaction: transaction.id,
			state: -Math.abs(transaction.state),
		}
	}

	async getStatement(params) {
		const { from, to } = params
		const transactions = await transactionModel.find({ create_time: { $gte: from, $lte: to }, provider: 'payme' })

		return transactions.map(transaction => ({
			id: transaction.id,
			time: transaction.create_time,
			amount: transaction.amount,
			account: {
				user_id: transaction.user,
				product_id: transaction.product,
			},
			create_time: transaction.create_time,
			perform_time: transaction.perform_time,
			cancel_time: transaction.cancel_time,
			transaction: transaction.id,
			state: transaction.state,
			reason: transaction.reason,
		}))
	}
}

module.exports = new TransactionService()

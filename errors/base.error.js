module.exports = class BaseError extends Error {
	status
	errors
	name
	statusCode

	constructor(status, message, errors = [], name, statusCode) {
		super(message)
		this.status = status
		this.errors = errors
		this.name = name
		this.statusCode = statusCode
	}

	static BadRequest(message, errors = []) {
		return new BaseError(400, message, errors)
	}

	static Unauthorized() {
		return new BaseError(401, 'Unauthorized')
	}
}

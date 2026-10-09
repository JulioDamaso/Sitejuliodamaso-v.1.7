import logger from '../utils/logger.js';
import { NodeEnv } from '../constants/common.js';

const errorMiddleware = (err, req, res, next) => {
	const message = err?.message || 'Não foi possível concluir a operação.';
	logger.error(message, err?.stack);

	if (res.headersSent) {
		return next(err);
	}

	const status = Number(err?.statusCode || err?.status) >= 400 ? Number(err.statusCode || err.status) : 500;
	res.status(status).json({
		message,
		error: message,
		...(err?.code && { code: err.code }),
		...(typeof err?.retryable === 'boolean' && { retryable: err.retryable }),
		...(err?.sourceStatus && { sourceStatus: err.sourceStatus }),
		...(process.env.NODE_ENV !== NodeEnv.Production && {
			details: {
				name: err.name,
				message,
				stack: err.stack,
			},
		}),
	});
};

export default errorMiddleware;
export { errorMiddleware };

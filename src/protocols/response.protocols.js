
class ApiResponse {
  constructor({ success, message, data = null, error = null, statusCode = 200 }) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.error = error;
    this.statusCode = statusCode;
  }

  static create({ success, message, data = null, error = null, statusCode = 200 }) {
    return new ApiResponse({ success, message, data, error, statusCode });
  }

  static success({ message = 'Success', data = null, statusCode = 200 }) {
    return new ApiResponse({ success: true, message, data, statusCode });
  }

  static error({ message = 'Error', error = null, statusCode = 500 }) {
    return new ApiResponse({ success: false, message, error, statusCode });
  }

  send(res) {
    return res.status(this.statusCode).json(this);
  }
}

export function apiResponse({ success, message, data = null, error = null, statusCode = 200 }) {
  return ApiResponse.create({ success, message, data, error, statusCode });
}

export function successResponse(res, { message = 'Success', data = null, statusCode = 200 }) {
  return ApiResponse.success({ message, data, statusCode }).send(res);
}

export function errorResponse(res, { message = 'Error', error = null, statusCode = 500 }) {
  return ApiResponse.error({ message, error, statusCode }).send(res);
}

export default ApiResponse;

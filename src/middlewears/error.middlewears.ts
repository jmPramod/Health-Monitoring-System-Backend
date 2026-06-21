interface CustomError extends Error {
  status: number;
  data: any;
}

const createError = (status: number, message: string): CustomError => {
  const error = new Error(message) as CustomError;
  error.status = status;
  error.data = null;
  return error;
};

export default createError;

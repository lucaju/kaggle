import mongoose from 'mongoose';

export const connect = async () => {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) return false;

  const mongo = await mongoose.connect(MONGO_URI).catch((error) => console.warn(error));
  return !!mongo;
};

export const close = () => mongoose.connection.close();

export default {
  connect,
  close,
};

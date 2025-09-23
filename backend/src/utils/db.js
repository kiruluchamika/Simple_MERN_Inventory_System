import mongoose from 'mongoose';

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('MONGO_URI not set in .env');
  process.exit(1);
}

mongoose.set('strictQuery', true);

mongoose
  .connect(uri)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((e) => {
    console.error('Mongo connect error:', e);
    process.exit(1);
  });

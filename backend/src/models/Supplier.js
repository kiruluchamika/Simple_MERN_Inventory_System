import mongoose from 'mongoose';
const { Schema } = mongoose;

const supplierSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },

    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },

    company: { type: String, required: true },

    products: [{ type: String }], // simple list; can be expanded to ObjectId refs if you add a Product model

    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'active'
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

// keep updatedAt fresh
supplierSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Supplier', supplierSchema);

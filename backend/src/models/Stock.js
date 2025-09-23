import mongoose from 'mongoose';
const { Schema } = mongoose;

/**
 * Matches your screenshot:
 * - itemName: String, required
 * - category: ObjectId (you can later ref a Category model if you create one)
 * - quantity: Number, required
 * - unit: String (kg, L, pieces, etc.)
 * - threshold: Number (min level before alert), default 0
 * - supplierId: ObjectId ref 'Supplier'
 * - expiryDate: Date (optional, for perishables)
 * - lastUpdated: Date default now
 */
const stockSchema = new Schema(
  {
    itemName: { type: String, required: true },
    // Store simple free-text category (e.g., "Beverages", "Hardware")
    category: { type: String, trim: true },
    quantity: { type: Number, required: true },
    unit: { type: String }, // "kg", "liters", "pieces"
    threshold: { type: Number, default: 0 },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    expiryDate: { type: Date }, // optional
    lastUpdated: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

stockSchema.pre('save', function (next) {
  this.lastUpdated = Date.now();
  next();
});

export default mongoose.model('Stock', stockSchema);

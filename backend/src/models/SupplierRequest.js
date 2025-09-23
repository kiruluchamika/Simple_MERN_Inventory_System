import mongoose from 'mongoose';
const { Schema } = mongoose;

/**
 * Request lifecycle:
 * - draft -> sent -> confirmed -> received -> closed/cancelled
 */
const supplierRequestSchema = new Schema(
  {
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },

    items: [
      {
        stock: { type: Schema.Types.ObjectId, ref: 'Stock' }, // optional link to a stock item
        name: { type: String, required: true },               // fallback free-text
        quantity: { type: Number, required: true },
        unit: { type: String } // e.g., kg, pieces
      }
    ],

    notes: String,

    status: {
      type: String,
      enum: ['draft', 'sent', 'confirmed', 'received', 'cancelled', 'closed'],
      default: 'draft'
    },

    emailSentAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

supplierRequestSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('SupplierRequest', supplierRequestSchema);

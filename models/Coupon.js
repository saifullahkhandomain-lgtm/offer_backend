const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store'
    },
    storeName: {
        type: String,
        required: true
    },
    storeLogo: String,
    storeLogoType: {
        type: String,
        enum: ['text', 'emoji', 'url', 'upload'],
        default: 'emoji'
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    code: String,
    type: {
        type: String,
        enum: ['Code', 'Deal'],
        required: true
    },
    discount: String,
    expiry: String,
    link: String, // Store URL where coupon can be used
    category: String,
    relatedCoupons: [String], // Array of additional coupon codes for this offer
    usageCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isTrending: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

CouponSchema.index({ isActive: 1, createdAt: -1 });
CouponSchema.index({ storeId: 1, isActive: 1 });
CouponSchema.index({ storeName: 1, isActive: 1 });
CouponSchema.index({ category: 1, isActive: 1 });
CouponSchema.index({ isTrending: 1, isActive: 1 });
CouponSchema.index({ title: 'text', storeName: 'text', description: 'text' });

module.exports = mongoose.model('Coupon', CouponSchema);

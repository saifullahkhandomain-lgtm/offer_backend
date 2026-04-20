const mongoose = require('mongoose');

const siteSettingSchema = new mongoose.Schema({
    socialLinks: {
        facebook: { type: String, default: '' },
        instagram: { type: String, default: '' },
        twitter: { type: String, default: '' },
        youtube: { type: String, default: '' },
        tiktok: { type: String, default: '' },
        linkedin: { type: String, default: '' }
    },
    general: {
        siteName: { type: String, default: 'GrabYourPromos' },
        contactEmail: { type: String, default: '' }
    },
    lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
}, { timestamps: true });

// Ensure only one document exists
siteSettingSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

module.exports = mongoose.model('SiteSetting', siteSettingSchema);

const mongoose = require('mongoose');
require('dotenv').config();

const SiteSetting = require('../models/SiteSetting');

async function seedSettings() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        // Check if settings exist
        const setting = await SiteSetting.findOne();
        if (setting) {
            console.log('Settings already exist. Updating social links...');
            setting.socialLinks = {
                facebook: 'https://facebook.com/grabyourpromos',
                instagram: 'https://instagram.com/grabyourpromos',
                twitter: 'https://twitter.com/grabyourpromos',
                youtube: 'https://youtube.com/grabyourpromos',
                linkedin: 'https://linkedin.com/company/grabyourpromos',
                tiktok: 'https://tiktok.com/@grabyourpromos'
            };
            await setting.save();
            console.log('✅ Updated existing settings with social links.');
        } else {
            console.log('Creating new settings...');
            await SiteSetting.create({
                siteName: 'GrabYourPromos',
                description: 'Best coupons and deals',
                socialLinks: {
                    facebook: 'https://facebook.com/grabyourpromos',
                    instagram: 'https://instagram.com/grabyourpromos',
                    twitter: 'https://twitter.com/grabyourpromos',
                    youtube: 'https://youtube.com/grabyourpromos',
                    linkedin: 'https://linkedin.com/company/grabyourpromos',
                    tiktok: 'https://tiktok.com/@grabyourpromos'
                }
            });
            console.log('✅ Created new settings with social links.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected.');
    }
}

seedSettings();

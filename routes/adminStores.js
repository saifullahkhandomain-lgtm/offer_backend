const express = require('express');
const router = express.Router();
const Store = require('../models/Store');
const { protect } = require('../middleware/auth');
const { invalidateCache } = require('../utils/cache');

// @route   GET /api/admin/stores
// @desc    Get all stores (for admin)
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const stores = await Store.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            count: stores.length,
            data: stores
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @route   POST /api/admin/stores
// @desc    Create new store
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const store = await Store.create(req.body);
        invalidateCache('stores');
        res.status(201).json({
            success: true,
            data: store
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @route   PUT /api/admin/stores/:id
// @desc    Update store
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        const store = await Store.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!store) {
            return res.status(404).json({ error: 'Store not found' });
        }

        invalidateCache('stores', `store:${store.name.trim().toLowerCase().replace(/\s+/g, '-')}`);
        res.json({
            success: true,
            data: store
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @route   DELETE /api/admin/stores/:id
// @desc    Delete store
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const store = await Store.findByIdAndDelete(req.params.id);

        if (!store) {
            return res.status(404).json({ error: 'Store not found' });
        }

        invalidateCache('stores', `store:${store.name.trim().toLowerCase().replace(/\s+/g, '-')}`);
        res.json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

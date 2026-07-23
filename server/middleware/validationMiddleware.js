import { body, param, query, validationResult } from 'express-validator';

// Middleware to handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// Auth validation rules
export const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and numbers'),
  body('role')
    .optional()
    .isIn(['student', 'staff']).withMessage('Role must be student or staff'),
];

export const validateLogin = [
  body('email')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
];

// Reservation validation rules
export const validateReservation = [
  body('slot')
    .notEmpty().withMessage('Slot ID is required')
    .isMongoId().withMessage('Invalid slot ID'),
  body('bookingDate')
    .notEmpty().withMessage('Booking date is required')
    .isISO8601().withMessage('Invalid date format'),
  body('arrivalTime')
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Invalid arrival time format (HH:mm)'),
  body('departureTime')
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Invalid departure time format (HH:mm)'),
  body('departureTime').custom((value, { req }) => {
    if (value <= req.body.arrivalTime) {
      throw new Error('Departure time must be after arrival time');
    }
    return true;
  }),
];

// User update validation
export const validateUserUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
  body('phoneNumber')
    .optional()
    .matches(/^[0-9+\-\s()]+$/).withMessage('Invalid phone number'),
  body('vehicleNumber')
    .optional()
    .trim()
    .matches(/^[A-Z0-9\-]+$/i).withMessage('Invalid vehicle number format'),
];

// Parking slot validation
export const validateSlot = [
  body('slotNumber')
    .notEmpty().withMessage('Slot number is required')
    .trim(),
  body('area')
    .notEmpty().withMessage('Area ID is required')
    .isMongoId().withMessage('Invalid area ID'),
  body('type')
    .notEmpty().withMessage('Slot type is required')
    .isIn(['regular', 'accessible', 'reserved']).withMessage('Invalid slot type'),
];

// Parking area validation
export const validateArea = [
  body('name')
    .notEmpty().withMessage('Area name is required')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Area name must be between 2 and 100 characters'),
  body('location')
    .notEmpty().withMessage('Location is required'),
  body('totalSlots')
    .isInt({ min: 1 }).withMessage('Total slots must be a positive number'),
];

// ID validation for mongo documents
export const validateMongoId = [
  param('id')
    .isMongoId().withMessage('Invalid ID format'),
];

// Query pagination validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive number'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

export const validateRequest = (schema) => {
  return (req, res, next) => {
    const errors = [];

    for (const field in schema) {
      const rules = schema[field];
      const value = req.body[field];

      const isEmpty =
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '');

      // Required field check
      if (rules.required && isEmpty) {
        errors.push({ field, message: `${field} is required` });
        continue;
      }

    
      if (isEmpty && !rules.required) continue;

      // Validate by type
      switch (rules.type) {
        case 'date':
          const parsedDate = new Date(value);
          if (isNaN(parsedDate.getTime())) {
            errors.push({ field, message: `${field} must be a valid date` });
          } else if (rules.maxDate && parsedDate > rules.maxDate) {
            errors.push({ field, message: `${field} cannot be in the future` });
          }
          break;

        case 'number':
          if (typeof value !== 'number') {
            errors.push({ field, message: `${field} must be a number` });
          } else {
            if (rules.min !== undefined && value < rules.min) {
              errors.push({ field, message: `${field} must be at least ${rules.min}` });
            }
            if (rules.max !== undefined && value > rules.max) {
              errors.push({ field, message: `${field} cannot exceed ${rules.max}` });
            }
          }
          break;

        case 'string':
          if (typeof value !== 'string') {
            errors.push({ field, message: `${field} must be a string` });
          } else {
            if (rules.maxLength && value.length > rules.maxLength) {
              errors.push({ field, message: `${field} cannot exceed ${rules.maxLength} characters` });
            }
            if (rules.enum && !rules.enum.includes(value)) {
              errors.push({ field, message: `${field} must be one of: ${rules.enum.join(', ')}` });
            }
          }
          break;

        case 'array':
          if (!Array.isArray(value)) {
            errors.push({ field, message: `${field} must be an array` });
          } else {
            value.forEach((item, index) => {
              if (rules.items?.type === 'string' && typeof item !== 'string') {
                errors.push({ field, message: `Item ${index + 1} in ${field} must be a string` });
              }
              if (rules.items?.enum && !rules.items.enum.includes(item)) {
                errors.push({ field, message: `Invalid value '${item}' in ${field}` });
              }
            });
          }
          break;

        default:
          break;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    next();
  };
};

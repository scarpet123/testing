const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  videoUrl: {
    type: String,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true,
    min: 1
  },
  order: {
    type: Number,
    required: true
  },
  isPreview: {
    type: Boolean,
    default: false
  },
  resources: [{
    title: String,
    url: String,
    type: {
      type: String,
      enum: ['pdf', 'doc', 'zip', 'link'],
      default: 'link'
    }
  }]
});

const sectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  order: {
    type: Number,
    required: true
  },
  lectures: [lectureSchema]
});

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  subtitle: {
    type: String,
    required: [true, 'Course subtitle is required'],
    trim: true,
    maxlength: [200, 'Subtitle cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    trim: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Instructor is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['web-development', 'mobile-development', 'data-science', 'design', 'business', 'marketing'],
      message: '{VALUE} is not a valid category'
    }
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    default: 0
  },
  originalPrice: {
    type: Number,
    min: [0, 'Original price cannot be negative']
  },
  isFree: {
    type: Boolean,
    default: false
  },
  thumbnail: {
    type: String,
    required: [true, 'Thumbnail is required']
  },
  promotionalVideo: {
    type: String,
    default: ''
  },
  sections: [sectionSchema],
  ratings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    review: {
      type: String,
      trim: true,
      maxlength: [500, 'Review cannot be more than 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  studentsEnrolled: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  totalStudents: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  totalHours: {
    type: Number,
    default: 0
  },
  level: {
    type: String,
    enum: {
      values: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
      message: '{VALUE} is not a valid level'
    },
    default: 'All Levels'
  },
  language: {
    type: String,
    default: 'English'
  },
  requirements: [{
    type: String,
    trim: true
  }],
  learningOutcomes: [{
    type: String,
    trim: true
  }],
  hasAssignments: {
    type: Boolean,
    default: false
  },
  hasMaterials: {
    type: Boolean,
    default: false
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for better query performance
courseSchema.index({ instructor: 1, createdAt: -1 });
courseSchema.index({ category: 1, isPublished: 1, isApproved: 1 });
courseSchema.index({ isPublished: 1, isApproved: 1, createdAt: -1 });

// Calculate total hours before saving
courseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate total hours from all lectures
  let totalMinutes = 0;
  this.sections.forEach(section => {
    section.lectures.forEach(lecture => {
      totalMinutes += lecture.duration || 0;
    });
  });
  this.totalHours = Math.round((totalMinutes / 60) * 10) / 10; // Round to 1 decimal
  
  // Set isFree based on price
  this.isFree = this.price === 0;
  
  // Calculate average rating
  if (this.ratings.length > 0) {
    const totalRating = this.ratings.reduce((sum, rating) => sum + rating.rating, 0);
    this.averageRating = Math.round((totalRating / this.ratings.length) * 10) / 10;
    this.totalRatings = this.ratings.length;
  }
  
  // Update total students
  this.totalStudents = this.studentsEnrolled.length;
  
  next();
});

// Static method to get published courses
courseSchema.statics.getPublishedCourses = function() {
  return this.find({ isPublished: true, isApproved: true })
    .populate('instructor', 'name profilePicture')
    .sort({ createdAt: -1 });
};

// Instance method to check if user is enrolled
courseSchema.methods.isUserEnrolled = function(userId) {
  return this.studentsEnrolled.includes(userId);
};

// Instance method to add rating
courseSchema.methods.addRating = async function(userId, rating, review = '') {
  // Check if user already rated
  const existingRating = this.ratings.find(r => r.user.toString() === userId);
  
  if (existingRating) {
    existingRating.rating = rating;
    existingRating.review = review;
    existingRating.createdAt = new Date();
  } else {
    this.ratings.push({
      user: userId,
      rating,
      review,
      createdAt: new Date()
    });
  }
  
  await this.save();
  return this;
};

// Virtual for discount percentage
courseSchema.virtual('discountPercentage').get(function() {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  return 0;
});

// Ensure virtual fields are serialized
courseSchema.set('toJSON', { virtuals: true });
courseSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Course', courseSchema);
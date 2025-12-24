import { sequelize } from '../config/database.js';
import defineUser from './user.js';
import defineImage from './image.js';

// Initialize models
const User = defineUser(sequelize);
const Image = defineImage(sequelize);

// Set up associations
User.hasMany(Image, {
  foreignKey: 'userId',
  as: 'images',
  onDelete: 'CASCADE'
});

Image.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Export models and sequelize instance
export {
  sequelize,
  User,
  Image
};

export default {
  sequelize,
  User,
  Image
};


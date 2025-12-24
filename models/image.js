import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Image = sequelize.define('Image', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'original_name'
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    mimeType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'mime_type',
      validate: {
        isIn: {
          args: [['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff']],
          msg: 'Invalid image type'
        }
      }
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        max: {
          args: [10485760], // 10MB
          msg: 'File size cannot exceed 10MB'
        }
      }
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    path: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    thumbnailPath: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'thumbnail_path'
    },
    transformations: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    isProcessing: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_processing'
    },
    processingStatus: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      defaultValue: 'completed',
      field: 'processing_status'
    },
    processingError: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'processing_error'
    },
    lastTransformedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_transformed_at'
    }
  }, {
    tableName: 'images',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['processing_status']
      }
    ]
  });

  // Define associations
  Image.associate = (models) => {
    Image.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'CASCADE'
    });
  };

  return Image;
};


import { Sequelize } from 'sequelize';
import readlineSync from 'readline-sync';

const sequelize = new Sequelize(
  process.env.DB_NAME || 'image_processing_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

/**
 * Initialize database with user prompt for existing database
 */
export const initializeDatabase = async () => {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Check if tables exist
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'images')
    `);

    if (results.length > 0) {
      console.log('⚠️  Existing tables found:', results.map(r => r.table_name).join(', '));
      
      // In non-interactive mode (like when running as a service), skip the prompt
      if (process.env.FORCE_SYNC === 'true') {
        console.log('🔄 Force sync enabled. Recreating tables...');
        await sequelize.sync({ force: true });
        console.log('✅ Database tables recreated successfully.');
      } else if (process.env.SKIP_SYNC_PROMPT === 'true') {
        console.log('📦 Using existing database tables.');
        await sequelize.sync({ alter: false });
      } else {
        const answer = readlineSync.question('Do you want to recreate the database tables? (yes/no): ');
        
        if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
          console.log('🔄 Recreating database tables...');
          await sequelize.sync({ force: true });
          console.log('✅ Database tables recreated successfully.');
        } else {
          console.log('📦 Using existing database tables.');
          await sequelize.sync({ alter: false });
        }
      }
    } else {
      console.log('🆕 No existing tables found. Creating new tables...');
      await sequelize.sync({ force: true });
      console.log('✅ Database tables created successfully.');
    }

    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    throw error;
  }
};

export { sequelize };
export default sequelize;

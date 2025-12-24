import amqp from 'amqplib';

let connection = null;
let channel = null;

const QUEUE_NAME = process.env.RABBITMQ_QUEUE || 'image_transformations';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://127.0.0.1:5672';

/**
 * Connect to RabbitMQ
 */
export const connectRabbitMQ = async () => {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    
    // Assert queue exists
    await channel.assertQueue(QUEUE_NAME, {
      durable: true // Queue survives broker restart
    });
    
    console.log('✅ Connected to RabbitMQ');
    console.log(`📬 Queue "${QUEUE_NAME}" is ready`);
    
    // Handle connection close
    connection.on('close', () => {
      console.log('⚠️  RabbitMQ connection closed');
    });
    
    connection.on('error', (err) => {
      console.error('❌ RabbitMQ connection error:', err.message);
    });
    
    return { connection, channel };
  } catch (error) {
    console.error('❌ Failed to connect to RabbitMQ:', error.message);
    console.log('🔄 Retrying in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    return connectRabbitMQ();
  }
};

/**
 * Get the channel
 */
export const getChannel = () => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }
  return channel;
};

/**
 * Publish message to queue
 */
export const publishToQueue = async (message) => {
  try {
    const ch = getChannel();
    const messageBuffer = Buffer.from(JSON.stringify(message));
    
    ch.sendToQueue(QUEUE_NAME, messageBuffer, {
      persistent: true // Message survives broker restart
    });
    
    console.log(`📤 Message published to queue: ${message.jobId}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to publish message:', error.message);
    throw error;
  }
};

/**
 * Consume messages from queue
 */
export const consumeFromQueue = async (callback) => {
  try {
    const ch = getChannel();
    
    // Process one message at a time
    ch.prefetch(1);
    
    console.log(`👂 Waiting for messages in queue "${QUEUE_NAME}"...`);
    
    ch.consume(QUEUE_NAME, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          console.log(`📥 Received job: ${content.jobId}`);
          
          await callback(content);
          
          // Acknowledge message
          ch.ack(msg);
          console.log(`✅ Job completed: ${content.jobId}`);
        } catch (error) {
          console.error(`❌ Error processing job:`, error.message);
          // Reject and requeue the message
          ch.nack(msg, false, true);
        }
      }
    });
  } catch (error) {
    console.error('❌ Failed to consume messages:', error.message);
    throw error;
  }
};

/**
 * Close RabbitMQ connection
 */
export const closeConnection = async () => {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('🔌 RabbitMQ connection closed');
  } catch (error) {
    console.error('❌ Error closing RabbitMQ connection:', error.message);
  }
};

export { QUEUE_NAME };

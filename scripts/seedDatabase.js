const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const OTP = require('../models/OTP');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🍃 MongoDB Connected for seeding...');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Event.deleteMany({});
    await Booking.deleteMany({});
    await OTP.deleteMany({});

    // Create Admin User
    console.log('👤 Creating admin user...');
    const adminUser = new User({
      username: 'admin',
      email: 'admin@eventhive.com',
      password: 'admin123', // Will be hashed automatically
      role: 'admin',
      isEmailVerified: true,
      preferences: {
        categories: ['technology', 'business', 'music'],
        eventTypes: ['conference', 'workshop', 'concert'],
        priceRange: { min: 0, max: 1000 }
      }
    });
    await adminUser.save();
    console.log('✅ Admin user created: admin@eventhive.com / admin123');

    // Create Sample Regular Users
    console.log('👥 Creating sample users...');
    const users = [
      {
        username: 'john_doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'user',
        isEmailVerified: true,
        preferences: {
          categories: ['music', 'arts'],
          eventTypes: ['concert', 'festival'],
          priceRange: { min: 0, max: 500 }
        }
      },
      {
        username: 'jane_smith',
        email: 'jane@example.com',
        password: 'password123',
        role: 'user',
        isEmailVerified: true,
        preferences: {
          categories: ['technology', 'education'],
          eventTypes: ['conference', 'workshop'],
          priceRange: { min: 50, max: 800 }
        }
      }
    ];

    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      console.log(`✅ User created: ${userData.email}`);
    }

    // Create Sample Events
    console.log('🎭 Creating sample events...');
    const events = [
      {
        title: "Jazz in the Park Festival",
        description: "An intimate evening of smooth jazz featuring local and international artists in a beautiful park setting. Experience the magic of jazz under the stars with world-renowned musicians.",
        date: "March 15-17, 2025",
        location: "Central Park, New York",
        category: "music",
        type: "festival",
        standardPrice: 299,
        vipPrice: 599,
        image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
        maxAttendees: 5000,
        currentAttendees: 1250,
        organizer: adminUser._id,
        tags: ['jazz', 'music', 'outdoor', 'family-friendly'],
        venue: {
          name: "Central Park Bandshell",
          address: "72nd Street and Fifth Avenue",
          city: "New York",
          state: "NY",
          country: "USA",
          coordinates: { lat: 40.7749, lng: -73.9692 }
        }
      },
      {
        title: "AI & Machine Learning Summit 2025",
        description: "Join industry leaders and innovators to explore the latest trends in artificial intelligence and machine learning. Network with experts and discover cutting-edge technologies.",
        date: "April 22-24, 2025",
        location: "Moscone Center, San Francisco",
        category: "technology",
        type: "conference",
        standardPrice: 599,
        vipPrice: 999,
        image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
        maxAttendees: 3000,
        currentAttendees: 850,
        organizer: adminUser._id,
        tags: ['AI', 'machine-learning', 'technology', 'networking'],
        venue: {
          name: "Moscone Convention Center",
          address: "747 Howard St",
          city: "San Francisco",
          state: "CA",
          country: "USA",
          coordinates: { lat: 37.7749, lng: -122.4194 }
        }
      },
      {
        title: "Contemporary Art Exhibition: Future Visions",
        description: "Discover groundbreaking contemporary artworks from emerging and established artists worldwide. A journey through modern artistic expression and creative innovation.",
        date: "May 1-31, 2025",
        location: "LACMA, Los Angeles",
        category: "arts",
        type: "exhibition",
        standardPrice: 25,
        vipPrice: 75,
        image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
        maxAttendees: 2000,
        currentAttendees: 450,
        organizer: adminUser._id,
        tags: ['art', 'contemporary', 'exhibition', 'culture'],
        venue: {
          name: "Los Angeles County Museum of Art",
          address: "5905 Wilshire Blvd",
          city: "Los Angeles",
          state: "CA",
          country: "USA",
          coordinates: { lat: 34.0639, lng: -118.3592 }
        }
      },
      {
        title: "Digital Marketing Masterclass",
        description: "Master the latest digital marketing strategies and tools in this hands-on intensive workshop. Learn from industry experts and transform your marketing approach.",
        date: "July 12-13, 2025",
        location: "Miami Convention Center, Miami",
        category: "business",
        type: "workshop",
        standardPrice: 199,
        vipPrice: 399,
        image: "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
        maxAttendees: 500,
        currentAttendees: 125,
        organizer: adminUser._id,
        tags: ['marketing', 'digital', 'business', 'strategy'],
        venue: {
          name: "Miami Beach Convention Center",
          address: "1901 Convention Center Dr",
          city: "Miami Beach",
          state: "FL",
          country: "USA",
          coordinates: { lat: 25.7907, lng: -80.1300 }
        }
      },
      {
        title: "International Food Festival",
        description: "Taste authentic cuisines from around the globe and learn cooking techniques from master chefs. A culinary journey through world flavors and traditions.",
        date: "August 15-17, 2025",
        location: "Pike Place Market, Seattle",
        category: "food",
        type: "festival",
        standardPrice: 35,
        vipPrice: 85,
        image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
        maxAttendees: 10000,
        currentAttendees: 2300,
        organizer: adminUser._id,
        tags: ['food', 'international', 'cooking', 'cultural'],
        venue: {
          name: "Pike Place Market",
          address: "85 Pike St",
          city: "Seattle",
          state: "WA",
          country: "USA",
          coordinates: { lat: 47.6085, lng: -122.3401 }
        }
      },
      {
        title: "Tech Startup Pitch Competition",
        description: "Watch innovative startups pitch their groundbreaking ideas to top investors. Network with entrepreneurs and discover the next big thing in technology.",
        date: "September 5-6, 2025",
        location: "Austin Convention Center, Austin",
        category: "business",
        type: "competition",
        standardPrice: 75,
        vipPrice: 150,
        image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
        maxAttendees: 1500,
        currentAttendees: 480,
        organizer: adminUser._id,
        tags: ['startup', 'pitch', 'investment', 'innovation'],
        venue: {
          name: "Austin Convention Center",
          address: "500 E Cesar Chavez St",
          city: "Austin",
          state: "TX",
          country: "USA",
          coordinates: { lat: 30.2637, lng: -97.7408 }
        }
      },
      {
        title: "Classical Music Gala Evening",
        description: "An elegant evening of classical masterpieces performed by the city's finest orchestra. Experience the timeless beauty of classical music in a magnificent venue.",
        date: "October 12, 2025",
        location: "Carnegie Hall, New York",
        category: "music",
        type: "concert",
        standardPrice: 89,
        vipPrice: 189,
        image: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
        maxAttendees: 2800,
        currentAttendees: 920,
        organizer: adminUser._id,
        tags: ['classical', 'orchestra', 'gala', 'elegant'],
        venue: {
          name: "Carnegie Hall",
          address: "881 7th Ave",
          city: "New York",
          state: "NY",
          country: "USA",
          coordinates: { lat: 40.7652, lng: -73.9799 }
        }
      },
      {
        title: "Sustainable Living Workshop",
        description: "Learn practical strategies for sustainable living and environmental conservation. Discover eco-friendly alternatives and make a positive impact on our planet.",
        date: "November 8-10, 2025",
        location: "Portland Convention Center, Portland",
        category: "education",
        type: "workshop",
        standardPrice: 49,
        vipPrice: 99,
        image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
        maxAttendees: 800,
        currentAttendees: 220,
        organizer: adminUser._id,
        tags: ['sustainability', 'environment', 'eco-friendly', 'education'],
        venue: {
          name: "Oregon Convention Center",
          address: "777 NE Martin Luther King Jr Blvd",
          city: "Portland",
          state: "OR",
          country: "USA",
          coordinates: { lat: 45.5282, lng: -122.6615 }
        }
      }
    ];

    for (const eventData of events) {
      const event = new Event(eventData);
      await event.save();
      console.log(`✅ Event created: ${eventData.title}`);
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`   • Users created: ${await User.countDocuments()}`);
    console.log(`   • Events created: ${await Event.countDocuments()}`);
    console.log(`   • Admin user: admin@eventhive.com (password: admin123)`);
    console.log(`   • Sample users: john@example.com, jane@example.com (password: password123)`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
};

const runSeeder = async () => {
  await connectDB();
  await seedDatabase();
  
  console.log('\n🚀 Ready to start your EventHive server!');
  console.log('   Run: npm start');
  
  await mongoose.connection.close();
  console.log('📦 Database connection closed.');
  process.exit(0);
};

runSeeder();

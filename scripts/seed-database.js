const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
require('dotenv').config();

const seedData = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('🍃 Connected to MongoDB for seeding...');

        // Create admin user
        let adminUser = await User.findOne({ email: 'admin@eventhive.com' });
        if (!adminUser) {
            adminUser = new User({
                username: 'admin',
                email: 'admin@eventhive.com',
                password: 'admin123',
                role: 'admin',
                isEmailVerified: true
            });
            await adminUser.save();
            console.log('👤 Admin user created');
        }

        // Clear existing events
        await Event.deleteMany({});
        console.log('🗑️  Cleared existing events');

        // Seed events
        const events = [
            {
                title: "Jazz in the Park",
                description: "An intimate evening of smooth jazz featuring local and international artists in a beautiful park setting.",
                date: "March 15-17, 2025",
                location: "Central Park, New York",
                category: "music",
                type: "festival",
                standardPrice: 299,
                vipPrice: 599,
                image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
                organizer: adminUser._id,
                maxAttendees: 2000,
                venue: {
                    name: "Central Park Bandshell",
                    address: "Central Park",
                    city: "New York",
                    state: "NY",
                    country: "USA"
                }
            },
            {
                title: "AI & Machine Learning Summit",
                description: "Join industry leaders and innovators to explore the latest trends in artificial intelligence and machine learning.",
                date: "April 22-24, 2025",
                location: "Convention Center, San Francisco",
                category: "technology",
                type: "conference",
                standardPrice: 599,
                vipPrice: 999,
                image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
                organizer: adminUser._id,
                maxAttendees: 1500,
                venue: {
                    name: "Moscone Convention Center",
                    address: "747 Howard St",
                    city: "San Francisco",
                    state: "CA",
                    country: "USA"
                }
            },
            {
                title: "Contemporary Art Exhibition",
                description: "Discover groundbreaking contemporary artworks from emerging and established artists worldwide.",
                date: "May 1-31, 2025",
                location: "Modern Art Gallery, Los Angeles",
                category: "arts",
                type: "exhibition",
                standardPrice: 25,
                vipPrice: 75,
                image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
                organizer: adminUser._id,
                maxAttendees: 500,
                venue: {
                    name: "LACMA",
                    address: "5905 Wilshire Blvd",
                    city: "Los Angeles",
                    state: "CA",
                    country: "USA"
                }
            },
            {
                title: "Jazz Under the Stars",
                description: "An intimate evening of smooth jazz performances under the starlit sky with world-renowned musicians.",
                date: "June 8, 2025",
                location: "Rooftop Venue, Chicago",
                category: "music",
                type: "concert",
                standardPrice: 89,
                vipPrice: 189,
                image: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
                organizer: adminUser._id,
                maxAttendees: 300,
                venue: {
                    name: "Sky Terrace",
                    address: "875 N Michigan Ave",
                    city: "Chicago",
                    state: "IL",
                    country: "USA"
                }
            },
            {
                title: "Digital Marketing Workshop",
                description: "Master the latest digital marketing strategies and tools in this hands-on intensive workshop.",
                date: "July 12-13, 2025",
                location: "Business Center, Miami",
                category: "business",
                type: "workshop",
                standardPrice: 199,
                vipPrice: 399,
                image: "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
                organizer: adminUser._id,
                maxAttendees: 100,
                venue: {
                    name: "Miami Business Center",
                    address: "1200 Brickell Ave",
                    city: "Miami",
                    state: "FL",
                    country: "USA"
                }
            },
            {
                title: "International Food Festival",
                description: "Taste authentic cuisines from around the globe and learn cooking techniques from master chefs.",
                date: "August 15-17, 2025",
                location: "Festival Grounds, Seattle",
                category: "food",
                type: "festival",
                standardPrice: 35,
                vipPrice: 85,
                image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
                organizer: adminUser._id,
                maxAttendees: 5000,
                venue: {
                    name: "Seattle Center",
                    address: "305 Harrison St",
                    city: "Seattle",
                    state: "WA",
                    country: "USA"
                }
            },
            {
                title: "Tech Innovation Conference 2025",
                description: "Explore cutting-edge technologies and innovations shaping the future of business and society.",
                date: "September 10-12, 2025",
                location: "Austin Convention Center, Texas",
                category: "technology",
                type: "conference",
                standardPrice: 450,
                vipPrice: 750,
                image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
                organizer: adminUser._id,
                maxAttendees: 2500,
                venue: {
                    name: "Austin Convention Center",
                    address: "500 E Cesar Chavez St",
                    city: "Austin",
                    state: "TX",
                    country: "USA"
                }
            },
            {
                title: "Fitness & Wellness Expo",
                description: "Discover the latest in fitness equipment, wellness products, and health innovations.",
                date: "October 5-7, 2025",
                location: "Health & Fitness Center, Denver",
                category: "sports",
                type: "exhibition",
                standardPrice: 15,
                vipPrice: 45,
                image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
                organizer: adminUser._id,
                maxAttendees: 1000,
                venue: {
                    name: "Colorado Convention Center",
                    address: "700 14th St",
                    city: "Denver",
                    state: "CO",
                    country: "USA"
                }
            }
        ];

        await Event.insertMany(events);
        console.log(`✅ Successfully seeded ${events.length} events`);

        console.log('\n🎉 Database seeding completed successfully!');
        console.log('\n📋 Summary:');
        console.log(`👤 Admin user: admin@eventhive.com (password: admin123)`);
        console.log(`🎯 Events created: ${events.length}`);
        
        await mongoose.connection.close();
        console.log('\n🔚 Database connection closed');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

// Run the seeder
if (require.main === module) {
    seedData();
}

module.exports = seedData;

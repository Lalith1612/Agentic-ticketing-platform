import uuid
from datetime import datetime, timedelta, timezone

def get_upcoming_dates(days=7):
    today = datetime.now(timezone.utc).date()
    return [(today + timedelta(days=i)).isoformat() for i in range(days)]

MOVIES = [
    {
        "id": "movie-1",
        "title": "Interstellar: Beyond Time",
        "genre": ["Sci-Fi", "Drama"],
        "language": "English",
        "rating": 8.9,
        "duration": "2h 49min",
        "cast": ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain", "Michael Caine"],
        "poster": "https://images.unsplash.com/photo-1534996858221-380b92700493?w=400&h=600&fit=crop",
        "banner": "https://images.unsplash.com/photo-1708559831534-44c30eb3ab0e?w=1200&h=500&fit=crop",
        "description": "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival as Earth becomes uninhabitable.",
        "release_date": "2025-01-15",
        "certificate": "UA"
    },
    {
        "id": "movie-2",
        "title": "Pushpa 3: The Rampage",
        "genre": ["Action", "Drama"],
        "language": "Telugu",
        "rating": 8.2,
        "duration": "2h 58min",
        "cast": ["Allu Arjun", "Rashmika Mandanna", "Fahadh Faasil"],
        "poster": "https://images.unsplash.com/photo-1762356121454-877acbd554bb?w=400&h=600&fit=crop",
        "banner": "https://images.unsplash.com/photo-1762356121454-877acbd554bb?w=1200&h=500&fit=crop",
        "description": "Pushpa Raj continues his rise in the red sandalwood smuggling syndicate, facing new enemies and old rivals in this action-packed sequel.",
        "release_date": "2025-02-10",
        "certificate": "UA"
    },
    {
        "id": "movie-3",
        "title": "Dil Se Phir",
        "genre": ["Romance", "Drama"],
        "language": "Hindi",
        "rating": 7.8,
        "duration": "2h 15min",
        "cast": ["Ranveer Singh", "Alia Bhatt", "Anil Kapoor"],
        "poster": "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&h=600&fit=crop",
        "banner": "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=1200&h=500&fit=crop",
        "description": "A heartwarming love story set across Mumbai and London, exploring the depths of love, loss, and second chances.",
        "release_date": "2025-02-14",
        "certificate": "U"
    },
    {
        "id": "movie-4",
        "title": "The Dark Knight Returns",
        "genre": ["Action", "Thriller"],
        "language": "English",
        "rating": 9.1,
        "duration": "2h 32min",
        "cast": ["Robert Pattinson", "Zoe Kravitz", "Colin Farrell", "Jeffrey Wright"],
        "poster": "https://images.unsplash.com/photo-1695893155161-e4cf7355322f?w=400&h=600&fit=crop",
        "banner": "https://images.unsplash.com/photo-1695893155161-e4cf7355322f?w=1200&h=500&fit=crop",
        "description": "Gotham's darkest hour arrives as Batman faces his most dangerous adversary yet in this gripping thriller.",
        "release_date": "2025-01-20",
        "certificate": "UA"
    },
    {
        "id": "movie-5",
        "title": "Kantara 2: Legend Unveiled",
        "genre": ["Action", "Drama", "Mythology"],
        "language": "Kannada",
        "rating": 8.5,
        "duration": "2h 40min",
        "cast": ["Rishab Shetty", "Sapthami Gowda", "Kishore"],
        "poster": "https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&h=600&fit=crop",
        "banner": "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&h=500&fit=crop",
        "description": "The prequel to the blockbuster Kantara explores the ancient origins of the divine protector of the forest.",
        "release_date": "2025-02-01",
        "certificate": "UA"
    },
    {
        "id": "movie-6",
        "title": "Stree 3: The Final Chapter",
        "genre": ["Horror", "Comedy"],
        "language": "Hindi",
        "rating": 7.6,
        "duration": "2h 10min",
        "cast": ["Rajkummar Rao", "Shraddha Kapoor", "Pankaj Tripathi", "Aparshakti Khurana"],
        "poster": "https://images.unsplash.com/photo-1713981277479-90d31eb93c51?w=400&h=600&fit=crop",
        "banner": "https://images.unsplash.com/photo-1713981277479-90d31eb93c51?w=1200&h=500&fit=crop",
        "description": "The residents of Chanderi face their ultimate supernatural challenge in this hilarious and spooky conclusion.",
        "release_date": "2025-01-25",
        "certificate": "UA"
    },
    {
        "id": "movie-7",
        "title": "Avatar: New Dawn",
        "genre": ["Sci-Fi", "Fantasy", "Adventure"],
        "language": "English",
        "rating": 8.7,
        "duration": "3h 10min",
        "cast": ["Sam Worthington", "Zoe Saldana", "Sigourney Weaver"],
        "poster": "https://images.unsplash.com/photo-1765120298918-e9932c6c0332?w=400&h=600&fit=crop",
        "banner": "https://images.unsplash.com/photo-1765120298918-e9932c6c0332?w=1200&h=500&fit=crop",
        "description": "Jake Sully and Neytiri venture into uncharted territories of Pandora, discovering new biomes and ancient civilizations.",
        "release_date": "2025-02-20",
        "certificate": "UA"
    },
    {
        "id": "movie-8",
        "title": "Salaar 2: Shouryanga Parvam",
        "genre": ["Action", "Thriller"],
        "language": "Telugu",
        "rating": 8.0,
        "duration": "2h 45min",
        "cast": ["Prabhas", "Prithviraj Sukumaran", "Shruti Haasan"],
        "poster": "https://images.unsplash.com/photo-1761948245185-fc300ad20316?w=400&h=600&fit=crop",
        "banner": "https://images.unsplash.com/photo-1761948245185-fc300ad20316?w=1200&h=500&fit=crop",
        "description": "Deva's past unravels as he confronts the violent world he left behind, in this explosive action sequel.",
        "release_date": "2025-02-05",
        "certificate": "A"
    }
]

THEATRES = [
    {
        "id": "theatre-1",
        "name": "PVR IMAX",
        "location": "Banjara Hills",
        "city": "Hyderabad",
        "screens": 6
    },
    {
        "id": "theatre-2",
        "name": "INOX Megaplex",
        "location": "Lower Parel",
        "city": "Mumbai",
        "screens": 8
    },
    {
        "id": "theatre-3",
        "name": "Cinepolis",
        "location": "DLF Cyber City",
        "city": "Delhi",
        "screens": 5
    },
    {
        "id": "theatre-4",
        "name": "PVR Gold",
        "location": "Koramangala",
        "city": "Bangalore",
        "screens": 4
    },
    {
        "id": "theatre-5",
        "name": "SPI Cinemas",
        "location": "T Nagar",
        "city": "Chennai",
        "screens": 5
    }
]

EVENTS = [
    {
        "id": "event-1",
        "title": "Arijit Singh Live in Concert",
        "type": "Concert",
        "venue": "Jawaharlal Nehru Stadium",
        "city": "Delhi",
        "date": get_upcoming_dates(14)[7],
        "time": "07:00 PM",
        "price_range": "1500 - 8000",
        "poster": "https://images.pexels.com/photos/4218027/pexels-photo-4218027.jpeg?auto=compress&cs=tinysrgb&w=600",
        "description": "Experience the magic of Arijit Singh live, performing his greatest hits in an unforgettable evening of music."
    },
    {
        "id": "event-2",
        "title": "Stand-Up Comedy Night",
        "type": "Comedy",
        "venue": "Canvas Laugh Club",
        "city": "Mumbai",
        "date": get_upcoming_dates(14)[5],
        "time": "08:00 PM",
        "price_range": "500 - 2000",
        "poster": "https://images.pexels.com/photos/2101487/pexels-photo-2101487.jpeg?auto=compress&cs=tinysrgb&w=600",
        "description": "A night of non-stop laughter featuring India's top stand-up comedians."
    },
    {
        "id": "event-3",
        "title": "Sunburn Music Festival",
        "type": "Music Festival",
        "venue": "Vagator Beach",
        "city": "Goa",
        "date": get_upcoming_dates(14)[10],
        "time": "04:00 PM",
        "price_range": "3000 - 15000",
        "poster": "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=600",
        "description": "Asia's biggest electronic dance music festival returns with world-class DJs and electrifying performances."
    },
    {
        "id": "event-4",
        "title": "Comic Con India 2025",
        "type": "Convention",
        "venue": "NESCO Exhibition Centre",
        "city": "Mumbai",
        "date": get_upcoming_dates(14)[12],
        "time": "10:00 AM",
        "price_range": "800 - 3500",
        "poster": "https://images.pexels.com/photos/3137890/pexels-photo-3137890.jpeg?auto=compress&cs=tinysrgb&w=600",
        "description": "The ultimate pop culture experience with cosplay, comics, gaming, and celebrity panels."
    }
]

SHOW_TIMES = ["10:00 AM", "01:30 PM", "04:45 PM", "07:30 PM", "10:15 PM"]

def generate_shows():
    shows = []
    dates = get_upcoming_dates(7)
    counter = 0
    for movie in MOVIES:
        for theatre in THEATRES:
            for date in dates[:4]:
                times_for_day = SHOW_TIMES[counter % 2: counter % 2 + 3]
                for i, time in enumerate(times_for_day):
                    shows.append({
                        "id": f"show-{uuid.uuid4().hex[:8]}",
                        "movie_id": movie["id"],
                        "theatre_id": theatre["id"],
                        "date": date,
                        "time": time,
                        "screen": (i % 3) + 1,
                        "prices": {
                            "platinum": 500,
                            "gold": 300,
                            "silver": 150
                        }
                    })
                counter += 1
    return shows

async def seed_database(db):
    await db.movies.delete_many({})
    await db.theatres.delete_many({})
    await db.shows.delete_many({})
    await db.events.delete_many({})

    await db.movies.insert_many([m.copy() for m in MOVIES])
    await db.theatres.insert_many([t.copy() for t in THEATRES])

    shows = generate_shows()
    if shows:
        await db.shows.insert_many([s.copy() for s in shows])

    await db.events.insert_many([e.copy() for e in EVENTS])

    return {
        "movies": len(MOVIES),
        "theatres": len(THEATRES),
        "shows": len(shows),
        "events": len(EVENTS)
    }

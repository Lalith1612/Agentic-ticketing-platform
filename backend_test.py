import requests
import sys
import json
from datetime import datetime

class ShowSpotAPITester:
    def __init__(self, base_url="https://theater-ai-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_email = f"test_user_{datetime.now().strftime('%H%M%S')}@test.com"
        self.test_user_password = "TestPass123!"
        self.show_id = None
        self.booking_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                    elif isinstance(response_data, dict):
                        print(f"   Response keys: {list(response_data.keys())}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_seed_database(self):
        """Test database seeding"""
        success, response = self.run_test(
            "Seed Database",
            "POST",
            "seed",
            200
        )
        if success:
            print(f"   Seeded: {response.get('counts', {})}")
        return success

    def test_get_movies(self):
        """Test getting movies"""
        success, response = self.run_test(
            "Get Movies",
            "GET",
            "movies",
            200
        )
        if success and response:
            print(f"   Found {len(response)} movies")
            if response:
                print(f"   First movie: {response[0].get('title', 'Unknown')}")
        return success

    def test_get_events(self):
        """Test getting events"""
        success, response = self.run_test(
            "Get Events",
            "GET",
            "events",
            200
        )
        if success and response:
            print(f"   Found {len(response)} events")
        return success

    def test_get_cities(self):
        """Test getting cities"""
        success, response = self.run_test(
            "Get Cities",
            "GET",
            "cities",
            200
        )
        if success and response:
            print(f"   Found cities: {response}")
        return success

    def test_get_shows_for_movie(self):
        """Test getting shows for a specific movie"""
        success, response = self.run_test(
            "Get Shows for Movie-1",
            "GET",
            "shows?movie_id=movie-1",
            200
        )
        if success and response:
            print(f"   Found {len(response)} shows for movie-1")
            if response:
                self.show_id = response[0].get('id')
                print(f"   Using show_id: {self.show_id}")
        return success

    def test_register_user(self):
        """Test user registration"""
        success, response = self.run_test(
            "Register User",
            "POST",
            "auth/register",
            200,
            data={
                "name": "Test User",
                "email": self.test_user_email,
                "password": self.test_user_password,
                "city": "Mumbai"
            }
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Registered user: {response.get('user', {}).get('name')}")
        return success

    def test_login_user(self):
        """Test user login"""
        success, response = self.run_test(
            "Login User",
            "POST",
            "auth/login",
            200,
            data={
                "email": self.test_user_email,
                "password": self.test_user_password
            }
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Logged in user: {response.get('user', {}).get('name')}")
        return success

    def test_get_user_profile(self):
        """Test getting user profile"""
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "auth/me",
            200
        )
        if success:
            print(f"   User profile: {response.get('name')} ({response.get('email')})")
        return success

    def test_get_show_seats(self):
        """Test getting seat layout for a show"""
        if not self.show_id:
            print("❌ No show_id available for seat testing")
            return False
            
        success, response = self.run_test(
            "Get Show Seats",
            "GET",
            f"shows/{self.show_id}/seats",
            200
        )
        if success:
            layout = response.get('layout', {})
            print(f"   Seat layout has {len(layout)} rows")
            if layout:
                first_row = list(layout.keys())[0]
                seats_in_row = len(layout[first_row].get('seats', []))
                print(f"   Row {first_row} has {seats_in_row} seats")
        return success

    def test_create_booking(self):
        """Test creating a booking"""
        if not self.show_id:
            print("❌ No show_id available for booking")
            return False
            
        success, response = self.run_test(
            "Create Booking",
            "POST",
            "bookings",
            200,
            data={
                "show_id": self.show_id,
                "seats": ["A1", "A2"]
            }
        )
        if success:
            self.booking_id = response.get('id')
            print(f"   Created booking: {self.booking_id}")
            print(f"   Total price: Rs. {response.get('total_price')}")
        return success

    def test_get_user_bookings(self):
        """Test getting user bookings"""
        success, response = self.run_test(
            "Get User Bookings",
            "GET",
            "bookings",
            200
        )
        if success and response:
            print(f"   Found {len(response)} bookings")
        return success

    def test_get_booking_details(self):
        """Test getting specific booking details"""
        if not self.booking_id:
            print("❌ No booking_id available")
            return False
            
        success, response = self.run_test(
            "Get Booking Details",
            "GET",
            f"bookings/{self.booking_id}",
            200
        )
        if success:
            print(f"   Booking for: {response.get('movie_title')}")
            print(f"   Seats: {response.get('seats')}")
        return success

    def test_chat_endpoint(self):
        """Test AI chat endpoint"""
        success, response = self.run_test(
            "Chat with AI",
            "POST",
            "chat",
            200,
            data={
                "message": "Show me action movies",
                "session_id": f"test-{datetime.now().strftime('%H%M%S')}"
            }
        )
        if success:
            print(f"   AI Response: {response.get('message', '')[:100]}...")
            print(f"   Action: {response.get('action')}")
        return success

def main():
    print("🎬 ShowSpot API Testing Started")
    print("=" * 50)
    
    tester = ShowSpotAPITester()
    
    # Test sequence
    tests = [
        ("Seed Database", tester.test_seed_database),
        ("Get Movies", tester.test_get_movies),
        ("Get Events", tester.test_get_events),
        ("Get Cities", tester.test_get_cities),
        ("Get Shows for Movie", tester.test_get_shows_for_movie),
        ("Register User", tester.test_register_user),
        ("Login User", tester.test_login_user),
        ("Get User Profile", tester.test_get_user_profile),
        ("Get Show Seats", tester.test_get_show_seats),
        ("Create Booking", tester.test_create_booking),
        ("Get User Bookings", tester.test_get_user_bookings),
        ("Get Booking Details", tester.test_get_booking_details),
        ("Chat with AI", tester.test_chat_endpoint),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if failed_tests:
        print(f"❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print("✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())
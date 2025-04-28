import unittest
import time
import threading
from flask_socketio import SocketIOTestClient

# Important: Assuming your main Flask app file is named 'app.py'
# and contains the 'app' and 'socketio' instances.
# Adjust the import if your file structure or variable names are different.
try:
    # Ensure eventlet patching happens if tests are run directly
    # This might be needed depending on how tests are discovered/run
    import eventlet
    eventlet.monkey_patch()
    from app import app, socketio, client as g4f_client
except ImportError as e:
    print(f"Error importing from app.py: {e}")
    print("Make sure tests.py is in the same directory as app.py or adjust the import path.")
    exit(1)
except RuntimeError as e:
    print(f"RuntimeError during import (possibly monkey_patch issue): {e}")
    print("Ensure eventlet.monkey_patch() is called FIRST in app.py")
    exit(1)


# Ensure the g4f client initialized, otherwise skip tests that need it
G4F_CLIENT_AVAILABLE = g4f_client is not None

# --- Helper Function for Stream Tests ---
def receive_stream_events(client, timeout=20):
    """Waits for and collects message_chunk and stream_end events."""
    received_events = []
    start_time = time.time()
    stream_ended = False
    while time.time() - start_time < timeout:
        received = client.get_received()
        if received:
            # print(f"[{client.sid if hasattr(client, 'sid') else 'N/A'}] Received: {received}") # Debug print
            received_events.extend(received)
            if any(event['name'] == 'stream_end' for event in received):
                stream_ended = True
                break # Stop waiting once stream ends
            if any(event['name'] == 'error' for event in received):
                 # Stop if an error is explicitly received
                 print(f"[{client.sid if hasattr(client, 'sid') else 'N/A'}] Received error, stopping wait.")
                 break
        time.sleep(0.05) # Yield control briefly
    return received_events, stream_ended

# --- Test Class ---
class SocketIOTests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Set up Flask app context once for the test class."""
        cls.app_context = app.app_context()
        cls.app_context.push()
        print("Flask App Context Pushed.")

    @classmethod
    def tearDownClass(cls):
        """Pop Flask app context once after all tests are done."""
        cls.app_context.pop()
        print("Flask App Context Popped.")

    def setUp(self):
        """Set up a test client before each test."""
        self.client = socketio.test_client(app, namespace='/')
        time.sleep(0.1) # Allow connection handshake
        self.assertTrue(self.client.is_connected(), "Client failed to connect in setUp")
        # print(f"Client {self.client.sid} connected.")

    def tearDown(self):
        """Disconnect the client after each test."""
        if self.client.is_connected():
            # print(f"Disconnecting client {self.client.sid}...")
            self.client.disconnect()
            time.sleep(0.1) # Allow disconnect processing
            self.assertFalse(self.client.is_connected(namespace='/'), f"Client {self.client.sid} failed to disconnect")
            # print(f"Client {self.client.sid} disconnected.")
        else:
            # print(f"Client was already disconnected in tearDown.")
            pass


    def test_connect_disconnect(self):
        """Test basic connection and disconnection."""
        print("\nTesting connection...")
        # Setup already connects, just verify
        self.assertTrue(self.client.is_connected())
        print("Client connected.")
        # Teardown will disconnect, just verify here
        self.client.disconnect()
        time.sleep(0.1)
        self.assertFalse(self.client.is_connected())
        print("Client disconnected.")

    # --- History Validation Tests ---

    def test_send_message_no_history(self):
        """Test sending a message without the 'history' key."""
        print("\nTesting message without history...")
        self.client.emit('send_message', {'invalid_key': 'some_data'})
        time.sleep(0.5)
        received = self.client.get_received()
        self.assertIsNotNone(received, "Did not receive any response.")
        error_event = received[0]
        self.assertEqual(error_event['name'], 'error')
        self.assertIn("'history' is required", error_event['args'][0]['message'])
        print("No history error test successful.")

    def test_send_message_empty_history(self):
        """Test sending an empty history list."""
        print("\nTesting empty history list...")
        self.client.emit('send_message', {'history': []})
        time.sleep(0.5)
        received = self.client.get_received()
        self.assertIsNotNone(received, "Did not receive any response.")
        error_event = received[0]
        self.assertEqual(error_event['name'], 'error')
        self.assertIn("'history' must be a non-empty list", error_event['args'][0]['message'])
        print("Empty history list error test successful.")

    def test_send_message_invalid_history_format(self):
        """Test sending history with incorrect format (not a list)."""
        print("\nTesting invalid history format...")
        self.client.emit('send_message', {'history': 'not_a_list'})
        time.sleep(0.5)
        received = self.client.get_received()
        self.assertIsNotNone(received)
        error_event = received[0]
        self.assertEqual(error_event['name'], 'error')
        self.assertIn("'history' must be a non-empty list", error_event['args'][0]['message'])
        print("Invalid history format test successful.")

    def test_send_message_invalid_message_structure(self):
        """Test sending history with invalid message structure inside the list."""
        print("\nTesting invalid message structure...")
        invalid_history = [{"role": "user", "wrong_key": "some content"}]
        self.client.emit('send_message', {'history': invalid_history})
        time.sleep(0.5)
        received = self.client.get_received()
        self.assertIsNotNone(received)
        error_event = received[0]
        self.assertEqual(error_event['name'], 'error')
        self.assertIn("Invalid message format in 'history'", error_event['args'][0]['message'])
        print("Invalid message structure test successful.")

    def test_send_message_last_message_not_user(self):
        """Test sending history where the last message is not from the user."""
        print("\nTesting last message not user...")
        invalid_history = [
            {"role": "user", "content": "First message"},
            {"role": "assistant", "content": "I cannot be the last one"}
        ]
        self.client.emit('send_message', {'history': invalid_history})
        time.sleep(0.5)
        received = self.client.get_received()
        self.assertIsNotNone(received)
        error_event = received[0]
        self.assertEqual(error_event['name'], 'error')
        self.assertIn("Last message must be from 'user'", error_event['args'][0]['message'])
        print("Last message not user test successful.")

    # --- Functional Tests ---

    @unittest.skipUnless(G4F_CLIENT_AVAILABLE, "g4f client not initialized, skipping stream test")
    def test_send_valid_message_stream(self):
        """Test sending a valid message and receiving stream events."""
        print("\nTesting valid message stream...")
        valid_history = [
            {"role": "system", "content": "You are a test bot."},
            {"role": "user", "content": "Hello bot, say 'test'."}
        ]
        self.client.emit('send_message', {'history': valid_history})
        print(f"[{self.client.sid}] Sent 'send_message' event.")

        received_events, stream_ended = receive_stream_events(self.client)

        self.assertTrue(any(event['name'] == 'message_chunk' for event in received_events),
                        f"[{self.client.sid}] Did not receive any 'message_chunk' events.")
        self.assertTrue(stream_ended, f"[{self.client.sid}] Did not receive 'stream_end' event within timeout.")
        print(f"[{self.client.sid}] Stream test successful.")

    @unittest.skipUnless(G4F_CLIENT_AVAILABLE, "g4f client not initialized, skipping repeated query test")
    def test_repeated_queries(self):
        """Test sending multiple messages sequentially from the same client."""
        print("\nTesting repeated queries...")

        # Query 1
        print(f"[{self.client.sid}] Sending query 1...")
        history1 = [{"role": "user", "content": "What is 1+1?"}]
        self.client.emit('send_message', {'history': history1})
        received1, ended1 = receive_stream_events(self.client)
        self.assertTrue(any(e['name'] == 'message_chunk' for e in received1), f"[{self.client.sid}] No chunks for query 1")
        self.assertTrue(ended1, f"[{self.client.sid}] Stream did not end for query 1")
        print(f"[{self.client.sid}] Query 1 successful.")

        # Allow a small gap
        time.sleep(0.5)

        # Query 2
        print(f"[{self.client.sid}] Sending query 2...")
        history2 = [
            {"role": "user", "content": "What is 1+1?"},
            # Simulate adding the previous response (simplified)
            {"role": "assistant", "content": "2"},
            {"role": "user", "content": "What is 2+2?"}
        ]
        self.client.emit('send_message', {'history': history2})
        received2, ended2 = receive_stream_events(self.client)
        self.assertTrue(any(e['name'] == 'message_chunk' for e in received2), f"[{self.client.sid}] No chunks for query 2")
        self.assertTrue(ended2, f"[{self.client.sid}] Stream did not end for query 2")
        print(f"[{self.client.sid}] Query 2 successful.")

        print("Repeated queries test successful.")

    @unittest.skipUnless(G4F_CLIENT_AVAILABLE, "g4f client not initialized, skipping concurrency test")
    def test_concurrent_clients(self):
        """Test handling multiple clients sending messages concurrently."""
        print("\nTesting concurrent clients...")
        num_clients = 3
        threads = []
        results = {} # Store results per client SID

        def client_task(client_id, result_dict):
            """Function executed by each client thread."""
            client = None # Ensure client is defined in scope
            try:
                # Each thread needs its own client instance
                client = socketio.test_client(app, namespace='/')
                time.sleep(0.1) # Allow connection
                if not client.is_connected():
                    print(f"[Thread-{client_id}] Failed to connect.")
                    result_dict[client_id] = {'success': False, 'reason': 'Connection failed'}
                    return

                client_sid = client.sid # Get SID after connection
                print(f"[Thread-{client_id}/{client_sid}] Connected.")

                history = [{"role": "user", "content": f"Hello from client {client_id}"}]
                client.emit('send_message', {'history': history})
                print(f"[Thread-{client_id}/{client_sid}] Sent message.")

                received_events, stream_ended = receive_stream_events(client)

                has_chunks = any(event['name'] == 'message_chunk' for event in received_events)
                result_dict[client_id] = {
                    'success': has_chunks and stream_ended,
                    'sid': client_sid,
                    'chunks_received': has_chunks,
                    'stream_ended': stream_ended
                }
                print(f"[Thread-{client_id}/{client_sid}] Task finished. Success: {result_dict[client_id]['success']}")

            except Exception as e:
                print(f"[Thread-{client_id}] Error: {e}")
                result_dict[client_id] = {'success': False, 'reason': str(e)}
            finally:
                if client and client.is_connected():
                    client.disconnect()
                    time.sleep(0.1)
                    # print(f"[Thread-{client_id}/{client_sid}] Disconnected.")


        # Create and start threads
        for i in range(num_clients):
            thread = threading.Thread(target=client_task, args=(i, results))
            threads.append(thread)
            thread.start()
            time.sleep(0.1) # Stagger starts slightly

        # Wait for all threads to complete
        for thread in threads:
            thread.join(timeout=45) # Increased timeout for multiple concurrent requests

        print("\nConcurrency Test Results:")
        successful_clients = 0
        for client_id, result in results.items():
            print(f"Client {client_id}: {result}")
            if result.get('success'):
                successful_clients += 1

        self.assertEqual(successful_clients, num_clients,
                         f"Expected {num_clients} successful concurrent clients, but got {successful_clients}")
        print("Concurrency test finished.")


if __name__ == '__main__':
    unittest.main()

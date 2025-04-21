from flask import Flask, request, jsonify
from flask_cors import CORS
from g4f.client import Client
from g4f.Provider import PollinationsAI, RetryProvider
import logging

# --- g4f Client Setup ---
# Configure logging for g4f if needed
# logging.basicConfig(level=logging.DEBUG)

try:
    # Initialize the g4f client once when the app starts
    client = Client(
        provider=RetryProvider([PollinationsAI], single_provider_retry=True, max_retries=5)
    )
    print("g4f Client initialized successfully.")
except Exception as e:
    print(f"Fatal Error initializing g4f Client: {e}")
    # If the client fails to initialize, the app shouldn't run.
    client = None

# --- Flask App Setup ---
app = Flask(__name__)
CORS(app) # Enable CORS for requests from your React frontend

# --- API Routes ---
@app.route("/")
def home():
    if not client:
        return "Flask backend: g4f client failed to initialize!", 503
    return "Flask backend with g4f is running!"

@app.route("/api/chat", methods=["POST"])
def chat():
    # Check if the client was initialized successfully
    if not client:
         return jsonify({"error": "Chatbot client is not initialized."}), 503 # Service Unavailable

    data = request.get_json()
    # Expect the client to send the full conversation history
    conversation_history = data.get("history")

    # --- Input Validation ---
    if not conversation_history:
        return jsonify({"error": "'history' is required in the request body"}), 400
    if not isinstance(conversation_history, list):
         return jsonify({"error": "'history' must be a list of message objects"}), 400
    if not conversation_history: # Ensure history is not empty
         return jsonify({"error": "'history' cannot be empty"}), 400
    # Basic check for message format (can be more thorough)
    for msg in conversation_history:
        if not isinstance(msg, dict) or "role" not in msg or "content" not in msg:
            return jsonify({"error": "Each item in 'history' must be an object with 'role' and 'content'"}), 400
    # Ensure the last message is from the user for a valid request flow
    if conversation_history[-1].get("role") != "user":
        return jsonify({"error": "The last message in the history must be from the 'user'"}), 400
    # --- End Input Validation ---


    try:
        # Get response from AI using the provided history
        response = client.chat.completions.create(
            model="deepseek-r1", # Or another model supported by DeepInfra
            messages=conversation_history,
            # web_search=False # Optional
        )

        # Extract the new assistant response
        assistant_response = response.choices[0].message.content
        if not assistant_response:
             assistant_response = "Sorry, I received an empty response from the AI."

        # Return only the new assistant message
        return jsonify({"response": assistant_response})

    except Exception as e:
        print(f"Error during g4f chat completion: {e}") # Log the error server-side
        return jsonify({"error": f"An error occurred while contacting the AI: {e}"}), 500

# --- Run Flask App ---
if __name__ == "__main__":
    # Only run the app if the client initialized correctly
    if client:
        # Use a different port if 5000 is used by React dev server
        # Host 0.0.0.0 makes it accessible on your local network
        app.run(debug=True, port=5001, host='0.0.0.0')
    else:
        print("Flask app cannot start because g4f client failed to initialize.")


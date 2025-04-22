import eventlet # Required for Flask-SocketIO production/async modes
# Monkey patch MUST be done before other imports like Flask, SocketIO, etc.
eventlet.monkey_patch()

import traceback # Add this import at the top
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from g4f.client import Client
from g4f.Provider import PollinationsAI, RetryProvider, bing, You, Gemini
import logging
import time # Import time if not already

# --- g4f Client Setup ---
try:
    # Initialize the g4f client once when the app starts
    client = Client(
        provider=RetryProvider([bing, You, Gemini, PollinationsAI], single_provider_retry=True, max_retries=5)
    )
    print("g4f Client initialized successfully.")
except Exception as e:
    print(f"Fatal Error initializing g4f Client: {e}")
    # If the client fails to initialize, the app shouldn't run.
    client = None

# --- Flask App Setup ---
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key!' # Replace with a real secret key
CORS(app, resources={r"/socket.io/*": {"origins": "*"}}) # Allow CORS for SocketIO
# Initialize SocketIO, using eventlet for async mode
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# --- API Routes ---
@app.route("/")
def home():
    if not client:
        return "Flask backend: g4f client failed to initialize!", 503
    return "Flask backend with g4f and SocketIO is running!"

# --- Background Task for g4f ---
def run_g4f_stream(sid, history):
    """
    This function runs in a background thread (managed by eventlet/SocketIO)
    to avoid blocking the main server loop.
    """
    print(f"[{sid}] Background task started.")
    try:
        # Create a NEW client instance for each request
        request_client = Client(
            provider=RetryProvider([PollinationsAI], single_provider_retry=True, max_retries=5)
        )
        print(f"[{sid}] Created new g4f client instance for this request.")

        print(f"[{sid}] Background task: Attempting g4f stream creation...")
        response_stream = request_client.chat.completions.create(
            model="deepseek-r1",
            messages=history,
            stream=True,
            web_search=False
        )
        print(f"[{sid}] Background task: g4f stream object created. Starting iteration...")

        full_response = ""
        chunk_count = 0
        stream_finished_reason = None

        for chunk in response_stream:
            chunk_count += 1
            finish_reason = chunk.choices[0].finish_reason if chunk.choices and chunk.choices[0].finish_reason else None

            if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                chunk_content = chunk.choices[0].delta.content
                if isinstance(chunk_content, str):
                    full_response += chunk_content
                    # Use socketio.emit to send back to the specific client
                    socketio.emit('message_chunk', {'chunk': chunk_content}, room=sid)
                    # Use eventlet.sleep in background task too
                    eventlet.sleep(0.01)
                else:
                    print(f"[{sid}] Background task: Skipping non-string chunk content type: {type(chunk_content)}")
            elif finish_reason:
                stream_finished_reason = finish_reason
                print(f"[{sid}] Background task: Finish reason received: '{stream_finished_reason}'. Breaking loop.")
                break
            else:
                pass # Skip other chunk types

        print(f"[{sid}] Background task: Stream loop finished. Reason: {'Natural end' if not stream_finished_reason else stream_finished_reason}. Chunks processed: {chunk_count}.")
        # Use socketio.emit to send stream_end
        socketio.emit('stream_end', room=sid)
        print(f"[{sid}] Background task: 'stream_end' emitted.")

    except Exception as e:
        error_traceback = traceback.format_exc()
        print(f"!!! [{sid}] Background task ERROR: {e}\n{error_traceback}")
        # Use socketio.emit for errors
        socketio.emit('error', {'message': f"An error occurred during streaming: {e}"}, room=sid)
    finally:
        print(f"[{sid}] Background task finished.")

# --- SocketIO Event Handlers ---
@socketio.on('connect')
def handle_connect():
    sid = request.sid
    print(f"Client connected: {sid}")

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    print(f"Client disconnected: {sid}")

@socketio.on('send_message')
def handle_send_message(data):
    sid = request.sid # Get SID
    print(f"[{sid}] Received 'send_message'. Validating...")

    # --- Input Validation ---
    if not isinstance(data, dict) or 'history' not in data:
        emit('error', {'message': "'history' is required in message data."})
        return
    conversation_history = data['history']
    if not isinstance(conversation_history, list) or not conversation_history:
        emit('error', {'message': "'history' must be a non-empty list."})
        return
    for msg in conversation_history:
        if not isinstance(msg, dict) or "role" not in msg or "content" not in msg:
            emit('error', {'message': "Invalid message format in 'history'. Each item must be a dict with 'role' and 'content'."})
            return
    if conversation_history[-1].get("role") != "user":
        emit('error', {'message': "Last message must be from 'user'"})
        return
    # --- End Input Validation ---

    print(f"[{sid}] Validation passed. Starting background task for g4f stream.")

    # Start the blocking g4f interaction in a background task
    socketio.start_background_task(run_g4f_stream, sid, conversation_history)

    # Return immediately - the main handler is now non-blocking
    print(f"[{sid}] handle_send_message finished (background task started).")

# --- Run Flask App with SocketIO ---
if __name__ == "__main__":
    if client:
        print("Starting Flask-SocketIO server...")
        # Run WITHOUT debug mode for this test
        socketio.run(app, debug=False, port=5001, host='0.0.0.0')
    else:
        print("Flask app cannot start because g4f client failed to initialize.")


import os
import uuid
import eventlet  # Required for Flask-SocketIO production/async modes
# Monkey patch MUST be done before other imports like Flask, SocketIO, etc.
eventlet.monkey_patch()

import kreuzberg
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from g4f.client import Client
from g4f.Provider import PollinationsAI, RetryProvider, GeminiPro
import logging
import time

# --- g4f Client Setup ---
try:
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        raise EnvironmentError("GEMINI_API_KEY environment variable is not set.")
    
    client = Client(
        provider=GeminiPro(),
        api_key=gemini_api_key
    )
    print("g4f Client initialized successfully.")
except Exception as e:
    print(f"Fatal Error initializing g4f Client: {e}")
    client = None

# --- Flask App Setup ---
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key!'  # Replace with a real secret key
CORS(app, resources={r"/flask/*": {"origins": "*"}})  # Restrict CORS to /flask prefix

# Initialize SocketIO, using eventlet for async mode
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet', path="/ws")

# --- API Routes (under /flask prefix) ---
@app.route("/flask/")
def home():
    if not client:
        return "Flask backend: g4f client failed to initialize!", 503
    return "Flask backend with g4f and SocketIO is running!"

@app.route("/flask/extract_text", methods=["POST"])
def extract_text_route():
    """
    Accepts a single file, uses Kreuzberg to extract text, 
    returns the text as JSON, and deletes the file afterward.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    temp_filename = f"tmp_{uuid.uuid4()}_{file.filename}"
    temp_path = os.path.join("/tmp", temp_filename)

    try:
        file.save(temp_path)
        print(f"File received: {file.filename}, saved as {temp_path}")

        extracted_text = kreuzberg.extract_file_sync(temp_path)
        print(f"Extracted text: {extracted_text}")

        return jsonify({"text": extracted_text}), 200

    except Exception as e:
        error_message = f"Error processing file {file.filename}: {e}"
        print(error_message)
        return jsonify({"error": error_message}), 500

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
            print(f"Temporary file deleted: {temp_path}")

# --- SocketIO Event Handlers (under /ws path) ---
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
    sid = request.sid
    print(f"[{sid}] Received 'send_message'. Validating...")

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

    print(f"[{sid}] Validation passed. Starting background task for g4f stream.")
    socketio.start_background_task(run_g4f_stream, sid, conversation_history)
    print(f"[{sid}] handle_send_message finished (background task started).")

# --- Background Task for g4f ---
def run_g4f_stream(sid, history):
    print(f"[{sid}] Background task started.")
    try:
        request_client = Client(
            provider=RetryProvider([PollinationsAI], single_provider_retry=True, max_retries=5)
        )
        print(f"[{sid}] Created new g4f client instance for this request.")

        response_stream = request_client.chat.completions.create(
            model="gemini-2.0-flash",
            messages=history,
            stream=True,
            web_search=False
        )
        print(f"[{sid}] Background task: g4f stream object created. Starting iteration...")

        full_response = ""
        chunk_buffer = ""
        last_emit_time = time.time()

        for chunk in response_stream:
            if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                chunk_content = chunk.choices[0].delta.content
                if isinstance(chunk_content, str):
                    full_response += chunk_content
                    chunk_buffer += chunk_content

                    current_time = time.time()
                    if len(chunk_buffer) >= 5 or current_time - last_emit_time >= 0.1:
                        socketio.emit('message_chunk', {'chunk': chunk_buffer}, room=sid)
                        chunk_buffer = ""
                        last_emit_time = current_time
                        eventlet.sleep(0.01)

        if chunk_buffer:
            socketio.emit('message_chunk', {'chunk': chunk_buffer}, room=sid)

        socketio.emit('stream_end', room=sid)
        print(f"[{sid}] Full response: {full_response}")

    except Exception as e:
        error_traceback = traceback.format_exc()
        print(f"!!! [{sid}] Background task ERROR: {e}\n{error_traceback}")
        socketio.emit('error', {'message': f"An error occurred: {e}"}, room=sid)
    finally:
        print(f"[{sid}] Background task finished.")

# --- Run Flask App with SocketIO ---
if __name__ == "__main__":
    if client:
        print("Starting Flask-SocketIO server...")
        socketio.run(app, debug=False, port=5001, host='0.0.0.0')
    else:
        print("Flask app cannot start because g4f client failed to initialize.")


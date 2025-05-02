FROM python:3.12-slim

# Set the working directory inside the container


# Copy the requirements file to the container
COPY requirements.txt requirements.txt

# Install dependencies
RUN pip install -r requirements.txt

ENV GEMINI_API_KEY=AIzaSyCfNQuSrU46EFKrx_RKQCdtHT2jl3AcXBQ

# Copy the rest of the application code to the container
COPY . .

# Specify the command to run your Flask app
CMD ["python", "app.py"]
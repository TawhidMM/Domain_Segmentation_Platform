FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y docker.io

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Set PYTHONPATH
ENV PYTHONPATH=/app

# Create user
RUN useradd -m -u 1000 -s /bin/bash appuser
USER appuser

# Default command (for API)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
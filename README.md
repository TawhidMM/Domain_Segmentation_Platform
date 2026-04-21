
# 🚀 Spatial Transcriptomics Web Server: Deployment Guide


## 📋 Prerequisites
- **Docker** and **Docker Compose** installed.
- **Python 3.x** installed on the host (used to sync tool metadata).

---

## 🏗️ Step 1: Clone the Repository

Start by cloning the project to your server and navigating into the project root:

```bash
git clone git@github.com:TawhidMM/Domain_Segmentation_Platform.git
cd Domain_Segmentation_Platform
```


## 🛠️ Step 2: Prepare the Environment

Before starting, you must create and configure your environment variables. 

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```
2. **Open `.env` and fill in your credentials.**

### Determine your Docker GID
The `worker` container needs to communicate with the host's Docker socket to spin up analysis tools. For this to work, the `DOCKER_GID` in your `.env` **must** match the ID on your host machine.

**To find your Docker Group ID, run:**
```bash
getent group docker | cut -d: -f3
```
*If this returns `984`, ensure `DOCKER_GID=984` is set in your `.env`.*

### Set Host Paths
Ensure the following paths in your `.env` point to absolute directories on your host machine. These will store your uploaded datasets and analysis results persistently.
- `HOST_EXPERIMENTS_ROOT`
- `HOST_UPLOADS_ROOT`

---

## 🚢 Step 3: Run the Deployment

We use a sequential deployment script to handle **12GB+ research images**. This prevents the server from hanging by pulling large images one at a time before restarting the web services.



**1. Make the script executable:**
```bash
chmod +x deploy.sh
```

**2. Execute the deployment:**
```bash
./deploy.sh
```

### What `deploy.sh` does:
1. **Tool Warm-up:** Reads `get_tool_images.py` and pulls `STAIG`, `DeepST`, etc., one by one.
2. **Infrastructure Pull:** Pulls the latest Frontend, API, Worker, and DB images.
3. **Service Restart:** Runs `docker compose up -d` to refresh all services.
4. **Database Sync:** Automatically runs `alembic upgrade head` inside the API container to sync your schema.
5. **Auto-Cleanup:** Prunes orphaned image layers to reclaim disk space.


## **4. Download the Sample Data:**

You can sample datasets here: [Dataset Repository (Google Drive)](https://drive.google.com/drive/folders/1IaYbdZvMc5U3lj3VizW8VT623gDtGZRO?usp=sharing)

**2. Usage:**
- The datasets are provided in `.zip` format. 
- Use these zip files as direct input to the tool execution interface.

---


## Project Structure
- `deploy.sh`: Main deployment orchestrator.
- `get_tool_images.py`: Bridges your Python `TOOLS` configuration with the shell script.
- `docker-compose.prod.yml`: Production-ready service definitions.
- `.env.example`: Template for all required environment variables.

***
# Domain Segmentation Platform

A web server for spatial transcriptomics domain identification. Upload a dataset, choose a tool (**STAIG**, **DeepST**, or **ScribbleDom**), run it on the server's GPU, and view the resulting spatial domains in the browser.


**Contents:**
- [Requirements](#requirements)
- [GPU setup](#gpu-setup)
- [Deployment](#deployment)
- [Browser requirements](#browser-requirements)
- [Configuration](#configuration)
- [Updating](#updating)
- [Sample data and tutorials](#sample-data-and-tutorials)


## Requirements

### Software

| | |
|---|---|
| OS | Linux, x86_64 (amd64) |
| Docker Engine | Rootful installation. Rootless Docker and Podman are not supported. |
| Docker Compose | v2 (v2.1.1 or newer) |
| NVIDIA driver and NVIDIA Container Toolkit | See [GPU setup](#gpu-setup) |
| Network | Outbound access to Docker Hub (images are public) |
| Port | TCP 80 by default, configurable with `HTTP_PORT` |
| Permissions | The deploying user is in the `docker` group, or uses `sudo` |

### Hardware

The minimum CPU, RAM, and GPU figures assume that only one analysis execution runs at a time. To run multiple analyses concurrently, increase the CPU, RAM, and GPU resources proportionately for the desired concurrency.

| Resource | Minimum |
|---|---|
| CPU | 4 cores |
| RAM | 12 GB |
| GPU | NVIDIA, 4 GB VRAM |
| Free disk | 50 GB |


> The 4 GB minimum VRAM covers all stages except STAIG image feature extraction. That stage needs a 24 GB GPU; without one, a user can upload precomputed image features instead.

Memory needs grow with dataset size. The figures above are for typical datasets (~4,000 spots), and much larger datasets need more RAM and VRAM.  The **Minimum** figures were calculated by running **the DLPFC** dataset. See [Resource usage details](#resource-usage-details).

## GPU setup
 
The GPU is used by the analysis tool containers, so Docker must be able to pass it through. Do this once per server.
 
#### 1. Confirm the NVIDIA driver works on the host (it must print your GPU):
```bash
   nvidia-smi
```
#### 2. Install the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html).
#### 3. Register it with Docker and restart Docker:
```bash
   sudo nvidia-ctk runtime configure --runtime=docker
   sudo systemctl restart docker
```
#### 4. Verify that a container can see the GPU:
```bash
   docker run --rm --gpus all nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi
```
Continue only when step 4 prints the GPU table.


## Deployment
 
#### 1. Clone
 
```bash
git clone https://github.com/TawhidMM/Domain_Segmentation_Platform.git
cd Domain_Segmentation_Platform
```
 
#### 2. Configure
 
```bash
cp .env.example .env
nano .env
```
 
Fill in every value (see [Configuration](#configuration)). Do not include spaces in values.
 
#### 3. Deploy
 
```bash
chmod +x deploy.sh
./deploy.sh
```
 
The first run downloads about 20 GB. The script pulls the images one at a time, runs database migrations in the one-shot `migrate` service, starts the application services only after migrations succeed, and checks that every container is stable. It ends with `DEPLOYMENT SUCCESSFUL`. If a step fails, it prints the failing step, container status and recent logs.
 
Always use `./deploy.sh` rather than a plain `docker compose up`.

#### 4. Set Up automatic updates

To update the deployment automatically, configure the included
`auto_deploy.sh` script to run from cron. The script checks whether any
Celery tasks are running before pulling images, deploys only when an image
has changed, and records the last successfully deployed image state.

Make the script executable:

```bash
chmod +x auto_deploy.sh
```

For details and the cron schedule, see [Automatic nightly updates (cron)](#automatic-nightly-updates-cron).
 
#### 5. Open the platform

| Deployment | URL |
|---|---|
| Local | <http://localhost> |
| Remote server (port 80) | `http://<server-ip>` |
| Custom port | `http://<server-ip>:<HTTP_PORT>` |

The firewall must allow inbound TCP traffic on the chosen port (for example `sudo ufw allow 80/tcp`).


## Browser requirements

Several plots are rendered with **WebGL**, which runs in users' browsers on their computers. Hardware acceleration must be enabled in the browser. Otherwise, plots may appear blank, be very slow, or show a WebGL error.

Use a recent version of Chrome, Edge or Firefox on a computer with a GPU.

### 1. Check whether WebGL works

Open <https://get.webgl.org/>. A spinning cube with the message "Your browser supports WebGL" means everything is fine and you can skip the rest of this section.

### 2. Enable hardware acceleration

**Google Chrome**

1. Open `chrome://settings/system`.
2. Turn on **Use graphics acceleration when available** (older versions call it "Use hardware acceleration when available").
3. Click **Relaunch**.
4. Open `chrome://gpu` and check that **WebGL** and **WebGL2** show **Hardware accelerated**.
5. If they show "Software only" or "Disabled", open `chrome://flags/#ignore-gpu-blocklist`, set **Override software rendering list** to **Enabled**, and relaunch again.

**Microsoft Edge**

1. Open `edge://settings/system` and turn on **Use graphics acceleration when available**.
2. Restart Edge.
3. Open `edge://gpu` and check that **WebGL** and **WebGL2** show **Hardware accelerated**.
4. If not, open `edge://flags/#ignore-gpu-blocklist`, set it to **Enabled**, and restart.

**Mozilla Firefox**

1. Open `about:preferences`, go to **General**, then **Performance**.
2. Uncheck **Use recommended performance settings**.
3. Check **Use hardware acceleration when available** and restart Firefox.
4. Open `about:support` and look under **Graphics** for a WebGL renderer entry, which should name your GPU and not "Software".
5. If WebGL is still unavailable, open `about:config`, search for `webgl.force-enabled`, set it to `true`, and restart.

**Safari (macOS)**

WebGL is enabled by default. No setting is needed.



## Configuration
 
All settings are in `.env`.
 
| Variable | Description |
|---|---|
| `APP_ENV` | Keep as `production`. |
| `SECRET_KEY` | Random secret. Generate with `openssl rand -hex 32`. |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Database credentials. Use a strong password. |
| `DB_HOST`, `DB_PORT`, `REDIS_HOST`, `REDIS_PORT` | Leave at the defaults (`db`, `5432`, `redis`, `6379`). |
| `DOCKER_GID` | Group ID of the host's `docker` group: `getent group docker \| cut -d: -f3` |
| `HOST_EXPERIMENTS_ROOT` | Absolute host path for experiment results, e.g. `/srv/st_project/experiments` |
| `HOST_UPLOADS_ROOT` | Absolute host path for uploaded datasets, e.g. `/srv/st_project/uploads` |
| `HTTP_PORT` | Host port to expose the platform on. Default `80`. |
| `WORKER_CONCURRENCY` | Number of concurrent segmentation jobs handled by the heavy worker. Default `1`; increase only when the server has sufficient CPU, RAM, and GPU resources. |
| `WORKER_IO_CONCURRENCY` | Number of concurrent lightweight I/O tasks handled by the I/O worker. Default `4`; tune independently from `WORKER_CONCURRENCY`. |
 

## Updating

Updates pull new images, restart the services, and apply database migrations. Existing data (the database and the two host directories) is preserved.


### Manual Update

#### 1. Check for running tasks

> **Heads up:** restarting the stack stops the Celery workers. Anything still running is killed mid-task, so **make sure no experiments are running before you update.** `deploy.sh` does not check this on its own.


```bash
docker compose -f docker-compose.prod.yml exec -T worker \
  celery -A app.core.celery.celery_app inspect active --json --timeout 10
docker compose -f docker-compose.prod.yml exec -T worker \
  celery -A app.core.celery.celery_app inspect reserved --json --timeout 10
```

If every worker shows an empty list (`[]`), it is safe to update. If you see entries with an `"id"`, tasks are running or queued. Wait for them to finish.

#### 2. Update

If no worker is running or queued, pull the changes and deploy again.

```bash
git pull
./deploy.sh
```

### Automatic nightly updates (cron)

`auto_deploy.sh` can run on a schedule. Each run:

1. Exits immediately if workers are busy (nothing is pulled).
2. Pulls the app images and the tool images.
3. Runs `deploy.sh` only if an image changed since the last successful deploy.


#### 1. Check that cron is available

```bash
command -v crontab
systemctl is-active cron || systemctl is-active crond
```

If `crontab` is missing or the service is inactive, ask an administrator to
install it (`sudo apt install cron` or `sudo dnf install cronie`) and run
`sudo systemctl enable --now cron`.

#### 2. Check you are allowed to use it

```bash
crontab -l
```

`no crontab for <user>` means you are allowed. `You are not allowed to use this program` means an admin must add you to `/etc/cron.allow`.

Then confirm that cron actually runs:

```bash
(crontab -l 2>/dev/null; printf 'SHELL=/bin/bash\n* * * * * date >> "$HOME/cron_test.log"\n') | crontab -
sleep 70 && tail -n 2 "$HOME/cron_test.log"
```

If it outputs timestamps, cron is running properly. Remove the temporary test
entry after verification with `crontab -e`.

#### 3. Add the cron entry

```bash
crontab -e
```
Add the following commands and save them. Replace `/absolute/path/to/project` with the absolute path to the project
directory.

```cron
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
MAILTO=""
0 0-3 * * * /absolute/path/to/project/auto_deploy.sh >/dev/null 2>&1
```


## Sample data and tutorials

**Sample datasets:** [Google Drive folder](https://drive.google.com/drive/folders/1IaYbdZvMc5U3lj3VizW8VT623gDtGZRO?usp=sharing). The datasets are `.zip` files; use the ZIP files directly as input in the tool execution interface.

**Video tutorials:** [Spatial Transcriptomics Webserver - YouTube playlist](https://www.youtube.com/playlist?list=PLA_NksohuCtNzN6l_ZiJuAr2sjdAbjhFE). They cover the interface, dataset upload, and how to interpret the domain identification results.

## Resource usage details

### Measured usage

Peak usage of a single analysis job on **DLPFC** datasets of about 4,000 spots, without any safety margin:

| Tool | Peak RAM | Peak GPU memory |
|---|---|---|
| DeepST | 8.5 GiB | 1.01 GiB |
| ScribbleDom | 6.5 GiB | 1.69 GiB |
| STAIG | 4.2 GiB | 2.41 GiB |

These figures exclude STAIG's histology image feature extraction.

### How the recommendations were derived

**RAM.** Measured peak plus a 30% margin, rounded to standard sizes:

| Tool | Tool RAM with margin | GPU with margin |
|---|---|---|
| DeepST | 12 GB | 4 GB |
| ScribbleDom | 10 GB | 4 GB |
| STAIG | 8 GB | 4 GB |


## Repository layout:

```
deploy.sh                 deployment script (use this, not plain docker compose up)
docker-compose.prod.yml   production service definitions
nginx.conf                reverse proxy configuration
.env.example              template for all settings
backend/                  FastAPI application and Celery tasks
frontend/                 React application
tools/<tool-id>/          tool packages (tool.yaml, manifest.yaml)
```
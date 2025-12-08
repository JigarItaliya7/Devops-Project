**Set Docker Credentials**

Before running the project, set your Docker username and password as environment variables:

**Linux / macOS**

```bash
export DOCKER_USERNAME=your_username
export DOCKER_PASSWORD=your_password
```

**Windows (PowerShell)**

```powershell
$env:DOCKER_USERNAME="your_username"
$env:DOCKER_PASSWORD="your_password"
```

> For CI/CD, add these as secret variables in your pipeline instead of hardcoding.

**Installation**

1. **Clone the repository**

```bash
git clone https://github.com/JigarItaliya7/Devops-Project.git
cd Deveops-Project
```

2. **Set Docker credentials**
   *(See section above for details)*

```bash
export DOCKER_USERNAME=your_username
export DOCKER_PASSWORD=your_password
```

3. **Build Docker images**

```bash
docker build -t your-image-name .
```

4. **Run the container**

```bash
docker run -it your-image-name
```

> **Optional:** For CI/CD pipelines, set `DOCKER_USERNAME` and `DOCKER_PASSWORD` as secret variables instead of exporting locally.


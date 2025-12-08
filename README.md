Set Docker Credentials

Before running the project, set your Docker username and password as environment variables:

Linux / macOS

export DOCKER_USERNAME=your_username
export DOCKER_PASSWORD=your_password


Windows (PowerShell)

$env:DOCKER_USERNAME="your_username"
$env:DOCKER_PASSWORD="your_password"


For CI/CD, add these as secret variables in your pipeline instead of hardcoding.

Installation

Clone the repository

git clone https://github.com/your-username/your-repo.git
cd your-repo


Set Docker credentials
(See section above for details)

export DOCKER_USERNAME=your_username
export DOCKER_PASSWORD=your_password


Build Docker images

docker build -t your-image-name .


Run the container

docker run -it your-image-name


Optional: For CI/CD pipelines, set DOCKER_USERNAME and DOCKER_PASSWORD as secret variables instead of exporting locally.

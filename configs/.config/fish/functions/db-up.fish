function db-up
  cd ~/configs/docker/postgresql
  podman-compose up -d
  cd -
end

# Defined in /home/simmetopia/.config/fish/functions/am_be.fish @ line 2
function am_be
   cd /home/simmetopia/code/ammaraal/EPUniTool-backend
   git checkout develop --force
   git pull --force
   docker-compose down
   docker volume rm epunitool-backend_mssql_server_data
   sudo docker-compose up --build -d
   cd --
end

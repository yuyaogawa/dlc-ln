### Integrate
DLC-LN needs to have other components to provide service as described the diagram above.
PM2 is one way to manage all processes including Docker container.
```
# In dlc-ln folder
pm2 start "npm start" --name dlc-ln
# In oracle-server folder
pm2 start "npm start" --name oracle-server
# In dlc-frontend folder
pm2 start "PORT=5000 HOST=0.0.0.0 npm run dev" --name dlc-frontend
```


### Stats
```
select id, paid, status, DATETIME(ROUND(createdAt / 1000), 'unixepoch') AS isodate from contract where paid = 1;

select status, count(id) from contract where paid = 1 group by status;
```

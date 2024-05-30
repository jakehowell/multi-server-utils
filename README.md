## Multi Server Utility

This is a little utility application that I wrote using Node.js and vanilla javascript to help me quickly search logs and run commands on multiple servers at the same time. The reason I wrote it is beacuse we had multiple servers behind a load balancer and it was very hard to troubleshoot active issues since it required logging into each server and searching through the logs individually.

This utility allows you to run commands across servers and search logs quickly and saves the output to a local text file. It also saves command history using a local sqlite database so that you can review previous commands.

DISCLAIMER: This is a working PROOF OF CONCEPT and is very much a WORK IN PROGRESS.

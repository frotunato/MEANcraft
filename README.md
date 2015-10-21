= =========== =
=  MEANcraft  =
= =========== =

A Minecraft webadmin written using the MEAN stack (MongoDB, ExpressJS, AngularJS, NodeJS).

It features a web interface that gives full access to anything related to server's magnament; it grants access to ingame chat through an user based system that limits the interaction with the server depending on their privileges [TODO], a resumable upload system (based in socket.io) to feed the database with maps and executables. Currently only .tar.gz and zip formats are avaible due being a cross-platform aplication.

It also gives the capability to modify the files in the selected executable in order to adjust minor settings (server.properties, plugin configs and so) through a web file explorer.

Internally files are stored in a MongoDB database using GridFS, encoded in LZ4 format through streams (it can deal with massive files without memory limitations). 

This format provides a high performance on compressing/decompressing operations such as getting the server up or performing backups with a minimal impact into overall system load.

### TODO ###
- User based system
- Web view of current map's rendering
- ...
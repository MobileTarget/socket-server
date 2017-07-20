module.exports = function(io){
	var numUsers = 0;
	var connectedUsers = {};
	io.on('connection', function (socket) {
		var addedUser = false;

		// when the client emits 'new message', this listens and executes
		socket.on('new message', function (data) {
		  // we tell the client to execute 'new message'
		  socket.broadcast.emit('new message', {
			username: socket.username,
			message: data
		  });
		});
	  
		// when the client emits 'add user', this listens and executes
		socket.on('add user', function (username) {
		  if (addedUser) return;
	  
		  // we store the username in the socket session for this client
		  socket.username = username;
		  ++numUsers;
		  addedUser = true;
		  socket.emit('login', {
			numUsers: numUsers
		  });
		  // echo globally (all clients) that a person has connected
		  socket.broadcast.emit('user joined', {
			username: socket.username,
			numUsers: numUsers
		  });
		});
	  
		// when the client emits 'typing', we broadcast it to others
		socket.on('typing', function () {
		  socket.broadcast.emit('typing', {
			username: socket.username
		  });
		});
	  
		// when the client emits 'stop typing', we broadcast it to others
		socket.on('stop typing', function () {
		  socket.broadcast.emit('stop typing', {
			username: socket.username
		  });
		});
	  
		// when the user disconnects.. perform this
		socket.on('disconnect', function () {
			if (addedUser) {
			  --numUsers;
		
			  // echo globally that this client has left
			  socket.broadcast.emit('user left', {
				username: socket.username,
				numUsers: numUsers
			  });
			}
			
			//following code is used for todooffline app.
			if(socket.user_id) {
				delete connectedUsers[socket.user_id]  ;
				console.log(`Socket is going to disconnect.`);
			}
		});
		
		socket.on('$onAppResume$event', function(obj){
			console.log("Resume Event triggered  >>>>>", obj);
			if(connectedUsers[obj.id]){
				console.log(`User is already connected with SocketId ${obj.id}.`);
			}else{
				socket.user_id = obj.id;
				connectedUsers[obj.id] = socket;
				console.log(`User is going to connect with SocketId ${obj.id}`);
			}
		});

		socket.on('$onAppPause$event', function(obj){
			console.log("Pause Event triggered  >>>>>", obj);
			if(connectedUsers[obj.id]){
				console.log(`User is going to offline with the SocketId ${obj.id}.`);
				delete connectedUsers[obj.id];	
			}else{
				console.log(`User ${obj.id} is already dis-connected.`);
			}
		});
		
		socket.on('$typing$event', function(data){
			socket.broadcast.emit('$typing$event', data);
		});

		socket.on('$stop$typing$event', function(data){
			socket.broadcast.emit('$stop$typing$event', data);
		});

		socket.on('$push$message$event', function(data){
			socket.broadcast.emit('$push$message$event', data);
		});
	});
};